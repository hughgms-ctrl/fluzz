-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Admins and gestors can create process docs" ON public.process_documentation;

-- Create new INSERT policy that also considers user_permissions
CREATE POLICY "Users with permission can create process docs" 
ON public.process_documentation 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() 
  AND (
    user_is_admin_or_gestor(auth.uid(), workspace_id) 
    OR EXISTS (
      SELECT 1 FROM user_permissions up 
      WHERE up.user_id = auth.uid() 
      AND up.workspace_id = process_documentation.workspace_id 
      AND up.can_edit_processes = true
    )
  )
);

-- Also update UPDATE policy to include permission check
DROP POLICY IF EXISTS "Admins and gestors can update process docs" ON public.process_documentation;

CREATE POLICY "Users with permission can update process docs" 
ON public.process_documentation 
FOR UPDATE 
USING (
  user_is_admin_or_gestor(auth.uid(), workspace_id) 
  OR EXISTS (
    SELECT 1 FROM user_permissions up 
    WHERE up.user_id = auth.uid() 
    AND up.workspace_id = process_documentation.workspace_id 
    AND up.can_edit_processes = true
  )
);

-- Also update DELETE policy to include permission check
DROP POLICY IF EXISTS "Admins and gestors can delete process docs" ON public.process_documentation;

CREATE POLICY "Users with permission can delete process docs" 
ON public.process_documentation 
FOR DELETE 
USING (
  user_is_admin_or_gestor(auth.uid(), workspace_id) 
  OR EXISTS (
    SELECT 1 FROM user_permissions up 
    WHERE up.user_id = auth.uid() 
    AND up.workspace_id = process_documentation.workspace_id 
    AND up.can_edit_processes = true
  )
);