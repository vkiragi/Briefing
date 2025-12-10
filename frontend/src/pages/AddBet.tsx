import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Plus, Trash2, Search, Clock, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { Autocomplete } from '../components/ui/Autocomplete';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Game } from '../types';

const SPORTS = [
    { id: 'nba', label: 'NBA', icon: '🏀' },
    { id: 'nfl', label: 'NFL', icon: '🏈' },
    { id: 'mlb', label: 'MLB', icon: '⚾' },
    { id: 'nhl', label: 'NHL', icon: '🏒' },
    { id: 'soccer', label: 'Soccer', icon: '⚽' },
    { id: 'tennis', label: 'Tennis', icon: '🎾' },
    { id: 'f1', label: 'F1', icon: '🏎️' },
    { id: 'ufc', label: 'UFC', icon: '🥊' },
];

// NBA-specific bet types matching terminal CLI
const NBA_BET_TYPES = [
    { id: 'player_prop', label: 'Player Prop' },
    { id: 'moneyline', label: 'Moneyline (Full Game)' },
    { id: 'spread', label: 'Point Spread (Full Game)' },
    { id: 'total', label: 'Total Score (Full Game)' },
    { id: '1h_bets', label: '1st Half Bets (ML, Spread, Total)' },
    { id: '1q_bets', label: '1st Quarter Bets (ML, Spread, Total)' },
    { id: 'team_total', label: 'Team Total Points' },
];

// Generic bet types for other sports
const GENERIC_BET_TYPES = ['Moneyline', 'Spread', 'Total', 'Parlay', 'Prop'];

