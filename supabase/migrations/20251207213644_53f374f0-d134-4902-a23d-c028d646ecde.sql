-- Adiciona política para permitir que todos os membros do workspace vejam os vendedores do debriefing
CREATE POLICY "Workspace members can view debriefing vendedores"
ON public.debriefing_vendedores
FOR SELECT
USING (
  debriefing_id IN (
    SELECT d.id 
    FROM debriefings d
    JOIN projects p ON d.project_id = p.id
    WHERE p.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  )
);