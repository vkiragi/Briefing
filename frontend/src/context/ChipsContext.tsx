import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'briefing_chips';
const STARTING_CHIPS = 1000;

interface ChipsContextType {
  chips: number;
  addChips: (amount: number) => void;
  removeChips: (amount: number) => boolean;
  resetChips: () => void;
}

const ChipsContext = createContext<ChipsContextType | undefined>(undefined);

export const ChipsProvider = ({ children }: { children: ReactNode }) => {
  const [chips, setChips] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? STARTING_CHIPS : parsed;
    }
    return STARTING_CHIPS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, chips.toString());
  }, [chips]);

  const addChips = (amount: number) => {
    setChips(prev => prev + amount);
  };

  const removeChips = (amount: number): boolean => {
    if (chips >= amount) {
      setChips(prev => prev - amount);
      return true;
    }
    return false;
  };

  const resetChips = () => {
    setChips(STARTING_CHIPS);
  };

  return (
    <ChipsContext.Provider value={{ chips, addChips, removeChips, resetChips }}>
      {children}
    </ChipsContext.Provider>
  );
};

export const useChips = () => {
  const context = useContext(ChipsContext);
  if (!context) {
    throw new Error('useChips must be used within a ChipsProvider');
  }
  return context;
};
