import { useEffect } from 'react';
import { X, Trophy, MapPin, Calendar, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface BoxingFight {
  fighter1: string;
  fighter2: string;
  title: string;
  date: string;
  venue: string;
  status: string;
  completed: boolean;
  winner?: string | null;
  method?: string | null;
  rounds?: number | null;
  belt?: string | null;
  // Fighter 1 stats
  fighter1_record?: string;
  fighter1_ko_pct?: number;
  fighter1_age?: number;
  fighter1_stance?: string;
  // Fighter 2 stats
  fighter2_record?: string;
  fighter2_ko_pct?: number;
  fighter2_age?: number;
  fighter2_stance?: string;
}

interface BoxingFightModalProps {
  isOpen: boolean;
  onClose: () => void;
  fight: BoxingFight | null;
}

export const BoxingFightModal = ({ isOpen, onClose, fight }: BoxingFightModalProps) => {
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

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isWinner = (fighterName: string) => {
    return fight?.winner?.toLowerCase() === fighterName.toLowerCase();
  };

  return (
    <AnimatePresence>
      {isOpen && fight && (
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
            className="fixed inset-4 md:inset-10 lg:inset-x-40 lg:inset-y-20 bg-card border border-border rounded-xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
              <div className="flex-1 min-w-0">
                {fight.belt && (
                  <div className="flex items-center gap-2 text-sm text-yellow-500 mb-1">
                    <Award size={14} />
                    <span className="truncate">{fight.belt}</span>
                  </div>
                )}
                <h2 className="text-xl md:text-2xl font-bold text-white truncate">
                  {fight.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {fight.venue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(fight.date)}
                  </span>
                  {fight.rounds && (
                    <span>{fight.rounds} Rounds</span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-4"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
              {/* Fighter Cards */}
              <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                {/* Fighter 1 */}
                <FighterCard
                  name={fight.fighter1}
                  record={fight.fighter1_record}
                  koPct={fight.fighter1_ko_pct}
                  age={fight.fighter1_age}
                  stance={fight.fighter1_stance}
                  isWinner={isWinner(fight.fighter1)}
                  showWinner={fight.completed}
                />

                {/* VS Divider */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-400">VS</span>
                  </div>
                </div>

                {/* Fighter 2 */}
                <FighterCard
                  name={fight.fighter2}
                  record={fight.fighter2_record}
                  koPct={fight.fighter2_ko_pct}
                  age={fight.fighter2_age}
                  stance={fight.fighter2_stance}
                  isWinner={isWinner(fight.fighter2)}
                  showWinner={fight.completed}
                />
              </div>

              {/* Mobile VS */}
              <div className="md:hidden flex justify-center -mt-4 -mb-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-400">VS</span>
                </div>
              </div>
            </div>

            {/* Winner Banner */}
            {fight.completed && fight.winner && (
              <div className="border-t border-border p-4 bg-gradient-to-r from-yellow-500/10 to-transparent">
                <div className="flex items-center gap-3">
                  <Trophy className="text-yellow-500" size={24} />
                  <div>
                    <div className="text-sm text-gray-400">Winner</div>
                    <div className="text-lg font-bold text-white">
                      {fight.winner}
                      {fight.method && (
                        <span className="text-sm font-normal text-gray-400 ml-2">
                          ({fight.method})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Fight Banner */}
            {!fight.completed && (
              <div className="border-t border-border p-4 bg-gradient-to-r from-accent/10 to-transparent">
                <div className="flex items-center gap-3">
                  <Calendar className="text-accent" size={24} />
                  <div>
                    <div className="text-sm text-gray-400">Status</div>
                    <div className="text-lg font-bold text-white">{fight.status}</div>
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

interface FighterCardProps {
  name: string;
  record?: string;
  koPct?: number;
  age?: number;
  stance?: string;
  isWinner: boolean;
  showWinner: boolean;
}

const FighterCard = ({ name, record, koPct, age, stance, isWinner, showWinner }: FighterCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative bg-white/5 rounded-xl p-6 border",
        isWinner && showWinner
          ? "border-yellow-500/50 bg-yellow-500/5"
          : "border-border"
      )}
    >
      {/* Winner Badge */}
      {isWinner && showWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Trophy size={12} />
            WINNER
          </div>
        </div>
      )}

      {/* Fighter Name */}
      <h3 className="text-2xl font-bold text-white text-center mb-6">{name}</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Record */}
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Record</div>
          <div className="text-xl font-bold text-white font-mono">
            {record || 'N/A'}
          </div>
        </div>

        {/* KO % */}
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">KO %</div>
          <div className="text-xl font-bold text-red-400 font-mono">
            {koPct !== undefined ? `${koPct}%` : 'N/A'}
          </div>
        </div>

        {/* Age */}
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Age</div>
          <div className="text-xl font-bold text-white font-mono">
            {age !== undefined ? age : 'N/A'}
          </div>
        </div>

        {/* Stance */}
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Stance</div>
          <div className="text-lg font-semibold text-white">
            {stance || 'N/A'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
