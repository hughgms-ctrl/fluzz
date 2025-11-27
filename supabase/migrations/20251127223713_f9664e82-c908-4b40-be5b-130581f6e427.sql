-- Corrigir recursão infinita na política de workspace_members
DROP POLICY IF EXISTS "Users can view members in their workspaces" ON workspace_members;

-- Política simples que permite usuários verem membros dos workspaces onde eles estão
CREATE POLICY "Users can view workspace members"
ON workspace_members FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  workspace_id IN (
    SELECT wm.workspace_id 
    FROM workspace_members wm 
    WHERE wm.user_id = auth.uid()
  )
);

-- Garantir que a política não cause recursão usando uma abordagem diferente
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;

CREATE POLICY "Members can view their workspace colleagues"
ON workspace_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
  )
);