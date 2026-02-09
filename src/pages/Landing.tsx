import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Sun, Moon, Dumbbell, Droplets, Bot, BarChart3,
  Smartphone, Camera, Trophy, Clock,
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
            Track your lifts.
            <br />
            <span className="text-muted-foreground">See what's actually working.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Logs your sets, food, water, and sleep in one app. So you train smarter and better.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/signin"
              className="btn-brutalist btn-primary px-8 py-4 text-base flex items-center justify-center"
            >
              Start for free
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
          </motion.div>

          {/* Spacer for removed ticker */}
        </motion.div>
      </section>

      {/* Reptrack vs Others */}
      <section className="py-16 md:py-24 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-14"
          >
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3 md:mb-4">
              Why Reptrack?
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              Most fitness apps do one thing. Reptrack does it all.
            </p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground"></th>
                  <th className="py-3 px-4 font-semibold text-center">Reptrack</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground text-center" colSpan={2}>Other popular apps</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {[
                  { feature: "Set-by-set logging", reptrack: true, others: true },
                  { feature: "Calorie tracking", reptrack: true, others: true },
                  { feature: "Water tracking", reptrack: true, others: true },
                  { feature: "Sleep and recovery", reptrack: true, others: false },
                  { feature: "AI food scanning", reptrack: true, others: false },
                  { feature: "Weekly insights", reptrack: true, others: false },
                  { feature: "Free forever", reptrack: true, others: false },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-center font-medium text-foreground">Yes</td>
                    <td className="py-3 px-4 text-center text-muted-foreground" colSpan={2}>
                      {row.others ? 'Some' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>


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
              Logging takes seconds.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No complicated menus. No wasted time. Just tap and move on.
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
                Tap weight, tap reps, done. PRs caught automatically.
              </p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1">
                <MiniWaterDemo />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                One tap between sets. Hit your daily goal without thinking.
              </p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1">
                <MiniCalorieDemo />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Snap a photo. Get calories and macros instantly.
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
              One app. Zero excuses.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Workouts, nutrition, hydration, and recovery all live here. No more juggling 4 apps.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="2-second logging"
              description="Last session's weights pre-filled. Just update reps and go."
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="PRs you'd miss"
              description="Hit a new max? Reptrack catches it before you forget."
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="Photo-to-calories"
              description="Take a photo of your plate. AI handles the math."
            />
            <FeatureCard
              icon={<Droplets className="w-6 h-6" />}
              title="Water accountability"
              description="Tap between sets. See your progress ring fill up."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Patterns you can't see"
              description="Correlates sleep, weight, and volume so you stop guessing."
            />
            <FeatureCard
              icon={<Dumbbell className="w-6 h-6" />}
              title="Programs that work"
              description="PPL, Upper/Lower, Full Body. Pick one and start lifting."
            />
            <FeatureCard
              icon={<Moon className="w-6 h-6" />}
              title="Recovery matters"
              description="Sleep and energy tracked. Know when to push, when to rest."
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="AI that knows you"
              description="Coaching tips based on your data, not generic advice."
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="No app store needed"
              description="Install from browser. Works offline. Feels native."
            />
          </div>
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
            You train hard. Now track it.
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Free forever.
          </p>
          <Link
            to="/signin"
            className="btn-brutalist btn-primary px-8 py-4 text-base inline-flex items-center"
          >
            Start for free
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
