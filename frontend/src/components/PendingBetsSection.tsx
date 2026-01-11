import { Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PropTracker } from "./PropTracker";
import { ParlayTracker } from "./ParlayTracker";
import { Bet, Game } from "../types";
import { cn } from "../lib/utils";

interface PendingBetsSectionProps {
  filteredPendingBets: Bet[];
  propsData: Map<string, any>;
  parlayLegsData: Map<string, any[]>;
  lastUpdated: Date | null;
  canResolveAll: boolean;
  onRefresh: () => void;
  onClearPending: (bets: Bet[]) => void;
  findMatchingGame: (bet: Bet) => Game | undefined;
}

export const PendingBetsSection = ({
  filteredPendingBets,
  propsData,
  parlayLegsData,
  lastUpdated,
  canResolveAll,
  onRefresh,
  onClearPending,
  findMatchingGame,
}: PendingBetsSectionProps) => {
  if (filteredPendingBets.length === 0) {
    return null;
  }

  // Create enriched bets with prop_status from game matching
  const enrichedPendingBets = filteredPendingBets.map(bet => {
    if (bet.type === 'Parlay') {
      const updatedLegs = parlayLegsData.get(bet.id);
      if (updatedLegs) {
        return { ...bet, legs: updatedLegs };
      }
      return bet;
    }

    const liveData = propsData.get(bet.id);
    if (liveData) {
      return { ...bet, ...liveData };
    }

    const matchingGame = findMatchingGame(bet);
    if (matchingGame) {
      const homeScore = parseInt(matchingGame.home_score || '0');
      const awayScore = parseInt(matchingGame.away_score || '0');
      const isGameOver = matchingGame.state === 'post' || matchingGame.completed;

      let propStatus: string | undefined;
      if (isGameOver && bet.type === 'Moneyline' && bet.selection) {
        const selectionLower = bet.selection.toLowerCase();
        const homeTeamLower = matchingGame.home_team.toLowerCase();
        const awayTeamLower = matchingGame.away_team.toLowerCase();

        const betOnHome = selectionLower.includes(homeTeamLower) || homeTeamLower.includes(selectionLower);
        const betOnAway = selectionLower.includes(awayTeamLower) || awayTeamLower.includes(selectionLower);

        if (betOnHome) {
          propStatus = homeScore > awayScore ? 'won' : 'lost';
        } else if (betOnAway) {
          propStatus = awayScore > homeScore ? 'won' : 'lost';
        }
      }

      return {
        ...bet,
        game_state: matchingGame.state,
        prop_status: propStatus,
      };
    }

    return bet;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Pending Bets</h2>
        <button
          onClick={onRefresh}
          className="text-sm text-accent hover:underline"
        >
          Refresh
        </button>
        {lastUpdated && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
        <button
          onClick={() => onClearPending(enrichedPendingBets)}
          disabled={!canResolveAll}
          className={cn(
            "flex items-center gap-1 text-xs transition-colors",
            canResolveAll
              ? "text-gray-400 hover:text-orange-500"
              : "text-gray-600 cursor-not-allowed"
          )}
          title={canResolveAll ? "Resolve all pending bets based on their outcomes" : "Wait for all games to finish"}
        >
          <Trash2 size={14} />
          <span>Resolve All</span>
        </button>
      </div>
      <div className={cn("grid gap-4", filteredPendingBets.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
        <AnimatePresence mode="popLayout">
          {filteredPendingBets.map(bet => {
            if (bet.type === 'Parlay') {
              const updatedLegs = parlayLegsData.get(bet.id);
              const enrichedParlay = updatedLegs ? { ...bet, legs: updatedLegs } : bet;
              return (
                <motion.div
                  key={bet.id}
                  initial={false}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <ParlayTracker bet={enrichedParlay} />
                </motion.div>
              );
            }

            const liveData = propsData.get(bet.id);
            let enrichedBet = liveData ? { ...bet, ...liveData } : bet;

            if (!liveData) {
              const matchingGame = findMatchingGame(bet);
              if (matchingGame) {
                const homeScore = parseInt(matchingGame.home_score || '0');
                const awayScore = parseInt(matchingGame.away_score || '0');
                const totalScore = homeScore + awayScore;
                const isGameOver = matchingGame.state === 'post' || matchingGame.completed;
                const isLive = matchingGame.state === 'in';
                const isPreGame = matchingGame.state === 'pre';

                let propStatus: string | undefined;
                if ((isLive || isGameOver) && bet.type === 'Moneyline' && bet.selection) {
                  const selectionLower = bet.selection.toLowerCase();
                  const homeTeamLower = matchingGame.home_team.toLowerCase();
                  const awayTeamLower = matchingGame.away_team.toLowerCase();

                  const betOnHome = selectionLower.includes(homeTeamLower) || homeTeamLower.includes(selectionLower);
                  const betOnAway = selectionLower.includes(awayTeamLower) || awayTeamLower.includes(selectionLower);

                  if (betOnHome) {
                    const isWinning = homeScore > awayScore;
                    propStatus = isGameOver ? (isWinning ? 'won' : 'lost') : (isWinning ? 'live_hit' : 'live_miss');
                  } else if (betOnAway) {
                    const isWinning = awayScore > homeScore;
                    propStatus = isGameOver ? (isWinning ? 'won' : 'lost') : (isWinning ? 'live_hit' : 'live_miss');
                  }
                }

                let gameStatusText = matchingGame.status;
                if (isGameOver) {
                  gameStatusText = 'Final';
                } else if (isLive && matchingGame.display_clock) {
                  gameStatusText = `Q${matchingGame.period} ${matchingGame.display_clock}`;
                }

                enrichedBet = {
                  ...bet,
                  game_state: matchingGame.state,
                  game_status_text: gameStatusText,
                  current_value_str: isPreGame ? undefined : `${awayScore}-${homeScore}`,
                  current_value: bet.type === 'Total' && !isPreGame ? totalScore : undefined,
                  prop_status: propStatus,
                  date: matchingGame.date || bet.date,
                };
              }
            }

            return (
              <motion.div
                key={bet.id}
                initial={false}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <PropTracker bet={enrichedBet} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
