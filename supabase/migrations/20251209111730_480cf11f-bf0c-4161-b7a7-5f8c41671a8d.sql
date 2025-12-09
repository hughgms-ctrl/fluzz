-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Workspace members can create tasks" ON public.tasks;

-- Create a simpler INSERT policy that allows any authenticated user to create tasks
CREATE POLICY "Authenticated users can create tasks" 
ON public.tasks 
FOR INSERT 
TO authenticated
WITH CHECK (true);