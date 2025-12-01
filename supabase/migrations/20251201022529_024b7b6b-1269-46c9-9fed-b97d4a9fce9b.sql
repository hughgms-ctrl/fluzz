-- Drop incomplete policy if exists
DROP POLICY IF EXISTS "Workspace members can view position assignments" ON user_positions;

-- Create comprehensive policy for workspace members to view position assignments
CREATE POLICY "Workspace members can view position assignments"
ON user_positions
FOR SELECT
TO authenticated
USING (
  position_id IN (
    SELECT p.id 
    FROM positions p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Ensure admins and gestors can insert position assignments for their workspace
DROP POLICY IF EXISTS "Authenticated users can create position assignments" ON user_positions;

CREATE POLICY "Admins and gestors can create position assignments"
ON user_positions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = assigned_by
  AND position_id IN (
    SELECT p.id 
    FROM positions p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'gestor')
  )
);