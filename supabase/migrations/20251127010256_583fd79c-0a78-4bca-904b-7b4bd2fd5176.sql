-- Create permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  can_view_projects boolean NOT NULL DEFAULT true,
  can_view_tasks boolean NOT NULL DEFAULT true,
  can_view_positions boolean NOT NULL DEFAULT true,
  can_view_analytics boolean NOT NULL DEFAULT true,
  can_view_briefings boolean NOT NULL DEFAULT true,
  can_view_culture boolean NOT NULL DEFAULT true,
  can_view_vision boolean NOT NULL DEFAULT true,
  can_view_processes boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage all permissions in their workspace
CREATE POLICY "Admins can manage permissions"
ON public.user_permissions
FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid, _workspace_id uuid)
RETURNS TABLE (
  can_view_projects boolean,
  can_view_tasks boolean,
  can_view_positions boolean,
  can_view_analytics boolean,
  can_view_briefings boolean,
  can_view_culture boolean,
  can_view_vision boolean,
  can_view_processes boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.can_view_projects,
    up.can_view_tasks,
    up.can_view_positions,
    up.can_view_analytics,
    up.can_view_briefings,
    up.can_view_culture,
    up.can_view_vision,
    up.can_view_processes
  FROM user_permissions up
  WHERE up.user_id = _user_id AND up.workspace_id = _workspace_id;
  
  -- If no permissions record exists, return default permissions
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, true, true, true, true, true, true, true;
  END IF;
END;
$$;

-- Trigger to create default permissions when a user joins a workspace
CREATE OR REPLACE FUNCTION public.create_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_permissions (user_id, workspace_id)
  VALUES (NEW.user_id, NEW.workspace_id)
  ON CONFLICT (user_id, workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_permissions_on_workspace_join
AFTER INSERT ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.create_default_permissions();