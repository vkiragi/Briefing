import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { Game, BoxScoreData, BoxScoreTeam } from '../types';

interface GameDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  sport: string;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  isOpen,
  onClose,
  game,
  sport,
}) => {
  const [boxScore, setBoxScore] = useState<BoxScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  useEffect(() => {
    if (isOpen && game?.event_id) {
      fetchBoxScore();
    }
  }, [isOpen, game?.event_id]);

  const fetchBoxScore = async () => {
    if (!game?.event_id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getBoxScore(sport, game.event_id);
      setBoxScore(data);
    } catch (e) {
      setError('Failed to load box score');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !game) return null;

  const statColumns = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT', 'STL', 'BLK', 'TO', 'PF', '+/-'];

  const renderTeamStats = (team: BoxScoreTeam) => {
    const starters = team.players.filter(p => p.starter);
    const bench = team.players.filter(p => !p.starter);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-gray-400 sticky left-0 bg-card min-w-[140px]">Player</th>
              {statColumns.map(col => (
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
                  <td colSpan={statColumns.length + 1} className="py-1 px-2 text-xs font-bold text-accent uppercase tracking-wider">
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
                    {statColumns.map(col => (
                      <td key={col} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                        {player.stats[col] ?? '-'}
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
                  <td colSpan={statColumns.length + 1} className="py-1 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
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
                    {statColumns.map(col => (
                      <td key={col} className="text-center py-2 px-2 text-gray-300 font-mono text-xs">
                        {player.stats[col] ?? '-'}
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

              {/* Game status and quarter scores */}
              {boxScore && (
                <div className="px-4 py-3 border-b border-border flex-shrink-0">
                  <div className="text-center text-sm text-gray-400 mb-2">
                    {boxScore.game_status}
                  </div>
                  {boxScore.linescores?.home?.length > 0 && (
                    <div className="flex justify-center items-center gap-6 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 w-16 text-right">{boxScore.linescores.away_team}</span>
                        <div className="flex gap-2 ml-2">
                          {boxScore.linescores.away.map((score, i) => (
                            <span key={i} className="w-8 text-center text-gray-300 bg-background px-2 py-1 rounded">
                              {score}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 w-16 text-right">{boxScore.linescores.home_team}</span>
                        <div className="flex gap-2 ml-2">
                          {boxScore.linescores.home.map((score, i) => (
                            <span key={i} className="w-8 text-center text-gray-300 bg-background px-2 py-1 rounded">
                              {score}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team selector tabs */}
              {boxScore && boxScore.teams.length > 0 && (
                <div className="flex gap-2 p-4 flex-shrink-0">
                  {boxScore.teams.map((team, index) => (
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
                ) : boxScore && boxScore.teams[selectedTeamIndex] ? (
                  renderTeamStats(boxScore.teams[selectedTeamIndex])
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
