import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { Check, X, SkipForward } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  upLabel?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  leftLabel = 'SKIP',
  rightLabel = 'LOG',
  upLabel = 'NEXT',
  disabled = false,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Visual feedback transforms
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const leftOpacity = useTransform(x, [-100, -30, 0], [1, 0.5, 0]);
  const rightOpacity = useTransform(x, [0, 30, 100], [0, 0.5, 1]);
  const upOpacity = useTransform(y, [-100, -30, 0], [1, 0.5, 0]);
  const scale = useTransform(
    [x, y],
    ([latestX, latestY]: number[]) => {
      const distance = Math.sqrt(latestX ** 2 + latestY ** 2);
      return Math.max(0.95, 1 - distance / 1000);
    }
  );

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (disabled) return;

    const threshold = 80;
    const velocity = 300;

    // Right swipe = LOG SET
    if (info.offset.x > threshold || info.velocity.x > velocity) {
      haptic('success');
      setExitDirection('right');
      onSwipeRight?.();
    }
    // Left swipe = SKIP
    else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      haptic('light');
      setExitDirection('left');
      onSwipeLeft?.();
    }
    // Up swipe = NEXT EXERCISE
    else if (info.offset.y < -threshold || info.velocity.y < -velocity) {
      haptic('medium');
      setExitDirection('up');
      onSwipeUp?.();
    }
  };

  const exitVariants = {
    left: { x: -500, opacity: 0, rotate: -30 },
    right: { x: 500, opacity: 0, rotate: 30 },
    up: { y: -500, opacity: 0 },
  };

  return (
    <div className="relative">
      {/* Swipe indicators */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-start pointer-events-none z-10"
        style={{ opacity: leftOpacity }}
      >
        <div className="ml-4 flex items-center gap-2 px-4 py-2 rounded-full bg-muted/90 backdrop-blur-sm text-muted-foreground font-medium text-sm">
          <X className="h-4 w-4" />
          {leftLabel}
        </div>
      </motion.div>

      <motion.div 
        className="absolute inset-0 flex items-center justify-end pointer-events-none z-10"
        style={{ opacity: rightOpacity }}
      >
        <div className="mr-4 flex items-center gap-2 px-4 py-2 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground font-medium text-sm">
          <Check className="h-4 w-4" />
          {rightLabel}
        </div>
      </motion.div>

      <motion.div 
        className="absolute inset-0 flex items-start justify-center pointer-events-none z-10"
        style={{ opacity: upOpacity }}
      >
        <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/90 backdrop-blur-sm text-secondary-foreground font-medium text-sm">
          <SkipForward className="h-4 w-4" />
          {upLabel}
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        drag={!disabled}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate, scale }}
        animate={exitDirection ? exitVariants[exitDirection] : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="touch-none cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Stacked cards effect for showing next exercises
interface CardStackProps {
  children: ReactNode[];
  currentIndex: number;
}

export function CardStack({ children, currentIndex }: CardStackProps) {
  return (
    <div className="relative h-full">
      {children.map((child, index) => {
        const offset = index - currentIndex;
        if (offset < 0 || offset > 2) return null;

        return (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={false}
            animate={{
              scale: 1 - offset * 0.05,
              y: offset * 12,
              opacity: offset === 0 ? 1 : 0.6 - offset * 0.2,
              zIndex: 10 - offset,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}