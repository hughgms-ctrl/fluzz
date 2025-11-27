-- Allow workspace members to view profiles of other workspace members
CREATE POLICY "Workspace members can view other member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm1
    WHERE wm1.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members wm2
      WHERE wm2.user_id = profiles.id
      AND wm2.workspace_id = wm1.workspace_id
    )
  )
);