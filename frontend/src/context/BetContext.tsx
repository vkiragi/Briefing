import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bet, BankrollTransaction } from '../types';

interface BetContextType {
  bets: Bet[];
  bankroll: number;
  transactions: BankrollTransaction[];
  addBet: (bet: Omit<Bet, 'id' | 'status'>) => void;
  updateBetStatus: (id: string, status: Bet['status']) => void;
  addTransaction: (transaction: Omit<BankrollTransaction, 'id' | 'date'>) => void;
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
  const [bets, setBets] = useState<Bet[]>(() => {
    const saved = localStorage.getItem('bets');
    return saved ? JSON.parse(saved) : [];
  });

  const [bankroll, setBankroll] = useState<number>(() => {
    const saved = localStorage.getItem('bankroll');
    return saved ? parseFloat(saved) : 1000;
  });

  const [transactions, setTransactions] = useState<BankrollTransaction[]>(() => {
      const saved = localStorage.getItem('transactions');
      return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bets', JSON.stringify(bets));
  }, [bets]);

  useEffect(() => {
    localStorage.setItem('bankroll', bankroll.toString());
  }, [bankroll]);
  
  useEffect(() => {
      localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addBet = (newBet: Omit<Bet, 'id' | 'status'>) => {
    const bet: Bet = {
      ...newBet,
      id: crypto.randomUUID(),
      status: 'Pending',
    };
    setBets((prev) => [bet, ...prev]);
    
    // Deduct stake from bankroll
    setBankroll(prev => prev - bet.stake);
    addTransaction({ type: 'bet_placed', amount: -bet.stake, note: `Bet placed: ${bet.matchup}` });
  };

  const updateBetStatus = (id: string, status: Bet['status']) => {
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id === id && bet.status !== status) {
            // Handle bankroll updates on status change
            if (status === 'Won' && bet.status !== 'Won') {
                 const payout = bet.stake + bet.potentialPayout;
                 setBankroll(b => b + payout);
                 addTransaction({ type: 'bet_won', amount: payout, note: `Bet won: ${bet.matchup}` });
            } else if (status === 'Pushed' && bet.status !== 'Pushed') {
                setBankroll(b => b + bet.stake);
                 addTransaction({ type: 'bet_pushed', amount: bet.stake, note: `Bet pushed: ${bet.matchup}` });
            } else if (status === 'Lost' && bet.status === 'Won') {
                // Revert win
                 const payout = bet.stake + bet.potentialPayout;
                 setBankroll(b => b - payout);
                 // No transaction for correction, or add a correction transaction? 
                 // For simplicity, direct modification of bankroll for corrections is tricky without transaction logs.
                 // We will just update bankroll state.
            }
            return { ...bet, status };
        }
        return bet;
      })
    );
  };
  
  const addTransaction = (tx: Omit<BankrollTransaction, 'id' | 'date'>) => {
      const newTx: BankrollTransaction = {
          ...tx,
          id: crypto.randomUUID(),
          date: new Date().toISOString()
      };
      setTransactions(prev => [newTx, ...prev]);
      if (tx.type === 'deposit') setBankroll(b => b + tx.amount);
      if (tx.type === 'withdrawal') setBankroll(b => b - tx.amount);
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
    <BetContext.Provider value={{ bets, bankroll, transactions, addBet, updateBetStatus, addTransaction, stats }}>
      {children}
    </BetContext.Provider>
  );
};



