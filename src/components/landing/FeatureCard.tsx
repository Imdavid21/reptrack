import { useState } from 'react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-background border border-border rounded-2xl p-3 md:p-6 cursor-default flex flex-col items-center text-center gap-2 md:gap-4 relative overflow-hidden"
    >
      <motion.div
        className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-secondary flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4 md:[&_svg]:w-6 md:[&_svg]:h-6"
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

      <h3 className="text-xs md:text-sm font-semibold leading-tight">{title}</h3>
      <p className="text-xs md:text-xs text-muted-foreground leading-relaxed hidden md:block">{description}</p>

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
