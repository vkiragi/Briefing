import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LayoutGrid, Clock, Eye, RotateCcw, GripVertical, Star, Search, Loader2, ChevronLeft, Sun, Moon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { useSettings, AVAILABLE_SECTIONS, SectionId, FavoriteTeam } from '../context/SettingsContext';
import { api } from '../lib/api';

// Touch drag state
interface TouchDragState {
  isDragging: boolean;
  draggedId: SectionId | null;
  startY: number;
  currentY: number;
  itemHeight: number;
}

// Sports available for team picker
const TEAM_SPORTS = [
  { id: 'nba', label: 'NBA', icon: '🏀' },
  { id: 'ncaab', label: 'NCAAB', icon: '🏀' },
  { id: 'nfl', label: 'NFL', icon: '🏈' },
  { id: 'ncaaf', label: 'NCAAF', icon: '🏈' },
  { id: 'mlb', label: 'MLB', icon: '⚾' },
  { id: 'nhl', label: 'NHL', icon: '🏒' },
  { id: 'epl', label: 'Premier League', icon: '⚽' },
  { id: 'laliga', label: 'La Liga', icon: '⚽' },
  { id: 'seriea', label: 'Serie A', icon: '⚽' },
  { id: 'bundesliga', label: 'Bundesliga', icon: '⚽' },
  { id: 'ligue1', label: 'Ligue 1', icon: '⚽' },
  { id: 'ucl', label: 'Champions League', icon: '🏆' },
  { id: 'mls', label: 'MLS', icon: '⚽' },
] as const;

