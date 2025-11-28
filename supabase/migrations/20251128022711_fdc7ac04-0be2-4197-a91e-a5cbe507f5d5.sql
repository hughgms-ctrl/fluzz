
-- Adicionar política RLS para permitir que membros do workspace vejam outros membros
CREATE POLICY "Workspace members can view other workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);
