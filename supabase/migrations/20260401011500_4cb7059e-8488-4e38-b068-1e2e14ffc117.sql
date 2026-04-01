
-- Table: external_participants
CREATE TABLE public.external_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view external participants in their workspace"
  ON public.external_participants FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins and gestors can create external participants"
  ON public.external_participants FOR INSERT
  WITH CHECK (user_is_admin_or_gestor(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "Admins and gestors can update external participants"
  ON public.external_participants FOR UPDATE
  USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins and gestors can delete external participants"
  ON public.external_participants FOR DELETE
  USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

-- Table: task_external_assignees
CREATE TABLE public.task_external_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.external_participants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, participant_id)
);

ALTER TABLE public.task_external_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view external assignees in workspace tasks"
  ON public.task_external_assignees FOR SELECT
  USING (task_id IN (
    SELECT t.id FROM tasks t
    WHERE t.project_id IN (
      SELECT p.id FROM projects p
      WHERE p.workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    ) OR (t.project_id IS NULL AND t.assigned_to = auth.uid())
  ));

CREATE POLICY "Authenticated users can create external assignees"
  ON public.task_external_assignees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins gestors can delete external assignees"
  ON public.task_external_assignees FOR DELETE
  USING (task_id IN (
    SELECT t.id FROM tasks t
    WHERE t.project_id IN (
      SELECT p.id FROM projects p
      WHERE user_is_admin_or_gestor(auth.uid(), p.workspace_id)
    )
  ));

-- Table: whatsapp_config
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  instance_subdomain text NOT NULL DEFAULT '',
  instance_token text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp config"
  ON public.whatsapp_config FOR ALL
  USING (user_has_role(auth.uid(), workspace_id, 'admin'))
  WITH CHECK (user_has_role(auth.uid(), workspace_id, 'admin'));

CREATE POLICY "Workspace members can view whatsapp config"
  ON public.whatsapp_config FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Table: whatsapp_notification_logs
CREATE TABLE public.whatsapp_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.external_participants(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  message_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and gestors can view notification logs"
  ON public.whatsapp_notification_logs FOR SELECT
  USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Service role can insert notification logs"
  ON public.whatsapp_notification_logs FOR INSERT
  WITH CHECK (true);
