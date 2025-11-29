-- Adicionar política para permitir que membros do workspace vejam todas as atribuições de cargos
CREATE POLICY "Workspace members can view position assignments"
ON public.user_positions
FOR SELECT
TO authenticated
USING (
  position_id IN (
    SELECT id 
    FROM positions 
    WHERE workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  )
);