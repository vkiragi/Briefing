import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, PlusCircle, List, BarChart2, Settings, User, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { SettingsModal } from "../SettingsModal";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/add", label: "Add Bet", icon: PlusCircle, isPrimary: true },
  { path: "/history", label: "History", icon: List },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('refreshInterval');
    return saved ? parseInt(saved, 10) : 30000;
  });

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
    localStorage.setItem('refreshInterval', interval.toString());
  };

  return (
    <div className="min-h-screen bg-background text-white pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 flex-col items-center py-8 bg-card border-r border-border z-50">
        <div className="mb-8 font-bold text-accent text-xl">BSB</div>
        <div className="flex flex-col gap-5 w-full px-3 flex-1">
          {navItems.map((item) => (
            <div key={item.path} className="flex flex-col items-center group">
              <Link
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 relative w-full",
                  "hover:bg-white/[0.03]",
                  location.pathname === item.path
                    ? "text-accent shadow-[0_2px_12px_rgba(0,255,133,0.15),0_1px_6px_rgba(0,0,0,0.3),0_0_16px_rgba(0,255,133,0.1)]"
                    : "text-gray-400 hover:text-white shadow-none hover:shadow-[0_4px_16px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,255,133,0.08),0_0_18px_rgba(0,255,133,0.12)] hover:-translate-y-1"
                )}
              >
                <item.icon
                  size={26}
                  className={cn(
                    "transition-transform duration-300",
                    location.pathname === item.path && "scale-110",
                    item.isPrimary && "text-blue-500"
                  )}
                />
              </Link>
              <span className={cn(
                "text-[10px] font-medium mt-1.5 transition-opacity duration-300 whitespace-nowrap text-center",
                location.pathname === item.path
                  ? "text-accent opacity-100"
                  : "text-gray-400 opacity-0 group-hover:opacity-100"
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        {/* Profile and Settings at bottom */}
        <div className="mt-auto flex flex-col gap-2 w-full px-3">
          {/* Profile Button */}
          <div ref={profileRef} className="flex flex-col items-center group relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 relative w-full hover:bg-white/[0.03] text-gray-400 hover:text-white"
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-7 h-7 rounded-full border border-accent/50"
                />
              ) : (
                <User size={26} />
              )}
            </button>
            <span className="text-[10px] font-medium mt-1.5 transition-opacity duration-300 whitespace-nowrap text-center text-gray-400 opacity-0 group-hover:opacity-100">
              Profile
            </span>
            {/* Dropdown on click */}
            {profileOpen && (
              <div className="absolute left-full bottom-0 ml-2 z-50">
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
                  <div className="text-xs text-gray-400 mb-2 truncate">
                    {user?.email ?? 'Signed in'}
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setProfileOpen(false);
                    }}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors w-full"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Settings Button */}
          <div className="flex flex-col items-center group">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 relative w-full hover:bg-white/[0.03] text-gray-400 hover:text-white"
            >
              <Settings size={26} />
            </button>
            <span className="text-[10px] font-medium mt-1.5 transition-opacity duration-300 whitespace-nowrap text-center text-gray-400 opacity-0 group-hover:opacity-100">
              Settings
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full min-h-screen md:pl-36 md:pr-12 relative">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full",
                location.pathname === item.path
                  ? "text-accent"
                  : "text-gray-400"
              )}
            >
              {item.isPrimary ? (
                 <div className={cn(
                   "bg-blue-500/10 p-3 rounded-full -mt-6 border-4 border-background transition-all duration-300",
                   location.pathname === item.path
                     ? "shadow-[0_12px_36px_rgba(59,130,246,0.45),0_6px_18px_rgba(0,0,0,0.65),0_0_48px_rgba(59,130,246,0.35)] scale-110"
                     : "shadow-[0_8px_24px_rgba(59,130,246,0.35),0_4px_12px_rgba(0,0,0,0.55),0_0_36px_rgba(59,130,246,0.25)] hover:shadow-[0_10px_32px_rgba(59,130,246,0.4),0_5px_16px_rgba(0,0,0,0.6),0_0_44px_rgba(59,130,246,0.3)] hover:scale-105"
                 )}>
                    <item.icon size={28} className="text-blue-500" />
                 </div>
              ) : (
                <div className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300",
                  location.pathname === item.path
                    ? "shadow-[0_2px_8px_rgba(0,255,133,0.2)]"
                    : ""
                )}>
                  <item.icon size={22} className="mb-1" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              )}
            </Link>
          ))}
          {/* Settings button for mobile */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full text-gray-400"
          >
            <Settings size={22} className="mb-1" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={handleRefreshIntervalChange}
      />
    </div>
  );
};

