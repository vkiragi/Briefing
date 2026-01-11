import { Clock } from "lucide-react";
import { DateNavigator } from "./DateNavigator";
import { GameCard } from "./GameCard";
import { Game, NavigationType } from "../types";
import { cn } from "../lib/utils";

interface GameSectionProps {
  leagueId: string;
  title: string;
  games: Game[];
  loading: boolean;
  lastUpdated: Date | null;
  sport: string;
  isCompact: boolean;
  navigationType: NavigationType;
  selectedDate: Date;
  displayLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateSelect: (date: Date) => void;
  getTeamRecord?: (teamName: string, sport: string) => string | null;
  onGameClick?: (game: Game, sport: string) => void;
}

export const GameSection = ({
  title,
  games,
  loading,
  lastUpdated,
  sport,
  isCompact,
  navigationType,
  selectedDate,
  displayLabel,
  onPrevious,
  onNext,
  onToday,
  onDateSelect,
  getTeamRecord,
  onGameClick,
}: GameSectionProps) => {
  const hasLiveGames = games.some(game => game.state === 'in');

  return (
    <div className={cn("space-y-4", isCompact && "space-y-2")}>
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className={cn("font-semibold tracking-tight text-white", isCompact ? "text-lg" : "text-xl")}>{title}</h2>

            {hasLiveGames && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Live
              </span>
            )}
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={12} />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <DateNavigator
            displayLabel={displayLabel}
            navigationType={navigationType}
            selectedDate={selectedDate}
            onPrevious={onPrevious}
            onNext={onNext}
            onToday={onToday}
            onDateSelect={onDateSelect}
            compact={isCompact}
          />
        </div>
        <div className="w-full h-0.5 bg-accent/40 rounded-full" />
      </div>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-4",
        isCompact ? "lg:grid-cols-4 gap-2" : "lg:grid-cols-3 gap-4"
      )}>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={cn("bg-card/50 animate-pulse rounded-lg", isCompact ? "h-16" : "h-24")} />
            ))}
          </>
        ) : games.length > 0 ? (
          games.map((game, i) => (
            <GameCard
              key={game.event_id || i}
              game={game}
              sport={sport}
              isCompact={isCompact}
              getTeamRecord={getTeamRecord}
              onGameClick={onGameClick}
            />
          ))
        ) : (
          <div className="text-gray-500 text-sm text-center py-8 col-span-full">No games scheduled this week</div>
        )}
      </div>
    </div>
  );
};
