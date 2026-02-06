import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const stats = [
  '3 sets logged',
  '2.1L water',
  '7.5h sleep',
  '1,820 kcal',
  '82.4 kg',
  'New PR: Bench',
];

export default function LiveStatTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={stats[index]}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="text-sm font-medium text-muted-foreground tracking-wide"
        >
          {stats[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
