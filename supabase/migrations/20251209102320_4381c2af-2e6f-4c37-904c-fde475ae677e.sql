-- Drop the restrictive policy that requires assigned_to = auth.uid()
DROP POLICY IF EXISTS "Users can create any task for themselves" ON public.tasks;

-- Keep only the simple policy: any workspace member can create tasks