
# Plano: Modo Foco Completo + Navegação Mobile Inferior

## Resumo das Alterações
Este plano implementa o **Modo Foco** nas três páginas principais (Home, Minhas Tarefas, Projetos), persistência completa das preferências do usuário, simplificação visual no modo foco, e uma barra de navegação inferior para dispositivos móveis.

---

## 1. Persistência de Preferências do Usuário

### 1.1 Criar Hook de Preferências Unificado
Criar `src/hooks/useFocusModePreferences.ts` para gerenciar:
- **viewMode**: "management" ou "focus" 
- **hideCompleted**: boolean (ocultar tarefas concluídas)
- Persistir ambos em `localStorage` automaticamente
- Carregar preferências na inicialização

---

## 2. Adicionar Toggle Modo Foco em Projects.tsx

### 2.1 Modificar `src/pages/Projects.tsx`
- Importar `ViewModeToggle` e `useViewMode`
- Adicionar o toggle no header (ao lado do seletor de visualização grid/list/calendar)
- Implementar visualização Focus Mode para projetos:
  - Em vez do grid/table, mostrar lista de projetos com tarefas agrupadas
  - Ao clicar em um projeto, expandir com split-view lateral mostrando tarefas do projeto

---

## 3. Simplificar Interface no Modo Foco

### 3.1 Modificar `src/components/focus-mode/FocusModeTaskItem.tsx`
Remover/ocultar campos extras no modo foco (conforme imagem com campos riscados):
- Manter apenas: checkbox circular, título, data de vencimento
- Ocultar: prioridade detalhada, badge de projeto, avatar de responsável
- Interface ultra-minimalista

### 3.2 Modificar `src/components/focus-mode/FocusModeTaskDetail.tsx`
Simplificar o painel de detalhes:
- Focar em: título, descrição, status, prazo
- Seções de Documentação e Notas acessíveis apenas via botão "Ver Completo" (navega para Workspace)

---

## 4. Persistência do Toggle "Ocultar Concluídas"

### 4.1 Atualizar `src/hooks/useViewMode.ts`
Expandir o hook para incluir:
```typescript
interface ViewModePreferences {
  viewMode: ViewMode;
  hideCompleted: boolean;
  setViewMode: (mode: ViewMode) => void;
  setHideCompleted: (hide: boolean) => void;
}
```
- Persistir `hideCompleted` em `localStorage` 
- Carregar na inicialização junto com `viewMode`

### 4.2 Atualizar páginas para usar nova preferência
- **MyTasks.tsx**: Usar `hideCompleted` do hook em vez de estado local
- **Home.tsx**: Aplicar filtro de concluídas se no modo foco
- **Projects.tsx**: Aplicar filtro no modo foco

---

## 5. Barra de Navegação Inferior Mobile

### 5.1 Criar `src/components/layout/MobileBottomNav.tsx`
Nova barra fixa na parte inferior da tela (apenas mobile):

```
+------------------------------------------------+
|  Projetos  |  Minhas Tarefas  |  Home  |  ≡   |
|     📁     |       ✓          |   🏠   |      |
+------------------------------------------------+
```

Estrutura:
- **Esquerda**: Projetos (ícone FolderKanban)
- **Centro**: Minhas Tarefas (ícone CheckSquare) - destacado
- **Centro-Direita**: Home (ícone Home)
- **Direita**: Menu hamburguer (abre drawer com restante da navegação)

### 5.2 Modificar `src/components/layout/AppLayout.tsx`
- Importar e renderizar `MobileBottomNav` apenas em mobile (`useIsMobile`)
- Adicionar padding-bottom ao conteúdo para não sobrepor a navbar
- Ocultar/minimizar sidebar lateral em mobile quando navbar inferior está ativa

### 5.3 Criar `src/components/layout/MobileNavDrawer.tsx`
Drawer lateral que abre ao clicar no menu hamburguer:
- Lista completa de navegação (Workspace, Analytics, AI, Setores, etc.)
- Perfil e logout

---

## 6. Configurar Rota Inicial

### 6.1 Modificar redirecionamento padrão
Quando usuário logado acessa "/", redirecionar para "/my-tasks" em vez de "/home"
- Modificar `src/pages/Landing.tsx` ou criar lógica em `AppLayout`

---

## Arquivos a Criar
1. `src/components/layout/MobileBottomNav.tsx`
2. `src/components/layout/MobileNavDrawer.tsx`
3. `src/components/focus-mode/FocusModeProjectsView.tsx` (vista de projetos em modo foco)

## Arquivos a Modificar
1. `src/hooks/useViewMode.ts` - Adicionar hideCompleted
2. `src/pages/Projects.tsx` - Adicionar toggle e modo foco
3. `src/pages/MyTasks.tsx` - Usar hideCompleted persistido
4. `src/pages/Home.tsx` - Aplicar filtros no modo foco
5. `src/components/layout/AppLayout.tsx` - Adicionar navegação mobile
6. `src/components/focus-mode/FocusModeTaskItem.tsx` - Simplificar visual
7. `src/components/focus-mode/FocusModeTaskDetail.tsx` - Simplificar campos

---

## Seção Técnica

### Estrutura do Hook de Preferências
```typescript
// src/hooks/useViewMode.ts (expandido)
export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return (localStorage.getItem("viewMode") as ViewMode) || "management";
  });
  
  const [hideCompleted, setHideCompletedState] = useState<boolean>(() => {
    return localStorage.getItem("hideCompleted") === "true";
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem("viewMode", mode);
  };

  const setHideCompleted = (hide: boolean) => {
    setHideCompletedState(hide);
    localStorage.setItem("hideCompleted", String(hide));
  };

  return { viewMode, setViewMode, hideCompleted, setHideCompleted };
}
```

### Estrutura da Navegação Mobile
```typescript
// Ícones e rotas da barra inferior
const mobileNavItems = [
  { icon: FolderKanban, path: "/projects", label: "Projetos" },
  { icon: CheckSquare, path: "/my-tasks", label: "Tarefas", isMain: true },
  { icon: Home, path: "/home", label: "Home" },
  { icon: Menu, action: "openDrawer", label: "Menu" },
];
```

### Safe Area para iOS
Garantir que a barra inferior respeite as safe areas:
```css
padding-bottom: env(safe-area-inset-bottom, 0px);
```
