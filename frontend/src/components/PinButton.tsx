import React from 'react';
import { Pin, PinOff } from 'lucide-react';
import { usePinnedGames } from '../context/PinnedGamesContext';
import { cn } from '../lib/utils';

interface PinButtonProps {
  eventId: string;
  sport: string;
  matchup?: string;
  homeTeam?: string;
  awayTeam?: string;
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export const PinButton: React.FC<PinButtonProps> = ({
  eventId,
  sport,
  matchup,
  homeTeam,
  awayTeam,
  className,
  size = 'sm',
  disabled = false,
}) => {
  const { isGamePinned, pinGame, unpinGame } = usePinnedGames();
  const isPinned = isGamePinned(eventId);

  // Don't render if disabled and not already pinned
  if (disabled && !isPinned) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    e.preventDefault();

    try {
      if (isPinned) {
        await unpinGame(eventId);
      } else {
        await pinGame({
          event_id: eventId,
          sport,
          matchup,
          home_team: homeTeam,
          away_team: awayTeam,
        });
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-1.5 rounded-md transition-all duration-200",
        isPinned
          ? "bg-accent/20 text-accent hover:bg-accent/30"
          : "bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white",
        className
      )}
      title={isPinned ? "Unpin game" : "Pin game"}
    >
      {isPinned ? (
        <PinOff size={iconSize} />
      ) : (
        <Pin size={iconSize} />
      )}
    </button>
  );
};
