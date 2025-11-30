import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useBets } from "../context/BetContext";
import { Card } from "../components/ui/Card";
import { api } from "../lib/api";
import { Game } from "../types";
import { cn } from "../lib/utils";

export const Dashboard = () => {
  const { stats, bankroll, bets } = useBets();
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        // Fetch NBA live games as default example, or could cycle/fetch multiple
        const games = await api.getScores('nba', 5, true); 
        // If no live games, maybe fetch schedule or scores
        if (!games || games.length === 0 || (games.length === 1 && games[0].status === 'No live games')) {
            const scheduled = await api.getSchedule('nba', 5);
             setLiveGames(scheduled);
        } else {
            setLiveGames(games);
        }
      } catch (e) {
        console.error("Failed to fetch games", e);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchLive();
  }, []);

  const recentBets = bets.slice(0, 5);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8 space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bankroll Card */}
        <Card className="bg-gradient-to-br from-card to-card/50 border-accent/20">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Total Bankroll</h3>
            <div className="p-2 bg-accent/10 rounded-full">
              <DollarSign size={16} className="text-accent" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${bankroll.toFixed(2)}
          </div>
          <div className={cn("text-xs flex items-center gap-1", stats.profit >= 0 ? "text-accent" : "text-red-500")}>
             {stats.profit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
             <span className="font-medium">${Math.abs(stats.profit).toFixed(2)}</span>
             <span className="text-gray-500 ml-1">all time</span>
          </div>
        </Card>

        {/* Win Rate Card */}
        <Card>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Win Rate</h3>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Activity size={16} className="text-blue-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {stats.wins}W - {stats.losses}L
          </div>
        </Card>

        {/* ROI Card */}
        <Card>
           <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-sm font-medium">ROI</h3>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <TrendingUp size={16} className="text-purple-500" />
            </div>
          </div>
          <div className={cn("text-3xl font-bold mb-1", stats.roi >= 0 ? "text-accent" : "text-red-500")}>
            {stats.roi.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            Return on investment
          </div>
        </Card>
        
         {/* Pending Card */}
         <Card>
           <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Pending Bets</h3>
            <div className="p-2 bg-yellow-500/10 rounded-full">
              <Activity size={16} className="text-yellow-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stats.pending}
          </div>
          <div className="text-xs text-gray-500">
            Active wagers
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bets Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent Bets</h2>
            <Link to="/history" className="text-sm text-accent hover:underline">View All</Link>
          </div>
          
          <div className="space-y-3">
            {recentBets.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-card/50 rounded-xl border border-dashed border-border">
                    No bets placed yet.
                    <br/>
                    <Link to="/add" className="text-accent hover:underline mt-2 inline-block">Place your first bet</Link>
                </div>
            ) : (
                recentBets.map(bet => (
                <div key={bet.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-center hover:bg-card/80 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-1 h-12 rounded-full", 
                            bet.status === 'Won' ? 'bg-accent' : 
                            bet.status === 'Lost' ? 'bg-red-500' : 
                            bet.status === 'Pending' ? 'bg-gray-500' : 'bg-yellow-500'
                        )} />
                        <div>
                            <div className="font-bold text-sm md:text-base">{bet.selection}</div>
                            <div className="text-xs text-gray-400">{bet.matchup} • {bet.type}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={cn("font-bold", bet.status === 'Won' ? "text-accent" : bet.status === 'Lost' ? "text-red-500" : "text-white")}>
                            {bet.status === 'Won' ? `+$${bet.potentialPayout.toFixed(2)}` : 
                             bet.status === 'Lost' ? `-$${bet.stake.toFixed(2)}` : 
                             `$${bet.stake.toFixed(2)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                        </div>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Live/Upcoming Games Column (Backend Integration) */}
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">NBA Action</h2>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Live Updates
                </span>
            </div>
            
            <div className="space-y-3">
                {loadingGames ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-24 bg-card/50 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : liveGames.length > 0 ? (
                    liveGames.map((game, i) => (
                        <div key={i} className="bg-card border border-border rounded-xl p-4 text-sm">
                            <div className="flex justify-between items-center mb-2 text-xs text-gray-500">
                                <span>{game.status}</span>
                                <span>{game.display_clock || game.date}</span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold">{game.home_team}</span>
                                <span className="font-mono">{game.home_score}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-400">{game.away_team}</span>
                                <span className="font-mono text-gray-400">{game.away_score}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-gray-500 text-sm text-center py-8">No games available</div>
                )}
            </div>
        </div>
      </div>
    </motion.div>
  );
};
