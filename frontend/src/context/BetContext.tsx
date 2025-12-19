import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bet } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface BetStats {
  totalBets: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  roi: number;
  profit: number;
}

interface BetContextType {
  bets: Bet[];
  addBet: (bet: Omit<Bet, 'id' | 'status'>) => Promise<void>;
  updateBetStatus: (id: string, status: Bet['status']) => Promise<void>;
  deleteBet: (id: string) => Promise<void>;
  clearPendingBets: (enrichedBets?: Bet[]) => Promise<void>;
  stats: BetStats;
  loading: boolean;
  refreshBets: () => Promise<void>;
}

const defaultStats: BetStats = {
  totalBets: 0,
  wins: 0,
  losses: 0,
  pending: 0,
  winRate: 0,
  roi: 0,
  profit: 0,
};

const BetContext = createContext<BetContextType | undefined>(undefined);

export const useBets = () => {
  const context = useContext(BetContext);
  if (!context) {
    throw new Error('useBets must be used within a BetProvider');
  }
  return context;
};

export const BetProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState<BetStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  // Fetch bets and stats from backend (single API call for better performance)
  const fetchBets = useCallback(async () => {
    if (!session?.access_token) {
      setBets([]);
      setStats(defaultStats);
      setLoading(false);
      return;
    }

    try {
      const { bets: remoteBets, stats: remoteStats } = await api.getBetsWithStats();
      setBets(remoteBets);
      setStats(remoteStats);
    } catch (e: any) {
      console.error("Failed to fetch bets from backend", e);
      if (e.message === 'Not authenticated') {
        setBets([]);
        setStats(defaultStats);
      }
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Re-fetch when user changes
  useEffect(() => {
    fetchBets();
  }, [fetchBets, user?.id]);

  const addBet = async (newBet: Omit<Bet, 'id' | 'status'>) => {
    const bet: Bet = {
      ...newBet,
      id: crypto.randomUUID(),
      status: 'Pending',
    };
    
    // Optimistic update
    setBets((prev) => [bet, ...prev]);
    
    try {
      await api.saveBet(bet);
      // Refresh from backend to ensure sync
      await fetchBets();
    } catch (e) {
      console.error("Failed to save bet to backend", e);
      // Rollback optimistic update on error
      setBets((prev) => prev.filter(b => b.id !== bet.id));
      throw e; // Re-throw so UI can handle error
    }
  };

  const updateBetStatus = async (id: string, status: Bet['status']) => {
    // Optimistic update
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id === id && bet.status !== status) {
            return { ...bet, status };
        }
        return bet;
      })
    );
    
    try {
      await api.updateBet(id, { status });
      // Refresh from backend to ensure sync
      await fetchBets();
    } catch (e) {
      console.error("Failed to update bet status in backend", e);
      // Rollback optimistic update on error
      await fetchBets();
      throw e;
    }
  };

  const deleteBet = async (id: string) => {
    const betToDelete = bets.find(b => b.id === id);
    if (!betToDelete) return;

    // Optimistic update
    setBets((prev) => prev.filter(bet => bet.id !== id));

    // Call backend to delete
    try {
      await api.deleteBet(id);
      // Refresh from backend to ensure sync
      await fetchBets();
    } catch (e) {
      console.error("Failed to delete bet from backend", e);
      // Rollback optimistic update on error
      setBets((prev) => {
        const exists = prev.find(b => b.id === id);
        if (!exists) {
          return [betToDelete, ...prev];
        }
        return prev;
      });
      throw e;
    }
  };

  const clearPendingBets = async (enrichedBets?: Bet[]) => {
    // Use enriched bets if provided (contains computed prop_status from game matching)
    // Otherwise fall back to stored bets
    const betsToCheck = enrichedBets || bets;

    const pendingBetsToResolve = betsToCheck.filter(b => b.status === 'Pending');

    // Update pending bets to their resolved status based on prop_status
    // Don't delete - just mark as Won/Lost/Push to preserve history
    for (const bet of pendingBetsToResolve) {
      try {
        let newStatus: Bet['status'] = 'Pending';

        // Determine status from prop_status
        if (bet.prop_status === 'won' || bet.prop_status === 'live_hit') {
          newStatus = 'Won';
        } else if (bet.prop_status === 'lost' || bet.prop_status === 'live_miss') {
          newStatus = 'Lost';
        } else if (bet.prop_status === 'push' || bet.prop_status === 'live_push') {
          newStatus = 'Pushed';
        } else if (bet.game_state === 'post' || bet.game_state === 'final') {
          // Game ended but no clear prop_status - mark as Lost by default
          newStatus = 'Lost';
        }

        // Only update if we determined a final status
        if (newStatus !== 'Pending') {
          await api.updateBet(bet.id, { status: newStatus });
        }
      } catch (e) {
        console.error(`Failed to update bet ${bet.id}`, e);
      }
    }

    // Refresh from backend
    await fetchBets();
  };

  return (
    <BetContext.Provider value={{ bets, addBet, updateBetStatus, deleteBet, clearPendingBets, stats, loading, refreshBets: fetchBets }}>
      {children}
    </BetContext.Provider>
  );
};






