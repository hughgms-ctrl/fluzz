-- Criar tabela para armazenar outras despesas e receitas do debriefing
CREATE TABLE public.debriefing_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debriefing_id UUID NOT NULL REFERENCES public.debriefings(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.debriefing_extras ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view extras in their workspace
CREATE POLICY "Users can view debriefing extras in their workspace"
ON public.debriefing_extras
FOR SELECT
USING (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Admins and gestors can manage extras
CREATE POLICY "Admins and gestors can manage debriefing extras"
ON public.debriefing_extras
FOR ALL
USING (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE user_is_admin_or_gestor(auth.uid(), workspace_id)
  )
)
WITH CHECK (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE user_is_admin_or_gestor(auth.uid(), workspace_id)
  )
);