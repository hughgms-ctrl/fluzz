-- Drop all existing INSERT policies for tasks to consolidate
DROP POLICY IF EXISTS "Admins and gestors can create tasks for workspace members" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for themselves" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in member projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own projects" ON public.tasks;

-- Create comprehensive INSERT policies:

-- 1. Admins/Gestores can create ANY task (standalone, project, routine) for ANY workspace member
CREATE POLICY "Admins and gestors can create any task" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'gestor')
      AND (
        -- For project tasks: check project is in same workspace
        (tasks.project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM projects p 
          WHERE p.id = tasks.project_id 
          AND p.workspace_id = wm.workspace_id
        ))
        OR
        -- For routine tasks: check routine is in same workspace
        (tasks.routine_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM routines r 
          WHERE r.id = tasks.routine_id 
          AND r.workspace_id = wm.workspace_id
        ))
        OR
        -- For standalone tasks: just check assigned_to is in same workspace
        (tasks.project_id IS NULL AND tasks.routine_id IS NULL AND EXISTS (
          SELECT 1 FROM workspace_members wm2 
          WHERE wm2.user_id = tasks.assigned_to 
          AND wm2.workspace_id = wm.workspace_id
        ))
      )
  )
);

-- 2. Any user can create ANY task (standalone, project, routine) for THEMSELVES
CREATE POLICY "Users can create any task for themselves" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  assigned_to = auth.uid()
);