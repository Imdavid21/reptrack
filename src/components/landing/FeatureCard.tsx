import { motion } from 'framer-motion';
import { useState } from 'react';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      variants={fadeInUp}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-background border border-border rounded-2xl p-6 cursor-default flex flex-col items-center text-center gap-4 relative overflow-hidden"
    >
      {/* Animated icon container */}
      <motion.div
        className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center"
        animate={{
          scale: isHovered ? 1.1 : 1,
          rotate: isHovered ? 6 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          animate={{ scale: isHovered ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {icon}
        </motion.div>
      </motion.div>

      {/* Short title only */}
      <h3 className="text-sm font-semibold leading-tight">{title}</h3>

      {/* One-liner description, muted */}
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

      {/* Subtle hover glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 30%, hsl(var(--foreground) / 0.03), transparent 70%)',
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
