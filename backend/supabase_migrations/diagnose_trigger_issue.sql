-- Comprehensive diagnosis of the trigger issue
-- Copy this entire script and run it in Supabase SQL Editor

-- 1. Check if user_stats table exists and in which schema
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'user_stats';

-- 2. Check if the trigger function exists
SELECT
    routine_schema,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_name = 'initialize_user_stats';

-- 3. Check if the trigger exists on profiles table
SELECT
    trigger_schema,
    trigger_name,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 4. Check RLS policies on user_stats
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'user_stats';

-- 5. Check table permissions
SELECT
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'user_stats';

-- 6. Most importantly - check if the function can see the table
-- This will tell us if there's a schema search path issue
SELECT current_setting('search_path');
