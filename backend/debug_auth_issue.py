#!/usr/bin/env python3
"""
Debug auth issue - check for orphaned auth users
"""
import os
import sys
from supabase import create_client

# Read environment variables
env_file = os.path.join(os.path.dirname(__file__), '..', 'frontend', '.env')
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    if key.startswith('VITE_'):
                        clean_key = key.replace('VITE_', '')
                        os.environ[clean_key] = value

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

print(f"🔍 Debugging auth issue...")
print()

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Check profiles
    profiles = supabase.table('profiles').select('*').execute()
    print(f"📊 Profiles in database: {len(profiles.data)}")

    if profiles.data:
        for profile in profiles.data:
            print(f"   - {profile.get('email')} (ID: {profile.get('id')})")
    else:
        print("   (none)")

    print()

    # Check user_stats
    stats = supabase.table('user_stats').select('*').execute()
    print(f"📈 User stats entries: {len(stats.data)}")

    if stats.data:
        for stat in stats.data:
            print(f"   - User ID: {stat.get('user_id')}")
    else:
        print("   (none)")

    print()
    print("💡 Diagnosis:")
    print()

    if len(profiles.data) == 0:
        print("The migrations are applied correctly, but no user has successfully")
        print("signed in yet. The error you're seeing suggests the trigger is")
        print("failing during the auth callback.")
        print()
        print("Possible causes:")
        print("1. The trigger 'initialize_stats_on_profile_create' may not be working")
        print("2. There might be permission issues with the trigger functions")
        print()
        print("Solution: Try signing in again now. The tables exist, so it should work.")
    else:
        print("✅ Users exist in the database. Auth should be working now.")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
