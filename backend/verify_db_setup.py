#!/usr/bin/env python3
"""
Verify Supabase database tables exist
"""
import os
import sys
from supabase import create_client

# Read environment variables from frontend/.env
env_file = os.path.join(os.path.dirname(__file__), '..', 'frontend', '.env')
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    if key.startswith('VITE_'):
                        # Remove VITE_ prefix for backend use
                        clean_key = key.replace('VITE_', '')
                        os.environ[clean_key] = value

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    sys.exit(1)

print(f"🔍 Connecting to Supabase: {SUPABASE_URL}")
print()

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # List of tables to check
    tables = ['profiles', 'bets', 'parlay_legs', 'bankroll_transactions', 'user_stats']

    print("📊 Checking if tables exist...")
    print()

    all_exist = True
    for table in tables:
        try:
            # Try to query the table (with limit 0 to avoid fetching data)
            result = supabase.table(table).select('*').limit(0).execute()
            print(f"✅ Table '{table}' exists")
        except Exception as e:
            print(f"❌ Table '{table}' DOES NOT EXIST")
            print(f"   Error: {str(e)}")
            all_exist = False

    print()
    if all_exist:
        print("🎉 All required tables exist! Database is properly set up.")
        print()
        print("Next steps:")
        print("1. Make sure you've set up Google OAuth in Supabase dashboard")
        print("2. Try signing in again")
    else:
        print("⚠️  Some tables are missing!")
        print()
        print("Please run the migrations manually:")
        print("1. Go to your Supabase dashboard SQL editor")
        print("2. Copy/paste each migration file from backend/supabase_migrations/")
        print("3. Run them in order: 001, 002, 003")
        sys.exit(1)

except Exception as e:
    print(f"❌ Error connecting to Supabase: {e}")
    sys.exit(1)
