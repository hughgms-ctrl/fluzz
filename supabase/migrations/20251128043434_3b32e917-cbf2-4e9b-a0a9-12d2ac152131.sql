-- Create inventory tables
CREATE TABLE IF NOT EXISTS public.inventory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.inventory_events(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  quantity INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_events
CREATE POLICY "Users can view events in their workspace"
ON public.inventory_events FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins and gestors can create events"
ON public.inventory_events FOR INSERT
WITH CHECK (
  user_is_admin_or_gestor(auth.uid(), workspace_id) AND created_by = auth.uid()
);

CREATE POLICY "Admins and gestors can update events"
ON public.inventory_events FOR UPDATE
USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete events"
ON public.inventory_events FOR DELETE
USING (user_has_role(auth.uid(), workspace_id, 'admin'));

-- RLS Policies for inventory_items
CREATE POLICY "Users can view items in their workspace"
ON public.inventory_items FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins and gestors can create items"
ON public.inventory_items FOR INSERT
WITH CHECK (
  user_is_admin_or_gestor(auth.uid(), workspace_id) AND created_by = auth.uid()
);

CREATE POLICY "Admins and gestors can update items"
ON public.inventory_items FOR UPDATE
USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete items"
ON public.inventory_items FOR DELETE
USING (user_has_role(auth.uid(), workspace_id, 'admin'));

-- RLS Policies for inventory_movements
CREATE POLICY "Users can view movements in their workspace"
ON public.inventory_movements FOR SELECT
USING (item_id IN (
  SELECT id FROM inventory_items WHERE workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Admins and gestors can create movements"
ON public.inventory_movements FOR INSERT
WITH CHECK (
  item_id IN (
    SELECT id FROM inventory_items 
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
    )
  ) AND created_by = auth.uid()
);

-- Triggers for updated_at
CREATE TRIGGER update_inventory_events_updated_at
  BEFORE UPDATE ON public.inventory_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Fix profiles RLS to allow workspace members to see each other
DROP POLICY IF EXISTS "Workspace members can view other member profiles" ON public.profiles;

CREATE POLICY "Workspace members can view other member profiles"
ON public.profiles FOR SELECT
USING (
  id IN (
    SELECT wm.user_id 
    FROM workspace_members wm
    WHERE wm.workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  )
);