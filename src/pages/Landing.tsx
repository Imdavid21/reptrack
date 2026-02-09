import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import {
  Dumbbell,
  Droplets,
  Sparkles,
  Activity,
  Bot,
  BarChart3,
  Globe,
  Smartphone,
  Camera,
  Trophy,
  Clock,
  TrendingUp,
  Wifi,
} from 'lucide-react';

import LiveStatTicker from '@/components/landing/LiveStatTicker';
// HowItWorksSection removed
import { Logo } from '@/components/layout/Logo';
import FeatureCard from '@/components/landing/FeatureCard';
import AppleIcon from '@/components/landing/AppleIcon';
import MiniWorkoutDemo from '@/components/landing/MiniWorkoutDemo';
import MiniWaterDemo from '@/components/landing/MiniWaterDemo';
import MiniCalorieDemo from '@/components/landing/MiniCalorieDemo';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  const scrollToSection = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between relative">
          <a
            href="#hero"
            onClick={(e) => scrollToSection(e, 'hero')}
            className="z-10"
          >
            <Logo size="md" />
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-foreground transition-colors">Features</a>
            <a href="#insights" onClick={(e) => scrollToSection(e, 'insights')} className="hover:text-foreground transition-colors">Insights</a>
          </nav>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border hover:bg-secondary transition-colors z-10"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-20 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <LiveStatTicker />
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6"
          >
            One place to track
            <br />
            <span className="text-muted-foreground">training, recovery, and intake.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Log workouts set by set. Track water, calories, sleep, and weight.
            Reptrack turns your daily logs into weekly insights so you know what's working.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/signin"
              className="btn-brutalist btn-primary px-8 py-4 text-base flex items-center justify-center"
            >
              Get started
            </Link>
          </motion.div>

          {/* PWA line */}
          <motion.div
            variants={fadeInUp}
            className="mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <span>Works like an app.</span>
              <span className="flex items-center gap-1.5">
                <AppleIcon className="w-4 h-4" />
                <Smartphone className="w-4 h-4" />
              </span>
              <span>Add to Home Screen.</span>
            </div>
            <div className="text-xs">
              Free forever.
            </div>
          </motion.div>

          {/* Spacer for removed ticker */}
        </motion.div>
      </section>

      {/* How It Works - removed */}

      {/* Live Demos Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              See it in action.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Logging takes seconds, not minutes. Here's what it actually looks like.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1">
                <MiniWorkoutDemo />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Log sets. PRs detected automatically.
              </p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1">
                <MiniWaterDemo />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                One tap to log water.
              </p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1">
                <MiniCalorieDemo />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                AI breaks down calories from photos.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for the gym.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to train smarter, in one place.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
            variants={staggerContainer}
          >
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Log faster between sets"
              description="Weights pre-filled from last session. Update reps, done."
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Auto-detected PRs"
              description="Every set compared to your history. New PR? You'll know right away."
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="AI calorie tracking"
              description="Snap your meal. AI gives you calories and macros in seconds."
            />
            <FeatureCard
              icon={<Droplets className="w-6 h-6" />}
              title="One-tap water logging"
              description="Tap after every set. Progress ring keeps you accountable all day."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Weekly trends and insights"
              description="See how sleep, weight, and volume affect your lifts over time."
            />
            <FeatureCard
              icon={<Dumbbell className="w-6 h-6" />}
              title="Real training programs"
              description="Pick PPL, Upper/Lower, or Full Body. Exercises and targets ready to go."
            />
            <FeatureCard
              icon={<Moon className="w-6 h-6" />}
              title="Sleep and recovery"
              description="Track sleep hours and energy so you know when to push or rest."
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="AI coaching"
              description="Get data-driven tips based on your actual training and recovery patterns."
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="Installable PWA"
              description="Add to Home Screen. Works offline. Feels like a native app."
            />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-border">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Start tracking today.
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Built for busy people who want one system for fitness.
            Free forever.
          </p>
          <Link
            to="/signin"
            className="btn-brutalist btn-primary px-8 py-4 text-base inline-flex items-center"
          >
            Get started
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <Logo size="sm" />
          </div>


        </div>
      </footer>
    </div>
  );
}
