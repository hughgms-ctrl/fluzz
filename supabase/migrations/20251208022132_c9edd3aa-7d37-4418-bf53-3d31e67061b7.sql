-- Create project_templates table to store templates independently
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template_tasks table to store tasks for templates
CREATE TABLE public.template_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  setor TEXT,
  documentation TEXT,
  process_id UUID REFERENCES public.process_documentation(id),
  task_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template_subtasks table
CREATE TABLE public.template_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_task_id UUID NOT NULL REFERENCES public.template_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  task_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template_task_processes table for many-to-many relationship
CREATE TABLE public.template_task_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_task_id UUID NOT NULL REFERENCES public.template_tasks(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.process_documentation(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_task_processes ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_templates
CREATE POLICY "Users can view templates in their workspace"
  ON public.project_templates FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and gestors can create templates"
  ON public.project_templates FOR INSERT
  WITH CHECK (user_is_admin_or_gestor(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "Admins and gestors can update templates"
  ON public.project_templates FOR UPDATE
  USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins and gestors can delete templates"
  ON public.project_templates FOR DELETE
  USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

-- RLS policies for template_tasks
CREATE POLICY "Users can view template tasks"
  ON public.template_tasks FOR SELECT
  USING (template_id IN (SELECT id FROM project_templates WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Admins and gestors can manage template tasks"
  ON public.template_tasks FOR ALL
  USING (template_id IN (SELECT id FROM project_templates WHERE user_is_admin_or_gestor(auth.uid(), workspace_id)));

-- RLS policies for template_subtasks
CREATE POLICY "Users can view template subtasks"
  ON public.template_subtasks FOR SELECT
  USING (template_task_id IN (SELECT id FROM template_tasks WHERE template_id IN (SELECT id FROM project_templates WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))));

CREATE POLICY "Admins and gestors can manage template subtasks"
  ON public.template_subtasks FOR ALL
  USING (template_task_id IN (SELECT id FROM template_tasks WHERE template_id IN (SELECT id FROM project_templates WHERE user_is_admin_or_gestor(auth.uid(), workspace_id))));

-- RLS policies for template_task_processes
CREATE POLICY "Users can view template task processes"
  ON public.template_task_processes FOR SELECT
  USING (template_task_id IN (SELECT id FROM template_tasks WHERE template_id IN (SELECT id FROM project_templates WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))));

CREATE POLICY "Admins and gestors can manage template task processes"
  ON public.template_task_processes FOR ALL
  USING (template_task_id IN (SELECT id FROM template_tasks WHERE template_id IN (SELECT id FROM project_templates WHERE user_is_admin_or_gestor(auth.uid(), workspace_id))));