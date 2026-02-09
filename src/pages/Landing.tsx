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

      {/* Benefits Section (not features) */}
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
              Everything you need between sets.
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
              title="Never miss a PR"
              description="Every set compared to your history. New PR? You'll know right away."
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="Skip calorie guesswork"
              description="Snap your meal. AI gives you calories and macros in seconds."
            />
            <FeatureCard
              icon={<Droplets className="w-6 h-6" />}
              title="Stay on top of water"
              description="One tap after every set. Progress ring keeps you accountable."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Know what's working"
              description="See how sleep, weight, and volume affect your lifts over time."
            />
            <FeatureCard
              icon={<Dumbbell className="w-6 h-6" />}
              title="Follow a real program"
              description="Pick PPL, Upper/Lower, or Full Body. Exercises and targets ready to go."
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="insights" className="py-16 md:py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-14"
          >
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3 md:mb-4">
              Your data talks. Reptrack translates.
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              Patterns emerge after a few weeks. Reptrack surfaces them as simple, actionable insights.
            </p>
          </motion.div>

          {/* Insight cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-12 md:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { icon: <Activity className="w-4 h-4" />, text: "Volume, sleep & strength trends weekly" },
              { icon: <Sparkles className="w-4 h-4" />, text: "PRs, plateaus & streaks auto-detected" },
              { icon: <Moon className="w-4 h-4" />, text: "Sleep-to-performance correlations" },
            ].map((item) => (
              <motion.div key={item.text} variants={fadeInUp} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl text-sm">
                <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <span>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Integrations + PWA row */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* AI Assistants */}
            <motion.div variants={fadeInUp} id="integrations" className="p-5 bg-card border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">AI Assistants</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Use Claude, ChatGPT, or automations to log workouts and pull stats.
              </p>
              <div className="flex flex-wrap gap-2">
                {["MCP Server", "REST API", "Webhooks"].map((label) => (
                  <span key={label} className="px-2.5 py-1 bg-secondary rounded-md text-xs font-medium">{label}</span>
                ))}
              </div>
            </motion.div>

            {/* PWA */}
            <motion.div variants={fadeInUp} id="pwa" className="p-5 bg-card border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Works like an app</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Add to home screen. Lightweight, fast, always up to date.
              </p>
              <div className="flex flex-wrap gap-2">
                {["No Install", "Offline", "Auto Updates", "Cross Platform"].map((label) => (
                  <span key={label} className="px-2.5 py-1 bg-secondary rounded-md text-xs font-medium">{label}</span>
                ))}
              </div>
            </motion.div>
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
