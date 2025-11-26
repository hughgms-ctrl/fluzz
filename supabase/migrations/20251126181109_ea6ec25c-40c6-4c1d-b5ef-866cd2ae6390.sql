-- Make project_id nullable to allow standalone tasks
ALTER TABLE public.tasks ALTER COLUMN project_id DROP NOT NULL;

-- Update RLS policies to allow standalone tasks (tasks without project)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create tasks in own projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in member projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in own projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in member projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in own projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in member projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in own projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in member projects" ON public.tasks;

-- New SELECT policies
CREATE POLICY "Users can view tasks in own projects" 
ON public.tasks FOR SELECT 
USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view tasks in member projects" 
ON public.tasks FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = tasks.project_id 
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own standalone tasks" 
ON public.tasks FOR SELECT 
USING (
  project_id IS NULL AND assigned_to = auth.uid()
);

-- New INSERT policies
CREATE POLICY "Users can create tasks in own projects" 
ON public.tasks FOR INSERT 
WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create tasks in member projects" 
ON public.tasks FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = tasks.project_id 
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create standalone tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (
  project_id IS NULL AND assigned_to = auth.uid()
);

-- New UPDATE policies
CREATE POLICY "Users can update tasks in own projects" 
ON public.tasks FOR UPDATE 
USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update tasks in member projects" 
ON public.tasks FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = tasks.project_id 
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own standalone tasks" 
ON public.tasks FOR UPDATE 
USING (
  project_id IS NULL AND assigned_to = auth.uid()
);

-- New DELETE policies
CREATE POLICY "Users can delete tasks in own projects" 
ON public.tasks FOR DELETE 
USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete tasks in member projects" 
ON public.tasks FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = tasks.project_id 
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own standalone tasks" 
ON public.tasks FOR DELETE 
USING (
  project_id IS NULL AND assigned_to = auth.uid()
);