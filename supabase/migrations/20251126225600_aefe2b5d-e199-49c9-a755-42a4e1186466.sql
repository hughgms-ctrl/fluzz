-- Remover policies problemáticas
DROP POLICY IF EXISTS "Users can view members of their workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins of existing workspaces can create new workspaces" ON public.workspaces;

-- Criar função segura para verificar se usuário pertence a um workspace
CREATE OR REPLACE FUNCTION public.user_workspace_ids(_user_id UUID)
RETURNS TABLE(workspace_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = _user_id
$$;

-- Criar função segura para verificar se usuário é admin de algum workspace
CREATE OR REPLACE FUNCTION public.user_is_any_admin(_user_id UUID)
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
      AND role = 'admin'
  )
$$;

-- Recriar policies para workspace_members usando as funções
CREATE POLICY "Users can view members of their workspace"
ON public.workspace_members FOR SELECT
USING (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

CREATE POLICY "Admins can insert workspace members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  public.user_has_role(auth.uid(), workspace_id, 'admin')
);

CREATE POLICY "Admins can update workspace members"
ON public.workspace_members FOR UPDATE
USING (
  public.user_has_role(auth.uid(), workspace_id, 'admin')
);

CREATE POLICY "Admins can delete workspace members"
ON public.workspace_members FOR DELETE
USING (
  public.user_has_role(auth.uid(), workspace_id, 'admin')
);

-- Recriar policy para criação de workspaces
CREATE POLICY "Admins can create new workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (
  public.user_is_any_admin(auth.uid())
);