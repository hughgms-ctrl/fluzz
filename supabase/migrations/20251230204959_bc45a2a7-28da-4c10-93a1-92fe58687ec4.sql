-- =====================================================
-- PAINEL DE GESTÃO: ESTRUTURA DE BANCO DE DADOS
-- =====================================================

-- Enum para roles de admin
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'employee');

-- Enum para status de usuário
CREATE TYPE public.user_account_status AS ENUM ('active', 'blocked', 'deleted');

-- Enum para status de assinatura
CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'canceled', 'past_due', 'exempt');

-- =====================================================
-- TABELA: admin_users (Usuários do painel admin)
-- =====================================================
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role admin_role NOT NULL DEFAULT 'employee',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
  )
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- RLS Policies for admin_users
CREATE POLICY "Only admins can view admin_users"
ON public.admin_users FOR SELECT
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only super_admin can insert admin_users"
ON public.admin_users FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can update admin_users"
ON public.admin_users FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can delete admin_users"
ON public.admin_users FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- TABELA: user_account_management (Gestão de contas)
-- =====================================================
CREATE TABLE public.user_account_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status user_account_status NOT NULL DEFAULT 'active',
  blocked_at TIMESTAMPTZ,
  blocked_by UUID,
  blocked_reason TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  can_access_subscriptions BOOLEAN NOT NULL DEFAULT false,
  subscription_panel_enabled_at TIMESTAMPTZ,
  subscription_panel_enabled_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_account_management ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_account_management
CREATE POLICY "Only admins can view user_account_management"
ON public.user_account_management FOR SELECT
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can insert user_account_management"
ON public.user_account_management FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can update user_account_management"
ON public.user_account_management FOR UPDATE
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can delete user_account_management"
ON public.user_account_management FOR DELETE
USING (public.is_platform_admin(auth.uid()));

-- =====================================================
-- TABELA: subscription_plans (Planos de assinatura)
-- =====================================================
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_per_workspace NUMERIC NOT NULL DEFAULT 0,
  price_per_user NUMERIC NOT NULL DEFAULT 0,
  free_users_limit INTEGER NOT NULL DEFAULT 3,
  is_workspace_owner_free BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can insert plans"
ON public.subscription_plans FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can update plans"
ON public.subscription_plans FOR UPDATE
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can delete plans"
ON public.subscription_plans FOR DELETE
USING (public.is_platform_admin(auth.uid()));

-- =====================================================
-- TABELA: user_subscriptions (Assinaturas dos usuários)
-- =====================================================
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'trial',
  is_exempt BOOLEAN NOT NULL DEFAULT false,
  exempt_reason TEXT,
  exempt_by UUID,
  discount_percentage NUMERIC DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_reason TEXT,
  discount_by UUID,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  payment_provider TEXT,
  payment_provider_customer_id TEXT,
  payment_provider_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.user_subscriptions FOR SELECT
USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can insert subscriptions"
ON public.user_subscriptions FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can update subscriptions"
ON public.user_subscriptions FOR UPDATE
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can delete subscriptions"
ON public.user_subscriptions FOR DELETE
USING (public.is_platform_admin(auth.uid()));

-- =====================================================
-- TABELA: payment_settings (Configurações de pagamento)
-- =====================================================
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  api_key_configured BOOLEAN NOT NULL DEFAULT false,
  webhook_secret_configured BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_settings
CREATE POLICY "Only admins can view payment_settings"
ON public.payment_settings FOR SELECT
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only super_admin can insert payment_settings"
ON public.payment_settings FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can update payment_settings"
ON public.payment_settings FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can delete payment_settings"
ON public.payment_settings FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- TABELA: blocked_emails (Emails bloqueados)
-- =====================================================
CREATE TABLE public.blocked_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  blocked_by UUID,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage blocked_emails"
ON public.blocked_emails FOR ALL
USING (public.is_platform_admin(auth.uid()));

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_account_management_updated_at
  BEFORE UPDATE ON public.user_account_management
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNÇÃO: Verificar se usuário está bloqueado
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_account_management
    WHERE user_id = _user_id AND status = 'blocked'
  )
$$;

-- =====================================================
-- FUNÇÃO: Verificar se email está bloqueado
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_email_blocked(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_emails
    WHERE lower(email) = lower(_email)
  )
$$;

-- =====================================================
-- FUNÇÃO: Obter estatísticas de usuário para admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_admin_stats(_user_id UUID)
RETURNS TABLE (
  workspaces_owned BIGINT,
  workspaces_member BIGINT,
  total_users_in_workspaces BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM workspaces WHERE created_by = _user_id) as workspaces_owned,
    (SELECT COUNT(*) FROM workspace_members WHERE user_id = _user_id) as workspaces_member,
    (SELECT COUNT(DISTINCT wm2.user_id) 
     FROM workspace_members wm1
     JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
     WHERE wm1.user_id = _user_id) as total_users_in_workspaces;
END;
$$;

-- Inserir plano padrão inicial
INSERT INTO public.subscription_plans (name, description, price_per_workspace, price_per_user, free_users_limit, is_workspace_owner_free, is_active, features)
VALUES ('Plano Básico', 'Plano inicial da plataforma', 0, 0, 3, true, true, '["Acesso completo", "Até 3 usuários grátis"]'::jsonb);