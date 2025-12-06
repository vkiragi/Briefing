import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, PlusCircle, List, BarChart2 } from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/history", label: "History", icon: List },
  { path: "/add", label: "Add Bet", icon: PlusCircle, isPrimary: true },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-white pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 bg-card border-r border-border z-50">
        <div className="mb-8 font-bold text-accent text-xl">BSB</div>
        <div className="flex flex-col gap-5 w-full">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group relative",
                location.pathname === item.path
                  ? "text-accent"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon
                size={22}
                className={cn(
                  "mb-1 transition-transform",
                  location.pathname === item.path && "scale-110",
                  item.isPrimary && "text-accent"
                )}
              />
              <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 absolute -bottom-2 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full min-h-screen md:pl-32 md:pr-12">
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
                 <div className="bg-accent/10 p-3 rounded-full -mt-6 border-4 border-background">
                    <item.icon size={28} className="text-accent" />
                 </div>
              ) : (
                <>
                  <item.icon size={22} className="mb-1" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

