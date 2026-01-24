import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, PlusCircle, List, BarChart2, Settings, User, HelpCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { SettingsModal } from "../SettingsModal";
import { ProfileModal } from "../ProfileModal";
import { ParlayBuilderFAB } from "../ParlayBuilderFAB";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/add", label: "Add Bet", icon: PlusCircle, isPrimary: true },
  { path: "/history", label: "History", icon: List },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  // { path: "/blackjack", label: "Blackjack", icon: Spade },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 flex-col items-center py-8 bg-card border-r border-border z-50">
        <div className="mb-8 flex flex-col items-center">
          <span className="text-2xl font-semibold tracking-tight text-white">
            <span className="text-accent">B</span>S<span className="text-accent">B</span>
          </span>
          <span className="text-[9px] font-medium tracking-[0.2em] text-gray-500 uppercase mt-0.5">Briefing</span>
        </div>
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
        {/* Profile, Help, and Settings at bottom */}
        <div className="mt-auto flex flex-col gap-2 w-full px-3">
          {/* Profile Button */}
          <div className="flex flex-col items-center group">
            <button
              onClick={() => setProfileOpen(true)}
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
          </div>
          {/* Help Button */}
          <div className="flex flex-col items-center group">
            <Link
              to="/help"
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 relative w-full hover:bg-white/[0.03]",
                location.pathname === "/help"
                  ? "text-accent"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <HelpCircle size={26} />
            </Link>
            <span className={cn(
              "text-[10px] font-medium mt-1.5 transition-opacity duration-300 whitespace-nowrap text-center",
              location.pathname === "/help"
                ? "text-accent opacity-100"
                : "text-gray-400 opacity-0 group-hover:opacity-100"
            )}>
              Help
            </span>
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

      {/* Mobile Header with Profile Button */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-50 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-[calc(3.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center">
          <span className="text-lg font-semibold tracking-tight text-white">
            <span className="text-accent">B</span>S<span className="text-accent">B</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/help"
            className={cn(
              "flex items-center justify-center p-2 rounded-full transition-all duration-300 hover:bg-white/[0.05]",
              location.pathname === "/help" ? "text-accent" : "text-gray-400 hover:text-white"
            )}
          >
            <HelpCircle size={22} />
          </Link>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center justify-center p-2 rounded-full transition-all duration-300 hover:bg-white/[0.05] text-gray-400 hover:text-white"
          >
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-accent/50"
              />
            ) : (
              <User size={24} />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full min-h-screen pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0 md:pl-36 md:pr-12 relative overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 mobile-bottom-nav">
        <div className="flex justify-around items-end px-1 pt-3 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-end flex-1 touch-manipulation",
                location.pathname === item.path
                  ? "text-accent"
                  : "text-gray-400 active:text-white"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {item.isPrimary ? (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <item.icon size={30} className={cn(
                    "mb-0.5",
                    location.pathname === item.path ? "text-accent" : "text-blue-500"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium",
                    location.pathname === item.path ? "text-accent" : "text-blue-500"
                  )}>{item.label}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <item.icon size={30} className="mb-0.5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              )}
            </Link>
          ))}
          {/* Settings button for mobile */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex flex-col items-center justify-end flex-1 text-gray-400 active:text-white touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <Settings size={30} className="mb-0.5" />
              <span className="text-[10px] font-medium">Settings</span>
            </div>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Parlay Builder FAB */}
      <ParlayBuilderFAB />
    </div>
  );
};

