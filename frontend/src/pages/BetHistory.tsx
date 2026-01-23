import { useState, useMemo } from 'react';
import { Search, Trash2, Check, X, Minus, TrendingUp, DollarSign, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { cn } from '../lib/utils';
import { Bet } from '../types';

type ViewMode = 'card' | 'list';

export const BetHistory = () => {
  const { bets, stats, updateBetStatus, deleteBet } = useBets();
  const [filter, setFilter] = useState<'All' | 'Won' | 'Lost' | 'Pending' | 'Pushed'>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

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

    // Sort by date (newest first)
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return result;
  }, [bets, filter, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto"
    >
      {/* Header with Stats */}
      <div className="flex-shrink-0 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Bet <span className="text-accent">History</span>
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">
              {filteredBets.length} {filteredBets.length === 1 ? 'bet' : 'bets'} found
            </p>
          </div>

          {/* Stats Cards */}
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="text-accent" size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Record</div>
                <div className="text-base font-bold text-white">
                  {stats.wins}W-{stats.losses}L
                  <span className="text-gray-600 ml-1">({stats.winRate.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                stats.roi >= 0 ? "bg-accent/10" : "bg-red-500/10"
              )}>
                <DollarSign className={stats.roi >= 0 ? "text-accent" : "text-red-500"} size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">ROI</div>
                <div className={cn(
                  "text-base font-bold",
                  stats.roi >= 0 ? "text-accent" : "text-red-500"
                )}>
                  {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accent line */}
        <div className="w-full h-0.5 bg-accent/40 rounded-full" />

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 w-full">
          {/* Search */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search bets..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-accent transition-colors"
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
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  filter === status
                    ? "bg-accent text-background shadow-lg shadow-accent/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-card border border-border p-1 rounded-lg ml-auto">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'card'
                  ? "bg-accent text-background shadow-lg shadow-accent/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
              title="Card View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-md transition-all",
                viewMode === 'list'
                  ? "bg-accent text-background shadow-lg shadow-accent/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bets Display */}
      <div>
        <AnimatePresence mode="popLayout">
          {filteredBets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                <Search className="text-gray-500" size={32} />
              </div>
              <p className="text-gray-500 text-sm">No bets found matching your criteria.</p>
            </motion.div>
          ) : viewMode === 'card' ? (
            /* Card View */
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 pb-4">
              {filteredBets.map((bet) => (
                <motion.div
                  key={bet.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "bg-card border rounded-xl p-4 hover:bg-card/80 transition-all relative overflow-hidden",
                    bet.status === 'Won' && "border-accent/30 bg-accent/5",
                    bet.status === 'Lost' && "border-red-500/30 bg-red-500/5",
                    bet.status === 'Pushed' && "border-yellow-500/30 bg-yellow-500/5",
                    bet.status === 'Pending' && "border-border"
                  )}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">
                        {new Date(bet.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-gray-400 uppercase font-medium">
                        {bet.sport}
                      </span>
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold",
                      bet.status === 'Won' && "bg-accent/20 text-accent",
                      bet.status === 'Lost' && "bg-red-500/20 text-red-500",
                      bet.status === 'Pushed' && "bg-yellow-500/20 text-yellow-500",
                      bet.status === 'Pending' && "bg-blue-500/20 text-blue-400"
                    )}>
                      {bet.status === 'Won' && '✓ WON'}
                      {bet.status === 'Lost' && '✗ LOST'}
                      {bet.status === 'Pushed' && '⊘ PUSH'}
                      {bet.status === 'Pending' && 'PENDING'}
                    </span>
                  </div>

                  {/* Matchup */}
                  <div className="mb-3">
                    <div className="text-base font-semibold text-white mb-1">
                      {bet.matchup}
                    </div>
                    <div className="text-xs text-gray-500 uppercase">
                      {bet.type}
                    </div>
                  </div>

                  {/* Selection */}
                  <div className="mb-3 pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Selection</span>
                      <span className="text-sm font-semibold text-accent bg-accent/10 px-3 py-1 rounded-lg">
                        {bet.selection}
                      </span>
                    </div>
                  </div>

                  {/* Bet Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Stake</div>
                      <div className="text-base font-bold text-white font-mono">
                        ${bet.stake.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Odds</div>
                      <div className={cn(
                        "text-base font-bold font-mono",
                        bet.odds > 0 ? "text-green-400" : "text-white"
                      )}>
                        {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                      </div>
                    </div>
                  </div>

                  {/* Return */}
                  <div className="mb-3 pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Potential Return</span>
                      <span className={cn(
                        "text-lg font-bold font-mono",
                        bet.status === 'Won' && "text-accent",
                        bet.status === 'Lost' && "text-red-500",
                        bet.status === 'Pending' && "text-gray-400"
                      )}>
                        {bet.status === 'Won' && `+$${bet.potentialPayout.toFixed(2)}`}
                        {bet.status === 'Lost' && `-$${bet.stake.toFixed(2)}`}
                        {(bet.status === 'Pending' || bet.status === 'Pushed') && `$${bet.potentialPayout.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1">
                    {bet.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => updateBetStatus(bet.id, 'Won')}
                          className="p-2 hover:bg-accent/20 text-gray-400 hover:text-accent rounded-lg transition-all"
                          title="Mark as Won"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => updateBetStatus(bet.id, 'Lost')}
                          className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                          title="Mark as Lost"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => updateBetStatus(bet.id, 'Pushed')}
                          className="p-2 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-500 rounded-lg transition-all"
                          title="Mark as Pushed"
                        >
                          <Minus size={18} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteBet(bet.id, bet.matchup)}
                      className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                      title="Delete bet"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* List/Table View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-gray-400 uppercase text-xs font-medium border-b border-border">
                    <tr>
                      <th className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">Date</th>
                      <th className="px-4 md:px-6 py-3 md:py-4">Matchup</th>
                      <th className="px-4 md:px-6 py-3 md:py-4">Selection</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-right">Stake</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-center">Odds</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-right">Return</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-center">Status</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredBets.map((bet) => (
                      <motion.tr
                        key={bet.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "hover:bg-white/5 transition-colors",
                          bet.status === 'Won' && "bg-accent/5",
                          bet.status === 'Lost' && "bg-red-500/5",
                          bet.status === 'Pushed' && "bg-yellow-500/5"
                        )}
                      >
                        <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                          <span className="text-xs md:text-sm text-gray-300 font-mono">
                            {new Date(bet.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <div className="font-medium text-white text-sm md:text-base">
                            {bet.matchup}
                          </div>
                          <div className="text-xs text-gray-500 uppercase">
                            {bet.sport} • {bet.type}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <span className="inline-block bg-accent/10 text-accent px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-semibold">
                            {bet.selection}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                          <span className="font-mono font-bold text-white text-sm md:text-base">
                            ${bet.stake.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                          <span className={cn(
                            "font-mono font-semibold text-sm md:text-base",
                            bet.odds > 0 ? "text-green-400" : "text-white"
                          )}>
                            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                          <span className={cn(
                            "font-mono font-bold text-sm md:text-base",
                            bet.status === 'Won' && "text-accent",
                            bet.status === 'Lost' && "text-red-500",
                            bet.status === 'Pending' && "text-gray-400"
                          )}>
                            {bet.status === 'Won' && `+$${bet.potentialPayout.toFixed(2)}`}
                            {bet.status === 'Lost' && `-$${bet.stake.toFixed(2)}`}
                            {(bet.status === 'Pending' || bet.status === 'Pushed') && `$${bet.potentialPayout.toFixed(2)}`}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-bold whitespace-nowrap",
                            bet.status === 'Won' && "bg-accent/20 text-accent",
                            bet.status === 'Lost' && "bg-red-500/20 text-red-500",
                            bet.status === 'Pushed' && "bg-yellow-500/20 text-yellow-500",
                            bet.status === 'Pending' && "bg-blue-500/20 text-blue-400"
                          )}>
                            {bet.status === 'Won' && '✓ WON'}
                            {bet.status === 'Lost' && '✗ LOST'}
                            {bet.status === 'Pushed' && '⊘ PUSH'}
                            {bet.status === 'Pending' && 'PENDING'}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <div className="flex justify-center gap-1">
                            {bet.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => updateBetStatus(bet.id, 'Won')}
                                  className="p-1.5 md:p-2 hover:bg-accent/20 text-gray-400 hover:text-accent rounded-lg transition-all"
                                  title="Mark as Won"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => updateBetStatus(bet.id, 'Lost')}
                                  className="p-1.5 md:p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                  title="Mark as Lost"
                                >
                                  <X size={16} />
                                </button>
                                <button
                                  onClick={() => updateBetStatus(bet.id, 'Pushed')}
                                  className="p-1.5 md:p-2 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-500 rounded-lg transition-all"
                                  title="Mark as Pushed"
                                >
                                  <Minus size={16} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteBet(bet.id, bet.matchup)}
                              className="p-1.5 md:p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                              title="Delete bet"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
