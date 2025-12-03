-- Add INSERT policy for workspace_members to allow admins and gestors to add members
CREATE POLICY "Admins and gestors can add workspace members"
ON public.workspace_members
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id 
    FROM workspace_members wm 
    WHERE wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'gestor')
  )
  AND invited_by = auth.uid()
);