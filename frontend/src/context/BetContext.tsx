import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bet } from '../types';
import { api } from '../lib/api';

interface BetContextType {
  bets: Bet[];
  addBet: (bet: Omit<Bet, 'id' | 'status'>) => Promise<void>;
  updateBetStatus: (id: string, status: Bet['status']) => Promise<void>;
  deleteBet: (id: string) => Promise<void>;
  stats: {
    totalBets: number;
    wins: number;
    losses: number;
    pending: number;
    winRate: number;
    roi: number;
    profit: number;
  };
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const useBets = () => {
  const context = useContext(BetContext);
  if (!context) {
    throw new Error('useBets must be used within a BetProvider');
  }
  return context;
};

export const BetProvider = ({ children }: { children: React.ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch bets from backend (single source of truth)
  const fetchBets = async () => {
    try {
      const remoteBets = await api.getBets();
      setBets(remoteBets);
      // Only use localStorage as read-only fallback for offline scenarios
      // Don't write to it - backend is the source of truth
    } catch (e) {
      console.error("Failed to fetch bets from backend", e);
      // Fallback to localStorage only if backend is completely unavailable
      const saved = localStorage.getItem('bets');
      if (saved) {
        console.warn("Using localStorage fallback - backend unavailable");
        setBets(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, []);

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

  const stats = (() => {
    const completedBets = bets.filter((b) => b.status === 'Won' || b.status === 'Lost');
    const wins = bets.filter((b) => b.status === 'Won').length;
    const losses = bets.filter((b) => b.status === 'Lost').length;
    const pending = bets.filter((b) => b.status === 'Pending').length;
    
    const totalStaked = completedBets.reduce((acc, b) => acc + b.stake, 0);
    const totalProfit = bets.reduce((acc, b) => {
        if (b.status === 'Won') return acc + b.potentialPayout;
        if (b.status === 'Lost') return acc - b.stake;
        return acc;
    }, 0);

    return {
      totalBets: bets.length,
      wins,
      losses,
      pending,
      winRate: completedBets.length > 0 ? (wins / completedBets.length) * 100 : 0,
      roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
      profit: totalProfit,
    };
  })();

  return (
    <BetContext.Provider value={{ bets, addBet, updateBetStatus, deleteBet, stats }}>
      {children}
    </BetContext.Provider>
  );
};






