-- Allow admins and gestors to delete position assignments in their workspace
DROP POLICY IF EXISTS "Users can delete position assignments they created" ON user_positions;

CREATE POLICY "Admins and gestors can delete position assignments"
ON user_positions
FOR DELETE
TO authenticated
USING (
  position_id IN (
    SELECT p.id 
    FROM positions p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'gestor')
  )
);