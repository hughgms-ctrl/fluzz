-- Create template_task_assignees table to store assignees for template tasks
CREATE TABLE public.template_task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_task_id UUID NOT NULL REFERENCES public.template_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_template_task_assignees_template_task_id ON public.template_task_assignees(template_task_id);

-- Enable RLS
ALTER TABLE public.template_task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow access to workspace members
CREATE POLICY "Users can view template task assignees in their workspace"
ON public.template_task_assignees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.template_tasks tt
    JOIN public.project_templates pt ON tt.template_id = pt.id
    JOIN public.workspace_members wm ON wm.workspace_id = pt.workspace_id
    WHERE tt.id = template_task_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins and gestors can insert template task assignees"
ON public.template_task_assignees FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.template_tasks tt
    JOIN public.project_templates pt ON tt.template_id = pt.id
    JOIN public.workspace_members wm ON wm.workspace_id = pt.workspace_id
    WHERE tt.id = template_task_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'gestor')
  )
);

CREATE POLICY "Admins and gestors can delete template task assignees"
ON public.template_task_assignees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.template_tasks tt
    JOIN public.project_templates pt ON tt.template_id = pt.id
    JOIN public.workspace_members wm ON wm.workspace_id = pt.workspace_id
    WHERE tt.id = template_task_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'gestor')
  )
);