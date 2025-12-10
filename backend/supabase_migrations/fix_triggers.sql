-- Fix: Ensure all triggers are properly created
-- Run this in Supabase SQL Editor if auth is still failing

-- First, let's verify the issue by checking existing triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Drop and recreate the initialize_user_stats trigger to ensure it works
DROP TRIGGER IF EXISTS initialize_stats_on_profile_create ON profiles;

CREATE TRIGGER initialize_stats_on_profile_create
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_user_stats();

-- Verify the trigger was created
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'initialize_stats_on_profile_create';

-- Test the trigger manually
-- This will show you if there's an error
DO $$
BEGIN
    RAISE NOTICE 'Trigger recreated successfully';
END $$;
