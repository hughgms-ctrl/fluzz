-- Criar tipo enum para roles de workspace
CREATE TYPE public.workspace_role AS ENUM ('admin', 'gestor', 'membro');

-- Tabela de Workspaces (Empresas)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela de Membros do Workspace
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role workspace_role DEFAULT 'membro' NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Adicionar workspace_id em todas as tabelas existentes
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.positions ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.process_documentation ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.company_info ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.company_news ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.routines ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_tasks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.briefings ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.debriefings ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX idx_positions_workspace ON public.positions(workspace_id);
CREATE INDEX idx_process_documentation_workspace ON public.process_documentation(workspace_id);
CREATE INDEX idx_company_info_workspace ON public.company_info(workspace_id);
CREATE INDEX idx_company_news_workspace ON public.company_news(workspace_id);
CREATE INDEX idx_routines_workspace ON public.routines(workspace_id);
CREATE INDEX idx_recurring_tasks_workspace ON public.recurring_tasks(workspace_id);
CREATE INDEX idx_briefings_workspace ON public.briefings(workspace_id);
CREATE INDEX idx_debriefings_workspace ON public.debriefings(workspace_id);

-- Função helper para verificar se usuário pertence ao workspace
CREATE OR REPLACE FUNCTION public.user_belongs_to_workspace(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
  )
$$;

-- Função helper para verificar role do usuário no workspace
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id UUID, _workspace_id UUID, _role workspace_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = _role
  )
$$;

-- Função helper para verificar se usuário é admin ou gestor
CREATE OR REPLACE FUNCTION public.user_is_admin_or_gestor(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role IN ('admin', 'gestor')
  )
$$;

-- Função para obter workspace_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_workspace_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Enable RLS em workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies para workspaces
CREATE POLICY "Users can view their workspaces"
ON public.workspaces FOR SELECT
USING (
  id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update their workspace"
ON public.workspaces FOR UPDATE
USING (public.user_has_role(auth.uid(), id, 'admin'));

CREATE POLICY "Admins of existing workspaces can create new workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- Enable RLS em workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies para workspace_members
CREATE POLICY "Users can view members of their workspace"
ON public.workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage workspace members"
ON public.workspace_members FOR ALL
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'));

-- Atualizar RLS policies das tabelas existentes para incluir workspace
-- Projects
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

CREATE POLICY "Users can create projects in their workspace"
ON public.projects FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace_id(auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Users can view projects in their workspace"
ON public.projects FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can update their projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Project owners can delete their projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- Positions
DROP POLICY IF EXISTS "Authenticated users can create positions" ON public.positions;
DROP POLICY IF EXISTS "Authenticated users can view positions" ON public.positions;
DROP POLICY IF EXISTS "Users can update their own positions" ON public.positions;
DROP POLICY IF EXISTS "Users can delete their own positions" ON public.positions;

CREATE POLICY "Users can create positions in their workspace"
ON public.positions FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace_id(auth.uid())
  AND auth.uid() = created_by
);

CREATE POLICY "Users can view positions in their workspace"
ON public.positions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and gestors can update positions"
ON public.positions FOR UPDATE
USING (public.user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete positions"
ON public.positions FOR DELETE
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'));

-- Process Documentation
DROP POLICY IF EXISTS "Anyone can view process documentation" ON public.process_documentation;
DROP POLICY IF EXISTS "Users can insert process documentation" ON public.process_documentation;
DROP POLICY IF EXISTS "Users can update own process documentation" ON public.process_documentation;
DROP POLICY IF EXISTS "Users can delete own process documentation" ON public.process_documentation;

CREATE POLICY "Users can create process docs in their workspace"
ON public.process_documentation FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace_id(auth.uid())
  AND auth.uid() = created_by
);

CREATE POLICY "Users can view process docs in their workspace"
ON public.process_documentation FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own process docs"
ON public.process_documentation FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own process docs"
ON public.process_documentation FOR DELETE
USING (auth.uid() = created_by);

-- Company Info
DROP POLICY IF EXISTS "Anyone can view company info" ON public.company_info;
DROP POLICY IF EXISTS "Authenticated users can insert company info" ON public.company_info;
DROP POLICY IF EXISTS "Authenticated users can update company info" ON public.company_info;

CREATE POLICY "Users can view company info in their workspace"
ON public.company_info FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage company info"
ON public.company_info FOR ALL
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'));

-- Company News
DROP POLICY IF EXISTS "Anyone can view news" ON public.company_news;
DROP POLICY IF EXISTS "Authenticated users can create news" ON public.company_news;
DROP POLICY IF EXISTS "Users can update their own news" ON public.company_news;
DROP POLICY IF EXISTS "Users can delete their own news" ON public.company_news;

CREATE POLICY "Users can view news in their workspace"
ON public.company_news FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and gestors can create news"
ON public.company_news FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace_id(auth.uid())
  AND public.user_is_admin_or_gestor(auth.uid(), workspace_id)
  AND auth.uid() = created_by
);

