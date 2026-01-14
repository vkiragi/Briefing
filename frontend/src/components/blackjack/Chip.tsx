import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ChipProps {
  value: number;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const chipColors: Record<number, { bg: string; border: string; text: string }> = {
  10: {
    bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    border: 'border-blue-300',
    text: 'text-white',
  },
  25: {
    bg: 'bg-gradient-to-br from-green-400 to-green-600',
    border: 'border-green-300',
    text: 'text-white',
  },
  50: {
    bg: 'bg-gradient-to-br from-red-400 to-red-600',
    border: 'border-red-300',
    text: 'text-white',
  },
  100: {
    bg: 'bg-gradient-to-br from-purple-400 to-purple-600',
    border: 'border-purple-300',
    text: 'text-white',
  },
  500: {
    bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
    border: 'border-yellow-300',
    text: 'text-gray-900',
  },
};

const defaultColors = {
  bg: 'bg-gradient-to-br from-gray-400 to-gray-600',
  border: 'border-gray-300',
  text: 'text-white',
};

export const Chip = ({ value, onClick, disabled, selected, size = 'md' }: ChipProps) => {
  const colors = chipColors[value] || defaultColors;

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 md:w-16 md:h-16 text-sm md:text-base',
    lg: 'w-20 h-20 text-lg',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.1, y: -4 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      className={cn(
        "relative rounded-full font-bold shadow-lg",
        "border-4 border-dashed",
        "flex items-center justify-center",
        "transition-opacity",
        sizeClasses[size],
        colors.bg,
        colors.border,
        colors.text,
        disabled && "opacity-40 cursor-not-allowed",
        selected && "ring-2 ring-white ring-offset-2 ring-offset-transparent"
      )}
    >
      {/* Inner circle decoration */}
      <div className="absolute inset-2 rounded-full border-2 border-white/30" />

      {/* Value */}
      <span className="relative z-10 font-bold drop-shadow-md">
        {value === 500 ? 'MAX' : value}
      </span>
    </motion.button>
  );
};

interface ChipStackProps {
  amount: number;
  className?: string;
}

export const ChipStack = ({ amount, className }: ChipStackProps) => {
  // Break down amount into chip denominations
  const denominations = [500, 100, 50, 25, 10];
  const chips: number[] = [];
  let remaining = amount;

  for (const denom of denominations) {
    while (remaining >= denom && chips.length < 8) {
      chips.push(denom);
      remaining -= denom;
    }
  }

  return (
    <div className={cn("relative flex flex-col-reverse items-center", className)}>
      {chips.map((value, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          style={{ marginTop: index > 0 ? '-36px' : '0' }}
        >
          <Chip value={value} size="sm" disabled />
        </motion.div>
      ))}
    </div>
  );
};
