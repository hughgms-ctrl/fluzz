-- Create a junction table for many-to-many relationship between tasks and processes
CREATE TABLE IF NOT EXISTS public.task_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.process_documentation(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, process_id)
);

-- Add RLS policies for task_processes
ALTER TABLE public.task_processes ENABLE ROW LEVEL SECURITY;

-- Users can view task_processes if they can view the task
CREATE POLICY "Users can view task processes in own projects"
ON public.task_processes FOR SELECT
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view task processes in member projects"
ON public.task_processes FOR SELECT
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view task processes for standalone tasks"
ON public.task_processes FOR SELECT
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE project_id IS NULL AND assigned_to = auth.uid()
  )
);

-- Users can create task_processes if they can update the task
CREATE POLICY "Users can create task processes in own projects"
ON public.task_processes FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create task processes in member projects"
ON public.task_processes FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create task processes for standalone tasks"
ON public.task_processes FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE project_id IS NULL AND assigned_to = auth.uid()
  )
);

-- Users can delete task_processes if they can update the task
CREATE POLICY "Users can delete task processes in own projects"
ON public.task_processes FOR DELETE
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete task processes in member projects"
ON public.task_processes FOR DELETE
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_members.project_id = tasks.project_id 
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete task processes for standalone tasks"
ON public.task_processes FOR DELETE
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE project_id IS NULL AND assigned_to = auth.uid()
  )
);

-- Migrate existing process_id data to task_processes
INSERT INTO public.task_processes (task_id, process_id)
SELECT id, process_id 
FROM public.tasks 
WHERE process_id IS NOT NULL
ON CONFLICT (task_id, process_id) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_task_processes_task_id ON public.task_processes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_processes_process_id ON public.task_processes(process_id);

COMMENT ON TABLE public.task_processes IS 'Junction table for many-to-many relationship between tasks and processes';
COMMENT ON COLUMN public.task_processes.task_id IS 'Reference to the task';
COMMENT ON COLUMN public.task_processes.process_id IS 'Reference to the process documentation';