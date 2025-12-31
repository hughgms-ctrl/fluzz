-- Drop the existing policy
DROP POLICY IF EXISTS "Platform admins can view workspaces with active sessions" ON public.workspaces;

-- Create a more secure policy with explicit platform admin check
CREATE POLICY "Platform admins can view workspaces with active sessions"
ON public.workspaces
FOR SELECT
USING (
  -- Must be a platform admin
  is_platform_admin(auth.uid())
  AND
  -- Must have an active session for this workspace
  EXISTS (
    SELECT 1 FROM admin_view_sessions avs
    WHERE avs.workspace_id = id
    AND avs.admin_user_id = auth.uid()
    AND avs.expires_at > NOW()
  )
);