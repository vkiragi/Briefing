-- ============================================================================
-- Migration: Add combined prop fields to parlay_legs table
-- This enables tracking combined player props (e.g., "Player A + Player B 4+ TDs")
-- ============================================================================

-- Add combined prop columns to parlay_legs table
ALTER TABLE parlay_legs
ADD COLUMN IF NOT EXISTS is_combined BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS combined_players JSONB;

-- Add index for combined prop lookups
CREATE INDEX IF NOT EXISTS idx_parlay_legs_is_combined ON parlay_legs(is_combined) WHERE is_combined = TRUE;

-- Comment on columns for documentation
COMMENT ON COLUMN parlay_legs.is_combined IS 'Whether this leg is a combined player prop';
COMMENT ON COLUMN parlay_legs.combined_players IS 'JSON array of players in the combined prop with their tracking data';
