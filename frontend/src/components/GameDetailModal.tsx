import React, { useState, useEffect } from 'react';
import { X, Loader2, Trophy, MapPin, Check, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { Game, BoxScoreData, BoxScoreTeam, BoxScorePlayer, NFLStatCategory, TennisMatchData } from '../types';
import { BetSlipPanel } from './BetSlipPanel';
import { useBets } from '../context/BetContext';

// Mapping from stat column to market type
const NBA_STAT_TO_MARKET: Record<string, string> = {
  'PTS': 'points',
  'REB': 'rebounds',
  'AST': 'assists',
  '3PT': 'threes',
  'BLK': 'blocks',
  'STL': 'steals',
};

// Bettable NBA stats (not MIN, FG%, +/-, etc.)
const NBA_BETTABLE_STATS = ['PTS', 'REB', 'AST', '3PT', 'BLK', 'STL'];

// NFL category + stat to market mapping
const NFL_STAT_TO_MARKET: Record<string, Record<string, string>> = {
  passing: { 'YDS': 'passing_yards', 'TD': 'passing_tds', 'CMP': 'completions' },
  rushing: { 'YDS': 'rushing_yards', 'TD': 'rushing_tds', 'CAR': 'rushing_attempts' },
  receiving: { 'YDS': 'receiving_yards', 'REC': 'receptions', 'TD': 'receiving_tds' },
};

// MLB category + stat to market mapping
const MLB_STAT_TO_MARKET: Record<string, Record<string, string>> = {
  batting: { 'H': 'hits', 'RBI': 'rbis', 'R': 'runs', 'HR': 'home_runs' },
  pitching: { 'K': 'strikeouts', 'IP': 'innings_pitched' },
};

interface GameDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  sport: string;
}

// Type guard to check if data is tennis match
const isTennisMatch = (data: BoxScoreData | TennisMatchData): data is TennisMatchData => {
  return data.sport === 'tennis';
};

