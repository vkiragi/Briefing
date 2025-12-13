-- ============================================================================
-- Migration: Add tracking fields to parlay_legs table
-- This enables live stat tracking for individual parlay legs
-- ============================================================================

-- Add tracking columns to parlay_legs table
ALTER TABLE parlay_legs
ADD COLUMN IF NOT EXISTS event_id TEXT,
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS team_name TEXT,
ADD COLUMN IF NOT EXISTS market_type TEXT,
ADD COLUMN IF NOT EXISTS line NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS side TEXT;

-- Add index for event_id lookups (for refreshing stats)
CREATE INDEX IF NOT EXISTS idx_parlay_legs_event_id ON parlay_legs(event_id) WHERE event_id IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN parlay_legs.event_id IS 'ESPN event ID for live tracking';
COMMENT ON COLUMN parlay_legs.player_name IS 'Player name for player props';
COMMENT ON COLUMN parlay_legs.team_name IS 'Team name for team-based bets';
COMMENT ON COLUMN parlay_legs.market_type IS 'Type of market (points, rebounds, moneyline, etc.)';
COMMENT ON COLUMN parlay_legs.line IS 'The line/total to beat';
COMMENT ON COLUMN parlay_legs.side IS 'Over/Under or team selection';
