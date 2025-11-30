import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, Search, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Game } from '../types';

const BET_TYPES = ['Moneyline', 'Spread', 'Total', 'Parlay', 'Prop'];
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer', 'ufc', 'tennis', 'f1'];

export const AddBet = () => {
  const navigate = useNavigate();
  const { addBet } = useBets();
  
  const [formData, setFormData] = useState({
    sport: 'nfl',
    type: 'Moneyline',
    matchup: '',
    selection: '',
    odds: -110,
    stake: '',
    date: new Date().toISOString().split('T')[0],
    book: '',
    // Additional fields for specific bet types
    selectedTeam: '',
    spreadValue: '',
    totalLine: '',
    overUnder: 'Over',
  });

  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoadingGames(true);
      try {
        const schedule = await api.getSchedule(formData.sport, 20);
        setGames(schedule);
      } catch (e) {
        console.error("Failed to fetch schedule", e);
      } finally {
        setLoadingGames(false);
      }
    };
    
    // Only fetch for supported sports in backend
    if (['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'f1'].includes(formData.sport)) {
         fetchSchedule();
    } else {
        setGames([]);
    }
  }, [formData.sport]);

  const calculatePayout = (stake: number, odds: number) => {
    if (!stake || !odds) return 0;
    if (odds > 0) {
      return stake * (odds / 100);
    } else {
      return stake * (100 / Math.abs(odds));
    }
  };

  const potentialProfit = calculatePayout(Number(formData.stake), Number(formData.odds));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate bet-specific fields
    if (selectedGame && formData.type === 'Moneyline' && !formData.selectedTeam) {
      alert('Please select a team for your moneyline bet');
      return;
    }
    if (selectedGame && formData.type === 'Spread' && (!formData.selectedTeam || !formData.spreadValue)) {
      alert('Please select a team and enter the point spread');
      return;
    }
    if (selectedGame && formData.type === 'Total' && !formData.totalLine) {
      alert('Please enter the total line');
      return;
    }
    
    addBet({
      sport: formData.sport,
      type: formData.type as any,
      matchup: formData.matchup,
      selection: formData.selection,
      odds: Number(formData.odds),
      stake: Number(formData.stake),
      date: formData.date,
      book: formData.book,
      potentialPayout: potentialProfit,
    });
    navigate('/');
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setFormData(prev => ({
        ...prev,
        matchup: `${game.away_team} @ ${game.home_team}`,
        // Pre-fill selection with home team as default example
        selection: '', 
        selectedTeam: '',
        date: game.date.includes(',') ? new Date().toISOString().split('T')[0] : prev.date // Keep current date if parsing fails or rely on manual
    }));
  };

  // Update selection field when bet type specific fields change
  useEffect(() => {
    if (!selectedGame) return;

    if (formData.type === 'Moneyline' && formData.selectedTeam) {
      setFormData(prev => ({
        ...prev,
        selection: formData.selectedTeam
      }));
    } else if (formData.type === 'Spread' && formData.selectedTeam && formData.spreadValue) {
      const spread = parseFloat(formData.spreadValue);
      const spreadStr = spread > 0 ? `+${spread}` : spread.toString();
      setFormData(prev => ({
        ...prev,
        selection: `${formData.selectedTeam} ${spreadStr}`
      }));
    } else if (formData.type === 'Total' && formData.totalLine) {
      setFormData(prev => ({
        ...prev,
        selection: `${formData.overUnder} ${formData.totalLine}`
      }));
    }
  }, [formData.type, formData.selectedTeam, formData.spreadValue, formData.totalLine, formData.overUnder, selectedGame]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8 max-w-3xl mx-auto"
    >
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-8">Add New Bet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sport & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Sport</label>
                  <select 
                    className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors appearance-none"
                    value={formData.sport}
                    onChange={(e) => setFormData({...formData, sport: e.target.value})}
                  >
                    {SPORTS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Bet Type</label>
                  <select 
                    className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                    value={formData.type}
                    onChange={(e) => setFormData({
                      ...formData, 
                      type: e.target.value,
                      selection: '',
                      selectedTeam: '',
                      spreadValue: '',
                      totalLine: '',
                      overUnder: 'Over'
                    })}
                  >
                    {BET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Bet Type Information */}
              {formData.type === 'Moneyline' && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-blue-400 mb-1">💰 Moneyline Bet</div>
                  <div className="text-gray-300">Bet on which team will win the game outright. No point spread involved.</div>
                </div>
              )}
              {formData.type === 'Spread' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-purple-400 mb-1">📊 Point Spread Bet</div>
                  <div className="text-gray-300">Bet on a team to win by more than the spread (favorite) or lose by less than the spread (underdog).</div>
                </div>
              )}
              {formData.type === 'Total' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-green-400 mb-1">🎯 Total (Over/Under)</div>
                  <div className="text-gray-300">Bet on whether the combined score of both teams will be over or under a specific number.</div>
                </div>
              )}

              {/* Matchup & Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Matchup</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lakers @ Warriors"
                    className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                    value={formData.matchup}
                    onChange={(e) => setFormData({...formData, matchup: e.target.value})}
                    required
                  />
                  {selectedGame && (
                      <p className="text-xs text-accent flex items-center gap-1">
                          <CheckCircle size={10} /> Linked to schedule
                      </p>
                  )}
                </div>

                {/* Conditional rendering based on bet type */}
                {formData.type === 'Moneyline' && selectedGame && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase">Select Team</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, selectedTeam: selectedGame.away_team})}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all font-semibold",
                          formData.selectedTeam === selectedGame.away_team
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-white"
                        )}
                      >
                        {selectedGame.away_team}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, selectedTeam: selectedGame.home_team})}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all font-semibold",
                          formData.selectedTeam === selectedGame.home_team
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-white"
                        )}
                      >
                        {selectedGame.home_team}
                      </button>
                    </div>
                  </div>
                )}

                {formData.type === 'Spread' && selectedGame && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-400 uppercase">Select Team & Spread</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, selectedTeam: selectedGame.away_team})}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all font-semibold",
                          formData.selectedTeam === selectedGame.away_team
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-white"
                        )}
                      >
                        {selectedGame.away_team}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, selectedTeam: selectedGame.home_team})}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all font-semibold",
                          formData.selectedTeam === selectedGame.home_team
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-white"
                        )}
                      >
                        {selectedGame.home_team}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Point Spread</label>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="e.g. -5.5 or +3.5"
                        className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                        value={formData.spreadValue}
                        onChange={(e) => setFormData({...formData, spreadValue: e.target.value})}
                        required
                      />
                      <p className="text-xs text-gray-500">Enter negative (-) for favorites, positive (+) for underdogs</p>
                    </div>
                  </div>
                )}

                {formData.type === 'Total' && selectedGame && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-400 uppercase">Over/Under</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, overUnder: 'Over'})}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all font-semibold",
                          formData.overUnder === 'Over'
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-white"
                        )}
                      >
                        Over
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, overUnder: 'Under'})}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all font-semibold",
                          formData.overUnder === 'Under'
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-white"
                        )}
                      >
                        Under
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Total Line</label>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="e.g. 47.5"
                        className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                        value={formData.totalLine}
                        onChange={(e) => setFormData({...formData, totalLine: e.target.value})}
                        required
                      />
                      <p className="text-xs text-gray-500">Enter the total points line</p>
                    </div>
                  </div>
                )}

                {/* Manual input fallback for non-game linked bets or other types */}
                {(!selectedGame || !['Moneyline', 'Spread', 'Total'].includes(formData.type)) && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase">Selection (Team/Prop)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Warriors -5.5"
                      className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                      value={formData.selection}
                      onChange={(e) => setFormData({...formData, selection: e.target.value})}
                      required
                    />
                  </div>
                )}

                {/* Display computed selection for preview */}
                {formData.selection && selectedGame && ['Moneyline', 'Spread', 'Total'].includes(formData.type) && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase mb-1">Your Bet</div>
                    <div className="text-lg font-bold text-accent">{formData.selection}</div>
                  </div>
                )}
              </div>

              {/* Odds & Stake */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Odds (American)</label>
                  <input 
                    type="number" 
                    placeholder="-110"
                    className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                    value={formData.odds}
                    onChange={(e) => setFormData({...formData, odds: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Stake ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-500">$</span>
                    <input 
                      type="number" 
                      placeholder="100"
                      className="w-full bg-background border border-border rounded-lg p-3 pl-7 text-white focus:outline-none focus:border-accent transition-colors"
                      value={formData.stake}
                      onChange={(e) => setFormData({...formData, stake: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Date & Sportsbook */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Sportsbook</label>
                  <input 
                    type="text" 
                    placeholder="e.g. DraftKings"
                    className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                    value={formData.book}
                    onChange={(e) => setFormData({...formData, book: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-border">
                <div>
                   <div className="text-xs text-gray-400">Potential Payout</div>
                   <div className="text-xl font-bold text-accent">
                     ${(Number(formData.stake || 0) + potentialProfit).toFixed(2)}
                   </div>
                   <div className="text-xs text-gray-500">
                     (Profit: ${potentialProfit.toFixed(2)})
                   </div>
                </div>
                <button 
                  type="submit" 
                  className="bg-accent text-background font-bold py-3 px-8 rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Place Bet
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Upcoming Games Sidebar */}
        <div className="space-y-4">
           <h3 className="font-bold text-lg">Upcoming Games</h3>
           <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
             {loadingGames ? (
                 <div className="text-center text-gray-500 py-8">Loading schedule...</div>
             ) : games.length > 0 ? (
                 games.map((game, i) => (
                     <div 
                        key={i} 
                        onClick={() => handleGameSelect(game)}
                        className={cn(
                            "bg-card border border-border p-3 rounded-lg cursor-pointer hover:bg-card/80 transition-all text-sm group",
                            selectedGame === game ? "border-accent bg-accent/5" : ""
                        )}
                     >
                        <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                            <span>{game.date.split(' - ')[0]}</span>
                            <span className="group-hover:text-accent transition-colors">Use</span>
                        </div>
                        <div className="font-bold">{game.away_team}</div>
                        <div className="text-xs text-gray-500 my-0.5">@</div>
                        <div className="font-bold">{game.home_team}</div>
                     </div>
                 ))
             ) : (
                 <div className="text-center text-gray-500 py-8 bg-card/30 rounded-lg">
                    No upcoming games found for this sport.
                 </div>
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
};
