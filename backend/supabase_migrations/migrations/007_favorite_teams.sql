-- Migration: Add favorite_teams table for users to save their favorite teams
-- Created: 2024-12-26

-- Create favorite_teams table
CREATE TABLE IF NOT EXISTS favorite_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    abbreviation TEXT,
    logo TEXT,
    sport TEXT NOT NULL,
    sport_display TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure a user can't add the same team twice (same team_id + sport combo)
    UNIQUE(user_id, team_id, sport)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_favorite_teams_user_id ON favorite_teams(user_id);

-- Enable RLS
ALTER TABLE favorite_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own favorite teams
CREATE POLICY "Users can view own favorite teams" ON favorite_teams
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own favorite teams
CREATE POLICY "Users can insert own favorite teams" ON favorite_teams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own favorite teams
CREATE POLICY "Users can delete own favorite teams" ON favorite_teams
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only update their own favorite teams
CREATE POLICY "Users can update own favorite teams" ON favorite_teams
    FOR UPDATE USING (auth.uid() = user_id);
