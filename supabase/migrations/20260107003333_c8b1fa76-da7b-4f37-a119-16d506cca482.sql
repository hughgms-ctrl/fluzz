-- Add color column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT NULL;

-- Add color column to project_templates table (to persist color when saving as template)
ALTER TABLE public.project_templates ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT NULL;

-- Create routine_task_subtasks table for subtasks on routine tasks
CREATE TABLE public.routine_task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_task_id UUID NOT NULL REFERENCES public.routine_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  subtask_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on routine_task_subtasks
ALTER TABLE public.routine_task_subtasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for routine_task_subtasks
-- Users can view subtasks if they can view the routine task (based on workspace membership)
CREATE POLICY "Users can view routine task subtasks via workspace"
ON public.routine_task_subtasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.routine_tasks rt
    JOIN public.routines r ON rt.routine_id = r.id
    JOIN public.workspace_members wm ON r.workspace_id = wm.workspace_id
    WHERE rt.id = routine_task_subtasks.routine_task_id
    AND wm.user_id = auth.uid()
  )
);

-- Users can insert subtasks if they're a workspace member
CREATE POLICY "Users can create routine task subtasks"
ON public.routine_task_subtasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.routine_tasks rt
    JOIN public.routines r ON rt.routine_id = r.id
    JOIN public.workspace_members wm ON r.workspace_id = wm.workspace_id
    WHERE rt.id = routine_task_subtasks.routine_task_id
    AND wm.user_id = auth.uid()
  )
);

-- Users can update subtasks if they're a workspace member
CREATE POLICY "Users can update routine task subtasks"
ON public.routine_task_subtasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.routine_tasks rt
    JOIN public.routines r ON rt.routine_id = r.id
    JOIN public.workspace_members wm ON r.workspace_id = wm.workspace_id
    WHERE rt.id = routine_task_subtasks.routine_task_id
    AND wm.user_id = auth.uid()
  )
);

-- Users can delete subtasks if they're a workspace member
CREATE POLICY "Users can delete routine task subtasks"
ON public.routine_task_subtasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.routine_tasks rt
    JOIN public.routines r ON rt.routine_id = r.id
    JOIN public.workspace_members wm ON r.workspace_id = wm.workspace_id
    WHERE rt.id = routine_task_subtasks.routine_task_id
    AND wm.user_id = auth.uid()
  )
);