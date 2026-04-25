
# Plano: Fluzz AI Conversacional + BYOK (Bring Your Own Key)

Vou dividir em **2 partes independentes** que serão entregues juntas.

---

## PARTE 1 — Fluzz AI cria projetos completos via conversa

### Visão geral do fluxo

```text
Usuário: "Quero criar um projeto de Monetização para a Mariana"
   ↓
Fluzz AI: faz perguntas (datas, descrição, briefing) e propõe um plano
   ↓
Usuário: "Sim, cria"
   ↓
Fluzz AI executa: cria projeto + tarefas + subtarefas + briefing
   (em uma única transação, com confirmação visual)
```

### O que o Fluzz AI poderá fazer (novas tools)

Hoje ele só tem `create_task` e `create_project` simples. Vou adicionar:

1. **`create_project_with_tasks`** — cria um projeto e várias tarefas de uma vez (com responsáveis, prazos, prioridades).
2. **`add_subtasks_to_task`** — adiciona subtarefas a uma tarefa existente ou recém-criada.
3. **`create_briefing_for_project`** — cria o briefing inicial do projeto (data, local, investimento, participantes).
4. **`update_project`** — edita campos de um projeto existente.
5. **`update_task`** — edita campos de uma tarefa (status, prazo, responsável, prioridade).
6. **`delete_task`** — remove uma tarefa.
7. **`assign_external_participant_to_task`** — atribui participantes externos (do sistema do WhatsApp que já criamos).

### Como funciona a confirmação

Atualmente o chat já tem um sistema de **"ação pendente → confirma → executa"** (via `pendingToolCalls`). Vou estender:

- Para **ações compostas** (ex: criar projeto + 5 tarefas + briefing), o Fluzz mostra um **resumo visual** com tudo que será criado.
- O usuário aprova com 1 clique e tudo é criado em sequência.
- Se algo falhar no meio, mostra o que conseguiu criar e o que falhou.

### Comportamento conversacional

Atualizo o **system prompt** do Fluzz para que ele:

- Faça perguntas de discovery antes de criar (ex: "qual a data de fim?", "quem é o responsável principal?").
- Sugira automaticamente uma estrutura de tarefas/subtarefas baseada no tipo de projeto.
- Permita iteração: "adiciona mais uma tarefa de revisão", "muda o prazo da tarefa 3 para sexta".
- Confirme cada bloco grande antes de criar.

### Arquivos da Parte 1

- `supabase/functions/ai-assistant/index.ts` — adicionar as novas tools e atualizar o system prompt.
- `supabase/functions/ai-execute-action/index.ts` — implementar os handlers das novas ações.
- `src/hooks/useAIChat.ts` — adicionar as novas funções ao mapa `ACTION_FUNCTIONS` e ao `formatQueryResult`.
- `src/lib/ai-chat.ts` — sem mudança estrutural, apenas suporte aos novos nomes.
- `src/components/ai/AIChatPanel.tsx` — melhorar o card de confirmação para mostrar planos compostos (projeto + N tarefas).

---

## PARTE 2 — Configurações de IA (BYOK + escolha de modelo)

### Visão geral

Em **Configurações do Workspace**, nova seção **"Inteligência Artificial"** onde o admin pode:

1. Escolher o **provedor**: Lovable AI (padrão), OpenAI, Anthropic, Google Gemini.
2. Inserir a **chave de API** do provedor escolhido (criptografada no banco).
3. Escolher o **modelo** específico (ex: `gpt-5`, `claude-3.5-sonnet`, `gemini-2.5-pro`).
4. Botão **"Testar conexão"** que faz uma chamada de teste.
5. Toggle **"Usar minha própria chave"** — se desligado, usa Lovable AI (default).

### Modelos suportados por provedor

```text
Lovable AI (default, sem chave):
  - google/gemini-2.5-flash (default)
  - google/gemini-2.5-pro
  - openai/gpt-5, gpt-5-mini, gpt-5-nano

OpenAI (chave própria):
  - gpt-5, gpt-5-mini, gpt-5-nano, gpt-4o, gpt-4o-mini

Anthropic (chave própria):
  - claude-opus-4, claude-sonnet-4, claude-3-5-sonnet, claude-3-5-haiku

Google Gemini (chave própria):
  - gemini-2.5-pro, gemini-2.5-flash, gemini-1.5-pro
```

