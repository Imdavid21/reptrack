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
    <div className="relative inline-flex items-center justify-center px-4 py-2 rounded-full border border-border/60 bg-card/60 shadow-soft">
      <div className="absolute inset-0 rounded-full bg-foreground/[0.02] animate-pulse pointer-events-none" />
      <div className="h-5 flex items-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="text-xs text-muted-foreground tracking-wide"
          >
            <span className="font-medium text-foreground">{current.name}</span>{' '}
            {current.action}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
