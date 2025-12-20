import { useEffect, useState } from 'react';
import { X, Trophy, Clock, MapPin, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface F1Race {
  name: string;
  round: number;
  date: string;
  location: string;
  status: string;
  completed: boolean;
  winner?: string;
}

interface F1RaceResult {
  position: string;
  driver: string;
  driver_code: string;
  team: string;
  grid: string;
  laps: string;
  status: string;
  time: string;
  points: string;
  fastest_lap_time: string;
  fastest_lap_rank: string;
}

interface F1RaceData {
  race_name: string;
  round: number;
  date: string;
  time: string;
  location: string;
  circuit: string;
  results: F1RaceResult[];
  has_results: boolean;
}

interface F1RaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  race: F1Race | null;
}

// Team colors for visual distinction
const TEAM_COLORS: Record<string, string> = {
  'Red Bull': 'bg-blue-600',
  'Ferrari': 'bg-red-600',
  'Mercedes': 'bg-teal-500',
  'McLaren': 'bg-orange-500',
  'Aston Martin': 'bg-green-700',
  'Alpine F1 Team': 'bg-pink-500',
  'Williams': 'bg-blue-400',
  'RB F1 Team': 'bg-blue-500',
  'Sauber': 'bg-green-500',
  'Haas F1 Team': 'bg-gray-500',
};

export const F1RaceModal = ({ isOpen, onClose, race }: F1RaceModalProps) => {
  const [raceData, setRaceData] = useState<F1RaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && race?.round && race.completed) {
      setLoading(true);
      setError(null);

      api.getF1RaceResults(race.round)
        .then(data => {
          setRaceData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch F1 race results:', err);
          setError('Failed to load race results');
          setLoading(false);
        });
    } else if (!race?.completed) {
      setRaceData(null);
    }
  }, [isOpen, race?.round, race?.completed]);

  const getTeamColor = (team: string) => {
    return TEAM_COLORS[team] || 'bg-gray-600';
  };

  const getPositionBadge = (position: string) => {
    const pos = parseInt(position);
    if (pos === 1) return 'bg-yellow-500 text-black';
    if (pos === 2) return 'bg-gray-300 text-black';
    if (pos === 3) return 'bg-amber-700 text-white';
    return 'bg-gray-700 text-white';
  };

  return (
    <AnimatePresence>
      {isOpen && race && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 bg-card border border-border rounded-xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <Flag size={14} />
                  <span>Round {race.round}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  {race.name}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {race.location}
                  </span>
                  {raceData?.circuit && (
                    <span>{raceData.circuit}</span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
              {!race.completed ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Clock size={48} className="mb-4" />
                  <p className="text-lg">Race not yet completed</p>
                  <p className="text-sm mt-2">
                    Scheduled for {new Date(race.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ) : loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-red-400">
                  {error}
                </div>
              ) : raceData?.has_results ? (
                <div className="space-y-2">
                  {/* Results header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-500 uppercase font-medium">
                    <div className="col-span-1">Pos</div>
                    <div className="col-span-4">Driver</div>
                    <div className="col-span-3">Team</div>
                    <div className="col-span-2 text-right">Time</div>
                    <div className="col-span-2 text-right">Points</div>
                  </div>

                  {/* Results list */}
                  {raceData.results.map((result, idx) => (
                    <motion.div
                      key={result.driver}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        "grid grid-cols-12 gap-2 px-3 py-3 rounded-lg items-center",
                        idx === 0 ? "bg-yellow-500/10 border border-yellow-500/30" :
                        idx === 1 ? "bg-gray-300/10 border border-gray-300/30" :
                        idx === 2 ? "bg-amber-700/10 border border-amber-700/30" :
                        "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {/* Position */}
                      <div className="col-span-1">
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                          getPositionBadge(result.position)
                        )}>
                          {result.position}
                        </span>
                      </div>

                      {/* Driver */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1 h-8 rounded-full", getTeamColor(result.team))} />
                          <div>
                            <div className="font-semibold text-white">
                              {result.driver}
                            </div>
                            <div className="text-xs text-gray-500">
                              Grid: P{result.grid}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team */}
                      <div className="col-span-3 text-sm text-gray-400 truncate">
                        {result.team}
                      </div>

                      {/* Time/Status */}
                      <div className="col-span-2 text-right">
                        {result.status === 'Finished' || result.time ? (
                          <div>
                            <div className="text-sm text-white font-mono">
                              {result.time || `+${result.laps} laps`}
                            </div>
                            {result.fastest_lap_rank === '1' && (
                              <div className="text-xs text-purple-400 flex items-center justify-end gap-1">
                                <Clock size={10} />
                                Fastest
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-red-400">{result.status}</span>
                        )}
                      </div>

                      {/* Points */}
                      <div className="col-span-2 text-right">
                        {parseInt(result.points) > 0 ? (
                          <span className="text-sm font-semibold text-accent">
                            +{result.points}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-600">0</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No results available for this race
                </div>
              )}
            </div>

            {/* Winner badge */}
            {race.winner && race.completed && (
              <div className="border-t border-border p-4 bg-gradient-to-r from-yellow-500/10 to-transparent">
                <div className="flex items-center gap-3">
                  <Trophy className="text-yellow-500" size={24} />
                  <div>
                    <div className="text-sm text-gray-400">Race Winner</div>
                    <div className="text-lg font-bold text-white">{race.winner}</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
