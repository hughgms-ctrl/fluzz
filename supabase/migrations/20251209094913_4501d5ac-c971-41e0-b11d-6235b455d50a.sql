-- Drop the complex policy
DROP POLICY IF EXISTS "Admins and gestors can create any task" ON public.tasks;

-- Create a simpler policy for admins/gestores
-- Any admin or gestor can create tasks for any user that shares a workspace with them
CREATE POLICY "Admins and gestors can create any task" 
ON public.tasks 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Check 1: User is admin or gestor in some workspace
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'gestor')
  )
  AND
  -- Check 2: The assigned_to user is in a workspace where the creator is also a member
  (
    assigned_to IS NULL 
    OR 
    EXISTS (
      SELECT 1
      FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = assigned_to
    )
  )
);