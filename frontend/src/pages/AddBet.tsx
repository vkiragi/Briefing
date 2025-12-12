import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Plus, Trash2, Clock, Calendar, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { Autocomplete } from '../components/ui/Autocomplete';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Game } from '../types';

const SPORTS = [
  { id: 'nba', label: 'NBA', icon: '🏀', logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/nba.png&w=100&h=100&transparent=true' },
  { id: 'nfl', label: 'NFL', icon: '🏈', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500-dark/nfl.png' },
  { id: 'mlb', label: 'MLB', icon: '⚾', logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/mlb.png&w=100&h=100&transparent=true' },
  { id: 'nhl', label: 'NHL', icon: '🏒', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500-dark/nhl.png' },
  { id: 'soccer', label: 'Soccer', icon: '⚽', logo: '' },
  { id: 'tennis', label: 'Tennis', icon: '🎾', logo: 'https://a.espncdn.com/combiner/i?img=/redesign/assets/img/icons/ESPN-icon-tennis.png&w=100&h=100' },
  { id: 'f1', label: 'F1', icon: '🏎️', logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/f1.png&w=100&h=100' },
  { id: 'ufc', label: 'UFC', icon: '🥊', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png' },
];

// NBA-specific bet types matching terminal CLI
const NBA_BET_TYPES = [
  { id: 'player_prop', label: 'Player Prop' },
  { id: 'moneyline', label: 'Moneyline' },
  { id: 'spread', label: 'Point Spread' },
  { id: 'total', label: 'Total Score' },
  { id: '1h_bets', label: '1st Half' },
  { id: '1q_bets', label: '1st Quarter' },
  { id: 'team_total', label: 'Team Total' },
];

// Generic bet types for other sports
const GENERIC_BET_TYPES = ['Moneyline', 'Spread', 'Total', 'Parlay', 'Prop'];

type Step = 'league' | 'game' | 'bet';

export const AddBet = () => {
  const navigate = useNavigate();
  const { addBet } = useBets();

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('league');

  const [formData, setFormData] = useState({
    sport: '',
    type: '',
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
    periodBetType: '',
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
    return GENERIC_BET_TYPES.map(t => ({ id: t.toLowerCase(), label: t }));
  };

  const betTypes = getBetTypes();

  // Format game date/time to PST
  const formatGameTime = (dateStr: string) => {
    try {
      if (!dateStr || dateStr === 'Unknown date' || dateStr === 'TBD') {
        return dateStr;
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
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
      return dateStr;
    }
  };

  // Fetch games when sport is selected
  useEffect(() => {
    const fetchGames = async () => {
      if (!formData.sport) return;

      setLoadingGames(true);
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
      }, 300);
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

  // Handle sport selection
  const handleSportSelect = (sportId: string) => {
    setFormData(prev => ({
      ...prev,
      sport: sportId,
      type: sportId === 'nba' ? 'player_prop' : 'moneyline',
      matchup: '',
      selection: '',
      selectedTeam: '',
    }));
    setSelectedGame(null);
    setCurrentStep('game');
  };

  // Handle game selection
  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setPlayerValidation({ status: 'idle', message: '' });
    setFormData(prev => ({
      ...prev,
      matchup: `${game.away_team} @ ${game.home_team}`,
      selection: '',
      selectedTeam: '',
      date: game.date.includes(',') ? new Date().toISOString().split('T')[0] : prev.date
    }));
    setCurrentStep('bet');
  };

  // Go back to previous step
  const goBack = () => {
    if (currentStep === 'game') {
      setCurrentStep('league');
      setFormData(prev => ({ ...prev, sport: '' }));
    } else if (currentStep === 'bet') {
      setCurrentStep('game');
      setSelectedGame(null);
    }
  };

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

    let validatedPlayerName = formData.playerName;
    let validatedTeamName = '';

    if (formData.sport === 'nba' && formData.type === 'player_prop' && formData.playerName.trim()) {
      if (!selectedGame) {
        setPlayerValidation({ status: 'invalid', message: 'Please select a game first' });
        return;
      }

      const eventId = selectedGame.event_id || selectedGame.competition_id;
      if (!eventId) {
        setPlayerValidation({ status: 'invalid', message: 'Game ID not available.' });
        return;
      }

      setPlayerValidation({ status: 'validating', message: 'Validating player...' });

      try {
        const result = await api.validatePlayer(formData.sport, eventId, formData.playerName);

        if (!result.found || !result.displayName) {
          setPlayerValidation({
            status: 'invalid',
            message: result.message || 'Player not found in this game.'
          });
          return;
        }

        validatedPlayerName = result.displayName;
        validatedTeamName = result.teamName || '';
        setFormData(prev => ({ ...prev, playerName: validatedPlayerName }));
      } catch (error) {
        setPlayerValidation({ status: 'invalid', message: 'Error validating player.' });
        return;
      }

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
    const betDate = selectedGame?.date && !selectedGame.date.includes(',')
      ? selectedGame.date
      : formData.date;

    const betData: any = {
      sport: formData.sport,
      type: betType as any,
      matchup: formData.matchup,
      selection: formData.selection,
      odds: Number(formData.odds),
      stake: stakeAmount,
      date: betDate,
      book: formData.book,
      potentialPayout: potentialProfit,
    };

    // Add prop tracking data for player props
    if (formData.sport === 'nba' && formData.type === 'player_prop' && selectedGame) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = validatedPlayerName;
      betData.team_name = validatedTeamName;
      betData.market_type = formData.marketType;
      betData.line = parseFloat(formData.line);
      betData.side = formData.side.toLowerCase();
    }

    // Add tracking data for other bet types...
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

    if (formData.sport === 'nba' && formData.type === 'team_total' && selectedGame) {
      const isHome = formData.selectedTeam === selectedGame.home_team;
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = `${formData.selectedTeam} Total Points`;
      betData.team_name = formData.selectedTeam;
      betData.market_type = isHome ? 'home_team_points' : 'away_team_points';
      betData.line = parseFloat(formData.line);
      betData.side = formData.side.toLowerCase();
    }

    if (formData.sport === 'nba' && formData.type === 'moneyline' && selectedGame) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = 'Moneyline';
      betData.team_name = formData.selectedTeam;
      betData.market_type = 'moneyline';
      betData.line = 0;
      betData.side = formData.selectedTeam.toLowerCase();
    }

    if (formData.sport === 'nba' && formData.type === 'spread' && selectedGame) {
      betData.event_id = selectedGame.event_id || selectedGame.competition_id;
      betData.player_name = 'Spread';
      betData.team_name = formData.selectedTeam;
      betData.market_type = 'spread';
      betData.line = parseFloat(formData.spreadValue);
      betData.side = formData.selectedTeam.toLowerCase();
    }

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
    formData.sport, formData.type, formData.selectedTeam, formData.spreadValue,
    formData.totalLine, formData.overUnder, formData.playerName, formData.marketType,
    formData.line, formData.side, formData.periodBetType, selectedGame
  ]);

  // Get current sport info
  const currentSport = SPORTS.find(s => s.id === formData.sport);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen overflow-hidden flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto"
    >
      {/* Header with Step Indicator */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {currentStep !== 'league' && (
              <button
                onClick={goBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-3xl font-bold">New Wager</h1>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentStep !== 'league') {
                setCurrentStep('league');
                setFormData(prev => ({ ...prev, sport: '' }));
                setSelectedGame(null);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              currentStep === 'league' ? "bg-accent text-background" : "bg-accent/20 text-accent cursor-pointer hover:opacity-80"
            )}
          >
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">1</span>
            League
          </button>
          <ChevronRight size={16} className="text-gray-600" />
          <button
            onClick={() => {
              // Only allow going back to game from bet step
              if (currentStep === 'bet') {
                setCurrentStep('game');
                setSelectedGame(null);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all !cursor-default",
              currentStep === 'game' ? "bg-accent text-background" :
              currentStep === 'bet' ? "bg-accent/20 text-accent !cursor-pointer hover:opacity-80" : "bg-gray-800 text-gray-500"
            )}
          >
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">2</span>
            Game
          </button>
          <ChevronRight size={16} className="text-gray-600" />
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-default",
              currentStep === 'bet' ? "bg-accent text-background" : "bg-gray-800 text-gray-500"
            )}
          >
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">3</span>
            Bet
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: League Selection */}
          {currentStep === 'league' && (
            <motion.div
              key="league"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-6">Select a League</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {SPORTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSportSelect(s.id)}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-accent hover:bg-accent/5 transition-all group"
                    >
                      {s.logo ? (
                        <img
                          src={s.logo}
                          alt={s.label}
                          className="w-12 h-12 object-contain group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <span className={cn("text-4xl group-hover:scale-110 transition-transform", s.logo && "hidden")}>{s.icon}</span>
                      <span className="font-semibold text-gray-300 group-hover:text-white">{s.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Game Selection */}
          {currentStep === 'game' && (
            <motion.div
              key="game"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-hidden flex flex-col"
            >
              <Card className="p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                  {currentSport?.logo ? (
                    <img src={currentSport.logo} alt={currentSport.label} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-3xl">{currentSport?.icon}</span>
                  )}
                  <h2 className="text-xl font-bold">Select a {currentSport?.label} Game</h2>
                  {loadingGames && <Loader2 className="animate-spin text-accent" size={20} />}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {loadingGames ? (
                    <div className="space-y-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="bg-card/50 h-24 rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Live Games */}
                      {liveGames.length > 0 && (
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <h4 className="text-sm font-bold text-red-500 uppercase">Live Now</h4>
                          </div>
                          {liveGames.map((game, i) => (
                            <button
                              key={`live-${i}`}
                              onClick={() => handleGameSelect(game)}
                              className="w-full bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/40 p-4 rounded-xl hover:border-red-500/60 transition-all text-left"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-red-500 uppercase flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                  LIVE
                                </span>
                                <span className="text-xs text-gray-500">{game.status}</span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                                <div className="text-right flex flex-col items-end">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-300">{game.away_team}</span>
                                    {game.away_logo && (
                                      <img src={game.away_logo} alt={game.away_team} className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    )}
                                  </div>
                                  <div className="text-2xl font-mono font-bold text-white">{game.away_score}</div>
                                </div>
                                <div className="text-xs text-gray-600 font-bold">VS</div>
                                <div className="flex flex-col items-start">
                                  <div className="flex items-center gap-2 mb-1">
                                    {game.home_logo && (
                                      <img src={game.home_logo} alt={game.home_team} className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    )}
                                    <span className="font-bold text-gray-300">{game.home_team}</span>
                                  </div>
                                  <div className="text-2xl font-mono font-bold text-white">{game.home_score}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Upcoming Games */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-400 uppercase">Upcoming</h4>
                        {games.length > 0 ? (
                          games.map((game, i) => (
                            <button
                              key={`upcoming-${i}`}
                              onClick={() => handleGameSelect(game)}
                              className="w-full bg-card border border-border p-4 rounded-xl hover:border-accent/50 hover:bg-card/80 transition-all text-left"
                            >
                              <div className="flex justify-between items-center mb-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12}/>
                                  {formatGameTime(game.date)}
                                </span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                <div className="text-right font-bold flex items-center justify-end gap-2">
                                  <span>{game.away_team}</span>
                                  {game.away_logo && (
                                    <img src={game.away_logo} alt={game.away_team} className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 font-bold">@</div>
                                <div className="font-bold flex items-center gap-2">
                                  {game.home_logo && (
                                    <img src={game.home_logo} alt={game.home_team} className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  )}
                                  <span>{game.home_team}</span>
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            No upcoming games found
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Bet Configuration */}
          {currentStep === 'bet' && selectedGame && (
            <motion.div
              key="bet"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto"
            >
              <Card className="p-6">
                {/* Selected Game Summary */}
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    {currentSport?.logo ? (
                      <img src={currentSport.logo} alt={currentSport.label} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-2xl">{currentSport?.icon}</span>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-lg flex items-center gap-2 flex-wrap">
                        {selectedGame.away_logo && (
                          <img src={selectedGame.away_logo} alt={selectedGame.away_team} className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        <span>{selectedGame.away_team}</span>
                        <span className="text-gray-500">@</span>
                        {selectedGame.home_logo && (
                          <img src={selectedGame.home_logo} alt={selectedGame.home_team} className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        <span>{selectedGame.home_team}</span>
                      </div>
                      <div className="text-sm text-gray-400">{formatGameTime(selectedGame.date)}</div>
                    </div>
                    {selectedGame.state === 'in' && (
                      <span className="ml-auto text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full">LIVE</span>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Bet Type Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase">Bet Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                            "px-4 py-3 rounded-lg text-sm font-medium transition-colors border text-center",
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

                  {/* Dynamic Bet Form Fields */}
                  <div className="space-y-4 bg-background/50 p-4 rounded-xl border border-border/50">
                    {/* NBA Player Prop */}
                    {formData.type === 'player_prop' && formData.sport === 'nba' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-400 uppercase">Player Name</label>
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
                            emptyMessage="No players found"
                          />
                          {playerValidation.status === 'invalid' && (
                            <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                              <AlertCircle size={16} />
                              <span>{playerValidation.message}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-400 uppercase">Market Type</label>
                          <select
                            className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent"
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
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase">Line</label>
                            <input
                              type="number"
                              step="0.5"
                              placeholder="e.g. 25.5"
                              className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent"
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

                    {/* Moneyline */}
                    {formData.type === 'moneyline' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 uppercase">Select Winner</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.away_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.away_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.away_team}</button>
                          <button type="button" onClick={() => setFormData({...formData, selectedTeam: selectedGame.home_team})} className={cn("p-4 rounded-lg border-2 transition-all font-semibold", formData.selectedTeam === selectedGame.home_team ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 text-white")}>{selectedGame.home_team}</button>
                        </div>
                      </div>
                    )}

                    {/* Spread */}
                    {formData.type === 'spread' && (
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
                            className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                            value={formData.spreadValue}
                            onChange={(e) => setFormData({...formData, spreadValue: e.target.value})}
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Total */}
                    {formData.type === 'total' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-400 uppercase">Total Line</label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="e.g. 220.5"
                            className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent"
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

                    {/* 1st Half/Quarter Bets */}
                    {(formData.type === '1h_bets' || formData.type === '1q_bets') && (
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
                                  className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent"
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

                    {/* Team Total */}
                    {formData.type === 'team_total' && (
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
                              className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent"
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
                  </div>

                  {/* Odds & Stake */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Odds</label>
                      <input
                        type="number"
                        placeholder="-110"
                        className="w-full bg-background border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                        value={formData.odds}
                        onChange={(e) => setFormData({...formData, odds: Number(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase">Stake (Optional)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3.5 text-gray-500">$</span>
                        <input
                          type="number"
                          placeholder="100"
                          className="w-full bg-background border border-border rounded-lg p-3 pl-7 text-white focus:outline-none focus:border-accent"
                          value={formData.stake}
                          onChange={(e) => setFormData({...formData, stake: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
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
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
