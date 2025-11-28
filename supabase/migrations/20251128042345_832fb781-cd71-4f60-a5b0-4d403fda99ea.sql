-- Restrict creation and management of sensitive workspace resources to admins and gestors

-- 1) Projects: only admins/gestors can create projects in a workspace
DROP POLICY IF EXISTS "Users can create projects in their workspace" ON public.projects;

CREATE POLICY "Admins and gestors can create projects"
ON public.projects
FOR INSERT
WITH CHECK (
  workspace_id = get_user_workspace_id(auth.uid())
  AND auth.uid() = user_id
  AND user_is_admin_or_gestor(auth.uid(), workspace_id)
);

-- 2) Positions (cargos): only admins/gestors can create
DROP POLICY IF EXISTS "Users can create positions in their workspace" ON public.positions;

CREATE POLICY "Admins and gestors can create positions"
ON public.positions
FOR INSERT
WITH CHECK (
  user_is_admin_or_gestor(auth.uid(), workspace_id)
  AND created_by = auth.uid()
);

-- 3) Routines: only admins/gestors can create
DROP POLICY IF EXISTS "Users can create routines in their workspace" ON public.routines;

CREATE POLICY "Admins and gestors can create routines"
ON public.routines
FOR INSERT
WITH CHECK (
  user_is_admin_or_gestor(auth.uid(), workspace_id)
  AND created_by = auth.uid()
);

-- 4) Recurring tasks (linked to routines/positions): only admins/gestors can create
DROP POLICY IF EXISTS "Users can create recurring tasks in their workspace" ON public.recurring_tasks;

CREATE POLICY "Admins and gestors can create recurring tasks"
ON public.recurring_tasks
FOR INSERT
WITH CHECK (
  user_is_admin_or_gestor(auth.uid(), workspace_id)
  AND created_by = auth.uid()
);

-- 5) Briefings: only admins/gestors can create/update/delete
DROP POLICY IF EXISTS "Users can manage briefings in their workspace" ON public.briefings;

CREATE POLICY "Admins and gestors can manage briefings"
ON public.briefings
FOR ALL
USING (user_is_admin_or_gestor(auth.uid(), workspace_id))
WITH CHECK (user_is_admin_or_gestor(auth.uid(), workspace_id));

-- 6) Debriefings: only admins/gestors can create/update/delete
DROP POLICY IF EXISTS "Users can manage debriefings in their workspace" ON public.debriefings;

CREATE POLICY "Admins and gestors can manage debriefings"
ON public.debriefings
FOR ALL
USING (user_is_admin_or_gestor(auth.uid(), workspace_id))
WITH CHECK (user_is_admin_or_gestor(auth.uid(), workspace_id));

-- 7) Culture/Vision (company_info): allow admins and gestors to manage
DROP POLICY IF EXISTS "Admins can manage company info" ON public.company_info;

CREATE POLICY "Admins and gestors can manage company info"
ON public.company_info
FOR ALL
USING (user_is_admin_or_gestor(auth.uid(), workspace_id))
WITH CHECK (user_is_admin_or_gestor(auth.uid(), workspace_id));

-- 8) Task processes: allow any user who can see a task to see its linked processes
DROP POLICY IF EXISTS "Users can view task processes for visible tasks" ON public.task_processes;

CREATE POLICY "Workspace members view task processes"
ON public.task_processes
FOR SELECT
USING (
  task_id IN (
    SELECT id
    FROM public.tasks
    WHERE
      (
        project_id IN (
          SELECT p.id
          FROM public.projects p
          WHERE p.workspace_id IN (
            SELECT wm.workspace_id
            FROM public.workspace_members wm
            WHERE wm.user_id = auth.uid()
          )
        )
        OR (project_id IS NULL AND assigned_to = auth.uid())
      )
  )
);

-- 9) Subtasks: allow users to fully manage subtasks for tasks assigned to them
DROP POLICY IF EXISTS "Users can manage subtasks for assigned tasks" ON public.subtasks;

CREATE POLICY "Users manage own assigned subtasks"
ON public.subtasks
FOR ALL
USING (
  task_id IN (
    SELECT id
    FROM public.tasks
    WHERE assigned_to = auth.uid()
  )
)
WITH CHECK (
  task_id IN (
    SELECT id
    FROM public.tasks
    WHERE assigned_to = auth.uid()
  )
);