CREATE POLICY "Users can update their own news"
ON public.company_news FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own news"
ON public.company_news FOR DELETE
USING (auth.uid() = created_by);

-- Routines
DROP POLICY IF EXISTS "Authenticated users can create routines" ON public.routines;
DROP POLICY IF EXISTS "Authenticated users can view routines" ON public.routines;
DROP POLICY IF EXISTS "Users can update their own routines" ON public.routines;
DROP POLICY IF EXISTS "Users can delete their own routines" ON public.routines;

CREATE POLICY "Users can create routines in their workspace"
ON public.routines FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace_id(auth.uid())
  AND auth.uid() = created_by
);

CREATE POLICY "Users can view routines in their workspace"
ON public.routines FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and gestors can update routines"
ON public.routines FOR UPDATE
USING (public.user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete routines"
ON public.routines FOR DELETE
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'));

-- Recurring Tasks
DROP POLICY IF EXISTS "Authenticated users can create recurring tasks" ON public.recurring_tasks;
DROP POLICY IF EXISTS "Authenticated users can view recurring tasks" ON public.recurring_tasks;
DROP POLICY IF EXISTS "Users can update their own recurring tasks" ON public.recurring_tasks;
DROP POLICY IF EXISTS "Users can delete their own recurring tasks" ON public.recurring_tasks;

CREATE POLICY "Users can create recurring tasks in their workspace"
ON public.recurring_tasks FOR INSERT
WITH CHECK (
  workspace_id = public.get_user_workspace_id(auth.uid())
  AND auth.uid() = created_by
);

CREATE POLICY "Users can view recurring tasks in their workspace"
ON public.recurring_tasks FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and gestors can update recurring tasks"
ON public.recurring_tasks FOR UPDATE
USING (public.user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete recurring tasks"
ON public.recurring_tasks FOR DELETE
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'));

-- Briefings
DROP POLICY IF EXISTS "Users can create briefings in own projects" ON public.briefings;
DROP POLICY IF EXISTS "Users can create briefings in member projects" ON public.briefings;
DROP POLICY IF EXISTS "Users can view briefings in own projects" ON public.briefings;
DROP POLICY IF EXISTS "Users can view briefings in member projects" ON public.briefings;
DROP POLICY IF EXISTS "Users can update briefings in own projects" ON public.briefings;
DROP POLICY IF EXISTS "Users can update briefings in member projects" ON public.briefings;
DROP POLICY IF EXISTS "Users can delete briefings in own projects" ON public.briefings;

CREATE POLICY "Users can manage briefings in their workspace"
ON public.briefings FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Debriefings
DROP POLICY IF EXISTS "Users can create debriefings in own projects" ON public.debriefings;
DROP POLICY IF EXISTS "Users can create debriefings in member projects" ON public.debriefings;
DROP POLICY IF EXISTS "Users can view debriefings in own projects" ON public.debriefings;
DROP POLICY IF EXISTS "Users can view debriefings in member projects" ON public.debriefings;
DROP POLICY IF EXISTS "Users can update debriefings in own projects" ON public.debriefings;
DROP POLICY IF EXISTS "Users can update debriefings in member projects" ON public.debriefings;
DROP POLICY IF EXISTS "Users can delete debriefings in own projects" ON public.debriefings;

CREATE POLICY "Users can manage debriefings in their workspace"
ON public.debriefings FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at em workspaces
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();