import { useState, useEffect } from 'react';
import { X, AlertCircle, LayoutGrid, Clock, Eye, RotateCcw, GripVertical, Star, Search, Loader2 } from 'lucide-react';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { useSettings, AVAILABLE_SECTIONS, SectionId, FavoriteTeam } from '../context/SettingsContext';
import { api } from '../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    settings,
    updateRefreshInterval,
    toggleSection,
    setSectionOrder,
    togglePropTracker,
    toggleCompactMode,
    resetToDefaults,
    isSectionEnabled,
    addFavoriteTeam,
    removeFavoriteTeam,
  } = useSettings();

  const [localInterval, setLocalInterval] = useState(settings.refreshInterval);
  const [activeTab, setActiveTab] = useState<'general' | 'homescreen' | 'teams'>('general');
  const [draggedItem, setDraggedItem] = useState<SectionId | null>(null);
  const [customSeconds, setCustomSeconds] = useState('');

  // Team search state
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamSearchResults, setTeamSearchResults] = useState<FavoriteTeam[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  // Sync local interval when global settings change
  useEffect(() => {
    setLocalInterval(settings.refreshInterval);
  }, [settings.refreshInterval]);

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

  if (!isOpen) return null;

  const handleSave = () => {
    updateRefreshInterval(localInterval);
    onClose();
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

  // Get ordered sections for display
  const orderedSections = settings.homeScreen.sectionOrder
    .map(id => AVAILABLE_SECTIONS.find(s => s.id === id))
    .filter(Boolean) as typeof AVAILABLE_SECTIONS[number][];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-shrink-0 flex-wrap">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'general'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <Clock size={16} />
            General
          </button>
          <button
            onClick={() => setActiveTab('homescreen')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'homescreen'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <LayoutGrid size={16} />
            Home Screen
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'teams'
                ? "bg-accent text-background"
                : "bg-card border border-border text-gray-400 hover:text-white"
            )}
          >
            <Star size={16} />
            My Teams
            {settings.favoriteTeams.length > 0 && (
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {settings.favoriteTeams.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Rate Limiting Disclaimer */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-500 mb-1">API Rate Limiting</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Setting refresh rates too low may result in temporary blocks.
                      <span className="text-accent ml-1 font-medium">Recommended: 30-60 seconds.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Refresh Rate Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Auto-Refresh Interval
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {presetIntervals.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setLocalInterval(preset.value);
                          setCustomSeconds('');
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
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
                    <span className="text-sm text-gray-400">Custom:</span>
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
                      placeholder="seconds"
                      className="w-24 px-3 py-2 bg-card border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                    />
                    <span className="text-sm text-gray-500">seconds</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Current: {localInterval / 1000} seconds
                  </p>
                </div>
              </div>

              {/* Display Options */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Display Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-card border border-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <Eye size={18} className="text-gray-400" />
                      <div>
                        <span className="text-sm font-medium">Show Prop Tracker</span>
                        <p className="text-xs text-gray-500">Display live prop bet tracking on dashboard</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showPropTracker}
                      onChange={togglePropTracker}
                      className="w-5 h-5 rounded bg-background border-border text-accent focus:ring-accent focus:ring-offset-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-card border border-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <LayoutGrid size={18} className="text-gray-400" />
                      <div>
                        <span className="text-sm font-medium">Compact Mode</span>
                        <p className="text-xs text-gray-500">Show more content with smaller cards</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.compactMode}
                      onChange={toggleCompactMode}
                      className="w-5 h-5 rounded bg-background border-border text-accent focus:ring-accent focus:ring-offset-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'homescreen' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">
                Choose which sports sections to show on your home screen. Drag to reorder.
              </p>

              {/* Sports Sections */}
              <div className="space-y-2">
                {orderedSections.map((section) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center justify-between p-3 bg-card border rounded-lg transition-all cursor-move",
                      draggedItem === section.id
                        ? "border-accent opacity-50"
                        : "border-border hover:border-gray-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={18} className="text-gray-500" />
                      <span className="text-lg">{section.icon}</span>
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSectionEnabled(section.id)}
                        onChange={() => toggleSection(section.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
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
                  className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white border border-border rounded-lg hover:border-gray-600 transition-colors"
                >
                  Enable All
                </button>
                <button
                  onClick={() => {
                    AVAILABLE_SECTIONS.forEach(s => {
                      if (isSectionEnabled(s.id)) toggleSection(s.id);
                    });
                  }}
                  className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white border border-border rounded-lg hover:border-gray-600 transition-colors"
                >
                  Disable All
                </button>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">
                Add your favorite teams to see their latest results and upcoming games at the top of your dashboard.
              </p>

              {/* Team Search */}
              <div className="relative">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search for a team..."
                    className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  />
                  {isSearching && (
                    <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
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

              {/* Current Favorite Teams */}
              {settings.favoriteTeams.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">
                    Your Teams ({settings.favoriteTeams.length}/10)
                  </h4>
                  <div className="space-y-2">
                    {settings.favoriteTeams.map((team) => (
                      <div
                        key={`${team.sport}-${team.id}`}
                        className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {team.logo && (
                            <img src={team.logo} alt="" className="w-8 h-8 object-contain" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-white">
                              {team.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {team.sportDisplay}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFavoriteTeam(team.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remove team"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settings.favoriteTeams.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Star size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No favorite teams yet</p>
                  <p className="text-xs mt-1">Search above to add your teams</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 mt-6 pt-6 border-t border-border flex-shrink-0">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent/90 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
