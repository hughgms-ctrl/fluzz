-- Add edit permission columns to user_permissions table
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS can_edit_projects boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_tasks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_positions boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_analytics boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_briefings boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_culture boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_vision boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_processes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_inventory boolean DEFAULT false;