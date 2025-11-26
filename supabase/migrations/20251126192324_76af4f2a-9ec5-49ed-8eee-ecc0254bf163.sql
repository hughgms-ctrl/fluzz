-- Create routines table (Level 2)
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  recurrence_type TEXT NOT NULL,
  recurrence_config JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create routine_tasks table (Level 3)
CREATE TABLE public.routine_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  process_id UUID REFERENCES public.process_documentation(id) ON DELETE SET NULL,
  task_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on routines
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- RLS policies for routines
CREATE POLICY "Authenticated users can view routines"
  ON public.routines FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create routines"
  ON public.routines FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own routines"
  ON public.routines FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own routines"
  ON public.routines FOR DELETE
  USING (auth.uid() = created_by);

-- Enable RLS on routine_tasks
ALTER TABLE public.routine_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for routine_tasks
CREATE POLICY "Authenticated users can view routine tasks"
  ON public.routine_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create routine tasks"
  ON public.routine_tasks FOR INSERT
  WITH CHECK (
    routine_id IN (
      SELECT id FROM public.routines WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own routine tasks"
  ON public.routine_tasks FOR UPDATE
  USING (
    routine_id IN (
      SELECT id FROM public.routines WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own routine tasks"
  ON public.routine_tasks FOR DELETE
  USING (
    routine_id IN (
      SELECT id FROM public.routines WHERE created_by = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_routines_position_id ON public.routines(position_id);
CREATE INDEX idx_routine_tasks_routine_id ON public.routine_tasks(routine_id);
CREATE INDEX idx_routine_tasks_project_id ON public.routine_tasks(project_id);
CREATE INDEX idx_routine_tasks_process_id ON public.routine_tasks(process_id);

-- Add routine_id to tasks table to track which routine generated the task
ALTER TABLE public.tasks ADD COLUMN routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_routine_id ON public.tasks(routine_id);

-- Migrate existing recurring_tasks to new structure
-- Each recurring_task becomes a routine with one task
INSERT INTO public.routines (id, position_id, name, description, recurrence_type, recurrence_config, created_by, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  position_id,
  title,
  description,
  recurrence_type,
  recurrence_config,
  created_by,
  created_at,
  updated_at
FROM public.recurring_tasks;

-- Insert corresponding routine_tasks
INSERT INTO public.routine_tasks (routine_id, title, description, priority, project_id, process_id, task_order)
SELECT 
  r.id,
  rt.title,
  rt.description,
  rt.priority,
  rt.project_id,
  rt.process_id,
  0
FROM public.recurring_tasks rt
JOIN public.routines r ON r.name = rt.title AND r.position_id = rt.position_id;

-- Add triggers for updated_at
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_routine_tasks_updated_at
  BEFORE UPDATE ON public.routine_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();