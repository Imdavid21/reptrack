import { motion } from 'framer-motion';
import { Dumbbell, Droplets, BarChart3 } from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const steps = [
  {
    num: 1,
    icon: <Dumbbell className="w-6 h-6" />,
    title: 'Log workouts',
    description: 'Add sets, reps, and weight as you train.',
  },
  {
    num: 2,
    icon: <Droplets className="w-6 h-6" />,
    title: 'Track daily basics',
    description: 'Water, calories, sleep, and weight in seconds.',
  },
  {
    num: 3,
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Get weekly insights',
    description: 'See what moves your performance forward.',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 px-4 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Track in minutes. Learn in weeks.
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.2 }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              variants={fadeInUp}
              transition={{ delay: i * 0.2 }}
              className="relative bg-card border border-border rounded-2xl p-6 text-center"
            >
              {/* Animated number badge */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 300 }}
                className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold"
              >
                {step.num}
              </motion.div>

              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4">
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
