

# Plano: Sistema de Participantes Externos + Notificações WhatsApp (UAZapi)

Este é um recurso complexo com 4 partes principais. Vamos dividir em etapas incrementais.

---

## Visão Geral

```text
┌─────────────────────────────────────────────┐
│           WORKSPACE SETTINGS                │
│  ┌───────────────────────────────────────┐  │
│  │  Configuração WhatsApp (UAZapi)       │  │
│  │  - Subdomínio da instância            │  │
│  │  - Token da instância                 │  │
│  │  - Teste de conexão                   │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│         PARTICIPANTES (WORKSPACE)           │
│  ┌───────────────────────────────────────┐  │
│  │  Cadastro: Nome, Telefone, Email(op)  │  │
│  │  Podem ser atribuídos a tarefas       │  │
│  │  Recebem notificações via WhatsApp    │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│          ATRIBUIÇÃO DE TAREFAS              │
│  MultiAssigneeDialog mostra participantes   │
│  externos junto com membros internos        │
├─────────────────────────────────────────────┤
│       NOTIFICAÇÕES WHATSAPP (EDGE FN)       │
│  Triggers: atribuição, mudança status,      │
│  prazo, lembretes automáticos               │
└─────────────────────────────────────────────┘
```

---

## Parte 1: Banco de Dados

### Nova tabela: `external_participants`
- `id` (uuid, PK)
- `workspace_id` (uuid, FK → workspaces)
- `name` (text, NOT NULL)
- `phone` (text, NOT NULL) — formato internacional ex: 5511999999999
- `email` (text, nullable)
- `notes` (text, nullable)
- `created_by` (uuid)
- `created_at`, `updated_at`

RLS: workspace members podem CRUD nos participantes do seu workspace. Admin/gestor podem criar/editar/deletar.

### Nova tabela: `task_external_assignees`
- `id` (uuid, PK)
- `task_id` (uuid, FK → tasks)
- `participant_id` (uuid, FK → external_participants)
- `created_at`

RLS: mesmas regras das task_assignees, baseado no workspace da task.

### Nova tabela: `whatsapp_config`
- `id` (uuid, PK)
- `workspace_id` (uuid, FK → workspaces, UNIQUE)
- `instance_subdomain` (text) — subdomínio UAZapi
- `instance_token` (text) — token da instância (criptografado/secret)
- `is_active` (boolean, default false)
- `created_by` (uuid)
- `created_at`, `updated_at`

RLS: apenas admin do workspace pode gerenciar.

### Nova tabela: `whatsapp_notification_logs`
- `id` (uuid, PK)
- `workspace_id` (uuid)
- `participant_id` (uuid, FK → external_participants)
- `task_id` (uuid, FK → tasks)
- `message_type` (text) — 'task_assigned', 'status_changed', 'due_reminder', etc.
- `status` (text) — 'sent', 'failed'
- `error_message` (text, nullable)
- `sent_at` (timestamptz)

---

## Parte 2: UI — Participantes do Workspace

### Painel "Participantes" na página de configurações do workspace
- Listar participantes com nome e telefone
- Botão "Adicionar Participante" → dialog com campos: Nome, Telefone (obrigatório), Email (opcional), Observações
- Editar/excluir participantes existentes
- Acessível por admin e gestor

### Aba "Participantes" dentro do ProjectDetail
- Mostrar participantes que estão atribuídos a tarefas deste projeto
- Opção de atribuir participante existente a uma tarefa do projeto

---

## Parte 3: UI — Atribuição de Participantes Externos a Tarefas

### Atualizar `MultiAssigneeDialog`
- Adicionar seção separada "Participantes Externos" abaixo dos membros internos
- Mostrar lista de participantes do workspace com checkbox
- Ao salvar, inserir na tabela `task_external_assignees`
- Mostrar avatares diferenciados (ícone de pessoa externa) nos cards de tarefa

### Atualizar componentes de exibição
- `MultiAssigneeAvatars` — mostrar participantes externos com badge/ícone diferenciado
- `TaskCard`, `FocusModeTaskItem` — exibir participantes externos

---

## Parte 4: Configuração WhatsApp (UAZapi) no Workspace

### UI em Configurações do Workspace
- Seção "Integração WhatsApp"
- Campos: Subdomínio da instância, Token
- Botão "Testar Conexão" — chama edge function que faz um GET na API UAZapi para verificar status
- Toggle ativar/desativar

### Secrets
- O token da UAZapi será armazenado na tabela `whatsapp_config` (por workspace, não global)
- A edge function lerá da tabela ao enviar mensagens

---

## Parte 5: Edge Function — Envio de Notificações WhatsApp

### `send-whatsapp-notification` edge function
- Recebe: `workspace_id`, `participant_id`, `task_id`, `message_type`
- Busca config do workspace na tabela `whatsapp_config`
- Busca dados do participante e da tarefa
- Monta mensagem em português baseada no tipo
- Chama UAZapi: `POST https://{subdomain}.uazapi.com/sendText` com header `token`
- Registra log na tabela `whatsapp_notification_logs`

### Tipos de notificação:
1. **Atribuição** — "Olá {nome}, você foi atribuído à tarefa '{título}' com prazo em {data}."
2. **Mudança de status** — "A tarefa '{título}' mudou para {status}."
3. **Prazo próximo** — "Lembrete: a tarefa '{título}' vence em {data}."
4. **Tarefa atrasada** — "A tarefa '{título}' está atrasada desde {data}."

### Trigger automático
- Database trigger na tabela `task_external_assignees` (INSERT) → chama edge function
- Database trigger na tabela `tasks` (UPDATE de status/due_date) → para cada external_assignee, chama edge function
- Cron job para lembretes de prazo (reutilizar padrão do `check-task-deadlines`)

---

## Ordem de Implementação

1. Migrations (tabelas + RLS)
2. UI de Participantes (cadastro no workspace)
3. Integração no MultiAssigneeDialog
4. UI de configuração WhatsApp
5. Edge function de envio
6. Triggers automáticos

---

## Detalhes Técnicos

- **UAZapi endpoint para enviar texto**: `POST https://{subdomain}.uazapi.com/sendText` com body `{ "phone": "5511...", "message": "..." }` e header `token: {instance_token}`
- Participantes são do workspace (compartilhados entre projetos)
- A tabela `task_external_assignees` é separada de `task_assignees` para não quebrar FK com auth.users
- Avatares de participantes externos usarão ícone `UserRoundPlus` ou similar para diferenciação visual

