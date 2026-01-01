-- Add workspace_id to tasks so standalone/routine tasks can be scoped to a workspace
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- FK (optional but helps integrity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_workspace_id_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill: project tasks inherit workspace_id from project
UPDATE public.tasks t
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE t.project_id = p.id
  AND p.workspace_id IS NOT NULL
  AND (t.workspace_id IS NULL OR t.workspace_id <> p.workspace_id);

-- Backfill: routine tasks inherit workspace_id from routine
UPDATE public.tasks t
SET workspace_id = r.workspace_id
FROM public.routines r
WHERE t.routine_id = r.id
  AND r.workspace_id IS NOT NULL
  AND t.workspace_id IS NULL;

-- Backfill: standalone tasks for users that belong to exactly 1 workspace
WITH single_ws AS (
  SELECT wm.user_id, (array_agg(wm.workspace_id))[1] AS workspace_id
  FROM public.workspace_members wm
  GROUP BY wm.user_id
  HAVING count(*) = 1
)
UPDATE public.tasks t
SET workspace_id = s.workspace_id
FROM single_ws s
WHERE t.project_id IS NULL
  AND t.workspace_id IS NULL
  AND t.assigned_to = s.user_id;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);

-- Keep workspace_id in sync for project/routine tasks and require it for standalone tasks
CREATE OR REPLACE FUNCTION public.set_task_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Project task: derive workspace_id from project
  IF NEW.project_id IS NOT NULL THEN
    SELECT p.workspace_id INTO v_workspace_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;

    NEW.workspace_id := v_workspace_id;
    RETURN NEW;
  END IF;

  -- Routine task: derive workspace_id from routine
  IF NEW.routine_id IS NOT NULL THEN
    SELECT r.workspace_id INTO v_workspace_id
    FROM public.routines r
    WHERE r.id = NEW.routine_id;

    NEW.workspace_id := v_workspace_id;
    RETURN NEW;
  END IF;

  -- Standalone task: must set workspace_id explicitly
  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required for standalone tasks';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_task_workspace_id ON public.tasks;
CREATE TRIGGER trg_set_task_workspace_id
BEFORE INSERT OR UPDATE OF project_id, routine_id, workspace_id
ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_workspace_id();
