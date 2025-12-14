import React, { useState, useEffect } from 'react';
import { X, Loader2, Trophy, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { Game, BoxScoreData, BoxScoreTeam, BoxScorePlayer, NFLStatCategory, TennisMatchData } from '../types';

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

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  isOpen,
  onClose,
  game,
  sport,
}) => {
  const [boxScore, setBoxScore] = useState<BoxScoreData | TennisMatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  const isTennisTournament = sport.startsWith('tennis') && game?.match_type === 'tournament';

  useEffect(() => {
    // Don't fetch box score for tournament cards - we already have the data
    if (isOpen && game?.event_id && !isTennisTournament) {
      fetchBoxScore();
    }
  }, [isOpen, game?.event_id, isTennisTournament]);

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
                    {nbaStatColumns.map(col => (
                      <td key={col} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                        {!Array.isArray(player.stats) ? (player.stats[col] ?? '-') : '-'}
                      </td>
                    ))}
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
                    {nbaStatColumns.map(col => (
                      <td key={col} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                        {!Array.isArray(player.stats) ? (player.stats[col] ?? '-') : '-'}
                      </td>
                    ))}
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

  // Soccer stat columns to display
  const soccerStatColumns = ['G', 'A', 'SH', 'ST', 'FC', 'FA', 'YC', 'RC'];
  const soccerStatLabels: Record<string, string> = {
    'G': 'Goals',
    'A': 'Assists',
    'SH': 'Shots',
    'ST': 'On Target',
    'FC': 'Fouls',
    'FA': 'Fouled',
    'YC': 'Yellow',
    'RC': 'Red',
  };

  // Render Soccer team stats
  const renderSoccerTeamStats = (team: BoxScoreTeam) => {
    const starters = team.players.filter(p => p.starter);
    const bench = team.players.filter(p => !p.starter);

    return (
      <div>
        {team.formation && (
          <div className="text-center text-sm text-accent mb-3">
            Formation: {team.formation}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-gray-400 sticky left-0 bg-card min-w-[160px]">Player</th>
                {soccerStatColumns.map(col => (
                  <th key={col} className="text-center py-2 px-2 font-medium text-gray-400 min-w-[40px]" title={soccerStatLabels[col]}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Starting XI */}
              {starters.length > 0 && (
                <>
                  <tr className="bg-accent/5">
                    <td colSpan={soccerStatColumns.length + 1} className="py-1 px-2 text-xs font-bold text-accent uppercase tracking-wider">
                      Starting XI
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
                      {soccerStatColumns.map(col => (
                        <td key={col} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                          {!Array.isArray(player.stats) ? (player.stats[col] ?? '-') : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {/* Substitutes */}
              {bench.length > 0 && (
                <>
                  <tr className="bg-gray-800/30">
                    <td colSpan={soccerStatColumns.length + 1} className="py-1 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Substitutes
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
                      {soccerStatColumns.map(col => (
                        <td key={col} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                          {!Array.isArray(player.stats) ? (player.stats[col] ?? '-') : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
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
              {/* Header with score */}
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-4 flex-wrap">
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
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Game status and period scores */}
              {teamBoxScore && (
                <div className="px-4 py-3 border-b border-border flex-shrink-0">
                  <div className="text-center text-sm text-gray-400 mb-3">
                    {teamBoxScore.game_status}
                  </div>
                  {teamBoxScore.linescores?.home?.length > 0 && (
                    <div className="flex justify-center">
                      <table className="text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="w-24 text-left px-2 py-1"></th>
                            {teamBoxScore.linescores.home.map((_: number, i: number) => {
                              // Different labels based on sport
                              let label = `${i + 1}`;
                              if (teamBoxScore.sport === 'soccer') {
                                label = i === 0 ? '1H' : '2H';
                              } else if (teamBoxScore.sport === 'mlb') {
                                label = `${i + 1}`;
                              } else if (teamBoxScore.sport === 'nba' || teamBoxScore.sport === 'ncaab' ||
                                         teamBoxScore.sport === 'nfl' || teamBoxScore.sport === 'ncaaf') {
                                label = `Q${i + 1}`;
                              } else {
                                label = `Q${i + 1}`;
                              }
                              return (
                                <th key={i} className="w-10 text-center px-2 py-1 font-medium">
                                  {label}
                                </th>
                              );
                            })}
                            <th className="w-10 text-center px-2 py-1 font-bold text-gray-400">T</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="text-gray-400 text-left px-2 py-1 font-medium">{teamBoxScore.linescores.away_team}</td>
                            {teamBoxScore.linescores.away.map((score: number, i: number) => (
                              <td key={i} className="text-center px-2 py-1 text-gray-300 bg-background rounded">
                                {score}
                              </td>
                            ))}
                            <td className="text-center px-2 py-1 text-white font-bold">
                              {teamBoxScore.linescores.away.reduce((a: number, b: number) => a + b, 0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-gray-400 text-left px-2 py-1 font-medium">{teamBoxScore.linescores.home_team}</td>
                            {teamBoxScore.linescores.home.map((score: number, i: number) => (
                              <td key={i} className="text-center px-2 py-1 text-gray-300 bg-background rounded">
                                {score}
                              </td>
                            ))}
                            <td className="text-center px-2 py-1 text-white font-bold">
                              {teamBoxScore.linescores.home.reduce((a: number, b: number) => a + b, 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
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
    </AnimatePresence>
  );
};
