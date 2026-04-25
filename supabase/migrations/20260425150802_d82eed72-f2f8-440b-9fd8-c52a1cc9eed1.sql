-- Tabela de configuração de IA por workspace (BYOK)
CREATE TABLE public.ai_workspace_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable' CHECK (provider IN ('lovable', 'openai', 'anthropic', 'gemini')),
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  api_key TEXT,
  use_own_key BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_workspace_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai config"
ON public.ai_workspace_config
FOR SELECT
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'::workspace_role));

CREATE POLICY "Admins can insert ai config"
ON public.ai_workspace_config
FOR INSERT
WITH CHECK (public.user_has_role(auth.uid(), workspace_id, 'admin'::workspace_role));

CREATE POLICY "Admins can update ai config"
ON public.ai_workspace_config
FOR UPDATE
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'::workspace_role));

CREATE POLICY "Admins can delete ai config"
ON public.ai_workspace_config
FOR DELETE
USING (public.user_has_role(auth.uid(), workspace_id, 'admin'::workspace_role));

CREATE TRIGGER update_ai_workspace_config_updated_at
BEFORE UPDATE ON public.ai_workspace_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();