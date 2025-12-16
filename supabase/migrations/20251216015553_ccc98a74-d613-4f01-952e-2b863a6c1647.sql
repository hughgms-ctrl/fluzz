-- Allow approval reviewers to update tasks they are reviewing
CREATE POLICY "Reviewers can update tasks for approval" 
ON public.tasks 
FOR UPDATE 
USING (approval_reviewer_id = auth.uid());