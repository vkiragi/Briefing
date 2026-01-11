import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { useBets } from "../context/BetContext";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { GameDetailModal } from "../components/GameDetailModal";
import { F1RaceModal } from "../components/F1RaceModal";
import { BoxingFightModal } from "../components/BoxingFightModal";
import { DateNavigator } from "../components/DateNavigator";
import { PinnedGamesSection } from "../components/PinnedGamesSection";
import { FavoriteTeamsSection } from "../components/FavoriteTeamsSection";
import { SportTabs } from "../components/SportTabs";
import { GameSection } from "../components/GameSection";
import { PendingBetsSection } from "../components/PendingBetsSection";
import { useDashboardData } from "../hooks/useDashboardData";
import { Game, SPORT_NAVIGATION } from "../types";
import { LEAGUE_CONFIG, F1Race, BoxingFight } from "../lib/leagueConfig";
import { cn } from "../lib/utils";

export const Dashboard = () => {
  const { stats } = useBets();
  const { settings, isSectionEnabled } = useSettings();
  const { user } = useAuth();

  // Sport filter state from URL
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSportFilter = searchParams.get('sport') || 'home';

  const handleSelectSport = useCallback((sport: string) => {
    if (sport === 'home') {
      searchParams.delete('sport');
    } else {
      searchParams.set('sport', sport);
    }
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  // Get user's first name for the header
  const fullName = user?.user_metadata?.full_name;
  const firstName = fullName ? fullName.split(' ')[0] : null;

  // Use the custom hook for all data management
  const {
    leagueData,
    leagueDates,
    propsData,
    parlayLegsData,
    lastUpdated,
    f1Data,
    boxingData,
    boxingSelectedDate,
    setBoxingSelectedDate,
    filteredPendingBets,
    enrichedPendingBets,
    sectionsToRender,
    canResolveAll,
    refreshPropsData,
    clearPendingBets,
    findMatchingGame,
    handlePrevious,
    handleNext,
    handleToday,
    handleDateChange,
    getDateDisplayLabel,
    getTeamRecord,
  } = useDashboardData(selectedSportFilter);

  // Modal state
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedF1Race, setSelectedF1Race] = useState<F1Race | null>(null);
  const [selectedBoxingFight, setSelectedBoxingFight] = useState<BoxingFight | null>(null);

  const isCompact = settings.compactMode;

  const handleGameClick = useCallback((game: Game, sport: string) => {
    setSelectedGame(game);
    setSelectedSport(sport);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-2 md:px-4 pt-6 md:pt-8 pb-2 md:pb-4 max-w-[2400px] mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            {firstName ? `${firstName}'s` : 'Your'} <span className="text-accent">Briefing</span>
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {/* Stats Strip */}
        <div className="flex items-center gap-4 md:gap-8 text-base md:text-lg">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Record</span>
            <span className="font-semibold text-white">{stats.wins}W-{stats.losses}L</span>
            <span className="text-gray-600">({stats.winRate.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">ROI</span>
            <span className={cn("font-semibold", stats.roi >= 0 ? "text-accent" : "text-red-500")}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Active</span>
            <span className="font-semibold text-white">{stats.pending}</span>
          </div>
        </div>
      </div>

      {/* Sport Filter Tabs */}
      <SportTabs
        selectedSport={selectedSportFilter}
        onSelectSport={handleSelectSport}
      />

      {/* Pending Bets Section */}
      <PendingBetsSection
        filteredPendingBets={filteredPendingBets}
        propsData={propsData}
        parlayLegsData={parlayLegsData}
        lastUpdated={lastUpdated}
        canResolveAll={canResolveAll}
        onRefresh={refreshPropsData}
        onClearPending={() => clearPendingBets(enrichedPendingBets)}
        findMatchingGame={findMatchingGame}
      />

      {/* Favorite Teams Section - only show on home page */}
      {selectedSportFilter === 'home' && <FavoriteTeamsSection />}

      {/* Pinned Games Section */}
      <PinnedGamesSection
        sportFilter={selectedSportFilter}
        onGameClick={(game, sport) => {
          setSelectedGame({
            event_id: game.event_id,
            home_team: game.home_team || '',
            away_team: game.away_team || '',
          } as Game);
          setSelectedSport(sport);
        }}
      />

      {/* Sports Sections */}
      {sectionsToRender.map(sectionId => {
        if (selectedSportFilter === 'home' && !isSectionEnabled(sectionId)) return null;

        const config = LEAGUE_CONFIG[sectionId];
        if (!config) return null;

        // Handle F1 separately
        if (config.isF1) {
          return (
            <F1Section
              key={sectionId}
              config={config}
              f1Data={f1Data}
              isCompact={isCompact}
              onRaceClick={setSelectedF1Race}
            />
          );
        }

        // Handle Boxing separately
        if (config.isBoxing) {
          return (
            <BoxingSection
              key={sectionId}
              config={config}
              boxingData={boxingData}
              boxingSelectedDate={boxingSelectedDate}
              setBoxingSelectedDate={setBoxingSelectedDate}
              isCompact={isCompact}
              onFightClick={setSelectedBoxingFight}
            />
          );
        }

        const data = leagueData[sectionId];
        if (!data) return null;

        const navType = SPORT_NAVIGATION[sectionId] || 'daily';
        const selectedDate = leagueDates[sectionId] || new Date();

        return (
          <GameSection
            key={sectionId}
            leagueId={sectionId}
            title={config.title}
            games={data.games}
            loading={data.loading}
            lastUpdated={data.lastUpdated}
            sport={sectionId}
            isCompact={isCompact}
            navigationType={navType}
            selectedDate={selectedDate}
            displayLabel={getDateDisplayLabel(sectionId)}
            onPrevious={() => handlePrevious(sectionId)}
            onNext={() => handleNext(sectionId)}
            onToday={() => handleToday(sectionId)}
            onDateSelect={(date) => handleDateChange(sectionId, date)}
            getTeamRecord={getTeamRecord}
            onGameClick={handleGameClick}
          />
        );
      })}

      {/* Modals */}
      <GameDetailModal
        isOpen={!!selectedGame}
        onClose={() => setSelectedGame(null)}
        game={selectedGame}
        sport={selectedSport}
      />

      <F1RaceModal
        isOpen={!!selectedF1Race}
        onClose={() => setSelectedF1Race(null)}
        race={selectedF1Race}
      />

      <BoxingFightModal
        isOpen={!!selectedBoxingFight}
        onClose={() => setSelectedBoxingFight(null)}
        fight={selectedBoxingFight}
      />
    </motion.div>
  );
};

// F1 Section Component
interface F1SectionProps {
  config: { title: string };
  f1Data: { races: F1Race[]; loading: boolean; lastUpdated: Date | null };
  isCompact: boolean;
  onRaceClick: (race: F1Race) => void;
}

const F1Section = ({ config, f1Data, isCompact, onRaceClick }: F1SectionProps) => (
  <div className={cn("space-y-4", isCompact && "space-y-2")}>
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h2 className={cn("font-semibold tracking-tight text-white", isCompact ? "text-lg" : "text-xl")}>
          {config.title}
        </h2>
        {f1Data.lastUpdated && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>Updated {f1Data.lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      <div className="w-full h-0.5 bg-accent/40 rounded-full" />
    </div>

    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 gap-4",
      isCompact ? "lg:grid-cols-4 gap-2" : "lg:grid-cols-3 gap-4"
    )}>
      {f1Data.loading ? (
        <>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn("bg-card/50 animate-pulse rounded-lg", isCompact ? "h-16" : "h-24")} />
          ))}
        </>
      ) : f1Data.races.length > 0 ? (
        f1Data.races.map((race, i) => {
          const raceDate = new Date(race.date);
          const isPast = race.completed;
          const isUpcoming = !isPast && raceDate > new Date();

          return (
            <div
              key={i}
              onClick={() => onRaceClick(race)}
              className={cn(
                "bg-card border border-border rounded-lg hover:bg-card/80 transition-all cursor-pointer hover:border-accent/50",
                isCompact ? "p-2" : "p-4"
              )}
            >
              <div className={cn("flex items-center justify-between", isCompact ? "mb-1" : "mb-2")}>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  isPast ? "bg-gray-700 text-gray-300" :
                  isUpcoming ? "bg-accent/20 text-accent" :
                  "bg-red-500/20 text-red-400"
                )}>
                  {race.status}
                </span>
                <span className={cn("text-xs text-gray-500", isCompact && "text-[10px]")}>
                  {format(raceDate, 'MMM d, yyyy')}
                </span>
              </div>
              <h3 className={cn("font-semibold text-white truncate", isCompact ? "text-sm mb-1" : "text-base mb-2")}>
                {race.name}
              </h3>
              <p className={cn("text-gray-400 truncate", isCompact ? "text-xs" : "text-sm")}>
                📍 {race.location}
              </p>
              {race.winner && (
                <p className={cn("text-accent font-medium mt-1 truncate", isCompact ? "text-xs" : "text-sm")}>
                  🏆 {race.winner}
                </p>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-gray-500 text-sm text-center py-8 col-span-full">
          No F1 races available
        </div>
      )}
    </div>
  </div>
);

// Boxing Section Component
interface BoxingSectionProps {
  config: { title: string };
  boxingData: { fights: BoxingFight[]; loading: boolean; lastUpdated: Date | null };
  boxingSelectedDate: Date;
  setBoxingSelectedDate: (date: Date) => void;
  isCompact: boolean;
  onFightClick: (fight: BoxingFight) => void;
}

const BoxingSection = ({ config, boxingData, boxingSelectedDate, setBoxingSelectedDate, isCompact, onFightClick }: BoxingSectionProps) => {
  const boxingWeekStart = startOfWeek(boxingSelectedDate, { weekStartsOn: 0 });
  const boxingWeekEnd = endOfWeek(boxingSelectedDate, { weekStartsOn: 0 });

  const filteredFights = boxingData.fights.filter(fight => {
    const fightDate = new Date(fight.date);
    const fightDateOnly = new Date(fightDate.getFullYear(), fightDate.getMonth(), fightDate.getDate());
    const weekStartOnly = new Date(boxingWeekStart.getFullYear(), boxingWeekStart.getMonth(), boxingWeekStart.getDate());
    const weekEndOnly = new Date(boxingWeekEnd.getFullYear(), boxingWeekEnd.getMonth(), boxingWeekEnd.getDate());
    return fightDateOnly >= weekStartOnly && fightDateOnly <= weekEndOnly;
  });

  const boxingDisplayLabel = `${format(boxingWeekStart, 'MMM d')} - ${format(boxingWeekEnd, 'MMM d')}`;

  return (
    <div className={cn("space-y-4", isCompact && "space-y-2")}>
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className={cn("font-semibold tracking-tight text-white", isCompact ? "text-lg" : "text-xl")}>
              {config.title}
            </h2>
            {boxingData.lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={12} />
                <span>Updated {boxingData.lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <DateNavigator
            displayLabel={boxingDisplayLabel}
            navigationType="weekly"
            selectedDate={boxingSelectedDate}
            onPrevious={() => setBoxingSelectedDate(subWeeks(boxingSelectedDate, 1))}
            onNext={() => setBoxingSelectedDate(addWeeks(boxingSelectedDate, 1))}
            onToday={() => setBoxingSelectedDate(new Date())}
            onDateSelect={(date) => setBoxingSelectedDate(date)}
            compact={isCompact}
          />
        </div>
        <div className="w-full h-0.5 bg-accent/40 rounded-full" />
      </div>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-4",
        isCompact ? "lg:grid-cols-4 gap-2" : "lg:grid-cols-3 gap-4"
      )}>
        {boxingData.loading ? (
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={cn("bg-card/50 animate-pulse rounded-lg", isCompact ? "h-16" : "h-28")} />
            ))}
          </>
        ) : filteredFights.length > 0 ? (
          filteredFights.map((fight, i) => {
            const fightDate = new Date(fight.date);
            const isPast = fight.completed;
            const isUpcoming = !isPast && fightDate > new Date();

            return (
              <div
                key={i}
                onClick={() => onFightClick(fight)}
                className={cn(
                  "bg-card border border-border rounded-lg hover:bg-card/80 transition-all hover:border-accent/50 cursor-pointer",
                  isCompact ? "p-2" : "p-4"
                )}
              >
                <div className={cn("flex items-center justify-between", isCompact ? "mb-1" : "mb-2")}>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    isPast ? "bg-gray-700 text-gray-300" :
                    isUpcoming ? "bg-accent/20 text-accent" :
                    "bg-red-500/20 text-red-400"
                  )}>
                    {fight.status}
                  </span>
                  <span className={cn("text-xs text-gray-500", isCompact && "text-[10px]")}>
                    {format(fightDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <h3 className={cn("font-semibold text-white", isCompact ? "text-sm mb-1" : "text-base mb-2")}>
                  <span>{fight.fighter1}</span>
                  <span className="text-gray-500 mx-2">vs</span>
                  <span>{fight.fighter2}</span>
                </h3>
                {fight.belt && (
                  <p className={cn("text-yellow-500 truncate", isCompact ? "text-xs" : "text-sm")}>
                    🏆 {fight.belt}
                  </p>
                )}
                <p className={cn("text-gray-400 truncate", isCompact ? "text-xs" : "text-sm")}>
                  📍 {fight.venue}
                </p>
                {fight.winner && (
                  <p className={cn("text-accent font-medium mt-1 truncate", isCompact ? "text-xs" : "text-sm")}>
                    Winner: {fight.winner}
                    {fight.method && ` (${fight.method})`}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-gray-500 text-sm text-center py-8 col-span-full">
            No boxing fights this week
          </div>
        )}
      </div>
    </div>
  );
};
