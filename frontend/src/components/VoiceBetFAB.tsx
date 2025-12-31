import React, { useState, useEffect } from 'react';
import { Mic, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseVoiceBet, ParsedBetData } from '../lib/voiceBetParser';
import { VoiceBetConfirmationModal } from './VoiceBetConfirmationModal';

export const VoiceBetFAB: React.FC = () => {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [parsedBet, setParsedBet] = useState<ParsedBetData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showListeningOverlay, setShowListeningOverlay] = useState(false);

  // When we get a final transcript, parse it
  useEffect(() => {
    if (transcript && !isListening) {
      const parsed = parseVoiceBet(transcript);
      setParsedBet(parsed);
      setShowListeningOverlay(false);
      setShowConfirmation(true);
    }
  }, [transcript, isListening]);

  // Handle listening state
  useEffect(() => {
    if (isListening) {
      setShowListeningOverlay(true);
    }
  }, [isListening]);

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setParsedBet(null);
      startListening();
    }
  };

  const handleCancelListening = () => {
    stopListening();
    resetTranscript();
    setShowListeningOverlay(false);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setParsedBet(null);
    resetTranscript();
  };

  const getErrorMessage = () => {
    switch (error) {
      case 'not-allowed':
        return 'Microphone access denied. Please enable in browser settings.';
      case 'no-speech':
        return "I didn't catch that. Tap to try again.";
      case 'network':
        return 'Connection error. Please try again.';
      case 'audio-capture':
        return 'No microphone found.';
      default:
        return null;
    }
  };

  return (
    <>
      {/* Listening Overlay */}
      <AnimatePresence>
        {showListeningOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6"
            onClick={handleCancelListening}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pulsing mic indicator */}
              <div className="relative mb-6">
                <motion.div
                  className="absolute inset-0 bg-red-500/30 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{ width: 80, height: 80, margin: 'auto' }}
                />
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto relative z-10">
                  <Mic size={36} className="text-white" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">Listening...</h2>
              <p className="text-gray-400 text-sm mb-4 max-w-xs">
                Say your bet, like "Put $20 on LeBron over 25 points"
              </p>

              {/* Live transcript */}
              <div className="min-h-[60px] mb-6">
                {(transcript || interimTranscript) && (
                  <div className="bg-white/10 rounded-lg px-4 py-3 max-w-sm mx-auto">
                    <p className="text-white text-lg">
                      {transcript}
                      <span className="text-gray-400">{interimTranscript}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Cancel button */}
              <button
                onClick={handleCancelListening}
                className="px-6 py-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && !isListening && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50 pointer-events-none flex justify-center"
          >
            <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg max-w-sm">
              <AlertCircle size={18} />
              <span className="text-sm">{getErrorMessage()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMicClick}
          className={`
            w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors
            ${isListening
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-card border border-border hover:border-accent'
            }
          `}
          aria-label={isListening ? 'Stop listening' : 'Voice bet'}
        >
          {isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Mic size={24} className="text-white" />
            </motion.div>
          ) : (
            <Mic size={24} className="text-gray-400" />
          )}
        </motion.button>
      </div>

      {/* Confirmation Modal */}
      <VoiceBetConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCloseConfirmation}
        parsedBet={parsedBet}
      />
    </>
  );
};
