-- Garantir que membros do workspace vejam todos os dados compartilhados

-- Atualizar políticas de projetos para permitir que membros do workspace vejam todos os projetos
DROP POLICY IF EXISTS "Users can view projects in their workspace" ON projects;
CREATE POLICY "Users can view projects in their workspace"
ON projects FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas de tarefas para permitir que membros do workspace vejam todas as tarefas
DROP POLICY IF EXISTS "Users can view tasks in own projects" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in member projects" ON tasks;
DROP POLICY IF EXISTS "Users can view their own standalone tasks" ON tasks;

CREATE POLICY "Users can view tasks in workspace projects"
ON tasks FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  OR
  (project_id IS NULL AND assigned_to = auth.uid())
);

-- Garantir que company_info (cultura) seja visível para membros
DROP POLICY IF EXISTS "Users can view company info in their workspace" ON company_info;
CREATE POLICY "Users can view company info in their workspace"
ON company_info FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Garantir que process_documentation (processos) seja visível para membros
DROP POLICY IF EXISTS "Users can view process docs in their workspace" ON process_documentation;
CREATE POLICY "Users can view process docs in their workspace"
ON process_documentation FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Garantir que positions (cargos) sejam visíveis para membros
DROP POLICY IF EXISTS "Users can view positions in their workspace" ON positions;
CREATE POLICY "Users can view positions in their workspace"
ON positions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Garantir que routines (rotinas) sejam visíveis para membros
DROP POLICY IF EXISTS "Users can view routines in their workspace" ON routines;
CREATE POLICY "Users can view routines in their workspace"
ON routines FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Garantir que recurring_tasks sejam visíveis para membros
DROP POLICY IF EXISTS "Users can view recurring tasks in their workspace" ON recurring_tasks;
CREATE POLICY "Users can view recurring tasks in their workspace"
ON recurring_tasks FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Garantir que briefings sejam visíveis para membros
DROP POLICY IF EXISTS "Users can manage briefings in their workspace" ON briefings;
CREATE POLICY "Users can view briefings in their workspace"
ON briefings FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage briefings in their workspace"
ON briefings FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Garantir que debriefings sejam visíveis para membros
DROP POLICY IF EXISTS "Users can manage debriefings in their workspace" ON debriefings;
CREATE POLICY "Users can view debriefings in their workspace"
ON debriefings FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage debriefings in their workspace"
ON debriefings FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Garantir que workspace_members possam ver outros membros do mesmo workspace
DROP POLICY IF EXISTS "User sees own membership and workspace owner sees all" ON workspace_members;
CREATE POLICY "Users can view members in their workspaces"
ON workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);