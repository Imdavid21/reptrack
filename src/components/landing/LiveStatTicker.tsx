import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const activities = [
  { name: 'Alex', action: 'logged a push workout' },
  { name: 'Priya', action: 'hit a new squat PR' },
  { name: 'Marcus', action: 'tracked 2.4L of water' },
  { name: 'Sofia', action: 'logged breakfast — 620 kcal' },
  { name: 'James', action: 'completed leg day' },
  { name: 'Aisha', action: 'logged 8h of sleep' },
  { name: 'Daniel', action: 'added 3 sets of deadlifts' },
  { name: 'Emma', action: 'hit a bench press PR' },
  { name: 'Kai', action: 'tracked a rest day' },
  { name: 'Lena', action: 'logged her morning check-in' },
  { name: 'Ryan', action: 'finished an upper body session' },
  { name: 'Nina', action: 'tracked 1,950 kcal for the day' },
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
    <div className="h-6 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="text-sm text-muted-foreground tracking-wide"
        >
          <span className="font-medium">{current.name}</span> {current.action}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
