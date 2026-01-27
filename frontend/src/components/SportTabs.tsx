import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Home, Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Build tabs list from all available sections (always show all sports)
  const tabs: TabInfo[] = useMemo(() => {
    const homeTab: TabInfo = { id: 'home', label: 'Home', icon: '🏠' };
    const sportTabs = AVAILABLE_SECTIONS
      .map(s => ({ id: s.id, label: s.label, icon: s.icon }));
    return [homeTab, ...sportTabs];
  }, []);

  // Filter tabs based on search query
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs;
    const query = searchQuery.toLowerCase();
    return tabs.filter(tab =>
      tab.label.toLowerCase().includes(query) ||
      tab.id.toLowerCase().includes(query)
    );
  }, [tabs, searchQuery]);

  const handleSearchSelect = (sportId: string) => {
    onSelectSport(sportId);
    setSearchQuery('');
    setShowSearch(false);
  };

  // Determine how many tabs to show on mobile (before "More")
  // Show Home + 2 sports to leave room for "More" button without overflow
  const mobileVisibleCount = 3;
  const visibleTabs = tabs.slice(0, mobileVisibleCount);
  const overflowTabs = tabs.slice(mobileVisibleCount);

  const handleSelectSport = (sportId: string) => {
    onSelectSport(sportId);
    setShowMore(false);
  };

  return (
    <div className="mb-4">
      {/* Desktop: Horizontal scroll with search */}
      <div className="hidden md:flex gap-2 items-center">
        {/* Search button/input */}
        <div className="relative flex-shrink-0">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leagues..."
                  className="w-48 bg-card border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
            >
              <Search size={14} />
            </button>
          )}

          {/* Search results dropdown */}
          <AnimatePresence>
            {showSearch && searchQuery && filteredTabs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 left-0 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[200px] max-h-[300px] overflow-y-auto"
              >
                {filteredTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleSearchSelect(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                      selectedSport === tab.id
                        ? "bg-accent/20 text-accent"
                        : "text-gray-300 hover:bg-white/5"
                    )}
                  >
                    {tab.id === 'home' ? <Home size={14} /> : <span>{tab.icon}</span>}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
            {showSearch && searchQuery && filteredTabs.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 left-0 z-50 bg-card border border-border rounded-lg shadow-xl py-3 px-4 min-w-[200px]"
              >
                <p className="text-sm text-gray-500">No leagues found</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tabs */}
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar"
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
      </div>

      {/* Mobile: Search + Visible tabs + More dropdown */}
      <div className="flex md:hidden gap-2 items-center">
        {/* Mobile search button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "flex items-center justify-center p-1.5 rounded-lg text-xs font-medium transition-all border",
              showSearch
                ? "bg-accent text-background border-accent"
                : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
            )}
          >
            <Search size={14} />
          </button>

          {/* Mobile search dropdown */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 left-0 z-50 bg-card border border-border rounded-lg shadow-xl p-2 min-w-[250px]"
              >
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leagues..."
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <X size={14} className="text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="max-h-[250px] overflow-y-auto">
                  {filteredTabs.length > 0 ? (
                    filteredTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleSearchSelect(tab.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left rounded-lg",
                          selectedSport === tab.id
                            ? "bg-accent/20 text-accent"
                            : "text-gray-300 hover:bg-white/5"
                        )}
                      >
                        {tab.id === 'home' ? <Home size={14} /> : <span>{tab.icon}</span>}
                        <span>{tab.label}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 px-3 py-2">No leagues found</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
