-- Create admin_view_sessions table to track when platform admins are viewing workspaces
CREATE TABLE public.admin_view_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '2 hours'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_admin_view_sessions_admin ON public.admin_view_sessions(admin_user_id);
CREATE INDEX idx_admin_view_sessions_expires ON public.admin_view_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.admin_view_sessions ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage their own sessions
CREATE POLICY "Platform admins can manage their own view sessions"
ON public.admin_view_sessions
FOR ALL
USING (
    is_platform_admin(auth.uid()) AND admin_user_id = auth.uid()
)
WITH CHECK (
    is_platform_admin(auth.uid()) AND admin_user_id = auth.uid()
);

-- Function to check if user has active admin view session for a workspace
CREATE OR REPLACE FUNCTION public.has_admin_view_session(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_view_sessions
        WHERE admin_user_id = _user_id
          AND workspace_id = _workspace_id
          AND expires_at > now()
    )
$$;

-- Function to check if user can access workspace (either member OR has admin view session)
CREATE OR REPLACE FUNCTION public.can_access_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        user_belongs_to_workspace(_user_id, _workspace_id)
        OR has_admin_view_session(_user_id, _workspace_id)
    )
$$;

-- Clean up expired sessions function (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.admin_view_sessions
    WHERE expires_at < now();
END;
$$;