-- Criar tabela para múltiplos responsáveis por tarefa
CREATE TABLE public.task_assignees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    UNIQUE (task_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Policies for task_assignees
-- Users can view assignees for tasks they have access to
CREATE POLICY "Users can view task assignees in workspace projects"
ON public.task_assignees
FOR SELECT
USING (
    task_id IN (
        SELECT t.id FROM tasks t
        WHERE (
            t.project_id IN (
                SELECT p.id FROM projects p
                WHERE p.workspace_id IN (
                    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
                )
            )
        ) OR (t.project_id IS NULL AND t.assigned_to = auth.uid())
    )
);

-- Authenticated users can create task assignees
CREATE POLICY "Authenticated users can create task assignees"
ON public.task_assignees
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can delete task assignees they can access
CREATE POLICY "Users can delete task assignees in accessible tasks"
ON public.task_assignees
FOR DELETE
USING (
    task_id IN (
        SELECT t.id FROM tasks t
        WHERE (
            t.project_id IN (
                SELECT p.id FROM projects p
                WHERE p.workspace_id IN (
                    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
                )
            )
        ) OR (t.project_id IS NULL AND t.assigned_to = auth.uid())
        OR t.assigned_to = auth.uid()
    )
);

-- Migrate existing assigned_to data to task_assignees
INSERT INTO public.task_assignees (task_id, user_id, created_by)
SELECT id, assigned_to, assigned_to
FROM public.tasks
WHERE assigned_to IS NOT NULL;

COMMENT ON TABLE public.task_assignees IS 'Stores multiple assignees per task';