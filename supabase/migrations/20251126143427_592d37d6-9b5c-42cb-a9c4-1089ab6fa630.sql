-- Add archived column to projects table
ALTER TABLE public.projects 
ADD COLUMN archived boolean DEFAULT false NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_projects_archived ON public.projects(archived);

-- Add index for archived and user_id combination (common query pattern)
CREATE INDEX idx_projects_user_archived ON public.projects(user_id, archived);