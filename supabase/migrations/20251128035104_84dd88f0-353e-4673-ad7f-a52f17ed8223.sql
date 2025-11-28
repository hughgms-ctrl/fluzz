-- Allow workspace members (not just owners) to view their workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Keep existing owner select policy but also allow members to select
DROP POLICY IF EXISTS "Workspace members can select" ON public.workspaces;

CREATE POLICY "Workspace members can select"
ON public.workspaces
FOR SELECT
USING (
  id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);
