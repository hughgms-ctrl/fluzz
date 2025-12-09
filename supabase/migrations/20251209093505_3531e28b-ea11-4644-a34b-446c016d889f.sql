-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can create standalone tasks for themselves" ON public.tasks;

-- Create a comprehensive policy for ANY user creating tasks for themselves
-- This covers standalone, routine, AND project tasks when assigned to self
CREATE POLICY "Users can create tasks for themselves" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  -- Any authenticated user can create any type of task for themselves
  assigned_to = auth.uid()
);