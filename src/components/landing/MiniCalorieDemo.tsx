import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';

const phases = ['idle', 'scanning', 'result'] as const;

export default function MiniCalorieDemo() {
  const [phase, setPhase] = useState<typeof phases[number]>('idle');

  useEffect(() => {
    const cycle = () => {
      setPhase('idle');
      const t1 = setTimeout(() => setPhase('scanning'), 1500);
      const t2 = setTimeout(() => setPhase('result'), 3200);
      const t3 = setTimeout(() => setPhase('idle'), 6000);
      return [t1, t2, t3];
    };

    let timers = cycle();
    const interval = setInterval(() => {
      timers = cycle();
    }, 6500);

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 max-w-xs mx-auto h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Snap to Log</span>
      </div>

      <div className="relative h-28 bg-secondary rounded-xl flex items-center justify-center overflow-hidden mb-3">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Camera className="w-8 h-8 mx-auto mb-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Take a photo</span>
            </motion.div>
          )}
          {phase === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2 className="w-6 h-6 mx-auto mb-1 text-muted-foreground animate-spin" />
              <span className="text-xs text-muted-foreground">Analyzing food...</span>
            </motion.div>
          )}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full px-3"
            >
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>Chicken Rice Bowl</span>
                  <span className="font-semibold">620 kcal</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>P: 42g</span>
                  <span>C: 65g</span>
                  <span>F: 18g</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-xs text-center text-muted-foreground">
        AI identifies food from photos instantly
      </div>
    </div>
  );
}
