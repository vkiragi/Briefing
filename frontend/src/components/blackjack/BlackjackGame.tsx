import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { PlayingCard, Card, createDeck, shuffleDeck, calculateHandValue, isBlackjack } from './Card';
import { useChips } from '../../context/ChipsContext';
import { cn } from '../../lib/utils';

type GamePhase = 'betting' | 'playing' | 'dealerTurn' | 'result';
type GameResult = 'win' | 'lose' | 'push' | 'blackjack' | null;

const BETTING_AMOUNTS = [10, 25, 50, 100];

// Confetti component
const Confetti = () => {
  const pieces = useMemo(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      color: ['#00FF85', '#4ECDC4', '#FFE66D', '#95E1D3', '#00CC6A', '#00FF85', '#FCBAD3'][Math.floor(Math.random() * 7)],
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }))
  , []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{
            y: -20,
            x: `${piece.x}vw`,
            rotate: 0,
            opacity: 1
          }}
          animate={{
            y: '100vh',
            rotate: piece.rotation + 720,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.shape === 'circle' ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};

export const BlackjackGame = () => {
  const { chips, addChips, removeChips, resetChips } = useChips();

  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [currentBet, setCurrentBet] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting');
  const [result, setResult] = useState<GameResult>(null);
  const [lastWin, setLastWin] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Initialize deck
  useEffect(() => {
    setDeck(shuffleDeck(createDeck()));
  }, []);

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

  const startGame = useCallback(() => {
    if (currentBet === 0) return;

    let currentDeck = deck;
    if (currentDeck.length < 10) {
      currentDeck = shuffleDeck(createDeck());
      setDeck(currentDeck);
    }

    const pCard1 = { ...currentDeck[0], faceUp: true };
    const dCard1 = { ...currentDeck[1], faceUp: true };
    const pCard2 = { ...currentDeck[2], faceUp: true };
    const dCard2 = { ...currentDeck[3], faceUp: false };

    setDeck(currentDeck.slice(4));
    setPlayerHand([pCard1, pCard2]);
    setDealerHand([dCard1, dCard2]);
    setGamePhase('playing');
    setResult(null);
    setLastWin(0);

    const playerCards = [pCard1, pCard2];
    const dealerCards = [dCard1, { ...dCard2, faceUp: true }];

    if (isBlackjack(playerCards)) {
      setTimeout(() => {
        setDealerHand([dCard1, { ...dCard2, faceUp: true }]);

        if (isBlackjack(dealerCards)) {
          setGamePhase('result');
          setResult('push');
          addChips(currentBet);
        } else {
          setGamePhase('result');
          setResult('blackjack');
          const winAmount = Math.floor(currentBet * 2.5);
          addChips(winAmount);
          setLastWin(winAmount - currentBet);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
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
      setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
    } else if (handValue === 21) {
      stand();
    }
  }, [gamePhase, deck, playerHand]);

  const stand = useCallback(() => {
    if (gamePhase !== 'playing') return;

    setGamePhase('dealerTurn');
    setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
  }, [gamePhase]);

  const doubleDown = useCallback(() => {
    if (gamePhase !== 'playing' || playerHand.length !== 2) return;
    if (chips < currentBet) return;

    removeChips(currentBet);
    setCurrentBet(prev => prev * 2);

    const newCard = { ...deck[0], faceUp: true };
    const newHand = [...playerHand, newCard];
    setDeck(prev => prev.slice(1));
    setPlayerHand(newHand);

    const handValue = calculateHandValue(newHand);
    if (handValue > 21) {
      setGamePhase('result');
      setResult('lose');
      setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
    } else {
      setGamePhase('dealerTurn');
      setDealerHand(prev => prev.map(c => ({ ...c, faceUp: true })));
    }
  }, [gamePhase, playerHand, chips, currentBet, deck, removeChips]);

  // Dealer's turn logic
  useEffect(() => {
    if (gamePhase !== 'dealerTurn') return;

    const dealerValue = calculateHandValue(dealerHand);

    if (dealerValue < 17) {
      const timer = setTimeout(() => {
        if (deck.length === 0) return;

        const newCard = { ...deck[0], faceUp: true };
        setDeck(prev => prev.slice(1));
        setDealerHand(prev => [...prev, newCard]);
      }, 600);

      return () => clearTimeout(timer);
    } else {
      const playerValue = calculateHandValue(playerHand);

      setTimeout(() => {
        setGamePhase('result');

        if (dealerValue > 21) {
          setResult('win');
          const winAmount = currentBet * 2;
          addChips(winAmount);
          setLastWin(winAmount - currentBet);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else if (playerValue > dealerValue) {
          setResult('win');
          const winAmount = currentBet * 2;
          addChips(winAmount);
          setLastWin(winAmount - currentBet);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else if (playerValue < dealerValue) {
          setResult('lose');
        } else {
          setResult('push');
          addChips(currentBet);
        }
      }, 400);
    }
  }, [gamePhase, dealerHand, playerHand, deck, currentBet, addChips]);

  const newGame = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setCurrentBet(0);
    setGamePhase('betting');
    setResult(null);
    setLastWin(0);

    if (deck.length < 15) {
      setDeck(shuffleDeck(createDeck()));
    }
  };

  const playerScore = calculateHandValue(playerHand);
  const dealerScore = calculateHandValue(dealerHand.filter(c => c.faceUp));
  const canDoubleDown = gamePhase === 'playing' && playerHand.length === 2 && chips >= currentBet;

  const getResultMessage = () => {
    switch (result) {
      case 'blackjack': return 'BLACKJACK!';
      case 'win': return 'YOU WIN';
      case 'lose': return playerScore > 21 ? 'BUST' : 'YOU LOSE';
      case 'push': return 'PUSH';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl overflow-hidden border border-border">
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full">
            <span className="text-lg">♠</span>
            <span className="font-bold">{currentBet || '--'}</span>
          </div>
          {currentBet > 0 && gamePhase === 'betting' && (
            <div className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-full font-medium">
              ×2
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="text-xl font-black text-white tracking-tight">BLK</div>
          <div className="text-xl font-black text-accent tracking-tight -mt-1">JCK</div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-border">
          <span className="text-lg text-accent">♠</span>
          <span className="font-bold text-white">{chips.toLocaleString()}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-8 relative">
        {/* Dealer Hand */}
        {dealerHand.length > 0 && (
          <div className="relative">
            <div className="flex items-center justify-center">
              {dealerHand.map((card, index) => (
                <div
                  key={index}
                  style={{ marginLeft: index > 0 ? '-24px' : '0' }}
                >
                  <Card card={card} index={index} />
                </div>
              ))}
            </div>
            {/* Score badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "absolute -right-3 top-0 min-w-[32px] h-8 px-2 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm",
                result === 'win' || result === 'blackjack' ? "bg-red-500 text-white line-through" : "bg-white/10 text-white border border-border"
              )}
            >
              {gamePhase === 'playing' || gamePhase === 'betting' ? '?' : dealerScore}
            </motion.div>
          </div>
        )}

        {/* Result Display */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <span className={cn(
                "text-4xl font-black tracking-tight",
                result === 'win' || result === 'blackjack' ? "text-accent" :
                result === 'lose' ? "text-red-500" : "text-gray-400"
              )}>
                {getResultMessage()}
              </span>
              {lastWin > 0 && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-accent text-background px-4 py-1 rounded-lg font-bold text-lg"
                >
                  +{lastWin}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Hand */}
        {playerHand.length > 0 && (
          <div className="relative">
            <div className="flex items-center justify-center">
              {playerHand.map((card, index) => (
                <div
                  key={index}
                  style={{ marginLeft: index > 0 ? '-24px' : '0' }}
                >
                  <Card card={card} index={index} />
                </div>
              ))}
            </div>
            {/* Score badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "absolute -right-3 top-0 min-w-[32px] h-8 px-2 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm",
                playerScore > 21 ? "bg-red-500 text-white" : "bg-accent text-background"
              )}
            >
              {playerScore}
            </motion.div>
          </div>
        )}

        {/* Betting Phase - Empty State */}
        {gamePhase === 'betting' && playerHand.length === 0 && (
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">Place your bet to start</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-6 pt-2 border-t border-border">
        {/* Betting Phase */}
        {gamePhase === 'betting' && (
          <div className="space-y-4">
            {/* Chip buttons */}
            <div className="flex items-center justify-center gap-3">
              {BETTING_AMOUNTS.map(amount => (
                <motion.button
                  key={amount}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => placeBet(amount)}
                  disabled={chips < amount}
                  className={cn(
                    "w-14 h-14 rounded-full font-bold text-lg shadow-md transition-all border-2",
                    chips >= amount
                      ? "bg-white/5 text-white border-border hover:border-accent hover:text-accent"
                      : "bg-white/5 text-gray-600 border-border cursor-not-allowed"
                  )}
                >
                  {amount}
                </motion.button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3">
              {currentBet > 0 && (
                <button
                  onClick={clearBet}
                  className="px-6 py-3 text-gray-500 font-medium hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={startGame}
                disabled={currentBet === 0}
                className={cn(
                  "flex-1 max-w-xs py-4 rounded-2xl font-bold text-lg transition-all",
                  currentBet > 0
                    ? "bg-accent text-background shadow-lg hover:bg-accent/90"
                    : "bg-white/5 text-gray-600 cursor-not-allowed border border-border"
                )}
              >
                Deal
              </motion.button>
            </div>

            {/* Free chips */}
            {chips === 0 && (
              <button
                onClick={resetChips}
                className="w-full py-3 text-accent font-medium hover:text-accent/80 transition-colors"
              >
                Get Free Chips
              </button>
            )}
          </div>
        )}

        {/* Playing Phase */}
        {gamePhase === 'playing' && (
          <div className="flex items-center justify-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={hit}
              className="flex-1 max-w-[120px] py-4 rounded-2xl bg-white/10 text-white font-bold text-lg shadow-md hover:bg-white/20 transition-all border border-border"
            >
              Hit
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stand}
              className="flex-1 max-w-[120px] py-4 rounded-2xl bg-white text-background font-bold text-lg shadow-md hover:bg-gray-200 transition-all"
            >
              Stand
            </motion.button>
            {canDoubleDown && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={doubleDown}
                className="flex-1 max-w-[120px] py-4 rounded-2xl bg-accent text-background font-bold text-lg shadow-md hover:bg-accent/90 transition-all"
              >
                Double
              </motion.button>
            )}
          </div>
        )}

        {/* Dealer Turn */}
        {gamePhase === 'dealerTurn' && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-gray-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full"
              />
              <span className="font-medium">Dealer's turn...</span>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {gamePhase === 'result' && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={newGame}
            className="w-full py-4 rounded-2xl bg-accent text-background font-bold text-lg shadow-lg hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} />
            Play Again
          </motion.button>
        )}
      </div>
    </div>
  );
};
