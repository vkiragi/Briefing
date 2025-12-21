-- Migration: Add pinned_games table for users to pin favorite games to their dashboard
-- Created: 2024-12-20

-- Create pinned_games table
CREATE TABLE IF NOT EXISTS pinned_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    matchup TEXT,
    home_team TEXT,
    away_team TEXT,
    pinned_at TIMESTAMPTZ DEFAULT NOW(),
    game_end_time TIMESTAMPTZ,

    -- Ensure a user can't pin the same game twice
    UNIQUE(user_id, event_id)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_pinned_games_user_id ON pinned_games(user_id);

-- Create index for cleanup of ended games
CREATE INDEX IF NOT EXISTS idx_pinned_games_game_end_time ON pinned_games(game_end_time)
    WHERE game_end_time IS NOT NULL;

-- Enable RLS
ALTER TABLE pinned_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own pinned games
CREATE POLICY "Users can view own pinned games" ON pinned_games
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own pinned games
CREATE POLICY "Users can insert own pinned games" ON pinned_games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own pinned games
CREATE POLICY "Users can delete own pinned games" ON pinned_games
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only update their own pinned games
CREATE POLICY "Users can update own pinned games" ON pinned_games
    FOR UPDATE USING (auth.uid() = user_id);
