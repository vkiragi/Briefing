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
  const searchRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
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
        <div className="relative flex-shrink-0" ref={searchRef}>
          <AnimatePresence mode="wait">
            {showSearch ? (
              <motion.div
                key="search-input"
                initial={{ width: 40, opacity: 0.5 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 40, opacity: 0.5 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative"
              >
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leagues..."
                  className="w-full bg-card/80 backdrop-blur-sm border border-accent/50 rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={14} className="text-gray-400 hover:text-white" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="search-button"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.5 }}
                onClick={() => setShowSearch(true)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-sm font-medium transition-all border bg-card/80 backdrop-blur-sm border-border text-gray-400 hover:text-accent hover:border-accent/50 hover:bg-accent/5"
              >
                <Search size={16} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Search results dropdown */}
          <AnimatePresence>
            {showSearch && (searchQuery || !searchQuery) && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl shadow-black/20 py-2 min-w-[240px] max-h-[320px] overflow-hidden"
              >
                <div className="px-3 pb-2 border-b border-border/50">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {searchQuery ? `${filteredTabs.length} results` : 'All Leagues'}
                  </p>
                </div>
                <div className="max-h-[260px] overflow-y-auto custom-scrollbar py-1">
                  {filteredTabs.length > 0 ? (
                    filteredTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleSearchSelect(tab.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all text-left mx-1 rounded-lg",
                          "hover:bg-white/5",
                          selectedSport === tab.id
                            ? "bg-accent/15 text-accent"
                            : "text-gray-300"
                        )}
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 text-sm">
                          {tab.id === 'home' ? <Home size={14} /> : tab.icon}
                        </span>
                        <span className="font-medium">{tab.label}</span>
                        {selectedSport === tab.id && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-accent" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <p className="text-sm text-gray-500">No leagues found</p>
                      <p className="text-xs text-gray-600 mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
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
        <div className="relative flex-shrink-0" ref={searchRef}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all border",
              showSearch
                ? "bg-accent/20 text-accent border-accent/50"
                : "bg-card border-border text-gray-400 hover:text-white hover:border-gray-600"
            )}
          >
            <Search size={14} />
          </button>

          {/* Mobile search dropdown */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl shadow-black/30 p-3 min-w-[280px]"
              >
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leagues..."
                    className="w-full bg-background/80 border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={14} className="text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider px-1 mb-2">
                  {searchQuery ? `${filteredTabs.length} results` : 'All Leagues'}
                </div>
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar -mx-1">
                  {filteredTabs.length > 0 ? (
                    filteredTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleSearchSelect(tab.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2.5 text-sm transition-all text-left rounded-lg mx-1",
                          "hover:bg-white/5 active:bg-white/10",
                          selectedSport === tab.id
                            ? "bg-accent/15 text-accent"
                            : "text-gray-300"
                        )}
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-base">
                          {tab.id === 'home' ? <Home size={14} /> : tab.icon}
                        </span>
                        <span className="font-medium">{tab.label}</span>
                        {selectedSport === tab.id && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-accent" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center">
                      <p className="text-sm text-gray-500">No leagues found</p>
                    </div>
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
