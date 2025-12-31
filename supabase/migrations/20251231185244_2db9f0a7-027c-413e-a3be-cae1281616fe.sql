-- Create RLS policy to allow platform admins to view workspaces they have active sessions for
CREATE POLICY "Platform admins can view workspaces with active sessions"
ON public.workspaces
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_view_sessions avs
    WHERE avs.workspace_id = id
    AND avs.admin_user_id = auth.uid()
    AND avs.expires_at > NOW()
  )
);