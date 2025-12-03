-- Drop existing standalone task processes INSERT policy
DROP POLICY IF EXISTS "Users can create task processes for standalone tasks" ON public.task_processes;

-- Create improved policy for task_processes on standalone tasks
CREATE POLICY "Users can create task processes for standalone tasks"
ON public.task_processes
FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT t.id FROM tasks t
    WHERE t.project_id IS NULL
    AND (
      -- User owns the standalone task
      t.assigned_to = auth.uid()
      OR
      -- Admin/gestor created a task for someone in their workspace
      EXISTS (
        SELECT 1 FROM workspace_members wm1
        WHERE wm1.user_id = auth.uid()
        AND wm1.role IN ('admin', 'gestor')
        AND EXISTS (
          SELECT 1 FROM workspace_members wm2
          WHERE wm2.user_id = t.assigned_to
          AND wm2.workspace_id = wm1.workspace_id
        )
      )
    )
  )
);