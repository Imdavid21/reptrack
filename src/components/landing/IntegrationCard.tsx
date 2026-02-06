import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function IntegrationCard({ icon, title, description }: IntegrationCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-card border border-border rounded-2xl p-8 text-center hover:border-muted-foreground/30 transition-colors"
    >
      <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </motion.div>
  );
}
