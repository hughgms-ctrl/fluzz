-- Function to look up a user by email for team invitations
CREATE OR REPLACE FUNCTION public.get_user_by_email(_email text)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id AS user_id, email
  FROM auth.users
  WHERE lower(email) = lower(_email);
$$;

-- Allow authenticated users (logged-in workspace admins) to call this helper
GRANT EXECUTE ON FUNCTION public.get_user_by_email(text) TO authenticated;