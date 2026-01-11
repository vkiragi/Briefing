import { PinButton } from "./PinButton";
import { Game } from "../types";
import { cn } from "../lib/utils";
import { SOCCER_LEAGUES } from "../lib/leagueConfig";

interface GameCardProps {
  game: Game;
  sport: string;
  isCompact: boolean;
  getTeamRecord?: (teamName: string, sport: string) => string | null;
  onGameClick?: (game: Game, sport: string) => void;
}

// Helper function to format game time based on sport
export const formatGameTime = (game: Game, sport: string) => {
  if (game.state === 'pre') {
    if (!game.date || game.date === 'TBD' || game.date === 'Unknown date') {
      return game.date || 'TBD';
    }
    try {
      const date = new Date(game.date);
      if (isNaN(date.getTime())) {
        return game.date;
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
    } catch {
      return game.date || 'TBD';
    }
  }

  if (game.state === 'post' || game.completed) {
    if (game.date && game.date !== 'TBD' && game.date !== 'Unknown date') {
      try {
        const date = new Date(game.date);
        if (!isNaN(date.getTime())) {
          const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            month: 'short',
            day: 'numeric',
          });
          return `Final • ${dateFormatter.format(date)}`;
        }
      } catch {
        // Fall through to just "Final"
      }
    }
    return 'Final';
  }

  // Tennis uses sets instead of quarters/periods
  if (sport.includes('tennis')) {
    const statusLower = (game.status || '').toLowerCase();
    if (statusLower.includes('set')) {
      return game.status || 'Live';
    }
    return game.status || 'Live';
  }

  // Soccer handling - show minute directly from display_clock
  const isSoccer = SOCCER_LEAGUES.includes(sport);

  if (isSoccer && game.state === 'in') {
    if (game.display_clock) {
      const minuteMatch = game.display_clock.match(/(\d+)/);
      const minute = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

      if (game.period === 1 && minute >= 45 && minute <= 46) {
        const statusLower = (game.status || '').toLowerCase();
        if (statusLower.includes('half')) {
          return 'Halftime';
        }
      }

      return game.display_clock;
    }
    return game.status || 'Live';
  }

  // Check for halftime (non-soccer sports)
  const statusLower = (game.status || '').toLowerCase();
  const isHalftime =
    statusLower.includes('half') ||
    statusLower.includes('halftime') ||
    (game.period === 2 && game.clock_seconds === 0 && game.state === 'in');

  if (isHalftime) {
    return 'Halftime';
  }

  // Live game - show period/quarter and time
  if (game.state === 'in' && game.period) {
    const period = sport === 'mlb' ? `Inning ${game.period}` : `Q${game.period}`;

    if (game.clock_seconds !== undefined && game.clock_seconds > 0) {
      const minutes = Math.floor(game.clock_seconds / 60);
      const seconds = game.clock_seconds % 60;
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      return `${period} ${formattedTime}`;
    }

    if (game.display_clock) {
      return `${period} ${game.display_clock}`;
    }

    return period;
  }

  return game.display_clock || game.status || 'Live';
};

