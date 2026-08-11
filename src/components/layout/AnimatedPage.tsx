import { motion, useReducedMotion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      transition={
        reduceMotion
          ? { duration: 0.12, ease: 'linear' }
          : { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Frequent dashboard visits should settle quickly and remain interruptible.
// The global reduced-motion rules collapse these to a gentle cross-fade.
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.02,
      staggerChildren: 0.035,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 38,
      mass: 0.8,
    },
  },
};
