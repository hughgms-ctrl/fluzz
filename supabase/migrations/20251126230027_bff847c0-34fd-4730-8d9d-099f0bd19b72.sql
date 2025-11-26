-- Reset workspace policies to avoid recursion and simplify ownership model
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can update their workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create first workspace or admins can create" ON public.workspaces;

CREATE POLICY "Workspace owners can select"
ON public.workspaces FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Workspace owners can insert"
ON public.workspaces FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Workspace owners can update"
ON public.workspaces FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Workspace owners can delete"
ON public.workspaces FOR DELETE
USING (created_by = auth.uid());

-- Reset workspace_members policies to depend only on workspaces (one-way)
DROP POLICY IF EXISTS "User sees own membership and workspace owner sees all" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner can delete members" ON public.workspace_members;

CREATE POLICY "User sees own membership and workspace owner sees all"
ON public.workspace_members FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.created_by = auth.uid()
  )
);

CREATE POLICY "Workspace owner can insert members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id
      AND w.created_by = auth.uid()
  )
);

CREATE POLICY "Workspace owner can update members"
ON public.workspace_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.created_by = auth.uid()
  )
);

CREATE POLICY "Workspace owner can delete members"
ON public.workspace_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.created_by = auth.uid()
  )
);