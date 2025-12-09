-- Drop all INSERT policies on tasks
DROP POLICY IF EXISTS "Admins and gestors can create any task" ON public.tasks;
DROP POLICY IF EXISTS "Members can create tasks for themselves" ON public.tasks;

-- Create ONE simple policy: any authenticated workspace member can create tasks
CREATE POLICY "Workspace members can create tasks" 
ON public.tasks 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be a member of at least one workspace
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE user_id = auth.uid()
  )
);