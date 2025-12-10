-- HOTFIX: Fix auth trigger schema issues
-- This fixes the "user_stats does not exist" error
-- Run this entire script in Supabase SQL Editor

-- ============================================================================
-- 1. Fix handle_new_user() function with explicit schema
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    -- Initialize user_stats immediately in the same function
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Recreate the trigger
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. Remove the redundant initialize_user_stats trigger (if it exists)
--    Since we're now handling user_stats creation in handle_new_user()
-- ============================================================================
DROP TRIGGER IF EXISTS initialize_stats_on_profile_create ON profiles;

-- ============================================================================
-- 4. Update initialize_user_stats function for safety (in case it's called elsewhere)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initialize_user_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. Verification: Check if everything is set up correctly
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Hotfix applied successfully!';
    RAISE NOTICE 'The handle_new_user() trigger now creates both profiles and user_stats entries.';
    RAISE NOTICE 'Try signing in again - it should work now!';
END
$$;

-- Show updated trigger
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
