-- Add policy to allow users to read their own record in user_account_management
CREATE POLICY "Users can read their own account management record" 
ON public.user_account_management 
FOR SELECT 
USING (auth.uid() = user_id);