// Selection for multi-select betting
export interface BetSelection {
  id: string; // unique key: `${playerId}-${market}`
  player: BoxScorePlayer;
  market: string;
  marketLabel: string;
  currentValue: string;
  teamName: string;
  // Configurable values (set in bet slip)
  line?: number;
  side?: 'over' | 'under';
  odds?: number;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  isOpen,
  onClose,
  game,
  sport,
}) => {
  const { addParlayLeg } = useBets();
  const [boxScore, setBoxScore] = useState<BoxScoreData | TennisMatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([]);
  const [showBetSlip, setShowBetSlip] = useState(false);

  const isTennisTournament = sport.startsWith('tennis') && game?.match_type === 'tournament';

  // Helper to handle stat click - toggles selection
  const handleStatClick = (
    player: BoxScorePlayer,
    statColumn: string,
    statValue: string | number,
    teamName: string,
    category?: string // For NFL/MLB category-based stats
  ) => {
    // Get market type based on sport
    let market: string | undefined;
    let marketLabel = statColumn;

    if (sport === 'nba' || sport === 'ncaab') {
      market = NBA_STAT_TO_MARKET[statColumn];
      marketLabel = statColumn;
    } else if (sport === 'nfl' || sport === 'ncaaf') {
      if (category && NFL_STAT_TO_MARKET[category]) {
        market = NFL_STAT_TO_MARKET[category][statColumn];
      }
      marketLabel = `${statColumn} (${category})`;
    } else if (sport === 'mlb') {
      if (category && MLB_STAT_TO_MARKET[category]) {
        market = MLB_STAT_TO_MARKET[category][statColumn];
      }
      marketLabel = `${statColumn} (${category})`;
    }

    if (!market) return;

    const selectionId = `${player.id}-${market}`;
    const numValue = typeof statValue === 'number' ? statValue : parseFloat(String(statValue)) || 0;

    setSelectedBets(prev => {
      const existingIndex = prev.findIndex(s => s.id === selectionId);
      if (existingIndex >= 0) {
        // Deselect - remove from array
        return prev.filter(s => s.id !== selectionId);
      } else {
        // Select - add to array with default values
        return [...prev, {
          id: selectionId,
          player,
          market,
          marketLabel,
          currentValue: String(statValue),
          teamName,
          line: numValue + 0.5,
          side: 'over' as const,
          odds: -110,
        }];
      }
    });
  };

  // Check if a stat is selected
  const isStatSelected = (playerId: string, market: string): boolean => {
    return selectedBets.some(s => s.id === `${playerId}-${market}`);
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedBets([]);
  };

  // Remove a single selection
  const removeSelection = (id: string) => {
    setSelectedBets(prev => prev.filter(s => s.id !== id));
  };

  // Update a selection's configuration
  const updateSelection = (id: string, updates: Partial<BetSelection>) => {
    setSelectedBets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Check if a stat is bettable
  const isBettableStat = (statColumn: string, category?: string): boolean => {
    if (sport === 'nba' || sport === 'ncaab') {
      return NBA_BETTABLE_STATS.includes(statColumn);
    }
    if (sport === 'nfl' || sport === 'ncaaf') {
      return category ? !!NFL_STAT_TO_MARKET[category]?.[statColumn] : false;
    }
    if (sport === 'mlb') {
      return category ? !!MLB_STAT_TO_MARKET[category]?.[statColumn] : false;
    }
    return false;
  };

  useEffect(() => {
    // Don't fetch box score for tournament cards - we already have the data
    if (isOpen && game?.event_id && !isTennisTournament) {
      fetchBoxScore();
    }
  }, [isOpen, game?.event_id, isTennisTournament]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const fetchBoxScore = async () => {
    if (!game?.event_id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getBoxScore(sport, game.event_id);
      setBoxScore(data);
    } catch (e) {
      setError('Failed to load match details');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !game) return null;

  // Render simple tournament info modal
  if (isTennisTournament) {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-white">Upcoming Tournament</span>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Tournament Info */}
                <div className="text-center space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-accent">{game.tournament || game.home_team}</h2>
                    {game.location && (
                      <div className="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1">
                        <MapPin size={14} />
                        {game.location}
                      </div>
                    )}
                  </div>

                  <div className="bg-background rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Tournament Dates</div>
                    <div className="text-white font-medium">
                      {formatDate(game.date)}
                      {game.end_date && ` - ${formatDate(game.end_date)}`}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    Matches will appear here once the tournament begins
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // NBA stat columns
  const nbaStatColumns = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT', 'STL', 'BLK', 'TO', 'PF', '+/-'];

  // Format NFL category name for display
  const formatCategoryName = (name: string) => {
    const categoryNames: Record<string, string> = {
      passing: 'Passing',
      rushing: 'Rushing',
      receiving: 'Receiving',
      fumbles: 'Fumbles',
      defensive: 'Defense',
      interceptions: 'Interceptions',
      kickReturns: 'Kick Returns',
      puntReturns: 'Punt Returns',
      kicking: 'Kicking',
      punting: 'Punting',
    };
    return categoryNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Render NFL category table
  const renderNFLCategory = (category: NFLStatCategory) => {
    if (!category.players || category.players.length === 0) return null;

    return (
      <div key={category.name} className="mb-6">
        <h4 className="text-sm font-bold text-accent uppercase tracking-wider mb-2 px-2">
          {formatCategoryName(category.name)}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-gray-400 sticky left-0 bg-card min-w-[140px]">Player</th>
                {category.labels.map((label, idx) => (
                  <th key={idx} className="text-center py-2 px-2 font-medium text-gray-400 min-w-[50px]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {category.players.map((player) => (
                <tr key={player.id} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 px-2 sticky left-0 bg-card">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-5 text-right">{player.jersey}</span>
                      <span className="font-medium text-white">{player.name}</span>
                      <span className="text-gray-500 text-xs">{player.position}</span>
                    </div>
                  </td>
                  {Array.isArray(player.stats) ? (
                    player.stats.map((stat, idx) => (
                      <td key={idx} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                        {stat ?? '-'}
                      </td>
                    ))
                  ) : (
                    category.labels.map((label, idx) => (
                      <td key={idx} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                        {(player.stats as Record<string, string>)[label] ?? '-'}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render NBA team stats (original format)
  const renderNBATeamStats = (team: BoxScoreTeam) => {
    const starters = team.players.filter(p => p.starter);
    const bench = team.players.filter(p => !p.starter);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-gray-400 sticky left-0 bg-card min-w-[140px]">Player</th>
              {nbaStatColumns.map(col => (
                <th key={col} className="text-center py-2 px-2 font-medium text-gray-400 min-w-[45px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Starters section */}
            {starters.length > 0 && (
              <>
                <tr className="bg-accent/5">
                  <td colSpan={nbaStatColumns.length + 1} className="py-1 px-2 text-xs font-bold text-accent uppercase tracking-wider">
                    Starters
                  </td>
                </tr>
                {starters.map(player => (
                  <tr key={player.id} className="border-b border-border/30 hover:bg-white/5">
                    <td className="py-2 px-2 sticky left-0 bg-card">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-5 text-right">{player.jersey}</span>
                        <span className="font-medium text-white">{player.name}</span>
                        <span className="text-gray-500 text-xs">{player.position}</span>
                      </div>
                    </td>
                    {nbaStatColumns.map(col => {
                      const isBettable = isBettableStat(col);
                      const statValue = !Array.isArray(player.stats) ? (player.stats[col] ?? '-') : '-';
                      const market = NBA_STAT_TO_MARKET[col];
                      const isSelected = market && isStatSelected(player.id, market);
                      return (
                        <td
                          key={col}
                          onClick={isBettable && statValue !== '-' ? () => handleStatClick(player, col, statValue, team.team_name) : undefined}
                          className={cn(
                            "text-center py-2 px-2 font-mono text-xs relative",
                            isBettable && statValue !== '-' && "cursor-pointer rounded transition-colors",
                            isSelected
                              ? "bg-accent text-background font-bold"
                              : isBettable && statValue !== '-'
                                ? "text-gray-300 hover:bg-accent/20 hover:text-accent"
                                : "text-gray-300"
                          )}
                        >
                          {isSelected && (
                            <Check size={10} className="absolute top-0.5 right-0.5" />
                          )}
                          {statValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* Bench section */}
            {bench.length > 0 && (
              <>
                <tr className="bg-gray-800/30">
                  <td colSpan={nbaStatColumns.length + 1} className="py-1 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Bench
                  </td>
                </tr>
                {bench.map(player => (
                  <tr key={player.id} className="border-b border-border/30 hover:bg-white/5">
                    <td className="py-2 px-2 sticky left-0 bg-card">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-5 text-right">{player.jersey}</span>
                        <span className="font-medium text-white">{player.name}</span>
                        <span className="text-gray-500 text-xs">{player.position}</span>
                      </div>
                    </td>
                    {nbaStatColumns.map(col => {
                      const isBettable = isBettableStat(col);
                      const statValue = !Array.isArray(player.stats) ? (player.stats[col] ?? '-') : '-';
                      const market = NBA_STAT_TO_MARKET[col];
                      const isSelected = market && isStatSelected(player.id, market);
                      return (
                        <td
                          key={col}
                          onClick={isBettable && statValue !== '-' ? () => handleStatClick(player, col, statValue, team.team_name) : undefined}
                          className={cn(
                            "text-center py-2 px-2 font-mono text-xs relative",
                            isBettable && statValue !== '-' && "cursor-pointer rounded transition-colors",
                            isSelected
                              ? "bg-accent text-background font-bold"
                              : isBettable && statValue !== '-'
                                ? "text-gray-300 hover:bg-accent/20 hover:text-accent"
                                : "text-gray-300"
                          )}
                        >
                          {isSelected && (
                            <Check size={10} className="absolute top-0.5 right-0.5" />
                          )}
                          {statValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Render NFL team stats (category-based)
  const renderNFLTeamStats = (team: BoxScoreTeam) => {
    if (!team.categories || team.categories.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No stats available for this team
        </div>
      );
    }

    // Order categories for better display
    const categoryOrder = ['passing', 'rushing', 'receiving', 'fumbles', 'defensive', 'interceptions', 'kickReturns', 'puntReturns', 'kicking', 'punting'];
    const sortedCategories = [...team.categories].sort((a, b) => {
      const aIdx = categoryOrder.indexOf(a.name);
      const bIdx = categoryOrder.indexOf(b.name);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    return (
      <div className="space-y-2">
        {sortedCategories.map(category => renderNFLCategory(category))}
      </div>
    );
  };

  // Render MLB team stats (batting and pitching categories)
  const renderMLBTeamStats = (team: BoxScoreTeam) => {
    if (!team.categories || team.categories.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No stats available for this team
        </div>
      );
    }

    // Order: batting first, then pitching
    const categoryOrder = ['batting', 'pitching'];
    const sortedCategories = [...team.categories].sort((a, b) => {
      const aIdx = categoryOrder.indexOf(a.name);
      const bIdx = categoryOrder.indexOf(b.name);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    const formatMLBCategoryName = (name: string) => {
      const names: Record<string, string> = {
        batting: 'Batting',
        pitching: 'Pitching',
      };
      return names[name] || name.charAt(0).toUpperCase() + name.slice(1);
    };

    return (
      <div className="space-y-2">
        {sortedCategories.map(category => (
          <div key={category.name} className="mb-6">
            <h4 className="text-sm font-bold text-accent uppercase tracking-wider mb-2 px-2">
              {formatMLBCategoryName(category.name)}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-gray-400 sticky left-0 bg-card min-w-[140px]">Player</th>
                    {category.labels.map((label, idx) => (
                      <th key={idx} className="text-center py-2 px-2 font-medium text-gray-400 min-w-[45px]">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {category.players.map((player) => (
                    <tr key={player.id} className="border-b border-border/30 hover:bg-white/5">
                      <td className="py-2 px-2 sticky left-0 bg-card">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-5 text-right">{player.jersey}</span>
                          <span className="font-medium text-white">{player.name}</span>
                          <span className="text-gray-500 text-xs">{player.position}</span>
                        </div>
                      </td>
                      {Array.isArray(player.stats) ? (
                        player.stats.map((stat, idx) => (
                          <td key={idx} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                            {stat ?? '-'}
                          </td>
                        ))
                      ) : (
                        category.labels.map((label, idx) => (
                          <td key={idx} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                            {(player.stats as Record<string, string>)[label] ?? '-'}
                          </td>
                        ))
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper to get position row for formation visualization
  const getPositionRow = (position: string): number => {
    // Map position codes to rows (0 = GK, 1 = DEF, 2 = MID, 3 = ATT/FWD)
    const pos = position?.toUpperCase() || '';
    if (pos === 'G' || pos === 'GK') return 0;
    if (pos.includes('CD') || pos.includes('CB') || pos === 'LB' || pos === 'RB' || pos === 'LWB' || pos === 'RWB' || pos === 'D') return 1;
    if (pos.includes('DM') || pos.includes('CM') || pos === 'LM' || pos === 'RM' || pos === 'M') return 2;
    if (pos.includes('AM') || pos.includes('CAM') || pos.includes('LW') || pos.includes('RW') || pos === 'W') return 3;
    if (pos === 'F' || pos === 'CF' || pos === 'ST' || pos === 'S' || pos.includes('FW')) return 4;
    return 2; // Default to midfield
  };

  // Helper to get horizontal position within row
  const getHorizontalPosition = (position: string): number => {
    const pos = position?.toUpperCase() || '';
    // Left side
    if (pos.includes('-L') || pos === 'LB' || pos === 'LM' || pos === 'LW' || pos === 'LWB') return 0;
    // Center-left
    if (pos === 'CD-L' || pos === 'CB-L' || pos === 'DM-L' || pos === 'CM-L') return 1;
    // Center
    if (pos === 'G' || pos === 'GK' || pos === 'CD' || pos === 'CB' || pos === 'DM' || pos === 'CM' || pos === 'AM' || pos === 'CAM' || pos === 'F' || pos === 'CF' || pos === 'ST' || pos === 'S') return 2;
    // Center-right
    if (pos === 'CD-R' || pos === 'CB-R' || pos === 'DM-R' || pos === 'CM-R') return 3;
    // Right side
    if (pos.includes('-R') || pos === 'RB' || pos === 'RM' || pos === 'RW' || pos === 'RWB') return 4;
    return 2; // Default center
  };

  // Soccer player node component
  const SoccerPlayerNode: React.FC<{ player: BoxScorePlayer; teamColor: string }> = ({ player, teamColor }) => {
    const stats = !Array.isArray(player.stats) ? player.stats : {};
    const hasYellow = Number(stats['YC'] ?? 0) > 0;
    const hasRed = Number(stats['RC'] ?? 0) > 0;
    const goals = Number(stats['G'] ?? 0);
    const assists = Number(stats['A'] ?? 0);

    // Get first initial and last name
    const nameParts = player.name.split(' ');
    const displayName = nameParts.length > 1
      ? `${nameParts[0][0]}. ${nameParts.slice(1).join(' ')}`
      : player.name;

    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 relative",
            teamColor
          )}
        >
          {player.jersey}
          {/* Goal indicator */}
          {goals > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-[10px]">⚽</span>
          )}
          {/* Card indicators */}
          {hasRed && (
            <span className="absolute -bottom-1 -right-1 w-3 h-4 bg-red-500 rounded-sm" />
          )}
          {hasYellow && !hasRed && (
            <span className="absolute -bottom-1 -right-1 w-3 h-4 bg-yellow-400 rounded-sm" />
          )}
        </div>
        <span className="text-[10px] text-white font-medium text-center leading-tight max-w-[60px] truncate">
          {displayName}
        </span>
        {/* Assist indicator */}
        {assists > 0 && (
          <span className="text-[9px] text-blue-400 font-medium">🅰️ {assists}</span>
        )}
      </div>
    );
  };

  // Render Soccer formation visualization
  const renderSoccerTeamStats = (team: BoxScoreTeam) => {
    const starters = team.players.filter(p => p.starter);
    const bench = team.players.filter(p => !p.starter);

    // Determine team color based on index
    const teamIndex = (boxScore as BoxScoreData)?.teams?.findIndex(t => t.team_id === team.team_id) ?? 0;
    const teamColor = teamIndex === 0
      ? "bg-red-600 border-red-400 text-white"
      : "bg-blue-500 border-blue-300 text-white";

    // Group starters by row
    const rows: BoxScorePlayer[][] = [[], [], [], [], []]; // GK, DEF, MID, AM, FWD
    starters.forEach(player => {
      const row = getPositionRow(player.position);
      rows[row].push(player);
    });

    // Sort each row by horizontal position
    rows.forEach(row => {
      row.sort((a, b) => getHorizontalPosition(a.position) - getHorizontalPosition(b.position));
    });

    return (
      <div className="space-y-4">
        {/* Formation pitch visualization */}
        <div className="relative bg-gradient-to-b from-green-800 to-green-700 rounded-lg overflow-hidden">
          {/* Pitch markings */}
          <div className="absolute inset-0">
            {/* Center line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/30 rounded-full" />
            {/* Goal box top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-10 border-b border-l border-r border-white/30" />
            {/* Goal box bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-10 border-t border-l border-r border-white/30" />
          </div>

          {/* Formation header */}
          <div className="relative z-10 flex items-center justify-between px-3 py-2 bg-black/30">
            <div className="flex items-center gap-2">
              {team.logo && <img src={team.logo} alt="" className="w-5 h-5 object-contain" />}
              <span className="text-white text-sm font-medium">{team.team_abbrev || team.team_name}</span>
            </div>
            <span className="text-white/80 text-sm">{team.formation}</span>
          </div>

          {/* Players on pitch */}
          <div className="relative z-10 py-4 px-2 space-y-4 min-h-[320px]">
            {/* Render rows in reverse order (forwards at top, GK at bottom) */}
            {[...rows].reverse().map((row, rowIndex) => {
              if (row.length === 0) return null;
              return (
                <div key={rowIndex} className="flex justify-around items-start">
                  {row.map(player => (
                    <SoccerPlayerNode key={player.id} player={player} teamColor={teamColor} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Stats Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-gray-400 sticky left-0 bg-card min-w-[160px]">Player</th>
                <th className="text-center py-2 px-2 font-medium text-gray-400 min-w-[40px]" title="Goals">G</th>
                <th className="text-center py-2 px-2 font-medium text-gray-400 min-w-[40px]" title="Assists">A</th>
                <th className="text-center py-2 px-2 font-medium text-gray-400 min-w-[40px]" title="Shots">SH</th>
                <th className="text-center py-2 px-2 font-medium text-gray-400 min-w-[40px]" title="On Target">ST</th>
                <th className="text-center py-2 px-2 font-medium text-gray-400 min-w-[40px]" title="Fouls">FC</th>
                <th className="text-center py-2 px-2 font-medium text-gray-400 min-w-[40px]" title="Saves">SV</th>
              </tr>
            </thead>
            <tbody>
              {/* Starting XI */}
              {starters.length > 0 && (
                <>
                  <tr className="bg-accent/5">
                    <td colSpan={7} className="py-1 px-2 text-xs font-bold text-accent uppercase tracking-wider">
                      Starting XI
                    </td>
                  </tr>
                  {starters.map(player => {
                    const stats = !Array.isArray(player.stats) ? player.stats : {};
                    const hasYellow = Number(stats['YC'] ?? 0) > 0;
                    const hasRed = Number(stats['RC'] ?? 0) > 0;
                    return (
                      <tr key={player.id} className="border-b border-border/30 hover:bg-white/5">
                        <td className="py-2 px-2 sticky left-0 bg-card">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs w-5 text-right">{player.jersey}</span>
                            <span className="font-medium text-white">{player.name}</span>
                            <span className="text-gray-500 text-xs">{player.position}</span>
                            {hasRed && <span className="w-3 h-4 bg-red-500 rounded-sm" title="Red Card" />}
                            {hasYellow && !hasRed && <span className="w-3 h-4 bg-yellow-400 rounded-sm" title="Yellow Card" />}
                          </div>
                        </td>
                        {['G', 'A', 'SH', 'ST', 'FC', 'SV'].map(col => {
                          const value = stats[col];
                          const hasValue = value !== undefined && value !== null && value !== '';
                          const numValue = hasValue ? Number(value) : null;
                          const isGoal = col === 'G' && numValue !== null && numValue > 0;
                          const isAssist = col === 'A' && numValue !== null && numValue > 0;
                          const isSaves = col === 'SV';
                          const showValue = hasValue && (numValue !== 0 || !isSaves);
                          return (
                            <td
                              key={col}
                              className={cn(
                                "text-center py-2 px-2 font-mono text-xs",
                                isGoal ? "text-accent font-bold" : isAssist ? "text-blue-400 font-bold" : "text-gray-300"
                              )}
                            >
                              {showValue ? numValue : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}

              {/* Substitutes */}
              {bench.length > 0 && (
                <>
                  <tr className="bg-gray-800/30">
                    <td colSpan={7} className="py-1 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Substitutes
                    </td>
                  </tr>
                  {bench.map(player => {
                    const stats = !Array.isArray(player.stats) ? player.stats : {};
                    const hasYellow = Number(stats['YC'] ?? 0) > 0;
                    const hasRed = Number(stats['RC'] ?? 0) > 0;
                    return (
                      <tr key={player.id} className="border-b border-border/30 hover:bg-white/5">
                        <td className="py-2 px-2 sticky left-0 bg-card">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs w-5 text-right">{player.jersey}</span>
                            <span className="font-medium text-white">{player.name}</span>
                            <span className="text-gray-500 text-xs">{player.position}</span>
                            {hasRed && <span className="w-3 h-4 bg-red-500 rounded-sm" title="Red Card" />}
                            {hasYellow && !hasRed && <span className="w-3 h-4 bg-yellow-400 rounded-sm" title="Yellow Card" />}
                          </div>
                        </td>
                        {['G', 'A', 'SH', 'ST', 'FC', 'SV'].map(col => {
                          const value = stats[col];
                          const hasValue = value !== undefined && value !== null && value !== '';
                          const numValue = hasValue ? Number(value) : null;
                          const isGoal = col === 'G' && numValue !== null && numValue > 0;
                          const isAssist = col === 'A' && numValue !== null && numValue > 0;
                          const isSaves = col === 'SV';
                          const showValue = hasValue && (numValue !== 0 || !isSaves);
                          return (
                            <td
                              key={col}
                              className={cn(
                                "text-center py-2 px-2 font-mono text-xs",
                                isGoal ? "text-accent font-bold" : isAssist ? "text-blue-400 font-bold" : "text-gray-300"
                              )}
                            >
                              {showValue ? numValue : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Main render function that switches based on sport
  const renderTeamStats = (team: BoxScoreTeam) => {
    if (boxScore && !isTennisMatch(boxScore)) {
      if (boxScore.sport === 'nfl' || boxScore.sport === 'ncaaf') {
        return renderNFLTeamStats(team);
      }
      if (boxScore.sport === 'mlb') {
        return renderMLBTeamStats(team);
      }
      if (boxScore.sport === 'soccer') {
        return renderSoccerTeamStats(team);
      }
      if (boxScore.sport === 'nba' || boxScore.sport === 'ncaab') {
        return renderNBATeamStats(team);
      }
    }
    return renderNBATeamStats(team);
  };

  // Render tennis match content
  const renderTennisMatch = (match: TennisMatchData) => {
    const player1 = match.players[0];
    const player2 = match.players[1];
    const numSets = Math.max(player1?.sets.length || 0, player2?.sets.length || 0);

    return (
      <div className="flex flex-col h-full">
        {/* Tournament Header */}
        <div className="text-center px-4 py-3 border-b border-border">
          <div className="text-accent font-semibold">{match.tournament}</div>
          <div className="text-sm text-gray-400 flex items-center justify-center gap-2 mt-1">
            <MapPin size={14} />
            <span>{match.location}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {match.competition_type} • {match.round}
          </div>
          {match.venue && (
            <div className="text-xs text-gray-500">{match.venue}</div>
          )}
        </div>

        {/* Match Score */}
        <div className="p-4 flex-1 overflow-auto">
          {/* Status */}
          <div className="text-center mb-4">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              match.completed ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
            )}>
              {match.status}
            </span>
          </div>

          {/* Set-by-set breakdown table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-gray-400 min-w-[180px]">Player</th>
                  {Array.from({ length: numSets }, (_, i) => (
                    <th key={i} className="text-center py-2 px-3 font-medium text-gray-400 w-16">
                      Set {i + 1}
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 font-medium text-gray-400 w-16">Sets</th>
                </tr>
              </thead>
              <tbody>
                {/* Player 1 */}
                <tr className={cn("border-b border-border/30", player1?.winner && "bg-accent/5")}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {player1?.winner && <Trophy size={14} className="text-accent" />}
                      <div>
                        <div className="font-medium text-white">{player1?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">
                          {player1?.seed && <span className="mr-2">Seed: {player1.seed}</span>}
                          {player1?.rank && <span>Rank: #{player1.rank}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: numSets }, (_, i) => {
                    const set = player1?.sets[i];
                    return (
                      <td key={i} className={cn(
                        "text-center py-3 px-3 font-mono",
                        set?.winner ? "text-white font-bold" : "text-gray-400"
                      )}>
                        {set ? (
                          <div>
                            <span>{set.games}</span>
                            {set.tiebreak !== undefined && set.tiebreak !== null && (
                              <sup className="text-xs text-accent ml-0.5">{set.tiebreak}</sup>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    );
                  })}
                  <td className="text-center py-3 px-3 text-white font-bold text-lg">
                    {player1?.sets.filter(s => s.winner).length || 0}
                  </td>
                </tr>

                {/* Player 2 */}
                <tr className={cn(player2?.winner && "bg-accent/5")}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {player2?.winner && <Trophy size={14} className="text-accent" />}
                      <div>
                        <div className="font-medium text-white">{player2?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">
                          {player2?.seed && <span className="mr-2">Seed: {player2.seed}</span>}
                          {player2?.rank && <span>Rank: #{player2.rank}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: numSets }, (_, i) => {
                    const set = player2?.sets[i];
                    return (
                      <td key={i} className={cn(
                        "text-center py-3 px-3 font-mono",
                        set?.winner ? "text-white font-bold" : "text-gray-400"
                      )}>
                        {set ? (
                          <div>
                            <span>{set.games}</span>
                            {set.tiebreak !== undefined && set.tiebreak !== null && (
                              <sup className="text-xs text-accent ml-0.5">{set.tiebreak}</sup>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    );
                  })}
                  <td className="text-center py-3 px-3 text-white font-bold text-lg">
                    {player2?.sets.filter(s => s.winner).length || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Full Score Display */}
          <div className="text-center text-gray-400 text-sm mb-4">
            <div className="font-mono">
              {player1?.name}: <span className="text-white">{player1?.score || '-'}</span>
            </div>
            <div className="font-mono">
              {player2?.name}: <span className="text-white">{player2?.score || '-'}</span>
            </div>
          </div>

          {/* Match Note */}
          {match.match_note && (
            <div className="text-center text-xs text-gray-500 italic border-t border-border pt-4">
              {match.match_note}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check if this is a tennis match
  if (boxScore && isTennisMatch(boxScore)) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <Card className="flex flex-col h-full max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">Match Details</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-accent" size={32} />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-400">{error}</div>
                ) : (
                  renderTennisMatch(boxScore)
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Cast boxScore to BoxScoreData for team sports
  const teamBoxScore = boxScore as BoxScoreData | null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            <Card className="flex flex-col h-full max-h-[90vh]">
              {/* Header with score - centered */}
              <div className="relative flex items-center justify-center p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <div className="flex items-center gap-2">
                    {game.away_logo && <img src={game.away_logo} alt="" className="w-8 h-8 object-contain" />}
                    <span className="font-semibold text-gray-300">{game.away_team}</span>
                    <span className="text-2xl font-bold text-white">{game.away_score || '0'}</span>
                  </div>
                  <span className="text-gray-500 text-sm">@</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">{game.home_score || '0'}</span>
                    <span className="font-semibold text-gray-300">{game.home_team}</span>
                    {game.home_logo && <img src={game.home_logo} alt="" className="w-8 h-8 object-contain" />}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Game status and period scores */}
              {teamBoxScore && (
                <div className="px-4 py-4 border-b border-border flex-shrink-0">
                  {/* Status badge */}
                  <div className="flex justify-center mb-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                      teamBoxScore.game_status?.toLowerCase().includes('final')
                        ? "bg-gray-700 text-gray-300"
                        : "bg-red-500/20 text-red-400"
                    )}>
                      {teamBoxScore.game_status}
                    </span>
                  </div>

                  {/* Period scores - redesigned */}
                  {teamBoxScore.linescores?.home?.length > 0 && (
                    <div className="flex justify-center">
                      <div className="bg-gray-800/50 rounded-xl p-4 inline-block">
                        {/* Period headers */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-28" /> {/* Spacer for team names */}
                          {teamBoxScore.linescores.home.map((_: number, i: number) => {
                            let label = `${i + 1}`;
                            if (teamBoxScore.sport === 'soccer') {
                              label = i === 0 ? '1st Half' : '2nd Half';
                            } else if (teamBoxScore.sport === 'mlb') {
                              label = `${i + 1}`;
                            } else if (teamBoxScore.sport === 'nba' || teamBoxScore.sport === 'ncaab' ||
                                       teamBoxScore.sport === 'nfl' || teamBoxScore.sport === 'ncaaf') {
                              label = `Q${i + 1}`;
                            }
                            return (
                              <div key={i} className={cn(
                                "text-center text-xs font-medium text-gray-500",
                                teamBoxScore.sport === 'soccer' ? "w-16" : "w-10"
                              )}>
                                {label}
                              </div>
                            );
                          })}
                          <div className="w-12 text-center text-xs font-bold text-gray-400">Total</div>
                        </div>

                        {/* Away team row */}
                        {(() => {
                          const awayTotal = teamBoxScore.linescores.away.reduce((a: number, b: number) => a + b, 0);
                          const homeTotal = teamBoxScore.linescores.home.reduce((a: number, b: number) => a + b, 0);
                          const awayWinning = awayTotal > homeTotal;
                          const homeWinning = homeTotal > awayTotal;
                          const isTied = awayTotal === homeTotal;

                          return (
                            <>
                              <div className="flex items-center gap-3 mb-2">
                                <div className={cn(
                                  "w-28 text-sm font-medium truncate",
                                  awayWinning || isTied ? "text-white" : "text-gray-500"
                                )}>
                                  {teamBoxScore.linescores.away_team}
                                </div>
                                {teamBoxScore.linescores.away.map((score: number, i: number) => (
                                  <div key={i} className={cn(
                                    "h-8 flex items-center justify-center bg-gray-900/50 rounded text-sm text-gray-300",
                                    teamBoxScore.sport === 'soccer' ? "w-16" : "w-10"
                                  )}>
                                    {score}
                                  </div>
                                ))}
                                <div className={cn(
                                  "w-12 h-8 flex items-center justify-center rounded-lg text-lg font-bold",
                                  awayWinning ? "bg-accent/20 text-accent" : isTied ? "bg-gray-700 text-white" : "bg-gray-900/50 text-gray-400"
                                )}>
                                  {awayTotal}
                                </div>
                              </div>

                              {/* Home team row */}
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-28 text-sm font-medium truncate",
                                  homeWinning || isTied ? "text-white" : "text-gray-500"
                                )}>
                                  {teamBoxScore.linescores.home_team}
                                </div>
                                {teamBoxScore.linescores.home.map((score: number, i: number) => (
                                  <div key={i} className={cn(
                                    "h-8 flex items-center justify-center bg-gray-900/50 rounded text-sm text-gray-300",
                                    teamBoxScore.sport === 'soccer' ? "w-16" : "w-10"
                                  )}>
                                    {score}
                                  </div>
                                ))}
                                <div className={cn(
                                  "w-12 h-8 flex items-center justify-center rounded-lg text-lg font-bold",
                                  homeWinning ? "bg-accent/20 text-accent" : isTied ? "bg-gray-700 text-white" : "bg-gray-900/50 text-gray-400"
                                )}>
                                  {homeTotal}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team selector tabs */}
              {teamBoxScore && teamBoxScore.teams.length > 0 && (
                <div className="flex gap-2 p-4 flex-shrink-0">
                  {teamBoxScore.teams.map((team: BoxScoreTeam, index: number) => (
                    <button
                      key={team.team_id}
                      onClick={() => setSelectedTeamIndex(index)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        selectedTeamIndex === index
                          ? "bg-accent text-background"
                          : "bg-background border border-border text-gray-400 hover:text-white hover:border-gray-600"
                      )}
                    >
                      {team.logo && <img src={team.logo} alt="" className="w-5 h-5 object-contain" />}
                      {team.team_name}
                    </button>
                  ))}
                </div>
              )}

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-4 pt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-400">{error}</div>
                ) : teamBoxScore && teamBoxScore.teams[selectedTeamIndex] ? (
                  renderTeamStats(teamBoxScore.teams[selectedTeamIndex])
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No box score data available
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Floating Selection Bar */}
      <AnimatePresence>
        {selectedBets.length > 0 && !showBetSlip && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-[80] md:left-auto md:right-8 md:max-w-md"
          >
            <div className="bg-card border border-accent/50 rounded-xl p-4 shadow-lg shadow-accent/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-accent text-background w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {selectedBets.length}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">
                      {selectedBets.length} selection{selectedBets.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-400">
                      Tap stats to add more
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearSelections}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowBetSlip(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-background font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    <Ticket size={16} />
                    Review Bets
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Slip Panel */}
      {game && (
        <BetSlipPanel
          isOpen={showBetSlip}
          onClose={() => setShowBetSlip(false)}
          selections={selectedBets}
          onUpdateSelection={updateSelection}
          onRemoveSelection={removeSelection}
          onClearAll={clearSelections}
          eventId={game.event_id}
          sport={sport}
          matchup={`${game.away_team} @ ${game.home_team}`}
          onComplete={() => {
            setSelectedBets([]);
            setShowBetSlip(false);
          }}
        />
      )}
    </AnimatePresence>
  );
};
