-- Create briefings table
CREATE TABLE public.briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  investimento_trafego DECIMAL(12, 2) NOT NULL,
  participantes_pagantes INTEGER NOT NULL,
  local TEXT NOT NULL,
  precos JSONB NOT NULL, -- {normal, casal, mentorados, players, convidados}
  currency TEXT NOT NULL DEFAULT 'BRL', -- BRL or USD
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create debriefings table
CREATE TABLE public.debriefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  investimento_trafego DECIMAL(12, 2) NOT NULL,
  leads INTEGER NOT NULL,
  vendas_ingressos INTEGER NOT NULL,
  retorno_vendas_ingressos DECIMAL(12, 2) NOT NULL,
  mentorias_vendidas INTEGER NOT NULL,
  valor_vendas_mentorias DECIMAL(12, 2) NOT NULL,
  participantes_outras_estrategias INTEGER NOT NULL,
  valor_outras_estrategias DECIMAL(12, 2) NOT NULL,
  total_participantes INTEGER NOT NULL,
  observacoes TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create debriefing_vendedores table
CREATE TABLE public.debriefing_vendedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debriefing_id UUID NOT NULL REFERENCES public.debriefings(id) ON DELETE CASCADE,
  vendedor_nome TEXT NOT NULL,
  leads_recebidos INTEGER NOT NULL,
  vendas_realizadas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_vendedores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for briefings
CREATE POLICY "Users can view briefings in own projects"
ON public.briefings FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view briefings in member projects"
ON public.briefings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = briefings.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create briefings in own projects"
ON public.briefings FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create briefings in member projects"
ON public.briefings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = briefings.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update briefings in own projects"
ON public.briefings FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update briefings in member projects"
ON public.briefings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = briefings.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete briefings in own projects"
ON public.briefings FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

-- RLS Policies for debriefings
CREATE POLICY "Users can view debriefings in own projects"
ON public.debriefings FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view debriefings in member projects"
ON public.debriefings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = debriefings.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create debriefings in own projects"
ON public.debriefings FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create debriefings in member projects"
ON public.debriefings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = debriefings.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update debriefings in own projects"
ON public.debriefings FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update debriefings in member projects"
ON public.debriefings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = debriefings.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete debriefings in own projects"
ON public.debriefings FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

-- RLS Policies for debriefing_vendedores
CREATE POLICY "Users can view vendedores in own projects"
ON public.debriefing_vendedores FOR SELECT
TO authenticated
USING (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view vendedores in member projects"
ON public.debriefing_vendedores FOR SELECT
TO authenticated
USING (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = debriefings.project_id
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create vendedores in own projects"
ON public.debriefing_vendedores FOR INSERT
TO authenticated
WITH CHECK (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create vendedores in member projects"
ON public.debriefing_vendedores FOR INSERT
TO authenticated
WITH CHECK (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = debriefings.project_id
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update vendedores in own projects"
ON public.debriefing_vendedores FOR UPDATE
TO authenticated
USING (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update vendedores in member projects"
ON public.debriefing_vendedores FOR UPDATE
TO authenticated
USING (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = debriefings.project_id
      AND project_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete vendedores in own projects"
ON public.debriefing_vendedores FOR DELETE
TO authenticated
USING (
  debriefing_id IN (
    SELECT id FROM public.debriefings
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_briefings_updated_at
BEFORE UPDATE ON public.briefings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_debriefings_updated_at
BEFORE UPDATE ON public.debriefings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();