export const GameCard = ({ game, sport, isCompact, getTeamRecord, onGameClick }: GameCardProps) => {
  const isLive = game.state === 'in';
  const isTennis = sport.startsWith('tennis');
  const showTournament = isTennis && game.tournament && game.match_type !== 'tournament';
  const isTennisMatch = isTennis && game.match_type !== 'tournament';
  const isTennisTournament = isTennis && game.match_type === 'tournament';
  const gameEventId = game.event_id || game.competition_id;

  const tennisTypes = ['tennis', 'tennis-atp-singles', 'tennis-atp-doubles', 'tennis-wta-singles', 'tennis-wta-doubles'];
  const boxScoreSports = ['nba', 'nfl', 'mlb', 'ncaab', 'ncaaf', ...SOCCER_LEAGUES, ...tennisTypes];
  const isTennisActualMatch = tennisTypes.includes(sport) && game.match_type !== 'tournament';
  const isClickable = boxScoreSports.includes(sport) && gameEventId && (tennisTypes.includes(sport) ? isTennisActualMatch : true);

  const handleClick = () => {
    if (isClickable && onGameClick) {
      onGameClick(game, sport);
    }
  };

  // Tennis tournament card
  if (isTennisTournament) {
    const tournamentClickable = !!gameEventId;
    return (
      <div
        onClick={() => tournamentClickable && onGameClick?.(game, sport)}
        className={cn(
          "bg-card border border-border rounded-lg hover:bg-card/80 transition-all relative",
          isCompact ? "p-2" : "p-4",
          tournamentClickable && "cursor-pointer hover:border-accent/50"
        )}
      >
        <div className="text-center">
          <div className={cn("font-mono text-gray-400 flex items-center justify-center gap-2", isCompact ? "text-xs mb-1" : "text-sm mb-2")}>
            <span>{formatGameTime(game, sport)}</span>
            {gameEventId && (
              <PinButton
                eventId={gameEventId}
                sport={sport}
                matchup={game.tournament || game.home_team}
                homeTeam={game.home_team}
                awayTeam={game.away_team}
                size="sm"
                disabled={game.state === 'post' || game.completed === true}
              />
            )}
          </div>
          <div className={cn("font-semibold text-white", isCompact ? "text-sm" : "text-base")}>
            {game.tournament || game.home_team}
          </div>
          {!isCompact && (
            <div className="text-xs text-gray-500 mt-1">
              Upcoming Tournament
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tennis match card
  if (isTennisMatch) {
    const tennisClickable = !!gameEventId;
    return (
      <div
        onClick={() => tennisClickable && onGameClick?.(game, sport)}
        className={cn(
          "bg-card border border-border rounded-lg hover:bg-card/80 transition-all relative",
          isCompact ? "p-2" : "p-4",
          tennisClickable && "cursor-pointer hover:border-accent/50"
        )}
      >
        {showTournament && (
          <div className="text-xs text-gray-400 font-medium mb-2 truncate">
            {game.tournament}
          </div>
        )}
        <div className={cn(
          "flex items-center mb-3",
          isLive ? "justify-between" : "justify-center"
        )}>
          {isLive && (
            <span className="text-xs uppercase font-medium text-red-500">
              Live
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-gray-400">
              {formatGameTime(game, sport)}
            </span>
            {gameEventId && (
              <PinButton
                eventId={gameEventId}
                sport={sport}
                matchup={`${game.away_team} vs ${game.home_team}`}
                homeTeam={game.home_team}
                awayTeam={game.away_team}
                size="sm"
                disabled={game.state === 'post' || game.completed === true}
              />
            )}
          </div>
        </div>
        {/* Player 1 */}
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {game.home_winner && (
              <span className="text-green-500 text-sm">✓</span>
            )}
            <span className={cn(
              "text-sm truncate",
              game.home_winner ? "font-semibold text-white" : "text-gray-400"
            )}>{game.home_team}</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className={cn(
              "text-lg font-mono font-bold w-4 text-center",
              game.home_winner ? "text-white" : "text-gray-400"
            )}>{game.home_score}</span>
            {game.home_set_scores && (
              <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                {game.home_set_scores}
              </span>
            )}
          </div>
        </div>
        {/* Player 2 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {game.away_winner && (
              <span className="text-green-500 text-sm">✓</span>
            )}
            <span className={cn(
              "text-sm truncate",
              game.away_winner ? "font-semibold text-white" : "text-gray-400"
            )}>{game.away_team}</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className={cn(
              "text-lg font-mono font-bold w-4 text-center",
              game.away_winner ? "text-white" : "text-gray-400"
            )}>{game.away_score}</span>
            {game.away_set_scores && (
              <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                {game.away_set_scores}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard sports card
  const homeScore = typeof game.home_score === 'string' ? parseInt(game.home_score) : game.home_score;
  const awayScore = typeof game.away_score === 'string' ? parseInt(game.away_score) : game.away_score;
  const hasScores = !isNaN(homeScore) && !isNaN(awayScore);
  const isTied = hasScores && homeScore === awayScore;
  const homeWinning = hasScores && (homeScore > awayScore || isTied);
  const awayWinning = hasScores && (awayScore > homeScore || isTied);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-card border border-border rounded-lg hover:bg-card/80 transition-all relative",
        isCompact ? "p-2" : "p-4",
        isClickable && "cursor-pointer hover:border-accent/50"
      )}
    >
      {showTournament && !isCompact && (
        <div className="text-xs text-accent font-medium mb-2 truncate">
          {game.tournament}
        </div>
      )}
      <div className={cn(
        "flex items-center",
        isCompact ? "mb-1" : "mb-3",
        isLive ? "justify-between" : "justify-center"
      )}>
        {isLive && (
          <span className={cn("uppercase font-medium text-red-500", isCompact ? "text-[10px]" : "text-xs")}>
            Live
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className={cn("font-mono font-semibold text-gray-400", isCompact ? "text-xs" : "text-sm")}>
            {formatGameTime(game, sport)}
          </span>
          {gameEventId && (
            <PinButton
              eventId={gameEventId}
              sport={sport}
              matchup={`${game.away_team} @ ${game.home_team}`}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
              size="sm"
              disabled={game.state === 'post' || game.completed === true}
            />
          )}
        </div>
      </div>

      {/* Home team */}
      <div className={cn("flex justify-between items-center", isCompact ? "mb-1" : "mb-2")}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {game.home_logo && (
            <img
              src={game.home_logo}
              alt={game.home_team}
              className={cn("object-contain flex-shrink-0", isCompact ? "w-5 h-5" : "w-6 h-6")}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <span className={cn(
            "font-semibold truncate",
            isCompact ? "text-sm" : "text-base",
            homeWinning ? "text-white" : "text-gray-400"
          )}>{game.home_team}</span>
          {(() => {
            const homeRecord = getTeamRecord?.(game.home_team, sport);
            return homeRecord && !isCompact ? (
              <span className="text-xs text-gray-500 font-normal">({homeRecord})</span>
            ) : null;
          })()}
        </div>
        <span className={cn(
          "font-mono font-semibold ml-2",
          isCompact ? "text-base" : "text-xl",
          homeWinning ? "text-white" : "text-gray-500"
        )}>{game.home_score}</span>
      </div>

      {/* Away team */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {game.away_logo && (
            <img
              src={game.away_logo}
              alt={game.away_team}
              className={cn("object-contain flex-shrink-0", isCompact ? "w-5 h-5" : "w-6 h-6")}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <span className={cn(
            "font-semibold truncate",
            isCompact ? "text-sm" : "text-base",
            awayWinning ? "text-white" : "text-gray-400"
          )}>{game.away_team}</span>
          {(() => {
            const awayRecord = getTeamRecord?.(game.away_team, sport);
            return awayRecord && !isCompact ? (
              <span className="text-xs text-gray-500 font-normal">({awayRecord})</span>
            ) : null;
          })()}
        </div>
        <span className={cn(
          "font-mono font-semibold ml-2",
          isCompact ? "text-base" : "text-xl",
          awayWinning ? "text-white" : "text-gray-500"
        )}>{game.away_score}</span>
      </div>
    </div>
  );
};
