
-- Add RLS policy to allow users to update tasks they are assigned to
CREATE POLICY "Users can update tasks assigned to them"
ON public.tasks
FOR UPDATE
USING (assigned_to = auth.uid());