### Banco de dados (nova tabela)

```text
ai_workspace_config
├── id (uuid, PK)
├── workspace_id (uuid, FK, UNIQUE)
├── provider (text) — 'lovable' | 'openai' | 'anthropic' | 'gemini'
├── api_key (text, nullable) — chave do usuário
├── model (text) — modelo escolhido
├── is_active (boolean)
├── created_by, created_at, updated_at
```

RLS: apenas admin do workspace pode ler/editar.

### Edge Function — adaptar `ai-assistant`

A função vai:

1. Buscar a config do workspace.
2. Se `provider = lovable` → usa o gateway atual (`ai.gateway.lovable.dev`) com `LOVABLE_API_KEY`.
3. Se `provider = openai` → chama `https://api.openai.com/v1/chat/completions` com a chave do usuário.
4. Se `provider = anthropic` → chama `https://api.anthropic.com/v1/messages` (formato diferente, vou converter).
5. Se `provider = gemini` → chama `https://generativelanguage.googleapis.com/v1beta/...` com a chave do usuário.

Todos os 4 caminhos suportam **streaming** e **tool calling**, então a UX permanece idêntica.

### UI de configuração

Nova página: `src/pages/workspace/AIConfig.tsx`

```text
┌────────────────────────────────────────┐
│  🤖 Configuração de IA                  │
├────────────────────────────────────────┤
│  [Toggle] Usar minha própria chave     │
│                                         │
│  Provedor: [Lovable AI ▼]              │
│  Modelo:   [gemini-2.5-flash ▼]        │
│                                         │
│  Chave de API: [••••••••••••••]        │
│                                         │
│  [Testar Conexão]  [Salvar]            │
└────────────────────────────────────────┘
```

Acessível pelo sidebar (apenas admin), ao lado de "Participantes" e "WhatsApp".

### Arquivos da Parte 2

- **Migration**: nova tabela `ai_workspace_config` + RLS.
- **Nova página**: `src/pages/workspace/AIConfig.tsx`.
- **Sidebar**: adicionar link em `src/components/layout/AppSidebar.tsx`.
- **Rota**: registrar em `src/App.tsx`.
- **Edge function**: refatorar `supabase/functions/ai-assistant/index.ts` para suportar múltiplos provedores.
- **Edge function nova**: `supabase/functions/test-ai-connection/index.ts` para o botão "Testar".

---

## Detalhes Técnicos

### Tool calling cross-provider

- **OpenAI/Lovable AI**: já usam o formato `tools` + `tool_calls` (idêntico).
- **Gemini**: usa `function_declarations` e `function_call` — vou criar um adaptador.
- **Anthropic**: usa `tools` + `tool_use` em formato próprio — outro adaptador.

Faço um pequeno layer `providerAdapter.ts` dentro da edge function que converte requests/responses de cada provedor para o formato OpenAI (que o frontend já entende via SSE).

### Segurança da chave de API

- A chave é armazenada na tabela `ai_workspace_config` com RLS **somente admin**.
- Nunca é retornada ao frontend após salva (apenas um placeholder `••••`).
- A edge function lê via service role e nunca expõe.

### Compatibilidade

- Workspaces sem config → continuam usando Lovable AI normalmente (zero breaking change).
- Toggle desligado → ignora chave própria mesmo se preenchida.

---

## Ordem de Implementação

1. **Migration** da tabela `ai_workspace_config`.
2. **Página de config de IA** + rota + sidebar.
3. **Refatoração da edge function** com suporte multi-provedor.
4. **Edge function de teste** de conexão.
5. **Novas tools do Fluzz AI** (create_project_with_tasks, add_subtasks, etc).
6. **Atualizar handlers** em `ai-execute-action`.
7. **Atualizar UI do chat** para confirmações compostas.
8. **Atualizar system prompt** com comportamento conversacional.

---

## Sobre a viabilidade

Sim, **é totalmente possível**. O sistema de tool calling do Fluzz AI já funciona — só precisamos dar a ele mais ferramentas (criar projeto com tarefas, subtarefas, briefings) e ensiná-lo a fazer perguntas conversacionais antes de executar. Para o BYOK, basta adicionar uma camada de configuração e um adaptador para os 3 provedores externos.