export const AddBet = () => {
  const navigate = useNavigate();
  const { addBet } = useBets();
  
  const [formData, setFormData] = useState({
    sport: 'nba',
    type: 'player_prop',
    matchup: '',
    selection: '',
    odds: -110,
    stake: '',
    date: new Date().toISOString().split('T')[0],
    book: '',
    selectedTeam: '',
    spreadValue: '',
    totalLine: '',
    overUnder: 'Over',
    // NBA specific fields
    playerName: '',
    marketType: '',
    line: '',
    side: 'Over',
    periodBetType: '', // For 1Q/1H bets (moneyline, spread, total)
  });

  const [games, setGames] = useState<Game[]>([]);
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [parlayLegs, setParlayLegs] = useState<any[]>([]);
  const [playerValidation, setPlayerValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message: string;
  }>({ status: 'idle', message: '' });
  const [playerSuggestions, setPlayerSuggestions] = useState<Array<{ displayName: string; teamName: string }>>([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get bet types based on sport
  const getBetTypes = () => {
    if (formData.sport === 'nba') {
      return NBA_BET_TYPES;
    }
    // Add more sport-specific types here as needed
    return GENERIC_BET_TYPES.map(t => ({ id: t.toLowerCase(), label: t }));
  };

  const betTypes = getBetTypes();

  // Format game date/time to PST
  const formatGameTime = (dateStr: string) => {
    try {
      // Handle special cases
      if (!dateStr || dateStr === 'Unknown date' || dateStr === 'TBD') {
        return dateStr;
      }

      // Try to parse as ISO date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr; // Return original if can't parse
      }

      // Format to PST
      const pstFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return pstFormatter.format(date) + ' PST';
    } catch (e) {
      return dateStr; // Fallback to original string
    }
  };

  useEffect(() => {
    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const [schedule, live] = await Promise.all([
          api.getSchedule(formData.sport, 20),
          api.getScores(formData.sport, 10, true)
        ]);
        
        // Filter out placeholder "No live games" responses
        const validLive = live.filter(g => g.state !== 'no_live' && g.status !== 'No live games');
        const validSchedule = schedule.filter(g => g.state !== 'tbd' && g.status !== 'TBD');

        setGames(validSchedule);
        setLiveGames(validLive);
      } catch (e) {
        console.error("Failed to fetch games", e);
        setGames([]);
        setLiveGames([]);
      } finally {
        setLoadingGames(false);
      }
    };
    
    if (['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'f1', 'tennis', 'ufc'].includes(formData.sport)) {
         fetchGames();
    } else {
        setGames([]);
        setLiveGames([]);
    }
  }, [formData.sport]);

  const handleRefresh = () => {
    setLoadingGames(true);
    // Re-trigger effect by momentarily clearing games or just calling fetch logic
    // Easier to extract fetch logic but it depends on state.
    // For now, duplicate the check or use a refresh trigger state.
    // Actually, we can just call the api directly here
    const fetchData = async () => {
        try {
            const [schedule, live] = await Promise.all([
              api.getSchedule(formData.sport, 20),
              api.getScores(formData.sport, 10, true)
            ]);
            const validLive = live.filter(g => g.state !== 'no_live' && g.status !== 'No live games');
            const validSchedule = schedule.filter(g => g.state !== 'tbd' && g.status !== 'TBD');
            setGames(validSchedule);
            setLiveGames(validLive);
        } catch (e) {
            console.error("Refreshed failed", e);
        } finally {
            setLoadingGames(false);
        }
    };
    fetchData();
  };

  const validatePlayerName = async () => {
    if (!formData.playerName.trim() || !selectedGame) {
      setPlayerValidation({ status: 'idle', message: '' });
      return;
    }

    const eventId = selectedGame.event_id || selectedGame.competition_id;
    if (!eventId) {
      setPlayerValidation({ 
        status: 'invalid', 
        message: 'Game ID not available. Please select a game from the list.' 
      });
      return;
    }

    setPlayerValidation({ status: 'validating', message: 'Validating player...' });
    
    try {
      const result = await api.validatePlayer(formData.sport, eventId, formData.playerName);
      
      if (result.found && result.displayName && result.teamName) {
        setPlayerValidation({ 
          status: 'valid', 
          message: `✓ ${result.displayName} (${result.teamName})` 
        });
        // Update form with full player name
        setFormData(prev => ({ ...prev, playerName: result.displayName }));
      } else {
        setPlayerValidation({ 
          status: 'invalid', 
          message: result.message || 'Player not found in this game' 
        });
      }
    } catch (error) {
      setPlayerValidation({ 
        status: 'invalid', 
        message: 'Error validating player. Please try again.' 
      });
    }
  };

  // Search for players with debouncing
  const searchPlayers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 1 || !selectedGame) {
      setPlayerSuggestions([]);
      return;
    }

    const eventId = selectedGame.event_id || selectedGame.competition_id;
    if (!eventId) {
      setPlayerSuggestions([]);
      return;
    }

    setSearchingPlayers(true);
    try {
      const results = await api.searchPlayers(formData.sport, eventId, query, 10);
      setPlayerSuggestions(results);
    } catch (error) {
      console.error('Failed to search players:', error);
      setPlayerSuggestions([]);
    } finally {
      setSearchingPlayers(false);
    }
  }, [selectedGame, formData.sport]);

  // Debounced player search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (formData.playerName.trim().length >= 1 && selectedGame) {
      searchTimeoutRef.current = setTimeout(() => {
        searchPlayers(formData.playerName);
      }, 300); // 300ms debounce
    } else {
      setPlayerSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [formData.playerName, selectedGame, searchPlayers]);

  const calculatePayout = (stake: number, odds: number) => {
    if (!stake || !odds) return 0;
    if (odds > 0) {
      return stake * (odds / 100);
    } else {
      return stake * (100 / Math.abs(odds));
    }
  };

  const getDecimalOdds = (american: number) => {
    if (american > 0) return (american / 100) + 1;
    return (100 / Math.abs(american)) + 1;
  };

  const calculateParlayOdds = () => {
      const combinedDecimal = parlayLegs.reduce((acc, leg) => acc * getDecimalOdds(leg.odds), 1);
      if (combinedDecimal === 1) return 0;
      
      let american = 0;
      if (combinedDecimal >= 2) {
          american = (combinedDecimal - 1) * 100;
      } else {
          american = -100 / (combinedDecimal - 1);
      }
      return Math.round(american);
  };

  const totalParlayOdds = calculateParlayOdds();
  const potentialProfit = formData.type === 'parlay' 
    ? calculatePayout(Number(formData.stake), totalParlayOdds)
    : calculatePayout(Number(formData.stake), Number(formData.odds));

  const handleAddLeg = () => {
      if (!formData.selection) {
          alert("Please make a selection");
          return;
      }
      const leg = {
          sport: formData.sport,
          matchup: formData.matchup,
          selection: formData.selection,
          odds: Number(formData.odds),
      };
      setParlayLegs([...parlayLegs, leg]);
      
      // Reset selection but keep sport
      setFormData(prev => ({
          ...prev,
          selection: '',
          selectedTeam: '',
          spreadValue: '',
          totalLine: '',
          odds: -110
      }));
      setSelectedGame(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate NBA player prop before submitting
    let validatedPlayerName = formData.playerName;
    let validatedTeamName = '';
    
    if (formData.sport === 'nba' && formData.type === 'player_prop' && formData.playerName.trim()) {
      if (!selectedGame) {
        setPlayerValidation({ 
          status: 'invalid', 
          message: 'Please select a game first' 
        });
        return;
      }

      const eventId = selectedGame.event_id || selectedGame.competition_id;
      if (!eventId) {
        setPlayerValidation({ 
          status: 'invalid', 
          message: 'Game ID not available. Please select a different game.' 
        });
        return;
      }

      // Show validating state
      setPlayerValidation({ status: 'validating', message: 'Validating player...' });

      try {
        const result = await api.validatePlayer(formData.sport, eventId, formData.playerName);
        
        if (!result.found || !result.displayName) {
          setPlayerValidation({ 
            status: 'invalid', 
            message: result.message || 'Player not found in this game. Please check the name and try again.' 
          });
          return; // Don't submit if player not found
        }

        // Store validated names
        validatedPlayerName = result.displayName;
        validatedTeamName = result.teamName || '';
        
        // Update form with validated name
        setFormData(prev => ({ ...prev, playerName: validatedPlayerName }));
      } catch (error) {
        console.error('Validation error:', error);
        setPlayerValidation({ 
          status: 'invalid', 
          message: 'Error validating player. Please try again.' 
        });
        return;
      }

      // Clear validation status after successful validation
      setPlayerValidation({ status: 'idle', message: '' });
    }

    if (formData.type === 'parlay') {
        if (parlayLegs.length < 2) {
            alert("Please add at least 2 legs for a parlay");
            return;
        }
        
        const totalOdds = calculateParlayOdds();
        const stakeAmount = Number(formData.stake) || 0;
        const payout = calculatePayout(stakeAmount, totalOdds);

        addBet({
            sport: 'Mixed',
            type: 'Parlay',
            matchup: 'Parlay',
            selection: `${parlayLegs.length} Leg Parlay`,
            odds: totalOdds,
            stake: stakeAmount,
            date: formData.date,
            book: formData.book,
            potentialPayout: payout,
            legs: parlayLegs
        });
        navigate('/');
        return;
    }
    
    // Convert NBA bet types to display-friendly format
    let betType = formData.type;
    if (formData.sport === 'nba') {
      if (formData.type === 'player_prop') betType = 'Prop';
      else if (formData.type === 'moneyline') betType = 'Moneyline';
      else if (formData.type === 'spread') betType = 'Spread';
      else if (formData.type === 'total') betType = 'Total';
      else if (formData.type === '1h_bets') betType = '1st Half';
      else if (formData.type === '1q_bets') betType = '1st Quarter';
      else if (formData.type === 'team_total') betType = 'Team Total';
    }
    
    const stakeAmount = Number(formData.stake) || 0;
    
    // Build bet object with prop tracking data if applicable
    const betData: any = {
      sport: formData.sport,
      type: betType as any,
      matchup: formData.matchup,
      selection: formData.selection,
      odds: Number(formData.odds),
      stake: stakeAmount,
      date: formData.date,
      book: formData.book,
      potentialPayout: potentialProfit,
    };

    // Add prop tracking data for player props
    if (formData.sport === 'nba' && formData.type === 'player_prop' && selectedGame) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = validatedPlayerName; // Use validated name
      betData.team_name = validatedTeamName; // Use validated team
      betData.market_type = formData.marketType;
      betData.line = parseFloat(formData.line);
      betData.side = formData.side.toLowerCase();
    }

    // Add tracking data for 1st Half bets
    if (formData.sport === 'nba' && formData.type === '1h_bets' && selectedGame && formData.periodBetType) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.team_name = formData.selectedTeam;

      if (formData.periodBetType === 'moneyline') {
        betData.player_name = '1st Half Moneyline';
        betData.market_type = '1h_moneyline';
        betData.line = 0;
        betData.side = formData.selectedTeam.toLowerCase();
      } else if (formData.periodBetType === 'spread') {
        betData.player_name = '1st Half Spread';
        betData.market_type = '1h_spread';
        betData.line = parseFloat(formData.line);
        betData.side = formData.selectedTeam.toLowerCase();
      } else if (formData.periodBetType === 'total') {
        betData.player_name = '1st Half Total';
        betData.market_type = '1h_total_score';
        betData.line = parseFloat(formData.line);
        betData.side = formData.side.toLowerCase();
      }
    }

    // Add tracking data for 1st Quarter bets
    if (formData.sport === 'nba' && formData.type === '1q_bets' && selectedGame && formData.periodBetType) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.team_name = formData.selectedTeam;

      if (formData.periodBetType === 'moneyline') {
        betData.player_name = '1st Quarter Moneyline';
        betData.market_type = '1q_moneyline';
        betData.line = 0;
        betData.side = formData.selectedTeam.toLowerCase();
      } else if (formData.periodBetType === 'spread') {
        betData.player_name = '1st Quarter Spread';
        betData.market_type = '1q_spread';
        betData.line = parseFloat(formData.line);
        betData.side = formData.selectedTeam.toLowerCase();
      } else if (formData.periodBetType === 'total') {
        betData.player_name = '1st Quarter Total';
        betData.market_type = '1q_total_score';
        betData.line = parseFloat(formData.line);
        betData.side = formData.side.toLowerCase();
      }
    }

    // Add tracking data for Team Total bets
    if (formData.sport === 'nba' && formData.type === 'team_total' && selectedGame) {
      const isHome = formData.selectedTeam === selectedGame.home_team;
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = `${formData.selectedTeam} Total Points`;
      betData.team_name = formData.selectedTeam;
      betData.market_type = isHome ? 'home_team_points' : 'away_team_points';
      betData.line = parseFloat(formData.line);
      betData.side = formData.side.toLowerCase();
    }

    // Add tracking data for full-game Moneyline bets
    if (formData.sport === 'nba' && formData.type === 'moneyline' && selectedGame) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = 'Moneyline';
      betData.team_name = formData.selectedTeam;
      betData.market_type = 'moneyline';
      betData.line = 0;
      betData.side = formData.selectedTeam.toLowerCase();
    }

    // Add tracking data for full-game Spread bets
    if (formData.sport === 'nba' && formData.type === 'spread' && selectedGame) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = 'Spread';
      betData.team_name = formData.selectedTeam;
      betData.market_type = 'spread';
      betData.line = parseFloat(formData.spreadValue);
      betData.side = formData.selectedTeam.toLowerCase();
    }

    // Add tracking data for full-game Total bets
    if (formData.sport === 'nba' && formData.type === 'total' && selectedGame) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = 'Total Score';
      betData.team_name = `${selectedGame.away_team} / ${selectedGame.home_team}`;
      betData.market_type = 'total_score';
      betData.line = parseFloat(formData.totalLine);
      betData.side = formData.overUnder.toLowerCase();
    }

    addBet(betData);
    navigate('/');
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setPlayerValidation({ status: 'idle', message: '' }); // Reset validation when game changes
    setFormData(prev => ({
        ...prev,
        matchup: `${game.away_team} @ ${game.home_team}`,
        selection: '', 
        selectedTeam: '',
        date: game.date.includes(',') ? new Date().toISOString().split('T')[0] : prev.date
    }));
  };

  // Auto-build selection string based on inputs
  useEffect(() => {
    if (formData.sport === 'nba') {
      if (formData.type === 'player_prop' && formData.playerName && formData.marketType && formData.line && formData.side) {
        const marketLabel = formData.marketType.replace(/_/g, ' ');
        setFormData(prev => ({ ...prev, selection: `${formData.playerName} ${formData.side} ${formData.line} ${marketLabel}` }));
      } else if (formData.type === 'moneyline' && formData.selectedTeam) {
        setFormData(prev => ({ ...prev, selection: formData.selectedTeam }));
      } else if (formData.type === 'spread' && formData.selectedTeam && formData.spreadValue) {
        const spread = parseFloat(formData.spreadValue);
        const spreadStr = spread > 0 ? `+${spread}` : spread.toString();
        setFormData(prev => ({ ...prev, selection: `${formData.selectedTeam} ${spreadStr}` }));
      } else if (formData.type === 'total' && formData.totalLine) {
        setFormData(prev => ({ ...prev, selection: `${formData.overUnder} ${formData.totalLine}` }));
      } else if ((formData.type === '1h_bets' || formData.type === '1q_bets') && formData.periodBetType && formData.selectedTeam) {
        const period = formData.type === '1h_bets' ? '1H' : '1Q';
        if (formData.periodBetType === 'moneyline') {
          setFormData(prev => ({ ...prev, selection: `${period} ${formData.selectedTeam} ML` }));
        } else if (formData.periodBetType === 'spread' && formData.line) {
          const spread = parseFloat(formData.line);
          const spreadStr = spread > 0 ? `+${spread}` : spread.toString();
          setFormData(prev => ({ ...prev, selection: `${period} ${formData.selectedTeam} ${spreadStr}` }));
        } else if (formData.periodBetType === 'total' && formData.line && formData.side) {
          setFormData(prev => ({ ...prev, selection: `${period} ${formData.side} ${formData.line}` }));
        }
      } else if (formData.type === 'team_total' && formData.selectedTeam && formData.line && formData.side) {
        setFormData(prev => ({ ...prev, selection: `${formData.selectedTeam} ${formData.side} ${formData.line}` }));
      }
    } else {
      // Legacy logic for other sports
      if (!selectedGame) return;
      if (formData.type === 'moneyline' && formData.selectedTeam) {
        setFormData(prev => ({ ...prev, selection: formData.selectedTeam }));
      } else if (formData.type === 'spread' && formData.selectedTeam && formData.spreadValue) {
        const spread = parseFloat(formData.spreadValue);
        const spreadStr = spread > 0 ? `+${spread}` : spread.toString();
        setFormData(prev => ({ ...prev, selection: `${formData.selectedTeam} ${spreadStr}` }));
      } else if (formData.type === 'total' && formData.totalLine) {
        setFormData(prev => ({ ...prev, selection: `${formData.overUnder} ${formData.totalLine}` }));
      }
    }
  }, [
    formData.sport,
    formData.type, 
    formData.selectedTeam, 
    formData.spreadValue, 
    formData.totalLine, 
    formData.overUnder, 
    formData.playerName,
    formData.marketType,
    formData.line,
    formData.side,
    formData.periodBetType,
    selectedGame
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen overflow-hidden flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto"
    >
      {/* Header Section */}
      <div className="flex-shrink-0 mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">New Wager</h1>
        </div>

        {/* Sport Selector */}
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {SPORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setFormData({...formData, sport: s.id})}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg border transition-all whitespace-nowrap",
                formData.sport === s.id
                  ? "bg-accent/20 border-accent text-white shadow-[0_0_10px_rgba(0,255,133,0.2)]"
                  : "bg-card border-border text-gray-400 hover:border-gray-600 hover:text-white"
              )}
            >
              <span className="text-lg">{s.icon}</span>
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Bet Form Section */}
        <div className="lg:col-span-7 space-y-6 overflow-y-auto pr-2 min-h-0">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Bet Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {betTypes.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormData({
                                ...formData, 
                                type: t.id,
                                selection: '',
                                selectedTeam: '',
                                spreadValue: '',
                                totalLine: '',
                                overUnder: 'Over',
                                playerName: '',
                                marketType: '',
                                line: '',
                                side: 'Over',
                                periodBetType: '',
                            })}
                            className={cn(
                                "px-4 py-3 rounded-lg text-sm font-medium transition-colors border text-left",
                                formData.type === t.id
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent border-border text-gray-400 hover:text-white hover:border-gray-600"
                            )}
                          >
                              {t.label}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Matchup & Selection - Dynamic based on bet type */}
              <div className="space-y-4 bg-background/50 p-4 rounded-xl border border-border/50">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Matchup</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lakers @ Warriors"
                    className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                    value={formData.matchup}
                    onChange={(e) => setFormData({...formData, matchup: e.target.value})}
                    required={formData.type !== 'parlay'}
                  />
                  {selectedGame && (
                      <p className="text-xs text-accent flex items-center gap-1">
                          <CheckCircle size={10} /> Linked to schedule
                      </p>
                  )}
                </div>

                {/* NBA Player Prop */}
                {formData.type === 'player_prop' && formData.sport === 'nba' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Player Name</label>
                      {selectedGame ? (
                        <Autocomplete
                          value={formData.playerName}
                          onChange={(value) => {
                            setFormData({...formData, playerName: value});
                            setPlayerValidation({ status: 'idle', message: '' });
                          }}
                          onSelect={(option) => {
                            setFormData({...formData, playerName: option.value});
                            setPlayerValidation({ status: 'valid', message: '' });
                          }}
                          options={playerSuggestions.map(player => ({
                            value: player.displayName,
                            label: player.displayName,
                            description: player.teamName,
                          }))}
                          loading={searchingPlayers}
                          placeholder="Type player name to search..."
                          disabled={!selectedGame}
                          emptyMessage={!selectedGame ? 'Please select a game first' : 'No players found'}
                        />
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Please select a game first"
                          className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors opacity-50"
                          disabled
                        />
                      )}
                      {playerValidation.status === 'invalid' && (
                        <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertCircle size={16} />
                          <span>{playerValidation.message}</span>
                        </div>
                      )}
                      {!selectedGame && (
                        <p className="text-xs text-yellow-500 flex items-center gap-1">
                          <AlertCircle size={12} /> Please select a game first to search for players
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Market Type</label>
                      <select 
                        className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                        value={formData.marketType}
                        onChange={(e) => setFormData({...formData, marketType: e.target.value})}
                        required
                      >
                        <option value="">Select Market</option>
                        <option value="points">Points</option>
                        <option value="rebounds">Rebounds</option>
                        <option value="assists">Assists</option>
                        <option value="three_pointers_made">3-Pointers Made</option>
                        <option value="blocks">Blocks</option>
                        <option value="steals">Steals</option>
                        <option value="double_double">Double Double</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase">Line</label>
                        <input 
                          type="number" 
                          step="0.5"
                          placeholder="e.g. 25.5"
                          className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                          value={formData.line}
                          onChange={(e) => setFormData({...formData, line: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase">Side</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setFormData({...formData, side: 'Over'})} className={cn("p-3 rounded-lg border-2 transition-all font-semibold", formData.side === 'Over' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Over</button>
                          <button type="button" onClick={() => setFormData({...formData, side: 'Under'})} className={cn("p-3 rounded-lg border-2 transition-all font-semibold", formData.side === 'Under' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Under</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* NBA Moneyline */}
                {formData.type === 'moneyline' && formData.sport === 'nba' && selectedGame && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase">Select Winner</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.away_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.away_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.away_team}</button>
                      <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.home_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.home_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.home_team}</button>
                    </div>
                  </div>
                )}

                {/* NBA Spread */}
                {formData.type === 'spread' && formData.sport === 'nba' && selectedGame && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Select Team</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.away_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.away_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.away_team}</button>
                        <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.home_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.home_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.home_team}</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Spread Line</label>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="e.g. -3.5 or +7.0"
                        className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                        value={formData.spreadValue}
                        onChange={(e) => setFormData({...formData, spreadValue: e.target.value})}
                        required
                      />
                    </div>
                  </>
                )}

                {/* NBA Total */}
                {formData.type === 'total' && formData.sport === 'nba' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Total Line</label>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="e.g. 220.5"
                        className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                        value={formData.totalLine}
                        onChange={(e) => setFormData({...formData, totalLine: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Side</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setFormData({...formData, overUnder: 'Over'})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.overUnder === 'Over' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Over</button>
                        <button type="button" onClick={() => setFormData({...formData, overUnder: 'Under'})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.overUnder === 'Under' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Under</button>
                      </div>
                    </div>
                  </>
                )}

                {/* NBA 1st Half/Quarter Bets */}
                {(formData.type === '1h_bets' || formData.type === '1q_bets') && formData.sport === 'nba' && selectedGame && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">
                        {formData.type === '1h_bets' ? '1st Half' : '1st Quarter'} Bet Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setFormData({...formData, periodBetType: 'moneyline'})} className={cn("p-3 rounded-lg border-2 transition-all font-semibold text-sm", formData.periodBetType === 'moneyline' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>ML</button>
                        <button type="button" onClick={() => setFormData({...formData, periodBetType: 'spread'})} className={cn("p-3 rounded-lg border-2 transition-all font-semibold text-sm", formData.periodBetType === 'spread' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Spread</button>
                        <button type="button" onClick={() => setFormData({...formData, periodBetType: 'total'})} className={cn("p-3 rounded-lg border-2 transition-all font-semibold text-sm", formData.periodBetType === 'total' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Total</button>
                      </div>
                    </div>
                    
                    {formData.periodBetType && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-400 uppercase">Select Team</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.away_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.away_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.away_team}</button>
                            <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.home_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.home_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.home_team}</button>
                          </div>
                        </div>
                        
                        {(formData.periodBetType === 'spread' || formData.periodBetType === 'total') && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase">
                              {formData.periodBetType === 'spread' ? 'Spread' : 'Total'} Line
                            </label>
                            <input 
                              type="number" 
                              step="0.5"
                              placeholder={formData.periodBetType === 'spread' ? "e.g. -2.5" : "e.g. 110.5"}
                              className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                              value={formData.line}
                              onChange={(e) => setFormData({...formData, line: e.target.value})}
                              required
                            />
                          </div>
                        )}
                        
                        {formData.periodBetType === 'total' && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase">Side</label>
                            <div className="grid grid-cols-2 gap-3">
                              <button type="button" onClick={() => setFormData({...formData, side: 'Over'})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.side === 'Over' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Over</button>
                              <button type="button" onClick={() => setFormData({...formData, side: 'Under'})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.side === 'Under' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Under</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* NBA Team Total Points */}
                {formData.type === 'team_total' && formData.sport === 'nba' && selectedGame && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Select Team</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.away_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.away_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.away_team}</button>
                        <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.home_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.home_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.home_team}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase">Total Line</label>
                        <input 
                          type="number" 
                          step="0.5"
                          placeholder="e.g. 110.5"
                          className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                          value={formData.line}
                          onChange={(e) => setFormData({...formData, line: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase">Side</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setFormData({...formData, side: 'Over'})} className={cn("p-3 rounded-lg border-2 transition-all font-semibold", formData.side === 'Over' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Over</button>
                          <button type="button" onClick={() => setFormData({...formData, side: 'Under'})} className={cn("p-3 rounded-lg border-2 transition-all font-semibold", formData.side === 'Under' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>Under</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Generic/Other Sports - Fallback to simple selection */}
                {!['player_prop', 'moneyline', 'spread', 'total', '1h_bets', '1q_bets', 'team_total'].includes(formData.type) && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase">Selection</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Warriors -5.5"
                      className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                      value={formData.selection}
                      onChange={(e) => setFormData({...formData, selection: e.target.value})}
                      required={formData.type !== 'parlay'}
                    />
                  </div>
                )}
              </div>

              {/* Odds & Stake */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Odds</label>
                      <input 
                        type="number" 
                        placeholder="-110"
                        className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                        value={formData.odds}
                        onChange={(e) => setFormData({...formData, odds: Number(e.target.value)})}
                        required
                      />
                  </div>
                  {formData.type !== 'parlay' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase">Stake (Optional)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-gray-500">$</span>
                          <input 
                            type="number" 
                            placeholder="100"
                            className="w-full bg-background border border-border rounded-lg p-3 pl-7 text-white focus:outline-none focus:border-accent transition-colors"
                            value={formData.stake}
                            onChange={(e) => setFormData({...formData, stake: e.target.value})}
                          />
                        </div>
                      </div>
                  )}
              </div>

              {formData.type === 'parlay' ? (
                  <button 
                    type="button" 
                    onClick={handleAddLeg} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                      <Plus size={18} /> Add Leg
                  </button>
              ) : (
                  <div className="pt-4 flex items-center justify-between border-t border-border">
                    <div>
                       <div className="text-xs text-gray-400">Potential Payout</div>
                       <div className="text-xl font-bold text-accent">
                         ${(Number(formData.stake || 0) + potentialProfit).toFixed(2)}
                       </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={playerValidation.status === 'validating'}
                      className={cn(
                        "bg-accent text-background font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2",
                        playerValidation.status === 'validating' 
                          ? "opacity-70 cursor-not-allowed" 
                          : "hover:bg-accent/90"
                      )}
                    >
                      {playerValidation.status === 'validating' ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Validating...
                        </>
                      ) : (
                        'Place Bet'
                      )}
                    </button>
                  </div>
              )}
            </form>
          </Card>

          {/* Parlay Slip */}
          {formData.type === 'parlay' && parlayLegs.length > 0 && (
              <Card className="p-6 border-accent/30 bg-accent/5">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <CheckCircle size={20} className="text-accent"/> Parlay Slip
                  </h3>
                  <div className="space-y-2 mb-6">
                      {parlayLegs.map((leg, i) => (
                          <div key={i} className="flex justify-between items-center bg-background/50 p-3 rounded border border-border">
                              <div>
                                  <div className="font-bold text-sm">{leg.selection}</div>
                                  <div className="text-xs text-gray-400">{leg.matchup}</div>
                              </div>
                              <button onClick={() => setParlayLegs(parlayLegs.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 size={16} /></button>
                          </div>
                      ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                          <div className="text-xs text-gray-400 uppercase">Odds</div>
                          <div className="text-xl font-bold text-white">{totalParlayOdds > 0 ? '+' : ''}{totalParlayOdds}</div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-400 uppercase">Stake (Optional)</label>
                          <input type="number" placeholder="100" className="w-full bg-background border border-border rounded-lg p-2 text-white" value={formData.stake} onChange={(e) => setFormData({...formData, stake: e.target.value})} />
                      </div>
                  </div>
                  <button onClick={handleSubmit} className="w-full bg-accent text-background font-bold py-3 rounded-lg hover:bg-accent/90 transition-colors">Place Parlay (${(Number(formData.stake || 0) + potentialProfit).toFixed(2)})</button>
              </Card>
          )}
        </div>

        {/* Games Sidebar */}
        <div className="lg:col-span-5 flex flex-col overflow-hidden min-h-0">
          <Card className="p-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {loadingGames ? <Clock className="animate-spin text-accent" size={18} /> : <Calendar size={18} />}
                Games
              </h3>
              <div className="flex items-center gap-2">
                {!loadingGames && liveGames.length > 0 && (
                  <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full animate-pulse border border-red-500/20">
                    {liveGames.length} LIVE
                  </span>
                )}
                <button onClick={handleRefresh} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Refresh Games">
                  <Clock size={14} className={loadingGames ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
           
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
             {loadingGames ? (
                 <div className="space-y-3">
                     {[1,2,3].map(i => (
                         <div key={i} className="bg-card/50 h-24 rounded-lg animate-pulse"></div>
                     ))}
                 </div>
             ) : (
                <>
                   {/* Live Games Section - Always at top, like ESPN */}
                   {liveGames.length > 0 ? (
                     <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <h4 className="text-sm font-bold text-red-500 uppercase">Live Now</h4>
                          <span className="text-xs text-gray-500 ml-auto">({liveGames.length})</span>
                        </div>
                        {liveGames.map((game, i) => {
                          // Format time and quarter for live games (same logic as Dashboard)
                          const formatLiveTime = () => {
                            if (game.state === 'pre') {
                              return game.date || 'TBD';
                            }
                            
                            if (game.state === 'post' || game.completed) {
                              return 'Final';
                            }
                            
                            // Check for halftime
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
                              if (game.display_clock && game.display_clock !== '0.0') {
                                return `${quarter} ${game.display_clock}`;
                              }
                              
                              return quarter;
                            }
                            
                            return game.display_clock || game.status || 'Live';
                          };
                          
                          return (
                            <div 
                              key={`live-${i}`} 
                              onClick={() => handleGameSelect(game)}
                              className={cn(
                                "bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/40 p-4 rounded-xl cursor-pointer hover:border-red-500/60 transition-all group relative overflow-hidden shadow-lg shadow-red-500/10",
                                selectedGame === game ? "ring-2 ring-accent bg-accent/10 border-accent" : ""
                              )}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                  <span className="text-[10px] font-bold text-red-500 uppercase">LIVE</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-semibold text-red-400">{formatLiveTime()}</span>
                                  <span className="text-gray-500">{game.status}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                                <div className="text-right">
                                  <div className="font-bold text-base text-gray-300">{game.away_team}</div>
                                  <div className="text-3xl font-mono font-bold text-white mt-1">{game.away_score}</div>
                                </div>
                                <div className="text-xs text-gray-500 font-bold">VS</div>
                                <div>
                                  <div className="font-bold text-base text-gray-300">{game.home_team}</div>
                                  <div className="text-3xl font-mono font-bold text-white mt-1">{game.home_score}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                     </div>
                   ) : (
                     <div className="text-center text-gray-500 py-4 text-sm mb-4">
                       No live games
                     </div>
                   )}

                   {/* Upcoming Games Section */}
                   <div className={cn("space-y-3", liveGames.length > 0 && "pt-4 border-t-2 border-border/50")}>
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">
                          Upcoming Schedule
                          {games.length > 0 && <span className="text-xs text-gray-500 ml-2">({games.length})</span>}
                        </h4>
                        {games.length > 0 ? (
                            games.map((game, i) => (
                                 <div 
                                    key={`upcoming-${i}`} 
                                    onClick={() => handleGameSelect(game)}
                                    className={cn(
                                        "bg-card border border-border p-4 rounded-xl cursor-pointer hover:bg-card/80 hover:border-accent/30 transition-all group",
                                        selectedGame === game ? "ring-2 ring-accent bg-accent/5 border-accent" : ""
                                    )}
                                 >
                                    <div className="flex justify-between items-center mb-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> {formatGameTime(game.date)}</span>
                                        <span className="group-hover:text-accent transition-colors opacity-0 group-hover:opacity-100 text-xs">Select</span>
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                        <div className="text-right font-bold text-base">{game.away_team}</div>
                                        <div className="text-xs text-gray-600 font-bold">@</div>
                                        <div className="font-bold text-base">{game.home_team}</div>
                                    </div>
                                 </div>
                             ))
                        ) : (
                             <div className="text-center text-gray-500 py-8 bg-card/30 rounded-xl flex flex-col items-center gap-2">
                                <p className="text-sm">No upcoming games found</p>
                             </div>
                        )}
                    </div>
                 </>
             )}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
