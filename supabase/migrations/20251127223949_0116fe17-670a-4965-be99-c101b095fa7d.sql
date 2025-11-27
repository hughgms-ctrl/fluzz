-- Simplificar política de leitura em workspace_members para evitar recursão infinita
DROP POLICY IF EXISTS "Users can view members in their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view their workspace colleagues" ON public.workspace_members;

-- Usuário só enxerga seus próprios memberships (suficiente para detectar a quais workspaces ele pertence)
CREATE POLICY "Users can view own workspace memberships"
ON public.workspace_members
FOR SELECT
USING (auth.uid() = user_id);