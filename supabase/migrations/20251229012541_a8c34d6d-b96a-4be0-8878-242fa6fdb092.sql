-- Remove the unique constraint on user_id to allow multiple devices per user
-- Keep the composite unique on (user_id, endpoint) to prevent duplicates
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_unique;