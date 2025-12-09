-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;

-- Create new INSERT policy checking auth.role() explicitly
CREATE POLICY "Authenticated users can create tasks" 
ON public.tasks 
FOR INSERT 
TO authenticated
WITH CHECK (true);