import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { AVAILABLE_SECTIONS } from '../context/SettingsContext';

interface SportTabsProps {
  selectedSport: string;
  onSelectSport: (sport: string) => void;
}

interface TabInfo {
  id: string;
  label: string;
  icon: string;
}

export const SportTabs: React.FC<SportTabsProps> = ({
  selectedSport,
  onSelectSport,
}) => {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build tabs list from all available sections (always show all sports)
  const tabs: TabInfo[] = useMemo(() => {
    const homeTab: TabInfo = { id: 'home', label: 'Home', icon: '🏠' };
    const sportTabs = AVAILABLE_SECTIONS
      .map(s => ({ id: s.id, label: s.label, icon: s.icon }));
    return [homeTab, ...sportTabs];
  }, []);

  // Determine how many tabs to show on mobile (before "More")
  const mobileVisibleCount = 4; // Home + 3 sports
  const visibleTabs = tabs.slice(0, mobileVisibleCount);
  const overflowTabs = tabs.slice(mobileVisibleCount);

  const handleSelectSport = (sportId: string) => {
    onSelectSport(sportId);
    setShowMore(false);
  };

  return (
    <div className="mb-4">
      {/* Desktop: Horizontal scroll with visible scrollbar */}
      <div
        ref={scrollContainerRef}
        className="hidden md:flex gap-2 overflow-x-auto pb-2 custom-scrollbar"
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSelectSport(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap",
              selectedSport === tab.id
                ? "bg-accent text-background border-accent"
                : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
            )}
          >
            {tab.id === 'home' ? (
              <Home size={14} />
            ) : (
              <span className="text-sm">{tab.icon}</span>
            )}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile: Visible tabs + More dropdown */}
      <div className="flex md:hidden gap-2">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSelectSport(tab.id)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap",
              selectedSport === tab.id
                ? "bg-accent text-background border-accent"
                : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
            )}
          >
            {tab.id === 'home' ? (
              <Home size={12} />
            ) : (
              <span className="text-xs">{tab.icon}</span>
            )}
            <span>{tab.label}</span>
          </button>
        ))}

        {/* More dropdown */}
        {overflowTabs.length > 0 && (
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap",
                overflowTabs.some(t => t.id === selectedSport)
                  ? "bg-accent text-background border-accent"
                  : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
              )}
            >
              <span>More</span>
              <ChevronDown size={12} className={cn("transition-transform", showMore && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 right-0 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
                >
                  {overflowTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectSport(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                        selectedSport === tab.id
                          ? "bg-accent/20 text-accent"
                          : "text-gray-300 hover:bg-white/5"
                      )}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
