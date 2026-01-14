import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Gift, Volume2, VolumeX } from 'lucide-react';
import { PlayingCard, createDeck, shuffleDeck, calculateHandValue, isBlackjack } from './Card';
import { Hand } from './Hand';
import { Chip, ChipStack } from './Chip';
import { useChips } from '../../context/ChipsContext';
import { cn } from '../../lib/utils';

type GamePhase = 'betting' | 'playing' | 'dealerTurn' | 'result';
type GameResult = 'win' | 'lose' | 'push' | 'blackjack' | null;

const BETTING_AMOUNTS = [10, 25, 50, 100];

export const BlackjackGame = () => {
  const { chips, addChips, removeChips, resetChips } = useChips();

  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [currentBet, setCurrentBet] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting');
  const [result, setResult] = useState<GameResult>(null);
  const [message, setMessage] = useState('Place your bet');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize deck
  useEffect(() => {
    setDeck(shuffleDeck(createDeck()));
  }, []);

  const drawCard = useCallback((faceUp: boolean = true): PlayingCard | null => {
    if (deck.length === 0) return null;

    const card = { ...deck[0], faceUp };
    setDeck(prev => prev.slice(1));
    return card;
  }, [deck]);

  const placeBet = (amount: number) => {
    if (chips >= amount && gamePhase === 'betting') {
      setCurrentBet(prev => prev + amount);
      removeChips(amount);
    }
  };

  const clearBet = () => {
    if (gamePhase === 'betting' && currentBet > 0) {
      addChips(currentBet);
      setCurrentBet(0);
    }
  };

  const allIn = () => {
    if (gamePhase === 'betting' && chips > 0) {
      setCurrentBet(prev => prev + chips);
      removeChips(chips);
    }
  };

  const startGame = useCallback(() => {
    if (currentBet === 0) return;

    // Ensure we have enough cards
    let currentDeck = deck;
    if (currentDeck.length < 10) {
      currentDeck = shuffleDeck(createDeck());
      setDeck(currentDeck);
    }

    // Deal initial cards
    const pCard1 = { ...currentDeck[0], faceUp: true };
    const dCard1 = { ...currentDeck[1], faceUp: true };
    const pCard2 = { ...currentDeck[2], faceUp: true };
    const dCard2 = { ...currentDeck[3], faceUp: false }; // Dealer's hole card

    setDeck(currentDeck.slice(4));
    setPlayerHand([pCard1, pCard2]);
    setDealerHand([dCard1, dCard2]);
    setGamePhase('playing');
    setResult(null);
    setMessage('Your turn');

    // Check for blackjack
    const playerCards = [pCard1, pCard2];
    const dealerCards = [dCard1, { ...dCard2, faceUp: true }];

    if (isBlackjack(playerCards)) {
      // Reveal dealer's card
      setTimeout(() => {
        setDealerHand([dCard1, { ...dCard2, faceUp: true }]);

        if (isBlackjack(dealerCards)) {
          setGamePhase('result');
          setResult('push');
          setMessage('Both Blackjack! Push');
          addChips(currentBet);
        } else {
          setGamePhase('result');
          setResult('blackjack');
          setMessage('Blackjack! You win!');
          addChips(Math.floor(currentBet * 2.5)); // 3:2 payout
        }
      }, 800);
    }
  }, [currentBet, deck, addChips]);

  const hit = useCallback(() => {
    if (gamePhase !== 'playing' || deck.length === 0) return;

    const newCard = { ...deck[0], faceUp: true };
    const newHand = [...playerHand, newCard];
    setDeck(prev => prev.slice(1));
    setPlayerHand(newHand);

    const handValue = calculateHandValue(newHand);
    if (handValue > 21) {
      setGamePhase('result');
      setResult('lose');
      setMessage('Bust! You lose');
      // Reveal dealer's hole card
      setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
    } else if (handValue === 21) {
      stand();
    }
  }, [gamePhase, deck, playerHand]);

  const stand = useCallback(() => {
    if (gamePhase !== 'playing') return;

    setGamePhase('dealerTurn');
    setMessage("Dealer's turn");

    // Reveal dealer's hole card
    setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
  }, [gamePhase]);

  const doubleDown = useCallback(() => {
    if (gamePhase !== 'playing' || playerHand.length !== 2) return;
    if (chips < currentBet) return;

    // Double the bet
    removeChips(currentBet);
    setCurrentBet(prev => prev * 2);

    // Draw one card and stand
    const newCard = { ...deck[0], faceUp: true };
    const newHand = [...playerHand, newCard];
    setDeck(prev => prev.slice(1));
    setPlayerHand(newHand);

    const handValue = calculateHandValue(newHand);
    if (handValue > 21) {
      setGamePhase('result');
      setResult('lose');
      setMessage('Bust! You lose');
      setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
    } else {
      setGamePhase('dealerTurn');
      setMessage("Dealer's turn");
      setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
    }
  }, [gamePhase, playerHand, chips, currentBet, deck, removeChips]);

  // Dealer's turn logic
  useEffect(() => {
    if (gamePhase !== 'dealerTurn') return;

    const dealerValue = calculateHandValue(dealerHand);

    if (dealerValue < 17) {
      // Dealer hits
      const timer = setTimeout(() => {
        if (deck.length === 0) return;

        const newCard = { ...deck[0], faceUp: true };
        setDeck(prev => prev.slice(1));
        setDealerHand(prev => [...prev, newCard]);
      }, 700);

      return () => clearTimeout(timer);
    } else {
      // Dealer stands, determine winner
      const playerValue = calculateHandValue(playerHand);

      setTimeout(() => {
        setGamePhase('result');

        if (dealerValue > 21) {
          setResult('win');
          setMessage('Dealer busts! You win!');
          addChips(currentBet * 2);
        } else if (playerValue > dealerValue) {
          setResult('win');
          setMessage('You win!');
          addChips(currentBet * 2);
        } else if (playerValue < dealerValue) {
          setResult('lose');
          setMessage('Dealer wins');
        } else {
          setResult('push');
          setMessage('Push - Tie game');
          addChips(currentBet);
        }
      }, 500);
    }
  }, [gamePhase, dealerHand, playerHand, deck, currentBet, addChips]);

  const newGame = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setCurrentBet(0);
    setGamePhase('betting');
    setResult(null);
    setMessage('Place your bet');

    // Reshuffle if low on cards
    if (deck.length < 15) {
      setDeck(shuffleDeck(createDeck()));
    }
  };

  const canDoubleDown = gamePhase === 'playing' && playerHand.length === 2 && chips >= currentBet;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">$</span>
            <motion.span
              key={chips}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-xl font-bold text-white"
            >
              {chips.toLocaleString()}
            </motion.span>
          </div>
          {chips === 0 && gamePhase === 'betting' && (
            <button
              onClick={resetChips}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              <Gift size={14} />
              Free Chips
            </button>
          )}
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* Game Table */}
      <div className="flex-1 flex flex-col items-center justify-between py-4 md:py-6 px-2 bg-gradient-to-b from-emerald-900/50 to-emerald-950/50 relative overflow-hidden">
        {/* Felt pattern overlay */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]" />

        {/* Dealer Section */}
        <div className="relative z-10 w-full flex flex-col items-center">
          <Hand
            cards={dealerHand}
            label="Dealer"
            hideScore={gamePhase === 'playing' || gamePhase === 'betting'}
            isDealer
          />
        </div>

        {/* Current Bet Display */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {currentBet > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <ChipStack amount={currentBet} />
              <span className="text-sm text-yellow-400 font-medium">${currentBet}</span>
            </motion.div>
          )}
        </div>

        {/* Player Section */}
        <div className="relative z-10 w-full flex flex-col items-center">
          <Hand cards={playerHand} label="Your Hand" />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 bg-black/30 rounded-b-xl space-y-3">
        {/* Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "text-center font-semibold text-lg",
              result === 'win' && "text-green-400",
              result === 'blackjack' && "text-yellow-400",
              result === 'lose' && "text-red-400",
              result === 'push' && "text-blue-400",
              !result && "text-white"
            )}
          >
            {message}
          </motion.div>
        </AnimatePresence>

        {/* Betting Phase */}
        {gamePhase === 'betting' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              {BETTING_AMOUNTS.map(amount => (
                <Chip
                  key={amount}
                  value={amount}
                  onClick={() => placeBet(amount)}
                  disabled={chips < amount}
                />
              ))}
              <Chip value={500} onClick={allIn} disabled={chips === 0} />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={clearBet}
                disabled={currentBet === 0}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
              <button
                onClick={startGame}
                disabled={currentBet === 0}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold text-lg transition-all",
                  currentBet > 0
                    ? "bg-accent text-background hover:bg-accent/90 shadow-lg shadow-accent/25"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                )}
              >
                Deal
              </button>
            </div>
          </div>
        )}

        {/* Playing Phase */}
        {gamePhase === 'playing' && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={hit}
              className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg transition-colors"
            >
              Hit
            </button>
            <button
              onClick={stand}
              className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-lg transition-colors"
            >
              Stand
            </button>
            <button
              onClick={doubleDown}
              disabled={!canDoubleDown}
              className={cn(
                "px-6 py-3 rounded-xl font-bold text-lg transition-colors",
                canDoubleDown
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              )}
            >
              Double
            </button>
          </div>
        )}

        {/* Dealer Turn */}
        {gamePhase === 'dealerTurn' && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span>Dealer drawing...</span>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {gamePhase === 'result' && (
          <div className="flex items-center justify-center">
            <button
              onClick={newGame}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-background font-bold text-lg hover:bg-accent/90 transition-colors"
            >
              <RotateCcw size={20} />
              New Hand
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
