import { useMemo } from 'react';
import {
  Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Target, DollarSign, Trophy, Flame, BarChart3, Calendar } from 'lucide-react';

export const Analytics = () => {
  const { bets, stats } = useBets();

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

  // Monthly Performance (show all months from first bet to current month)
  const monthlyPerformance = useMemo(() => {
    const stats: Record<string, { bets: number, wins: number, losses: number, totalOdds: number }> = {};

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find the earliest bet date
    let earliestDate = now;
    finishedBets.forEach(bet => {
      const betDate = new Date(bet.date);
      if (betDate < earliestDate) {
        earliestDate = betDate;
      }
    });

    // Generate all months from earliest bet to current month
    const startYear = earliestDate.getFullYear();
    const startMonth = earliestDate.getMonth();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();

    for (let year = startYear; year <= endYear; year++) {
      const monthStart = (year === startYear) ? startMonth : 0;
      const monthEnd = (year === endYear) ? endMonth : 11;

      for (let month = monthStart; month <= monthEnd; month++) {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        stats[monthKey] = { bets: 0, wins: 0, losses: 0, totalOdds: 0 };
      }
    }

    // Populate with bet data
    finishedBets.forEach(bet => {
      const date = new Date(bet.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!stats[monthKey]) stats[monthKey] = { bets: 0, wins: 0, losses: 0, totalOdds: 0 };

      stats[monthKey].bets += 1;
      stats[monthKey].totalOdds += bet.odds;
      if (bet.status === 'Won') {
        stats[monthKey].wins += 1;
      } else if (bet.status === 'Lost') {
        stats[monthKey].losses += 1;
      }
    });

    return Object.keys(stats)
      .sort()
      .map(key => {
        // Parse year and month from key (YYYY-MM) to avoid timezone issues
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month - 1, 1); // month is 0-indexed
        const isCurrentMonth = key === currentMonthKey;
        const avgOdds = stats[key].bets > 0 ? stats[key].totalOdds / stats[key].bets : 0;
        return {
          month: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          wins: stats[key].wins,
          losses: stats[key].losses,
          bets: stats[key].bets,
          winRate: stats[key].bets > 0 ? (stats[key].wins / stats[key].bets) * 100 : 0,
          avgOdds: Math.round(avgOdds),
          isCurrentMonth
        };
      });
  }, [finishedBets]);

  const COLORS = ['#00FF85', '#00C2FF', '#FF4757', '#FFD166', '#8B5CF6', '#F472B6'];

  // Format odds for display
  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  if (finishedBets.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <h2 className="text-2xl font-bold text-white mb-2">Analytics</h2>
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
      <h1 className="text-3xl font-bold mb-6 flex-shrink-0">Analytics</h1>

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

          {/* Monthly Performance - Bar Chart */}
          <Card>
            <h3 className="text-lg font-bold mb-4">Monthly Performance</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="month" stroke="#666" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#666" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={11} tickLine={false} tickFormatter={(val) => val > 0 ? `+${val}` : val} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#141417', borderColor: '#1F1F23', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Avg Odds') return [value > 0 ? `+${value}` : value, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="wins" name="Wins" fill="#00FF85" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="losses" name="Losses" fill="#FF4757" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="avgOdds" name="Avg Odds" stroke="#FFD166" strokeWidth={2} dot={{ fill: '#FFD166', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {monthlyPerformance.slice(-3).map(m => (
                <div key={m.month} className={cn("p-2 rounded-lg", m.isCurrentMonth ? "bg-accent/10 border border-accent/30" : "bg-white/5")}>
                  <div className="font-medium text-gray-400">{m.month}</div>
                  <div className="text-white font-bold">{m.wins}W - {m.losses}L</div>
                  <div className="text-gray-500">{m.winRate.toFixed(0)}% · {m.avgOdds > 0 ? '+' : ''}{m.avgOdds}</div>
                </div>
              ))}
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
    </motion.div>
  );
};
