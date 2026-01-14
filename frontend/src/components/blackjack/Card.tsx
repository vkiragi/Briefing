import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface PlayingCard {
  suit: Suit;
  value: CardValue;
  faceUp: boolean;
}

interface CardProps {
  card: PlayingCard;
  index?: number;
  className?: string;
}

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

export const Card = ({ card, index = 0, className }: CardProps) => {
  const symbol = suitSymbols[card.suit];
  const colorClass = suitColors[card.suit];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, rotateY: 180 }}
      animate={{ opacity: 1, y: 0, rotateY: card.faceUp ? 0 : 180 }}
      transition={{
        duration: 0.4,
        delay: index * 0.15,
        type: 'spring',
        stiffness: 200,
        damping: 20,
      }}
      className={cn(
        "relative w-16 h-24 md:w-20 md:h-28 rounded-lg shadow-lg preserve-3d cursor-default select-none",
        className
      )}
      style={{ perspective: '1000px' }}
    >
      {/* Card Front */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg bg-white border-2 border-gray-200 flex flex-col justify-between p-1.5 md:p-2 backface-hidden",
          !card.faceUp && "invisible"
        )}
      >
        {/* Top left */}
        <div className={cn("flex flex-col items-start leading-none", colorClass)}>
          <span className="text-sm md:text-base font-bold">{card.value}</span>
          <span className="text-xs md:text-sm">{symbol}</span>
        </div>

        {/* Center */}
        <div className={cn("text-2xl md:text-3xl text-center", colorClass)}>
          {symbol}
        </div>

        {/* Bottom right (rotated) */}
        <div className={cn("flex flex-col items-end leading-none rotate-180", colorClass)}>
          <span className="text-sm md:text-base font-bold">{card.value}</span>
          <span className="text-xs md:text-sm">{symbol}</span>
        </div>
      </div>

      {/* Card Back */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg backface-hidden",
          card.faceUp && "invisible"
        )}
        style={{ transform: 'rotateY(180deg)' }}
      >
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-900 p-1.5 md:p-2">
          <div className="w-full h-full rounded border-2 border-blue-400/30 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.05)_4px,rgba(255,255,255,0.05)_8px)] flex items-center justify-center">
            <div className="text-blue-300/50 text-2xl md:text-3xl font-bold">B</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Utility function to create a deck
export const createDeck = (): PlayingCard[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: PlayingCard[] = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, faceUp: true });
    }
  }

  return deck;
};

// Shuffle deck using Fisher-Yates algorithm
export const shuffleDeck = (deck: PlayingCard[]): PlayingCard[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calculate card value for blackjack
export const getCardValue = (card: PlayingCard): number => {
  if (card.value === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.value)) return 10;
  return parseInt(card.value, 10);
};

// Calculate hand value with ace handling
export const calculateHandValue = (hand: PlayingCard[]): number => {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.value === 'A') {
      aces += 1;
      value += 11;
    } else {
      value += getCardValue(card);
    }
  }

  // Adjust for aces if over 21
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }

  return value;
};

// Check if hand is blackjack (21 with 2 cards)
export const isBlackjack = (hand: PlayingCard[]): boolean => {
  return hand.length === 2 && calculateHandValue(hand) === 21;
};
