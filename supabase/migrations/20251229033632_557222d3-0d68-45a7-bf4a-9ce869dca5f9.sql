-- Adicionar tipos de notificação "general" e "test" à constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['task_assigned'::text, 'task_due_soon'::text, 'task_overdue'::text, 'task_comment'::text, 'workspace_invite'::text, 'task_completed'::text, 'task_updated'::text, 'general'::text, 'test'::text, 'reminder'::text]));