-- Add subtask_order column for manual reordering
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS subtask_order INTEGER DEFAULT 0;

-- Update existing subtasks to have sequential order based on creation date
WITH ordered_subtasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY created_at) as rn
  FROM public.subtasks
)
UPDATE public.subtasks s
SET subtask_order = os.rn
FROM ordered_subtasks os
WHERE s.id = os.id;