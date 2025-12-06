import { useEffect, useState, useMemo, useCallback } from "react";
import { TrendingUp, Activity, Settings, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useBets } from "../context/BetContext";
import { Card } from "../components/ui/Card";
import { PropTracker } from "../components/PropTracker";
import { SettingsModal } from "../components/SettingsModal";
import { api } from "../lib/api";
import { Game } from "../types";
import { cn } from "../lib/utils";

export const Dashboard = () => {
  const { stats, bets } = useBets();
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [propsData, setPropsData] = useState<Map<string, any>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [gamesLastUpdated, setGamesLastUpdated] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('refreshInterval');
    return saved ? parseInt(saved, 10) : 30000; // Default 30 seconds
  });

  // Get active props that need tracking
  const activeProps = useMemo(() => bets.filter(b => 
    b.status === 'Pending' && 
    b.type === 'Prop' && 
    b.event_id && 
    b.player_name &&
    b.market_type &&
    b.line !== undefined
  ), [bets]);

  // Combine all props that need tracking
  const allPropsToTrack = useMemo(() => 
    activeProps.map(b => b.id),
    [activeProps]
  );

  // Refresh props data
  const refreshPropsData = useCallback(async () => {
    if (allPropsToTrack.length === 0) return;
    
    setRefreshing(true);
    try {
      const result = await api.refreshProps(allPropsToTrack);
      
      setPropsData(prev => {
        const newPropsData = new Map(prev);
        result.bets.forEach((propData: any) => {
          newPropsData.set(propData.id, propData);
        });
        return newPropsData;
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh props:', error);
    } finally {
      setRefreshing(false);
    }
  }, [allPropsToTrack]);

  // Save refresh interval to localStorage
  useEffect(() => {
    localStorage.setItem('refreshInterval', refreshInterval.toString());
  }, [refreshInterval]);

  // Auto-refresh props based on user setting
  useEffect(() => {
    if (allPropsToTrack.length > 0) {
      refreshPropsData(); // Initial load
      
      const interval = setInterval(() => {
        refreshPropsData();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [allPropsToTrack.length, refreshPropsData, refreshInterval]); // Re-run when props to track change or interval changes

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
        setGamesLastUpdated(new Date());
      } catch (e) {
        console.error("Failed to fetch games", e);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchLive();
    
    // Auto-refresh games based on refresh interval
    const interval = setInterval(fetchLive, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Live Props Tracking */}
      {activeProps.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">Live Props Tracker</h2>
              {lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={18} className="text-gray-400" />
              </button>
              <button 
                onClick={refreshPropsData}
                disabled={refreshing}
                className="text-sm text-accent hover:underline disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeProps.map(bet => {
              const liveData = propsData.get(bet.id);
              const enrichedBet = liveData ? { ...bet, ...liveData } : bet;
              return <PropTracker key={bet.id} bet={enrichedBet} />;
            })}
          </div>
        </div>
      )}

      {/* Live/Upcoming Games Section */}
      <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">NBA Action</h2>
                  {gamesLastUpdated && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>Updated {gamesLastUpdated.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Live Updates
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {loadingGames ? (
                    <>
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-20 bg-card/50 animate-pulse rounded-lg" />
                        ))}
                    </>
                ) : liveGames.length > 0 ? (
                    liveGames.map((game, i) => {
                      // Format time and quarter display
                      const formatGameTime = () => {
                        if (game.state === 'pre') {
                          return game.date || 'TBD';
                        }
                        
                        if (game.state === 'post' || game.completed) {
                          return 'Final';
                        }
                        
                        // Check for halftime - multiple ways it might be indicated
                        const statusLower = (game.status || '').toLowerCase();
                        const isHalftime = 
                          statusLower.includes('half') || 
                          statusLower.includes('halftime') ||
                          (game.period === 2 && game.clock_seconds === 0 && game.state === 'in');
                        
                        if (isHalftime) {
                          return 'Halftime';
                        }
                        
                        // Live game - show quarter and time
                        if (game.state === 'in' && game.period) {
                          const quarter = `Q${game.period}`;
                          
                          // If we have clock_seconds, format as MM:SS
                          if (game.clock_seconds !== undefined && game.clock_seconds > 0) {
                            const minutes = Math.floor(game.clock_seconds / 60);
                            const seconds = game.clock_seconds % 60;
                            const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                            return `${quarter} ${formattedTime}`;
                          }
                          
                          // Fallback to display_clock if available
                          if (game.display_clock) {
                            return `${quarter} ${game.display_clock}`;
                          }
                          
                          return quarter;
                        }
                        
                        return game.display_clock || game.status || 'Live';
                      };
                      
                      return (
                        <div key={i} className="bg-card border border-border rounded-lg p-3 hover:bg-card/80 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-gray-500 uppercase">
                                  {game.state === 'in' ? 'Live' : game.status || 'Scheduled'}
                                </span>
                                <span className="text-xs font-mono text-gray-400 font-semibold">
                                  {formatGameTime()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold truncate">{game.home_team}</span>
                                <span className="text-lg font-mono font-bold ml-2">{game.home_score}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400 truncate">{game.away_team}</span>
                                <span className="text-lg font-mono text-gray-400 ml-2">{game.away_score}</span>
                            </div>
                        </div>
                      );
                    })
                ) : (
                    <div className="text-gray-500 text-sm text-center py-8 col-span-full">No games available</div>
                )}
            </div>
          </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
      />
    </motion.div>
  );
};
