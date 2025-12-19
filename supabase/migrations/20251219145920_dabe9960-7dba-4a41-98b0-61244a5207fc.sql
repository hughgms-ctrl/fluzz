-- Add new columns to debriefing_vendedores table
ALTER TABLE public.debriefing_vendedores 
ADD COLUMN IF NOT EXISTS vendas_outras_estrategias integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ingressos_gratuitos integer DEFAULT 0;