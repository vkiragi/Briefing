import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { NavigationType } from '../types';

interface DateNavigatorProps {
  displayLabel: string;
  navigationType: NavigationType;
  selectedDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateSelect: (date: Date) => void;
  className?: string;
  compact?: boolean;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  displayLabel,
  navigationType,
  selectedDate,
  onPrevious,
  onNext,
  onToday,
  onDateSelect,
  className,
  compact = false,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(selectedDate);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update calendar month when selectedDate changes
  useEffect(() => {
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  // Get day of week for first day (0 = Sunday)
  const firstDayOfWeek = startOfMonth(calendarMonth).getDay();

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        className={cn(
          "rounded-lg bg-card border border-border hover:bg-card/80 transition-colors text-gray-400 hover:text-white",
          compact ? "p-1" : "p-1.5"
        )}
        aria-label={navigationType === 'daily' ? 'Previous day' : 'Previous week'}
      >
        <ChevronLeft size={compact ? 14 : 16} />
      </button>

      {/* Date Display with Calendar Trigger */}
      <div className="relative" ref={calendarRef}>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg bg-card border border-border hover:bg-card/80 transition-colors justify-center",
            compact ? "px-2 py-1 w-[120px]" : "px-3 py-1.5 w-[160px]"
          )}
        >
          <span className={cn("font-medium text-white", compact ? "text-xs" : "text-sm")}>
            {displayLabel}
          </span>
          <Calendar size={compact ? 12 : 14} className="text-gray-400" />
        </button>

        {/* Calendar Dropdown */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[260px]"
            >
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                  className="p-1 hover:bg-border rounded text-gray-400 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-white text-sm">
                  {format(calendarMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  className="p-1 hover:bg-border rounded text-gray-400 hover:text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-[10px] text-gray-500 font-medium py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before first of month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {daysInMonth.map(day => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isDayToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        onDateSelect(day);
                        setShowCalendar(false);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors",
                        isSelected && "bg-accent text-black font-bold",
                        !isSelected && isDayToday && "ring-1 ring-accent text-accent",
                        !isSelected && !isDayToday && "hover:bg-border text-gray-300"
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-3 pt-3 border-t border-border flex justify-center">
                <button
                  onClick={() => {
                    onToday();
                    setShowCalendar(false);
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  Go to Today
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        className={cn(
          "rounded-lg bg-card border border-border hover:bg-card/80 transition-colors text-gray-400 hover:text-white",
          compact ? "p-1" : "p-1.5"
        )}
        aria-label={navigationType === 'daily' ? 'Next day' : 'Next week'}
      >
        <ChevronRight size={compact ? 14 : 16} />
      </button>

      {/* Today Quick Jump - always rendered to prevent layout shift */}
      <button
        onClick={() => {
          onToday();
          setShowCalendar(false);
        }}
        className={cn(
          "whitespace-nowrap transition-opacity",
          compact ? "text-[10px] ml-1 w-[32px]" : "text-xs ml-2 w-[38px]",
          isToday ? "opacity-0 pointer-events-none" : "text-accent hover:underline"
        )}
        disabled={isToday}
      >
        Today
      </button>
    </div>
  );
};
