-- Migration: Database Functions and Triggers
-- Description: Creates functions for auto-updating timestamps and calculating user stats

-- ============================================================================
-- FUNCTION: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at on tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bets_updated_at ON bets;
CREATE TRIGGER update_bets_updated_at
    BEFORE UPDATE ON bets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FUNCTION: Calculate and update user statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_user_stats(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_bets INTEGER;
    v_wins INTEGER;
    v_losses INTEGER;
    v_pushes INTEGER;
    v_pending INTEGER;
    v_total_staked NUMERIC(10,2);
    v_total_profit NUMERIC(10,2);
    v_win_rate NUMERIC(5,2);
    v_roi NUMERIC(5,2);
    v_completed_bets INTEGER;
BEGIN
    -- Count bets by status
    SELECT 
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE status = 'Won')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'Lost')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'Pushed')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'Pending')::INTEGER
    INTO 
        v_total_bets,
        v_wins,
        v_losses,
        v_pushes,
        v_pending
    FROM bets
    WHERE user_id = target_user_id;

    -- Calculate total staked (only completed bets)
    SELECT COALESCE(SUM(stake), 0)
    INTO v_total_staked
    FROM bets
    WHERE user_id = target_user_id
    AND status IN ('Won', 'Lost', 'Pushed');

    -- Calculate total profit
    SELECT COALESCE(SUM(
        CASE 
            WHEN status = 'Won' THEN potential_payout
            WHEN status = 'Lost' THEN -stake
            WHEN status = 'Pushed' THEN 0
            ELSE 0
        END
    ), 0)
    INTO v_total_profit
    FROM bets
    WHERE user_id = target_user_id;

    -- Calculate win rate (only for completed bets, excluding pushes)
    v_completed_bets := v_wins + v_losses;
    IF v_completed_bets > 0 THEN
        v_win_rate := (v_wins::NUMERIC / v_completed_bets::NUMERIC) * 100;
    ELSE
        v_win_rate := 0;
    END IF;

    -- Calculate ROI
    IF v_total_staked > 0 THEN
        v_roi := (v_total_profit / v_total_staked) * 100;
    ELSE
        v_roi := 0;
    END IF;

    -- Insert or update user_stats
    INSERT INTO user_stats (
        user_id,
        total_bets,
        wins,
        losses,
        pushes,
        pending,
        win_rate,
        total_staked,
        total_profit,
        roi,
        last_calculated_at,
        updated_at
    )
    VALUES (
        target_user_id,
        v_total_bets,
        v_wins,
        v_losses,
        v_pushes,
        v_pending,
        v_win_rate,
        v_total_staked,
        v_total_profit,
        v_roi,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        total_bets = EXCLUDED.total_bets,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        pushes = EXCLUDED.pushes,
        pending = EXCLUDED.pending,
        win_rate = EXCLUDED.win_rate,
        total_staked = EXCLUDED.total_staked,
        total_profit = EXCLUDED.total_profit,
        roi = EXCLUDED.roi,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Trigger function to recalculate stats when bets change
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_recalculate_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Determine which user_id to use
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    -- Recalculate stats for the user
    PERFORM public.calculate_user_stats(v_user_id);
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers to recalculate stats when bets are modified
DROP TRIGGER IF EXISTS recalculate_stats_on_bet_insert ON bets;
CREATE TRIGGER recalculate_stats_on_bet_insert
    AFTER INSERT ON bets
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalculate_user_stats();

DROP TRIGGER IF EXISTS recalculate_stats_on_bet_update ON bets;
CREATE TRIGGER recalculate_stats_on_bet_update
    AFTER UPDATE ON bets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.stake IS DISTINCT FROM NEW.stake OR OLD.potential_payout IS DISTINCT FROM NEW.potential_payout)
    EXECUTE FUNCTION public.trigger_recalculate_user_stats();

DROP TRIGGER IF EXISTS recalculate_stats_on_bet_delete ON bets;
CREATE TRIGGER recalculate_stats_on_bet_delete
    AFTER DELETE ON bets
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalculate_user_stats();

-- ============================================================================
-- FUNCTION: Auto-create bankroll transaction when bet status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_bet_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if status actually changed
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Delete old transaction if bet was won/lost/pushed and now changing
    IF OLD.status IN ('Won', 'Lost', 'Pushed') THEN
        DELETE FROM bankroll_transactions
        WHERE bet_id = NEW.id
        AND type IN ('bet_won', 'bet_pushed');
        
        -- Also remove the bet_placed transaction if status changed
        DELETE FROM bankroll_transactions
        WHERE bet_id = NEW.id
        AND type = 'bet_placed';
    END IF;

    -- Create new transactions based on new status
    IF NEW.status = 'Pending' THEN
        -- Create bet_placed transaction
        INSERT INTO bankroll_transactions (user_id, type, amount, bet_id, note)
        VALUES (NEW.user_id, 'bet_placed', -NEW.stake, NEW.id, 'Bet placed: ' || NEW.matchup);
    
    ELSIF NEW.status = 'Won' THEN
        -- Remove bet_placed (stake deduction)
        DELETE FROM bankroll_transactions
        WHERE bet_id = NEW.id AND type = 'bet_placed';
        
        -- Add bet_won transaction (payout)
        INSERT INTO bankroll_transactions (user_id, type, amount, bet_id, note)
        VALUES (NEW.user_id, 'bet_won', NEW.potential_payout, NEW.id, 'Bet won: ' || NEW.matchup);
    
    ELSIF NEW.status = 'Pushed' THEN
        -- Remove bet_placed (stake deduction)
        DELETE FROM bankroll_transactions
        WHERE bet_id = NEW.id AND type = 'bet_placed';
        
        -- Add bet_pushed transaction (return stake)
        INSERT INTO bankroll_transactions (user_id, type, amount, bet_id, note)
        VALUES (NEW.user_id, 'bet_pushed', NEW.stake, NEW.id, 'Bet pushed: ' || NEW.matchup);
    
    ELSIF NEW.status = 'Lost' THEN
        -- Remove bet_placed if exists (already deducted when placed)
        DELETE FROM bankroll_transactions
        WHERE bet_id = NEW.id AND type = 'bet_placed';
        
        -- Lost bets don't create additional transactions (stake already deducted)
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create transactions when bet status changes
DROP TRIGGER IF EXISTS create_transaction_on_bet_status_change ON bets;
CREATE TRIGGER create_transaction_on_bet_status_change
    AFTER INSERT OR UPDATE OF status ON bets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bet_status_change();

-- ============================================================================
-- FUNCTION: Initialize user_stats when profile is created
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initialize_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Initialize stats when profile is created
DROP TRIGGER IF EXISTS initialize_stats_on_profile_create ON profiles;
CREATE TRIGGER initialize_stats_on_profile_create
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_user_stats();

