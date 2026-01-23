import { PlayingCard, Card, calculateHandValue } from './Card';
import { cn } from '../../lib/utils';

interface HandProps {
  cards: PlayingCard[];
  score?: number;
  isDealer?: boolean;
  hideScore?: boolean;
}

export const Hand = ({ cards, isDealer, hideScore }: HandProps) => {
  const score = calculateHandValue(cards.filter(c => c.faceUp));
  const showScore = cards.length > 0 && !hideScore;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Cards */}
      <div className="flex items-center justify-center">
        {cards.map((card, index) => (
          <div
            key={index}
            style={{ marginLeft: index > 0 ? '-20px' : '0' }}
            className="relative"
          >
            <Card card={card} index={index} />
          </div>
        ))}
      </div>

      {/* Score badge */}
      {showScore && (
        <div className={cn(
          "absolute -right-2 -top-2 min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center text-sm font-bold",
          isDealer ? "bg-gray-800 text-white" : "bg-gray-800 text-white"
        )}>
          {hideScore ? '?' : score}
        </div>
      )}
    </div>
  );
};
