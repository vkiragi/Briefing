import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

export interface PinnedGame {
  id: string;
  user_id: string;
  event_id: string;
  sport: string;
  matchup?: string;
  home_team?: string;
  away_team?: string;
  pinned_at: string;
  game_end_time?: string;
}

interface PinnedGamesContextType {
  pinnedGames: PinnedGame[];
  pinnedEventIds: Set<string>;
  isLoading: boolean;
  pinGame: (game: { event_id: string; sport: string; matchup?: string; home_team?: string; away_team?: string }) => Promise<void>;
  unpinGame: (eventId: string) => Promise<void>;
  isGamePinned: (eventId: string) => boolean;
  refreshPinnedGames: () => Promise<void>;
}

const PinnedGamesContext = createContext<PinnedGamesContextType | undefined>(undefined);

export const PinnedGamesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [pinnedGames, setPinnedGames] = useState<PinnedGame[]>([]);
  const [pinnedEventIds, setPinnedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refreshPinnedGames = useCallback(async () => {
    if (!user) {
      setPinnedGames([]);
      setPinnedEventIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const games = await api.getPinnedGames();
      setPinnedGames(games);
      setPinnedEventIds(new Set(games.map(g => g.event_id)));
    } catch (error) {
      console.error('Failed to fetch pinned games:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load pinned games when user changes
  useEffect(() => {
    refreshPinnedGames();
  }, [refreshPinnedGames]);

  const pinGame = useCallback(async (game: {
    event_id: string;
    sport: string;
    matchup?: string;
    home_team?: string;
    away_team?: string;
  }) => {
    if (!user) return;

    // Optimistic update
    setPinnedEventIds(prev => new Set([...prev, game.event_id]));

    try {
      await api.pinGame(game);
      // Refresh to get full data
      await refreshPinnedGames();
    } catch (error) {
      console.error('Failed to pin game:', error);
      // Rollback optimistic update
      setPinnedEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(game.event_id);
        return newSet;
      });
      throw error;
    }
  }, [user, refreshPinnedGames]);

  const unpinGame = useCallback(async (eventId: string) => {
    if (!user) return;

    // Optimistic update
    setPinnedEventIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });
    setPinnedGames(prev => prev.filter(g => g.event_id !== eventId));

    try {
      await api.unpinGame(eventId);
    } catch (error) {
      console.error('Failed to unpin game:', error);
      // Rollback - refresh from server
      await refreshPinnedGames();
      throw error;
    }
  }, [user, refreshPinnedGames]);

  const isGamePinned = useCallback((eventId: string) => {
    return pinnedEventIds.has(eventId);
  }, [pinnedEventIds]);

  return (
    <PinnedGamesContext.Provider
      value={{
        pinnedGames,
        pinnedEventIds,
        isLoading,
        pinGame,
        unpinGame,
        isGamePinned,
        refreshPinnedGames,
      }}
    >
      {children}
    </PinnedGamesContext.Provider>
  );
};

export const usePinnedGames = () => {
  const context = useContext(PinnedGamesContext);
  if (context === undefined) {
    throw new Error('usePinnedGames must be used within a PinnedGamesProvider');
  }
  return context;
};
