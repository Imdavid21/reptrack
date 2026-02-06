import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const activities = [
  { name: 'Arjun', action: 'logged a push workout' },
  { name: 'Priya', action: 'hit a new squat PR' },
  { name: 'Rahul', action: 'tracked 2.4L of water' },
  { name: 'Sneha', action: 'logged breakfast, 620 kcal' },
  { name: 'Vikram', action: 'completed leg day' },
  { name: 'Aisha', action: 'logged 8h of sleep' },
  { name: 'Karthik', action: 'added 3 sets of deadlifts' },
  { name: 'Ananya', action: 'hit a bench press PR' },
  { name: 'Rohan', action: 'tracked a rest day' },
  { name: 'Meera', action: 'logged her morning check-in' },
  { name: 'Aditya', action: 'finished an upper body session' },
  { name: 'Divya', action: 'tracked 1,950 kcal for the day' },
];

export default function LiveStatTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % activities.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = activities[index];

  return (
    <motion.div
      className="relative inline-flex items-center justify-center px-4 py-2 rounded-full border border-border/60 bg-card/60 shadow-soft overflow-hidden"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Subtle shimmer sweep */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--foreground) / 0.04) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
      />
      <div className="h-5 flex items-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs text-muted-foreground tracking-wide"
          >
            <span className="font-medium text-foreground">{current.name}</span>{' '}
            {current.action}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
