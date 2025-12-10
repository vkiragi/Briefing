# Supabase Database Setup

This directory contains SQL migration files to set up the complete database schema for the Briefing betting application.

## Migration Files

Run these migrations in order in the Supabase SQL Editor:

1. **001_initial_schema.sql** - Creates all tables (profiles, bets, parlay_legs, bankroll_transactions, user_stats) and initial triggers
2. **002_functions_triggers.sql** - Creates database functions and triggers for auto-updating stats and handling bet status changes
3. **003_rls_policies.sql** - Enables Row Level Security and creates policies to ensure users can only access their own data

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file in order
4. Click **Run** to execute each migration
5. Verify tables are created in **Table Editor**

### Option 2: Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
# Apply all migrations
supabase db push

# Or apply individually
supabase migration up
```

## Post-Migration Steps

After running all migrations:

1. **Set up Google OAuth in Supabase:**
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials (Client ID and Secret)
   - Add redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Verify RLS is working:**
   - Test queries in SQL Editor with different user contexts
   - Ensure users can only see their own data

3. **Test the triggers:**
   - Insert a test bet and verify stats are calculated
   - Change bet status and verify transactions are created

## Database Schema Overview

- **profiles**: User profile information (linked to auth.users)
- **bets**: All bet records with prop tracking fields
- **parlay_legs**: Normalized table for parlay bet legs
- **bankroll_transactions**: All bankroll movements
- **user_stats**: Cached statistics (win rate, ROI, etc.)

## Important Notes

- All tables have RLS enabled - users can only access their own data
- User stats are automatically recalculated when bets change
- Bankroll transactions are automatically created when bet status changes
- Profiles are automatically created when users sign up via the trigger