export const Settings = () => {
  const navigate = useNavigate();
  const {
    settings,
    updateRefreshInterval,
    toggleSection,
    setSectionOrder,
    togglePropTracker,
    toggleCompactMode,
    toggleTheme,
    resetToDefaults,
    isSectionEnabled,
    addFavoriteTeam,
    removeFavoriteTeam,
  } = useSettings();

  const [localInterval, setLocalInterval] = useState(settings.refreshInterval);
  const [activeTab, setActiveTab] = useState<'general' | 'homescreen' | 'teams'>('general');
  const [draggedItem, setDraggedItem] = useState<SectionId | null>(null);
  const [customSeconds, setCustomSeconds] = useState('');

  // Touch drag state for mobile
  const [touchDrag, setTouchDrag] = useState<TouchDragState>({
    isDragging: false,
    draggedId: null,
    startY: 0,
    currentY: 0,
    itemHeight: 56,
  });
  const touchStartYRef = useRef<number>(0);
  const itemRefs = useRef<Map<SectionId, HTMLDivElement>>(new Map());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Team search state
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamSearchResults, setTeamSearchResults] = useState<FavoriteTeam[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Sport picker state
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [sportTeams, setSportTeams] = useState<FavoriteTeam[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  // Debounced team search
  useEffect(() => {
    if (teamSearchQuery.length < 2) {
      setTeamSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await api.searchTeams(teamSearchQuery, 10);
        setTeamSearchResults(results);
      } catch (error) {
        console.error('Team search failed:', error);
        setSearchError('Failed to search teams');
        setTeamSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [teamSearchQuery]);

  // State for sport teams error
  const [sportTeamsError, setSportTeamsError] = useState<string | null>(null);

  // Fetch teams when a sport is selected
  useEffect(() => {
    if (!selectedSport) {
      setSportTeams([]);
      setSportTeamsError(null);
      return;
    }

    setIsLoadingTeams(true);
    setSportTeamsError(null);
    api.getTeamsBySport(selectedSport)
      .then((teams) => {
        setSportTeams(teams);
      })
      .catch((error) => {
        console.error('Failed to fetch teams:', error);
        setSportTeams([]);
        setSportTeamsError(error.message || 'Failed to load teams. Please try again.');
      })
      .finally(() => {
        setIsLoadingTeams(false);
      });
  }, [selectedSport]);

  // Sync local interval when global settings change
  useEffect(() => {
    setLocalInterval(settings.refreshInterval);
  }, [settings.refreshInterval]);

  const handleSave = () => {
    updateRefreshInterval(localInterval);
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const presetIntervals = [
    { label: '5 sec', value: 5000 },
    { label: '10 sec', value: 10000 },
    { label: '15 sec', value: 15000 },
    { label: '30 sec', value: 30000 },
    { label: '1 min', value: 60000 },
  ];

  const handleDragStart = (e: React.DragEvent, sectionId: SectionId) => {
    setDraggedItem(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: SectionId) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const currentOrder = [...settings.homeScreen.sectionOrder];
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedItem);
      setSectionOrder(currentOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, sectionId: SectionId) => {
    const touch = e.touches[0];
    const itemEl = itemRefs.current.get(sectionId);
    const itemHeight = itemEl?.offsetHeight || 56;
    const startY = touch.clientY;
    touchStartYRef.current = startY;

    longPressTimerRef.current = setTimeout(() => {
      setTouchDrag({
        isDragging: true,
        draggedId: sectionId,
        startY,
        currentY: startY,
        itemHeight,
      });
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 150);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDrag.isDragging && longPressTimerRef.current) {
      const touch = e.touches[0];
      const moveDistance = Math.abs(touch.clientY - touchStartYRef.current);
      if (moveDistance > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }

    if (!touchDrag.isDragging || !touchDrag.draggedId) return;

    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchDrag.startY;
    const moveThreshold = touchDrag.itemHeight * 0.6;

    const positionsToMove = Math.round(deltaY / touchDrag.itemHeight);

    if (Math.abs(deltaY) > moveThreshold && positionsToMove !== 0) {
      const currentOrder = [...settings.homeScreen.sectionOrder];
      const currentIndex = currentOrder.indexOf(touchDrag.draggedId);
      const targetIndex = Math.max(0, Math.min(currentOrder.length - 1, currentIndex + (positionsToMove > 0 ? 1 : -1)));

      if (currentIndex !== targetIndex) {
        currentOrder.splice(currentIndex, 1);
        currentOrder.splice(targetIndex, 0, touchDrag.draggedId);
        setSectionOrder(currentOrder);

        setTouchDrag(prev => ({
          ...prev,
          startY: touch.clientY,
          currentY: touch.clientY,
        }));
      }
    } else {
      setTouchDrag(prev => ({
        ...prev,
        currentY: touch.clientY,
      }));
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    setTouchDrag({
      isDragging: false,
      draggedId: null,
      startY: 0,
      currentY: 0,
      itemHeight: 56,
    });
  };

  // Get ordered sections for display
  const orderedSections = settings.homeScreen.sectionOrder
    .map(id => AVAILABLE_SECTIONS.find(s => s.id === id))
    .filter(Boolean) as typeof AVAILABLE_SECTIONS[number][];

  return (
    <div className="min-h-screen px-4 py-6">
      <Card className="w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h2 className="text-xl font-bold">Settings</h2>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
              activeTab === 'general'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <Clock size={14} />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('homescreen')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
              activeTab === 'homescreen'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <LayoutGrid size={14} />
            <span>Home</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
              activeTab === 'teams'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <Star size={14} />
            <span>Teams</span>
            {settings.favoriteTeams.length > 0 && (
              <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded-full">
                {settings.favoriteTeams.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Rate Limiting Disclaimer */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-500 text-sm mb-0.5">API Rate Limiting</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Low refresh rates may cause temporary blocks.
                      <span className="text-accent ml-1 font-medium">Recommended: 30-60s</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Refresh Rate Setting */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Auto-Refresh Interval
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-1.5">
                    {presetIntervals.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setLocalInterval(preset.value);
                          setCustomSeconds('');
                        }}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                          localInterval === preset.value && !customSeconds
                            ? "bg-accent text-background border-accent"
                            : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Custom:</span>
                    <input
                      type="number"
                      min="1"
                      max="600"
                      value={customSeconds}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomSeconds(val);
                        if (val && !isNaN(parseInt(val)) && parseInt(val) >= 1) {
                          setLocalInterval(parseInt(val) * 1000);
                        }
                      }}
                      placeholder="sec"
                      className="w-20 px-2 py-1.5 bg-card border border-border rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                    />
                    <span className="text-xs text-gray-500">sec</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Current: {localInterval / 1000}s
                  </p>
                </div>
              </div>

              {/* Display Options */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Display Options
                </label>
                <div className="space-y-2">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      {settings.theme === 'dark' ? (
                        <Moon size={16} className="text-gray-400" />
                      ) : (
                        <Sun size={16} className="text-yellow-500" />
                      )}
                      <div>
                        <span className="text-xs font-medium">Theme</span>
                        <p className="text-[10px] text-gray-500">Dark / Light mode</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={cn(
                        "relative w-12 h-7 rounded-full transition-colors flex-shrink-0",
                        settings.theme === 'dark' ? "bg-gray-700" : "bg-accent"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 flex items-center justify-center w-5 h-5 bg-white rounded-full shadow-md transition-transform",
                          settings.theme === 'dark' ? "left-1" : "translate-x-5 left-1"
                        )}
                      >
                        {settings.theme === 'dark' ? (
                          <Moon size={12} className="text-gray-700" />
                        ) : (
                          <Sun size={12} className="text-yellow-500" />
                        )}
                      </span>
                    </button>
                  </div>

                  <label className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-gray-400" />
                      <div>
                        <span className="text-xs font-medium">Show Prop Tracker</span>
                        <p className="text-[10px] text-gray-500">Live prop tracking</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showPropTracker}
                      onChange={togglePropTracker}
                      className="w-4 h-4 rounded bg-background border-border text-accent focus:ring-accent focus:ring-offset-0 flex-shrink-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={16} className="text-gray-400" />
                      <div>
                        <span className="text-xs font-medium">Compact Mode</span>
                        <p className="text-[10px] text-gray-500">Smaller cards</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.compactMode}
                      onChange={toggleCompactMode}
                      className="w-4 h-4 rounded bg-background border-border text-accent focus:ring-accent focus:ring-offset-0 flex-shrink-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'homescreen' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Choose which sports to show. Hold to reorder.
              </p>

              {/* Sports Sections */}
              <div className="space-y-1.5">
                {orderedSections.map((section) => (
                  <div
                    key={section.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(section.id, el);
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, section.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className={cn(
                      "flex items-center justify-between p-2.5 bg-card border rounded-lg transition-all select-none",
                      "cursor-move touch-none",
                      draggedItem === section.id || touchDrag.draggedId === section.id
                        ? "border-accent bg-accent/10 scale-[1.02] shadow-lg z-10"
                        : "border-border hover:border-gray-600"
                    )}
                    style={{
                      transform: touchDrag.draggedId === section.id
                        ? `translateY(${touchDrag.currentY - touchDrag.startY}px)`
                        : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical
                        size={16}
                        className={cn(
                          "transition-colors",
                          touchDrag.draggedId === section.id ? "text-accent" : "text-gray-500"
                        )}
                      />
                      <span className="text-base">{section.icon}</span>
                      <span className="text-xs font-medium">{section.label}</span>
                    </div>
                    <label
                      className="relative inline-flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSectionEnabled(section.id)}
                        onChange={() => toggleSection(section.id)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    AVAILABLE_SECTIONS.forEach(s => {
                      if (!isSectionEnabled(s.id)) toggleSection(s.id);
                    });
                  }}
                  className="px-2.5 py-1.5 text-[10px] font-medium text-gray-400 hover:text-white border border-border rounded-lg hover:border-gray-600 transition-colors"
                >
                  Enable All
                </button>
                <button
                  onClick={() => {
                    AVAILABLE_SECTIONS.forEach(s => {
                      if (isSectionEnabled(s.id)) toggleSection(s.id);
                    });
                  }}
                  className="px-2.5 py-1.5 text-[10px] font-medium text-gray-400 hover:text-white border border-border rounded-lg hover:border-gray-600 transition-colors"
                >
                  Disable All
                </button>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Add favorite teams to see their games first.
              </p>

              {/* Team Search */}
              <div className="relative">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search for a team..."
                    className="w-full pl-9 pr-9 py-2.5 bg-card border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  />
                  {isSearching && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {teamSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {teamSearchResults.map((team) => {
                      const isAlreadyAdded = settings.favoriteTeams.some(
                        t => t.id === team.id && t.sport === team.sport
                      );
                      return (
                        <button
                          key={`${team.sport}-${team.id}`}
                          onClick={() => {
                            if (!isAlreadyAdded) {
                              addFavoriteTeam(team);
                              setTeamSearchQuery('');
                              setTeamSearchResults([]);
                            }
                          }}
                          disabled={isAlreadyAdded}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 text-left transition-colors",
                            isAlreadyAdded
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-gray-800"
                          )}
                        >
                          {team.logo && (
                            <img src={team.logo} alt="" className="w-8 h-8 object-contain" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {team.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {team.sportDisplay}
                            </div>
                          </div>
                          {isAlreadyAdded && (
                            <span className="text-xs text-green-500">Added</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchError && (
                  <p className="mt-2 text-sm text-red-400">{searchError}</p>
                )}
              </div>

              {/* Browse by League */}
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">
                  Or browse by league
                </h4>

                {!selectedSport ? (
                  /* Sport/League Grid */
                  <div className="grid grid-cols-4 gap-1.5">
                    {TEAM_SPORTS.map((sport) => (
                      <button
                        key={sport.id}
                        onClick={() => setSelectedSport(sport.id)}
                        className="flex flex-col items-center gap-0.5 p-2 bg-card border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
                      >
                        <span className="text-base">{sport.icon}</span>
                        <span className="text-[9px] font-medium text-gray-300 text-center leading-tight truncate w-full">
                          {sport.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Team List for Selected Sport */
                  <div>
                    <button
                      onClick={() => setSelectedSport(null)}
                      className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 mb-3"
                    >
                      <ChevronLeft size={16} />
                      Back to leagues
                    </button>

                    {isLoadingTeams ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-gray-500" />
                        <span className="ml-2 text-sm text-gray-500">Loading teams...</span>
                      </div>
                    ) : sportTeamsError ? (
                      <div className="py-6 text-center">
                        <AlertCircle size={24} className="mx-auto text-red-400 mb-2" />
                        <p className="text-sm text-red-400">{sportTeamsError}</p>
                        <button
                          onClick={() => {
                            const sport = selectedSport;
                            setSelectedSport(null);
                            setTimeout(() => setSelectedSport(sport), 100);
                          }}
                          className="mt-3 text-xs text-accent hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {sportTeams.map((team) => {
                          const isAlreadyAdded = settings.favoriteTeams.some(
                            t => t.id === team.id && t.sport === team.sport
                          );
                          return (
                            <button
                              key={`${team.sport}-${team.id}`}
                              onClick={() => {
                                if (!isAlreadyAdded) {
                                  addFavoriteTeam(team);
                                }
                              }}
                              disabled={isAlreadyAdded}
                              className={cn(
                                "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
                                isAlreadyAdded
                                  ? "opacity-50 cursor-not-allowed bg-card"
                                  : "hover:bg-card"
                              )}
                            >
                              {team.logo && (
                                <img src={team.logo} alt="" className="w-7 h-7 object-contain" />
                              )}
                              <span className="flex-1 text-sm font-medium text-white truncate">
                                {team.name}
                              </span>
                              {isAlreadyAdded && (
                                <span className="text-xs text-green-500">Added</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Current Favorite Teams */}
              {settings.favoriteTeams.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-2">
                    Your Teams ({settings.favoriteTeams.length}/10)
                  </h4>
                  <div className="space-y-1.5">
                    {settings.favoriteTeams.map((team) => (
                      <div
                        key={`${team.sport}-${team.id}`}
                        className="flex items-center justify-between p-2 bg-card border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {team.logo && (
                            <img src={team.logo} alt="" className="w-6 h-6 object-contain" />
                          )}
                          <div>
                            <div className="text-xs font-medium text-white">
                              {team.name}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {team.sportDisplay}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFavoriteTeam(team.id)}
                          className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remove team"
                        >
                          <span className="text-xs">✕</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settings.favoriteTeams.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Star size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No favorite teams yet</p>
                  <p className="text-[10px] mt-1">Search above to add your teams</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-background font-medium hover:bg-accent/90 transition-colors text-sm"
            >
              Save Settings
            </button>
          </div>
          <button
            onClick={resetToDefaults}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
        </div>
      </Card>
    </div>
  );
};
