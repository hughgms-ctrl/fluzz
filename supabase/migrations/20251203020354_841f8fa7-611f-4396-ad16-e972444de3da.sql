-- Drop existing standalone tasks policy
DROP POLICY IF EXISTS "Users can create standalone tasks" ON public.tasks;

-- Create improved standalone tasks INSERT policy
CREATE POLICY "Users can create standalone tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  -- User can create standalone task for themselves
  (project_id IS NULL AND assigned_to = auth.uid())
  OR
  -- Admins/gestors can create standalone tasks for any member in their workspace
  (project_id IS NULL AND EXISTS (
    SELECT 1 FROM workspace_members wm1
    WHERE wm1.user_id = auth.uid() 
    AND wm1.role IN ('admin', 'gestor')
    AND EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.user_id = tasks.assigned_to
      AND wm2.workspace_id = wm1.workspace_id
    )
  ))
);