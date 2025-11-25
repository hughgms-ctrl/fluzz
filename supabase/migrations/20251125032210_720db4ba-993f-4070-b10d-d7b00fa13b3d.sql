-- Drop existing problematic policies
DROP POLICY IF EXISTS "Project owners can view members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON public.project_members;

-- Create security definer function to check project ownership
CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND user_id = _user_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Project owners can view members" 
ON public.project_members
FOR SELECT 
USING (public.is_project_owner(auth.uid(), project_id));

CREATE POLICY "Project owners can add members" 
ON public.project_members
FOR INSERT 
WITH CHECK (public.is_project_owner(auth.uid(), project_id));

CREATE POLICY "Project owners can remove members" 
ON public.project_members
FOR DELETE 
USING (public.is_project_owner(auth.uid(), project_id));