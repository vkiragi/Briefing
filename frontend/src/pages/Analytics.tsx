import { useMemo, useState } from 'react';
import {
  Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Target, DollarSign, Trophy, Flame, BarChart3, Calendar, X, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Bet } from '../types';
import { addMonths, subMonths, format } from 'date-fns';

// Day detail modal component
interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  bets: Bet[];
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ isOpen, onClose, date, bets }) => {
  if (!isOpen || !date) return null;

  const dayBets = bets.filter(bet => {
    const betDate = new Date(bet.date);
    return betDate.getDate() === date.getDate() &&
           betDate.getMonth() === date.getMonth() &&
           betDate.getFullYear() === date.getFullYear();
  });

  const wins = dayBets.filter(b => b.status === 'Won');
  const losses = dayBets.filter(b => b.status === 'Lost');
  const pushes = dayBets.filter(b => b.status === 'Pushed');

  const totalProfit = dayBets.reduce((sum, bet) => {
    if (bet.status === 'Won') return sum + bet.potentialPayout;
    if (bet.status === 'Lost') return sum - bet.stake;
    return sum;
  }, 0);

  const totalStaked = dayBets.reduce((sum, bet) => sum + bet.stake, 0);

  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-white">{dateStr}</h3>
                <p className="text-sm text-gray-400">{dayBets.length} bet{dayBets.length !== 1 ? 's' : ''} placed</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 p-4 border-b border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{wins.length}</p>
                <p className="text-xs text-gray-400">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{losses.length}</p>
                <p className="text-xs text-gray-400">Losses</p>
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  totalProfit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">Profit</p>
              </div>
            </div>

            {/* Bet List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {dayBets.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No bets on this day</p>
              ) : (
                dayBets.map(bet => (
                  <div
                    key={bet.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      bet.status === 'Won' ? "bg-green-500/10 border-green-500/30" :
                      bet.status === 'Lost' ? "bg-red-500/10 border-red-500/30" :
                      "bg-yellow-500/10 border-yellow-500/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {bet.status === 'Won' ? (
                            <CheckCircle size={16} className="text-green-500 shrink-0" />
                          ) : bet.status === 'Lost' ? (
                            <XCircle size={16} className="text-red-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-yellow-500 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-gray-400 uppercase">{bet.sport}</span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs text-gray-400">{bet.type}</span>
                        </div>
                        <p className="text-sm font-medium text-white truncate">{bet.matchup}</p>
                        <p className="text-xs text-gray-400 truncate">{bet.selection}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-sm font-bold",
                          bet.status === 'Won' ? "text-green-500" :
                          bet.status === 'Lost' ? "text-red-500" :
                          "text-yellow-500"
                        )}>
                          {bet.status === 'Won' ? `+$${bet.potentialPayout.toFixed(2)}` :
                           bet.status === 'Lost' ? `-$${bet.stake.toFixed(2)}` :
                           'Push'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {dayBets.length > 0 && (
              <div className="p-4 border-t border-border bg-background/50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Staked</span>
                  <span className="text-white font-medium">${totalStaked.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">ROI for Day</span>
                  <span className={cn(
                    "font-medium",
                    totalProfit >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {totalStaked > 0 ? ((totalProfit / totalStaked) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const Analytics = () => {
  const { bets, stats } = useBets();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const finishedBets = useMemo(() => bets.filter(b => b.status === 'Won' || b.status === 'Lost' || b.status === 'Pushed'), [bets]);

  // Biggest Win & Biggest Loss
  const { biggestWin, biggestLoss } = useMemo(() => {
    let biggestWin = { amount: 0, bet: null as typeof finishedBets[0] | null };
    let biggestLoss = { amount: 0, bet: null as typeof finishedBets[0] | null };

    finishedBets.forEach(bet => {
      if (bet.status === 'Won') {
        const profit = bet.potentialPayout;
        if (profit > biggestWin.amount) {
          biggestWin = { amount: profit, bet };
        }
      } else if (bet.status === 'Lost') {
        if (bet.stake > biggestLoss.amount) {
          biggestLoss = { amount: bet.stake, bet };
        }
      }
    });

    return { biggestWin, biggestLoss };
  }, [finishedBets]);

  // Win/Loss Streaks
  const { currentStreak, longestWinStreak, longestLossStreak } = useMemo(() => {
    const sorted = [...finishedBets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentStreak = { type: 'none' as 'win' | 'loss' | 'none', count: 0 };
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    sorted.forEach(bet => {
      if (bet.status === 'Won') {
        tempWinStreak++;
        tempLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
        currentStreak = { type: 'win', count: tempWinStreak };
      } else if (bet.status === 'Lost') {
        tempLossStreak++;
        tempWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
        currentStreak = { type: 'loss', count: tempLossStreak };
      } else {
        // Push doesn't break streaks but doesn't count
      }
    });

    return { currentStreak, longestWinStreak, longestLossStreak };
  }, [finishedBets]);

  // Average Odds Analysis
  const oddsAnalysis = useMemo(() => {
    const wonBets = finishedBets.filter(b => b.status === 'Won');
    const lostBets = finishedBets.filter(b => b.status === 'Lost');

    const avgOddsWon = wonBets.length > 0
      ? wonBets.reduce((sum, b) => sum + b.odds, 0) / wonBets.length
      : 0;
    const avgOddsLost = lostBets.length > 0
      ? lostBets.reduce((sum, b) => sum + b.odds, 0) / lostBets.length
      : 0;
    const avgOddsAll = finishedBets.length > 0
      ? finishedBets.reduce((sum, b) => sum + b.odds, 0) / finishedBets.length
      : 0;

    // Implied probability from American odds
    const impliedProb = (odds: number) => {
      if (odds > 0) return 100 / (odds + 100);
      return Math.abs(odds) / (Math.abs(odds) + 100);
    };

    const avgImpliedProb = finishedBets.length > 0
      ? finishedBets.reduce((sum, b) => sum + impliedProb(b.odds), 0) / finishedBets.length * 100
      : 0;

    return { avgOddsWon, avgOddsLost, avgOddsAll, avgImpliedProb };
  }, [finishedBets]);

  // Outcomes by Sport
  const sportPerformance = useMemo(() => {
    const stats: Record<string, { bets: number, wins: number, losses: number, pushes: number }> = {};

    finishedBets.forEach(bet => {
      const sport = bet.sport.toUpperCase();
      if (!stats[sport]) stats[sport] = { bets: 0, wins: 0, losses: 0, pushes: 0 };

      stats[sport].bets += 1;
      if (bet.status === 'Won') {
        stats[sport].wins += 1;
      } else if (bet.status === 'Lost') {
        stats[sport].losses += 1;
      } else if (bet.status === 'Pushed') {
        stats[sport].pushes += 1;
      }
    });

    return Object.keys(stats)
      .map(sport => ({
        name: sport,
        wins: stats[sport].wins,
        losses: stats[sport].losses,
        pushes: stats[sport].pushes,
        count: stats[sport].bets,
        winRate: (stats[sport].wins / stats[sport].bets) * 100
      }))
      .sort((a, b) => b.wins - a.wins);
  }, [finishedBets]);

  // Performance by Bet Type
  const typePerformance = useMemo(() => {
    const stats: Record<string, { profit: number, bets: number, wins: number }> = {};
    finishedBets.forEach(bet => {
      if (!stats[bet.type]) stats[bet.type] = { profit: 0, bets: 0, wins: 0 };
      stats[bet.type].bets += 1;
      if (bet.status === 'Won') {
        stats[bet.type].profit += bet.potentialPayout;
        stats[bet.type].wins += 1;
      }
      if (bet.status === 'Lost') stats[bet.type].profit -= bet.stake;
    });

    return Object.keys(stats).map(type => ({
      name: type,
      profit: stats[type].profit,
      bets: stats[type].bets,
      winRate: (stats[type].wins / stats[type].bets) * 100
    })).sort((a, b) => b.profit - a.profit);
  }, [finishedBets]);

  // Wins Over Time (cumulative wins by date)
  const winsOverTime = useMemo(() => {
    const sorted = [...finishedBets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by date
    const byDate: Record<string, { wins: number, losses: number, total: number }> = {};

    sorted.forEach(bet => {
      const dateKey = new Date(bet.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!byDate[dateKey]) byDate[dateKey] = { wins: 0, losses: 0, total: 0 };

      byDate[dateKey].total += 1;
      if (bet.status === 'Won') byDate[dateKey].wins += 1;
      else if (bet.status === 'Lost') byDate[dateKey].losses += 1;
    });

    // Convert to cumulative
    let cumulativeWins = 0;
    let cumulativeLosses = 0;

    return Object.keys(byDate).map(date => {
      cumulativeWins += byDate[date].wins;
      cumulativeLosses += byDate[date].losses;

      return {
        date,
        wins: cumulativeWins,
        losses: cumulativeLosses,
        daily: byDate[date].wins
      };
    });
  }, [finishedBets]);

  // Monthly Calendar Data (show each day of the selected month)
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Build stats for each day
    const dayStats: Record<number, { wins: number, losses: number, totalOdds: number, bets: number }> = {};

    finishedBets.forEach(bet => {
      const betDate = new Date(bet.date);
      if (betDate.getFullYear() === year && betDate.getMonth() === month) {
        const day = betDate.getDate();
        if (!dayStats[day]) dayStats[day] = { wins: 0, losses: 0, totalOdds: 0, bets: 0 };

        dayStats[day].bets += 1;
        dayStats[day].totalOdds += bet.odds;
        if (bet.status === 'Won') {
          dayStats[day].wins += 1;
        } else if (bet.status === 'Lost') {
          dayStats[day].losses += 1;
        }
      }
    });

    // Generate calendar grid (6 rows x 7 columns max)
    const weeks: Array<Array<{ day: number | null, wins: number, losses: number, avgOdds: number, isToday: boolean }>> = [];
    let currentWeek: Array<{ day: number | null, wins: number, losses: number, avgOdds: number, isToday: boolean }> = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ day: null, wins: 0, losses: 0, avgOdds: 0, isToday: false });
    }

    // Check if selected month is the current month
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    // Add each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const stats = dayStats[day] || { wins: 0, losses: 0, totalOdds: 0, bets: 0 };
      const avgOdds = stats.bets > 0 ? Math.round(stats.totalOdds / stats.bets) : 0;
      const isToday = isCurrentMonth && day === now.getDate();

      currentWeek.push({ day, wins: stats.wins, losses: stats.losses, avgOdds, isToday });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining days in last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push({ day: null, wins: 0, losses: 0, avgOdds: 0, isToday: false });
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return {
      monthName: format(calendarMonth, 'MMMM yyyy'),
      weeks,
      year,
      month
    };
  }, [finishedBets, calendarMonth]);

  // Handle day click - create a Date object for the selected day
  const handleDayClick = (day: number | null) => {
    if (day === null) return;
    const clickedDate = new Date(calendarData.year, calendarData.month, day);
    setSelectedDay(clickedDate);
  };

  const COLORS = ['#00FF85', '#00C2FF', '#FF4757', '#FFD166', '#8B5CF6', '#F472B6'];

  // Format odds for display
  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  if (finishedBets.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Analytics</h2>
        <p>Place and settle some bets to see analytics data.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen overflow-hidden flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto"
    >
      <h1 className="text-3xl font-semibold tracking-tight mb-6 flex-shrink-0">Analytics</h1>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                stats.profit >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                <DollarSign className={cn("w-5 h-5", stats.profit >= 0 ? "text-green-500" : "text-red-500")} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Profit</p>
                <p className={cn(
                  "text-xl font-bold",
                  stats.profit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Win Rate</p>
                <p className="text-xl font-bold text-white">
                  {stats.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">{stats.wins}W - {stats.losses}L</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                stats.roi >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                {stats.roi >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">ROI</p>
                <p className={cn(
                  "text-xl font-bold",
                  stats.roi >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Bets</p>
                <p className="text-xl font-bold text-white">{stats.totalBets}</p>
                <p className="text-xs text-gray-500">{stats.pending} pending</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Trophy className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Biggest Win</p>
                <p className="text-xl font-bold text-green-500">
                  +${biggestWin.amount.toFixed(2)}
                </p>
                {biggestWin.bet && (
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                    {biggestWin.bet.matchup}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Biggest Loss</p>
                <p className="text-xl font-bold text-red-500">
                  -${biggestLoss.amount.toFixed(2)}
                </p>
                {biggestLoss.bet && (
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                    {biggestLoss.bet.matchup}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                currentStreak.type === 'win' ? "bg-green-500/20" : currentStreak.type === 'loss' ? "bg-red-500/20" : "bg-gray-500/20"
              )}>
                <Flame className={cn(
                  "w-5 h-5",
                  currentStreak.type === 'win' ? "text-green-500" : currentStreak.type === 'loss' ? "text-red-500" : "text-gray-500"
                )} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Current Streak</p>
                <p className={cn(
                  "text-xl font-bold",
                  currentStreak.type === 'win' ? "text-green-500" : currentStreak.type === 'loss' ? "text-red-500" : "text-gray-400"
                )}>
                  {currentStreak.count > 0 ? `${currentStreak.count}${currentStreak.type === 'win' ? 'W' : 'L'}` : '-'}
                </p>
                <p className="text-xs text-gray-500">
                  Best: {longestWinStreak}W / Worst: {longestLossStreak}L
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Calendar className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg Odds</p>
                <p className="text-xl font-bold text-white">
                  {formatOdds(Math.round(oddsAnalysis.avgOddsAll))}
                </p>
                <p className="text-xs text-gray-500">
                  {oddsAnalysis.avgImpliedProb.toFixed(1)}% implied
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wins Over Time - Line Chart */}
          <Card>
            <h3 className="text-lg font-bold mb-4">Wins Over Time</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={winsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} />
                  <YAxis stroke="#666" fontSize={11} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#141417', borderColor: '#1F1F23', borderRadius: '8px' }}
                    labelStyle={{ color: '#888' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wins"
                    name="Wins"
                    stroke="#00FF85"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#00FF85' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="losses"
                    name="Losses"
                    stroke="#FF4757"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#FF4757' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Monthly Performance - Calendar View */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{calendarData.monthName}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCalendarMonth(new Date())}
                  className="px-2 py-1 rounded-lg text-xs text-accent hover:bg-accent/10 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="w-full">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="space-y-1">
                {calendarData.weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="grid grid-cols-7 gap-1">
                    {week.map((dayData, dayIdx) => (
                      <button
                        key={dayIdx}
                        onClick={() => handleDayClick(dayData.day)}
                        disabled={dayData.day === null}
                        className={cn(
                          "aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all",
                          dayData.day === null ? "bg-transparent cursor-default" :
                          dayData.wins > dayData.losses ? "bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 cursor-pointer" :
                          dayData.losses > dayData.wins ? "bg-red-500/30 border border-red-500/50 hover:bg-red-500/40 cursor-pointer" :
                          (dayData.wins > 0 && dayData.wins === dayData.losses) ? "bg-gray-500/30 border border-gray-500/50 hover:bg-gray-500/40 cursor-pointer" :
                          "bg-white/5 hover:bg-white/10 cursor-pointer",
                          dayData.isToday && "ring-2 ring-accent"
                        )}
                      >
                        {dayData.day && (
                          <>
                            <span className={cn(
                              "font-medium",
                              dayData.isToday ? "text-accent" : "text-gray-300"
                            )}>
                              {dayData.day}
                            </span>
                            {(dayData.wins > 0 || dayData.losses > 0) ? (
                              <>
                                <span className="text-[10px] text-green-400">{dayData.wins}W</span>
                                <span className="text-[10px] text-red-400">{dayData.losses}L</span>
                              </>
                            ) : (
                              <span className="text-[9px] text-gray-600">-</span>
                            )}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/50" />
                  <span>Winning Day</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" />
                  <span>Losing Day</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-white/5" />
                  <span>No Bets</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Outcomes by Sport - Stacked Bar Chart */}
          <Card>
            <h3 className="text-lg font-bold mb-4">Outcomes by Sport</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sportPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#666" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#666" fontSize={11} tickLine={false} width={60} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#141417', borderColor: '#1F1F23', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="wins" name="Wins" stackId="a" fill="#00FF85" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="losses" name="Losses" stackId="a" fill="#FF4757" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto">
              {sportPerformance.map(sport => (
                <div key={sport.name} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
                  <span className="font-medium">{sport.name}</span>
                  <div className="text-right">
                    <span className="block font-bold text-white">
                      {sport.wins}W - {sport.losses}L{sport.pushes > 0 ? ` - ${sport.pushes}P` : ''}
                    </span>
                    <span className="text-xs text-gray-500">{sport.winRate.toFixed(0)}% win rate</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Performance by Bet Type - Bar Chart */}
          <Card>
            <h3 className="text-lg font-bold mb-4">Performance by Bet Type</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typePerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#666" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                  <YAxis type="category" dataKey="name" stroke="#666" fontSize={11} tickLine={false} width={80} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#141417', borderColor: '#1F1F23', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit/Loss']}
                  />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                    {typePerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#00FF85' : '#FF4757'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {typePerformance.map(type => (
                <div key={type.name} className="flex justify-between items-center text-xs text-gray-400">
                  <span>{type.name}</span>
                  <span>{type.bets} bets · {type.winRate.toFixed(0)}% win rate</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        date={selectedDay}
        bets={finishedBets}
      />
    </motion.div>
  );
};
