import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

const sets = [
  { exercise: 'Bench Press', weight: '80kg', reps: 8, isPR: false },
  { exercise: 'Bench Press', weight: '85kg', reps: 6, isPR: true },
  { exercise: 'Incline DB Press', weight: '30kg', reps: 10, isPR: false },
];

export default function MiniWorkoutDemo() {
  const [activeSet, setActiveSet] = useState(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSet((prev) => {
        if (prev >= sets.length - 1) return -1;
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 max-w-xs mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Push Day A</span>
        <span className="text-xs text-muted-foreground">Set {Math.max(activeSet + 1, 1)} / {sets.length}</span>
      </div>
      <div className="space-y-2">
        {sets.map((set, i) => (
          <motion.div
            key={i}
            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
              i <= activeSet
                ? 'bg-secondary border-border'
                : 'border-transparent'
            }`}
            animate={i === activeSet ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {i <= activeSet ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-border" />
                )}
              </AnimatePresence>
              <div>
                <span className="text-sm font-medium">{set.exercise}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{set.weight} x {set.reps}</span>
              {set.isPR && i <= activeSet && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded"
                >
                  NEW PR
                </motion.span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Progress bar */}
      <div className="mt-4 h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${((activeSet + 1) / sets.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
