import { motion } from 'framer-motion';
import { BlackjackGame } from '../components/blackjack/BlackjackGame';
import { ChipsProvider } from '../context/ChipsContext';

export const Blackjack = () => {
  return (
    <ChipsProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="h-[calc(100vh-3.5rem-env(safe-area-inset-top)-5rem-env(safe-area-inset-bottom))] md:h-screen flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-2xl mx-auto"
      >
        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            <span className="text-red-500">♥</span> Blackjack <span className="text-red-500">♦</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">Try to beat the dealer!</p>
        </div>

        {/* Game Container */}
        <div className="flex-1 bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-2xl border border-border overflow-hidden min-h-0">
          <BlackjackGame />
        </div>
      </motion.div>
    </ChipsProvider>
  );
};
