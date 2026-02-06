import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Plus } from 'lucide-react';

export default function MiniWaterDemo() {
  const [level, setLevel] = useState(0);
  const goal = 3.5;

  useEffect(() => {
    const timer = setInterval(() => {
      setLevel((prev) => {
        if (prev >= goal) return 0;
        return Math.round((prev + 0.5) * 10) / 10;
      });
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const percent = Math.min((level / goal) * 100, 100);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 max-w-xs mx-auto h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Water</span>
      </div>

      {/* Circular progress */}
      <div className="relative w-24 h-24 mx-auto mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={264}
            animate={{ strokeDashoffset: 264 - (264 * percent) / 100 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={level}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-bold"
          >
            {level.toFixed(1)}L
          </motion.span>
          <span className="text-[10px] text-muted-foreground">/ {goal}L</span>
        </div>
      </div>

      {/* Quick add button */}
      <motion.div
        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-secondary text-xs font-medium"
        animate={level > 0 && level < goal ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Plus className="w-3 h-3" />
        <span>250ml</span>
      </motion.div>
    </div>
  );
}
