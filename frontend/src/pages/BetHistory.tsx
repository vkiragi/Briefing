import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUp, ArrowDown, Trash2, Check, X, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { Bet } from '../types';

export const BetHistory = () => {
  const { bets, updateBetStatus, deleteBet } = useBets();
  const [filter, setFilter] = useState<'All' | 'Won' | 'Lost' | 'Pending' | 'Pushed'>('All');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Bet; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const handleDeleteBet = (betId: string, betMatchup: string) => {
    if (window.confirm(`Are you sure you want to delete this bet?\n\n${betMatchup}`)) {
      deleteBet(betId);
    }
  };

  const filteredBets = useMemo(() => {
    let result = [...bets];

    // Filter by status
    if (filter !== 'All') {
      result = result.filter(bet => bet.status === filter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(bet => 
        bet.matchup.toLowerCase().includes(q) || 
        bet.selection.toLowerCase().includes(q) ||
        bet.sport.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [bets, filter, search, sortConfig]);

  const requestSort = (key: keyof Bet) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Bet) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen overflow-hidden flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold">Bet History</h1>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search bets..." 
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-accent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-1 bg-card border border-border p-1 rounded-lg overflow-x-auto">
            {['All', 'Pending', 'Won', 'Lost', 'Pushed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                  filter === status 
                    ? "bg-accent text-background" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 uppercase text-xs font-medium">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => requestSort('date')}>
                  <div className="flex items-center gap-1">Date {getSortIcon('date')}</div>
                </th>
                <th className="px-6 py-4">Sport/Matchup</th>
                <th className="px-6 py-4">Selection</th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-white" onClick={() => requestSort('stake')}>
                  <div className="flex items-center justify-end gap-1">Stake {getSortIcon('stake')}</div>
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:text-white" onClick={() => requestSort('odds')}>
                   <div className="flex items-center justify-center gap-1">Odds {getSortIcon('odds')}</div>
                </th>
                <th className="px-6 py-4 text-right">Return</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No bets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {new Date(bet.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{bet.matchup}</div>
                      <div className="text-xs text-gray-500 uppercase">{bet.sport} • {bet.type}</div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="bg-white/10 px-2 py-1 rounded text-xs text-accent-foreground font-mono">
                         {bet.selection}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ${bet.stake.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-400">
                      {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                    </td>
                    <td className={cn(
                        "px-6 py-4 text-right font-bold",
                        bet.status === 'Won' ? "text-accent" : 
                        bet.status === 'Lost' ? "text-red-500" : "text-gray-500"
                    )}>
                      {bet.status === 'Won' ? `+$${bet.potentialPayout.toFixed(2)}` : 
                       bet.status === 'Lost' ? `-$${bet.stake.toFixed(2)}` : 
                       '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        bet.status === 'Won' ? "bg-accent/10 text-accent" :
                        bet.status === 'Lost' ? "bg-red-500/10 text-red-500" :
                        bet.status === 'Pushed' ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-gray-500/10 text-gray-400"
                      )}>
                        {bet.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        {bet.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => updateBetStatus(bet.id, 'Won')}
                              className="p-1 hover:bg-accent/20 text-gray-400 hover:text-accent rounded transition-colors"
                              title="Mark as Won"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                               onClick={() => updateBetStatus(bet.id, 'Lost')}
                               className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded transition-colors"
                               title="Mark as Lost"
                            >
                              <X size={16} />
                            </button>
                            <button 
                               onClick={() => updateBetStatus(bet.id, 'Pushed')}
                               className="p-1 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-500 rounded transition-colors"
                               title="Mark as Pushed"
                            >
                              <Minus size={16} />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDeleteBet(bet.id, bet.matchup)}
                          className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Delete bet"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
};
