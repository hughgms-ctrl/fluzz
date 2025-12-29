-- Tabela para rastrear instalações do PWA e controlar lembretes
CREATE TABLE public.pwa_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  installed_at TIMESTAMP WITH TIME ZONE,
  device_info TEXT,
  last_install_reminder_at TIMESTAMP WITH TIME ZONE,
  last_profile_reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pwa_installations_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.pwa_installations ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own installation status
CREATE POLICY "Users can view their own pwa installation" 
ON public.pwa_installations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pwa installation" 
ON public.pwa_installations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pwa installation" 
ON public.pwa_installations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Service role can access all for scheduled jobs
CREATE POLICY "Service role can access all pwa installations" 
ON public.pwa_installations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_pwa_installations_user_id ON public.pwa_installations(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_pwa_installations_updated_at
BEFORE UPDATE ON public.pwa_installations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();