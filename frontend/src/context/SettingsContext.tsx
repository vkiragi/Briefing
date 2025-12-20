import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Available sports sections for the home screen
export const AVAILABLE_SECTIONS = [
  { id: 'nba', label: 'NBA', icon: '🏀' },
  { id: 'ncaab', label: 'NCAA Basketball', icon: '🏀' },
  { id: 'nfl', label: 'NFL', icon: '🏈' },
  { id: 'ncaaf', label: 'NCAA Football', icon: '🏈' },
  { id: 'mlb', label: 'MLB', icon: '⚾' },
  { id: 'epl', label: 'Premier League', icon: '⚽' },
  { id: 'laliga', label: 'La Liga', icon: '⚽' },
  { id: 'seriea', label: 'Serie A', icon: '⚽' },
  { id: 'bundesliga', label: 'Bundesliga', icon: '⚽' },
  { id: 'ligue1', label: 'Ligue 1', icon: '⚽' },
  { id: 'ucl', label: 'Champions League', icon: '🏆' },
  { id: 'europa', label: 'Europa League', icon: '🏆' },
  { id: 'ligaportugal', label: 'Liga Portugal', icon: '⚽' },
  { id: 'saudi', label: 'Saudi Pro League', icon: '⚽' },
  { id: 'mls', label: 'MLS', icon: '⚽' },
  { id: 'brasileirao', label: 'Brasileirão', icon: '⚽' },
  { id: 'ligamx', label: 'Liga MX', icon: '⚽' },
  { id: 'scottish', label: 'Scottish Premiership', icon: '⚽' },
  { id: 'greek', label: 'Greek Super League', icon: '⚽' },
  { id: 'russian', label: 'Russian Premier League', icon: '⚽' },
  { id: 'turkish', label: 'Turkish Süper Lig', icon: '⚽' },
  { id: 'austrian', label: 'Austrian Bundesliga', icon: '⚽' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'f1', label: 'Formula 1', icon: '🏎️' },
] as const;

export type SectionId = typeof AVAILABLE_SECTIONS[number]['id'];

interface HomeScreenSettings {
  enabledSections: SectionId[];
  sectionOrder: SectionId[];
}

interface AppSettings {
  refreshInterval: number;
  homeScreen: HomeScreenSettings;
  showPropTracker: boolean;
  compactMode: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  updateRefreshInterval: (interval: number) => void;
  toggleSection: (sectionId: SectionId) => void;
  setSectionOrder: (order: SectionId[]) => void;
  togglePropTracker: () => void;
  toggleCompactMode: () => void;
  resetToDefaults: () => void;
  isSectionEnabled: (sectionId: SectionId) => boolean;
}

const defaultSettings: AppSettings = {
  refreshInterval: 5000,
  homeScreen: {
    // Only enable major leagues by default - users can enable others in settings
    enabledSections: ['nba', 'ncaab', 'nfl', 'ncaaf', 'mlb', 'epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'ucl', 'europa', 'tennis', 'f1'],
    sectionOrder: ['nba', 'ncaab', 'nfl', 'ncaaf', 'mlb', 'epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'ucl', 'europa', 'ligaportugal', 'saudi', 'mls', 'brasileirao', 'ligamx', 'scottish', 'greek', 'russian', 'turkish', 'austrian', 'tennis', 'f1'],
  },
  showPropTracker: true,
  compactMode: false,
};

const STORAGE_KEY = 'briefing_settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        // Get all available section IDs
        const allSectionIds = AVAILABLE_SECTIONS.map(s => s.id);

        // Merge enabled sections - add any new sections that aren't in the saved settings
        const savedEnabled = parsed.homeScreen?.enabledSections || [];
        const savedOrder = parsed.homeScreen?.sectionOrder || [];

        // Find new sections that aren't in the saved settings
        const newSections = allSectionIds.filter(id => !savedOrder.includes(id));

        // Add new sections to both enabled and order arrays
        const mergedEnabled = [...savedEnabled, ...newSections];
        const mergedOrder = [...savedOrder, ...newSections];

        return {
          ...defaultSettings,
          ...parsed,
          homeScreen: {
            enabledSections: mergedEnabled,
            sectionOrder: mergedOrder,
          },
        };
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return defaultSettings;
  });

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      // Also update the legacy refreshInterval key for backward compatibility
      localStorage.setItem('refreshInterval', settings.refreshInterval.toString());
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  const updateRefreshInterval = useCallback((interval: number) => {
    setSettings(prev => ({ ...prev, refreshInterval: interval }));
  }, []);

  const toggleSection = useCallback((sectionId: SectionId) => {
    setSettings(prev => {
      const isEnabled = prev.homeScreen.enabledSections.includes(sectionId);
      const newEnabledSections = isEnabled
        ? prev.homeScreen.enabledSections.filter(id => id !== sectionId)
        : [...prev.homeScreen.enabledSections, sectionId];

      return {
        ...prev,
        homeScreen: {
          ...prev.homeScreen,
          enabledSections: newEnabledSections,
        },
      };
    });
  }, []);

  const setSectionOrder = useCallback((order: SectionId[]) => {
    setSettings(prev => ({
      ...prev,
      homeScreen: {
        ...prev.homeScreen,
        sectionOrder: order,
      },
    }));
  }, []);

  const togglePropTracker = useCallback(() => {
    setSettings(prev => ({ ...prev, showPropTracker: !prev.showPropTracker }));
  }, []);

  const toggleCompactMode = useCallback(() => {
    setSettings(prev => ({ ...prev, compactMode: !prev.compactMode }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const isSectionEnabled = useCallback((sectionId: SectionId) => {
    return settings.homeScreen.enabledSections.includes(sectionId);
  }, [settings.homeScreen.enabledSections]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateRefreshInterval,
        toggleSection,
        setSectionOrder,
        togglePropTracker,
        toggleCompactMode,
        resetToDefaults,
        isSectionEnabled,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
