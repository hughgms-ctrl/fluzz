-- Add new permission column for viewing only projects where user is a member
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS projects_only_assigned boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.user_permissions.projects_only_assigned IS 'If true, user can only see projects where they are assigned as a member (project_members table)';