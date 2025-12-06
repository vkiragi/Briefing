import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from 'recharts';
import { motion } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

export const Analytics = () => {
  const { bets } = useBets();

  const finishedBets = useMemo(() => bets.filter(b => b.status === 'Won' || b.status === 'Lost' || b.status === 'Pushed'), [bets]);

  // Performance by Sport
  const sportPerformance = useMemo(() => {
    const stats: Record<string, { profit: number, bets: number, wins: number }> = {};
    
    finishedBets.forEach(bet => {
      const sport = bet.sport.toUpperCase();
      if (!stats[sport]) stats[sport] = { profit: 0, bets: 0, wins: 0 };
      
      stats[sport].bets += 1;
      if (bet.status === 'Won') {
        stats[sport].profit += bet.potentialPayout;
        stats[sport].wins += 1;
      } else if (bet.status === 'Lost') {
        stats[sport].profit -= bet.stake;
      }
    });

    return Object.keys(stats)
      .map(sport => ({
        name: sport,
        value: stats[sport].profit,
        count: stats[sport].bets,
        winRate: (stats[sport].wins / stats[sport].bets) * 100
      }))
      .sort((a, b) => b.value - a.value);
  }, [finishedBets]);

  // Performance by Bet Type
  const typePerformance = useMemo(() => {
    const stats: Record<string, number> = {};
    finishedBets.forEach(bet => {
       if (!stats[bet.type]) stats[bet.type] = 0;
       if (bet.status === 'Won') stats[bet.type] += bet.potentialPayout;
       if (bet.status === 'Lost') stats[bet.type] -= bet.stake;
    });

    return Object.keys(stats).map(type => ({
      name: type,
      profit: stats[type]
    }));
  }, [finishedBets]);

  // Cumulative Profit Over Time
  const profitOverTime = useMemo(() => {
    // Sort bets by date ascending
    const sorted = [...finishedBets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulative = 0;
    
    return sorted.map((bet, index) => {
      let change = 0;
      if (bet.status === 'Won') change = bet.potentialPayout;
      if (bet.status === 'Lost') change = -bet.stake;
      
      cumulative += change;
      
      return {
        date: new Date(bet.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        profit: cumulative,
        betIndex: index + 1
      };
    });
  }, [finishedBets]);

  const COLORS = ['#00FF85', '#00C2FF', '#FF4757', '#FFD166', '#8B8B8B'];

  if (finishedBets.length === 0) {
      return (
          <div className="p-8 text-center text-gray-500">
              <h2 className="text-2xl font-bold text-white mb-2">Analytics</h2>
              <p>Place and settle some bets to see analytics data.</p>
          </div>
      )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen overflow-hidden flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto"
    >
      <h1 className="text-3xl font-bold mb-6 flex-shrink-0">Analytics</h1>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profit by Sport - Pie Chart */}
        <Card>
          <h3 className="text-lg font-bold mb-6">Profit Distribution by Sport</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sportPerformance.filter(s => s.value > 0)} // Only show profitable sports in pie for visualization simplicity
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sportPerformance.filter(s => s.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#141417', borderColor: '#1F1F23', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
             {sportPerformance.map(sport => (
                 <div key={sport.name} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
                     <span className="font-medium">{sport.name} <span className="text-gray-500 text-xs">({sport.count} bets)</span></span>
                     <div className="text-right">
                         <span className={cn("block font-bold", sport.value >= 0 ? "text-accent" : "text-red-500")}>
                             {sport.value >= 0 ? '+' : ''}${sport.value.toFixed(2)}
                         </span>
                         <span className="text-xs text-gray-500">{sport.winRate.toFixed(1)}% Win Rate</span>
                     </div>
                 </div>
             ))}
          </div>
        </Card>

        {/* Profit Trend - Line Chart */}
        <Card>
          <h3 className="text-lg font-bold mb-6">Profit Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#141417', borderColor: '#1F1F23', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit']}
                    labelStyle={{ color: '#888' }}
                />
                <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#00FF85" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#00FF85' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Profit by Bet Type - Bar Chart */}
        <Card className="lg:col-span-2">
           <h3 className="text-lg font-bold mb-6">Performance by Bet Type</h3>
           <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#141417', borderColor: '#1F1F23', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit/Loss']}
                />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {typePerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#00FF85' : '#FF4757'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        </div>
      </div>
    </motion.div>
  );
};
