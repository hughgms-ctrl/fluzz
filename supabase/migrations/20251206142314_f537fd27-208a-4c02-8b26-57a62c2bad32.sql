-- Drop the old insert policy that uses get_user_workspace_id
DROP POLICY IF EXISTS "Users can create process docs in their workspace" ON public.process_documentation;

-- Create new insert policy that checks if user is admin/gestor in the workspace
CREATE POLICY "Admins and gestors can create process docs" 
ON public.process_documentation 
FOR INSERT 
WITH CHECK (
  user_is_admin_or_gestor(auth.uid(), workspace_id) 
  AND (created_by = auth.uid())
);

-- Update the update policy to allow admins/gestors to update any process in their workspace
DROP POLICY IF EXISTS "Users can update own process docs" ON public.process_documentation;

CREATE POLICY "Admins and gestors can update process docs" 
ON public.process_documentation 
FOR UPDATE 
USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

-- Update the delete policy similarly
DROP POLICY IF EXISTS "Users can delete own process docs" ON public.process_documentation;

CREATE POLICY "Admins and gestors can delete process docs" 
ON public.process_documentation 
FOR DELETE 
USING (user_is_admin_or_gestor(auth.uid(), workspace_id));