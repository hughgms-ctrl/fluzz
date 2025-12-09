-- Drop the existing standalone task policy
DROP POLICY IF EXISTS "Users can create standalone tasks" ON public.tasks;

-- Create updated policy that allows:
-- 1. Any user to create standalone tasks for themselves
-- 2. Admin/gestor to create standalone tasks for any member in their workspace
CREATE POLICY "Users can create standalone tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  (project_id IS NULL AND routine_id IS NULL) AND (
    -- Any user can create standalone tasks for themselves
    (assigned_to = auth.uid())
    OR
    -- Admin/gestor can create for any member in same workspace
    (EXISTS (
      SELECT 1 FROM workspace_members wm1
      WHERE wm1.user_id = auth.uid()
        AND wm1.role IN ('admin', 'gestor')
        AND EXISTS (
          SELECT 1 FROM workspace_members wm2
          WHERE wm2.user_id = tasks.assigned_to
            AND wm2.workspace_id = wm1.workspace_id
        )
    ))
  )
);