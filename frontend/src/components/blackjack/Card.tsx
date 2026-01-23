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
  clubs: 'text-white',
  spades: 'text-white',
};

export const Card = ({ card, index = 0, className }: CardProps) => {
  const symbol = suitSymbols[card.suit];
  const colorClass = suitColors[card.suit];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      className={cn(
        "relative w-14 h-20 md:w-16 md:h-24 rounded-xl shadow-lg",
        className
      )}
    >
      {card.faceUp ? (
        // Card Face - Dark theme
        <div className="w-full h-full rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center gap-0.5 backdrop-blur-sm">
          <span className={cn("text-xl md:text-2xl font-bold", colorClass)}>
            {card.value}
          </span>
          <span className={cn("text-2xl md:text-3xl", colorClass)}>
            {symbol}
          </span>
        </div>
      ) : (
        // Card Back - Dark theme with accent
        <div className="w-full h-full rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
          <div className="w-8 h-12 md:w-10 md:h-14 rounded-lg border-2 border-accent/40 flex items-center justify-center">
            <span className="text-accent/60 text-xl font-bold">?</span>
          </div>
        </div>
      )}
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
