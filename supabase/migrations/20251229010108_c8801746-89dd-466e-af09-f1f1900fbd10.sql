-- Add unique constraint to prevent multiple subscriptions per user
-- First, delete older duplicate subscriptions keeping only the most recent one per user
DELETE FROM push_subscriptions a
USING push_subscriptions b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Add unique constraint on user_id to prevent future duplicates
ALTER TABLE push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_id_unique UNIQUE (user_id);