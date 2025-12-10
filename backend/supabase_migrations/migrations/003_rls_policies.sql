-- Migration: Row Level Security (RLS) Policies
-- Description: Enables RLS and creates policies to ensure users can only access their own data

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE parlay_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but allow for safety)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- BETS POLICIES
-- ============================================================================

-- Users can view their own bets
DROP POLICY IF EXISTS "Users can view own bets" ON bets;
CREATE POLICY "Users can view own bets"
    ON bets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own bets
DROP POLICY IF EXISTS "Users can insert own bets" ON bets;
CREATE POLICY "Users can insert own bets"
    ON bets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own bets
DROP POLICY IF EXISTS "Users can update own bets" ON bets;
CREATE POLICY "Users can update own bets"
    ON bets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bets
DROP POLICY IF EXISTS "Users can delete own bets" ON bets;
CREATE POLICY "Users can delete own bets"
    ON bets
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PARLAY_LEGS POLICIES
-- ============================================================================

-- Users can view legs of their own bets
DROP POLICY IF EXISTS "Users can view own parlay legs" ON parlay_legs;
CREATE POLICY "Users can view own parlay legs"
    ON parlay_legs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bets
            WHERE bets.id = parlay_legs.bet_id
            AND bets.user_id = auth.uid()
        )
    );

-- Users can insert legs for their own bets
DROP POLICY IF EXISTS "Users can insert own parlay legs" ON parlay_legs;
CREATE POLICY "Users can insert own parlay legs"
    ON parlay_legs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bets
            WHERE bets.id = parlay_legs.bet_id
            AND bets.user_id = auth.uid()
        )
    );

-- Users can update legs of their own bets
DROP POLICY IF EXISTS "Users can update own parlay legs" ON parlay_legs;
CREATE POLICY "Users can update own parlay legs"
    ON parlay_legs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM bets
            WHERE bets.id = parlay_legs.bet_id
            AND bets.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bets
            WHERE bets.id = parlay_legs.bet_id
            AND bets.user_id = auth.uid()
        )
    );

-- Users can delete legs of their own bets
DROP POLICY IF EXISTS "Users can delete own parlay legs" ON parlay_legs;
CREATE POLICY "Users can delete own parlay legs"
    ON parlay_legs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM bets
            WHERE bets.id = parlay_legs.bet_id
            AND bets.user_id = auth.uid()
        )
    );

-- ============================================================================
-- BANKROLL_TRANSACTIONS POLICIES
-- ============================================================================

-- Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON bankroll_transactions;
CREATE POLICY "Users can view own transactions"
    ON bankroll_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own transactions
DROP POLICY IF EXISTS "Users can insert own transactions" ON bankroll_transactions;
CREATE POLICY "Users can insert own transactions"
    ON bankroll_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
DROP POLICY IF EXISTS "Users can update own transactions" ON bankroll_transactions;
CREATE POLICY "Users can update own transactions"
    ON bankroll_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transactions
DROP POLICY IF EXISTS "Users can delete own transactions" ON bankroll_transactions;
CREATE POLICY "Users can delete own transactions"
    ON bankroll_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- USER_STATS POLICIES
-- ============================================================================

-- Users can view their own stats
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
CREATE POLICY "Users can view own stats"
    ON user_stats
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own stats (mainly for manual recalculation if needed)
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats"
    ON user_stats
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Stats are auto-inserted by trigger, but allow for safety
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
CREATE POLICY "Users can insert own stats"
    ON user_stats
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

