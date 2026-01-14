import { motion } from 'framer-motion';
import { Card, PlayingCard, calculateHandValue } from './Card';
import { cn } from '../../lib/utils';

interface HandProps {
  cards: PlayingCard[];
  label: string;
  hideScore?: boolean;
  isDealer?: boolean;
  className?: string;
}

export const Hand = ({ cards, label, hideScore = false, isDealer = false, className }: HandProps) => {
  // For dealer, only count face-up cards for display
  const visibleCards = isDealer && hideScore
    ? cards.filter(c => c.faceUp)
    : cards;

  const score = calculateHandValue(visibleCards);
  const isBust = score > 21;
  const isBlackjack = cards.length === 2 && calculateHandValue(cards) === 21 && !hideScore;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Label and Score */}
      <div className="flex items-center gap-2">
        <span className="text-sm md:text-base font-medium text-gray-300">{label}</span>
        {cards.length > 0 && (
          <motion.span
            key={score}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "px-2 py-0.5 rounded-full text-xs md:text-sm font-bold",
              isBust && "bg-red-500/20 text-red-400",
              isBlackjack && "bg-yellow-500/20 text-yellow-400",
              !isBust && !isBlackjack && "bg-white/10 text-white"
            )}
          >
            {hideScore ? '?' : score}
            {isBlackjack && ' BJ!'}
            {isBust && ' BUST'}
          </motion.span>
        )}
      </div>

      {/* Cards */}
      <div className="flex items-center justify-center">
        <div className="flex -space-x-8 md:-space-x-10">
          {cards.map((card, index) => (
            <Card
              key={`${card.suit}-${card.value}-${index}`}
              card={card}
              index={index}
              className="hover:z-10 transition-transform hover:-translate-y-1"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
