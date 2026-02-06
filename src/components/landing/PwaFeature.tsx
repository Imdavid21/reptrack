import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface PwaFeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function PwaFeature({ icon, title, description }: PwaFeatureProps) {
  return (
    <motion.div variants={fadeInUp} className="text-center p-4">
      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </motion.div>
  );
}
