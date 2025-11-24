-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can view tasks in projects they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in projects they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in projects they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in projects they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can view subtasks of their tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can create subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks" ON public.subtasks;

-- Create new policies without recursion

-- Projects policies
CREATE POLICY "Users can view own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view projects they are members of"
ON public.projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
);

-- Project members policies
CREATE POLICY "Project owners can view members"
ON public.project_members FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can view other members"
ON public.project_members FOR SELECT
USING (
  user_id = auth.uid()
);

-- Tasks policies
CREATE POLICY "Users can view tasks in own projects"
ON public.tasks FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view tasks in member projects"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tasks in own projects"
ON public.tasks FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tasks in member projects"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks in own projects"
ON public.tasks FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks in member projects"
ON public.tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tasks in own projects"
ON public.tasks FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tasks in member projects"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- Subtasks policies
CREATE POLICY "Users can view subtasks in own projects"
ON public.subtasks FOR SELECT
USING (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE tasks.project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view subtasks in member projects"
ON public.subtasks FOR SELECT
USING (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create subtasks in own projects"
ON public.subtasks FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE tasks.project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create subtasks in member projects"
ON public.subtasks FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update subtasks in own projects"
ON public.subtasks FOR UPDATE
USING (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE tasks.project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update subtasks in member projects"
ON public.subtasks FOR UPDATE
USING (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete subtasks in own projects"
ON public.subtasks FOR DELETE
USING (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE tasks.project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete subtasks in member projects"
ON public.subtasks FOR DELETE
USING (
  task_id IN (
    SELECT tasks.id FROM public.tasks
    WHERE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  )
);