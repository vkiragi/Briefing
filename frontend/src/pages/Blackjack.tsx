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
        className="h-[calc(100vh-3.5rem-env(safe-area-inset-top)-5rem-env(safe-area-inset-bottom))] md:h-screen flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-md mx-auto"
      >
        <div className="flex-1 overflow-hidden rounded-2xl shadow-xl">
          <BlackjackGame />
        </div>
      </motion.div>
    </ChipsProvider>
  );
};
