-- Ajustar policies de workspace_members para remover recursão
DROP POLICY IF EXISTS "Users can view members of their workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can delete workspace members" ON public.workspace_members;

-- Policy: usuário vê sua própria linha e o dono do workspace vê todos
CREATE POLICY "User sees own membership and workspace owner sees all"
ON public.workspace_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.created_by = auth.uid()
  )
);

-- Dono do workspace pode inserir membros
CREATE POLICY "Workspace owner can insert members"
ON public.workspace_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_id
      AND w.created_by = auth.uid()
  )
);

-- Dono do workspace pode atualizar membros
CREATE POLICY "Workspace owner can update members"
ON public.workspace_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.created_by = auth.uid()
  )
);

-- Dono do workspace pode remover membros
CREATE POLICY "Workspace owner can delete members"
ON public.workspace_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.created_by = auth.uid()
  )
);

-- Ajustar policy de criação de workspaces para permitir o primeiro workspace
DROP POLICY IF EXISTS "Admins can create new workspaces" ON public.workspaces;

CREATE POLICY "Users can create first workspace or admins can create"
ON public.workspaces
FOR INSERT
WITH CHECK (
  public.user_is_any_admin(auth.uid())
  OR NOT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);