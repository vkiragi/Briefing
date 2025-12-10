-- Migration: Initial Database Schema
-- Description: Creates all tables for the betting application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with additional profile information
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================================
-- 2. BETS TABLE
-- Main table for storing all bet records
-- ============================================================================
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sport TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Moneyline', 'Spread', 'Total', 'Parlay', 'Prop', '1st Half', '1st Quarter', 'Team Total')),
    matchup TEXT NOT NULL,
    selection TEXT NOT NULL,
    odds NUMERIC(10,2) NOT NULL,
    stake NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Won', 'Lost', 'Pushed')),
    date DATE NOT NULL,
    book TEXT,
    potential_payout NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Prop-specific fields
    event_id TEXT,
    player_name TEXT,
    team_name TEXT,
    market_type TEXT,
    line NUMERIC(10,2),
    side TEXT CHECK (side IN ('over', 'under')),
    
    -- Live tracking fields
    current_value NUMERIC(10,2),
    current_value_str TEXT,
    game_state TEXT CHECK (game_state IN ('pre', 'in', 'post')),
    game_status_text TEXT,
    prop_status TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for bets table
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_status ON bets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bets_user_date ON bets(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bets_user_sport ON bets(user_id, sport);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status) WHERE status = 'Pending';
CREATE INDEX IF NOT EXISTS idx_bets_event_id ON bets(event_id) WHERE event_id IS NOT NULL;

-- ============================================================================
-- 3. PARLAY_LEGS TABLE
-- Normalized table for storing parlay bet legs
-- ============================================================================
CREATE TABLE IF NOT EXISTS parlay_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    sport TEXT NOT NULL,
    matchup TEXT NOT NULL,
    selection TEXT NOT NULL,
    odds NUMERIC(10,2) NOT NULL,
    leg_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure leg_order is unique per bet
    UNIQUE(bet_id, leg_order)
);

-- Indexes for parlay_legs
CREATE INDEX IF NOT EXISTS idx_parlay_legs_bet_id ON parlay_legs(bet_id);

-- ============================================================================
-- 4. BANKROLL_TRANSACTIONS TABLE
-- Tracks all bankroll movements (deposits, withdrawals, bet outcomes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bankroll_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_pushed')),
    amount NUMERIC(10,2) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT,
    bet_id UUID REFERENCES bets(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for bankroll_transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON bankroll_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON bankroll_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON bankroll_transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_bet_id ON bankroll_transactions(bet_id) WHERE bet_id IS NOT NULL;

-- ============================================================================
-- 5. USER_STATS TABLE
-- Cached statistics for performance (win rate, ROI, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    total_bets INTEGER DEFAULT 0 NOT NULL,
    wins INTEGER DEFAULT 0 NOT NULL,
    losses INTEGER DEFAULT 0 NOT NULL,
    pushes INTEGER DEFAULT 0 NOT NULL,
    pending INTEGER DEFAULT 0 NOT NULL,
    win_rate NUMERIC(5,2) DEFAULT 0 NOT NULL,
    total_staked NUMERIC(10,2) DEFAULT 0 NOT NULL,
    total_profit NUMERIC(10,2) DEFAULT 0 NOT NULL,
    roi NUMERIC(5,2) DEFAULT 0 NOT NULL,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

