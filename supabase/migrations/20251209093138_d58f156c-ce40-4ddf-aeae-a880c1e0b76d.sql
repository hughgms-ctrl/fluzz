-- Drop the existing standalone task policy
DROP POLICY IF EXISTS "Users can create standalone tasks" ON public.tasks;

-- Create a comprehensive policy for task creation by admins/gestors
-- This allows admins/gestors to create ANY type of task for any workspace member
CREATE POLICY "Admins and gestors can create tasks for workspace members" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  -- Admin/gestor creating a task for any member in the same workspace
  EXISTS (
    SELECT 1 FROM workspace_members wm1
    WHERE wm1.user_id = auth.uid()
      AND wm1.role IN ('admin', 'gestor')
      AND EXISTS (
        SELECT 1 FROM workspace_members wm2
        WHERE wm2.user_id = tasks.assigned_to
          AND wm2.workspace_id = wm1.workspace_id
      )
  )
);

-- Create a separate policy for users creating standalone tasks for themselves
CREATE POLICY "Users can create standalone tasks for themselves" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  -- User creating a standalone task for themselves
  project_id IS NULL 
  AND assigned_to = auth.uid()
);