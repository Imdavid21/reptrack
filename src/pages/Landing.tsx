import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  Dumbbell,
  Droplets,
  Flame,
  Brain,
  Sparkles,
  Activity,
  Moon,
  Zap,
  Bot,
  Code2,
  BarChart3,
  Smartphone,
  Wifi,
  Download,
  RefreshCw,
  Globe,
  Camera,
  Trophy,
  Clock,
} from 'lucide-react';

import LiveStatTicker from '@/components/landing/LiveStatTicker';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeatureCard from '@/components/landing/FeatureCard';
import InsightCard from '@/components/landing/InsightCard';
import IntegrationCard from '@/components/landing/IntegrationCard';
import PwaFeature from '@/components/landing/PwaFeature';
import PulseDot from '@/components/landing/PulseDot';
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
        <div className="text-2xl font-bold tracking-widest animate-pulse">
          REPTRACK<span className="text-muted-foreground"> </span>FITNESS
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a
            href="#hero"
            onClick={(e) => scrollToSection(e, 'hero')}
            className="text-xl font-bold tracking-widest"
          >
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-foreground transition-colors">Features</a>
            <a href="#insights" onClick={(e) => scrollToSection(e, 'insights')} className="hover:text-foreground transition-colors">Insights</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to="/signin"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="btn-brutalist btn-primary px-4 py-2 text-sm"
            >
              Get Started
            </Link>
          </div>
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
              to="/signup"
              className="btn-brutalist btn-primary px-8 py-4 text-base flex items-center justify-center"
            >
              Get started
            </Link>
            <Link
              to="/signin"
              className="btn-brutalist bg-secondary text-secondary-foreground px-8 py-4 text-base"
            >
              Sign In
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

      {/* How It Works */}
      <HowItWorksSection />

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
              What you get from using Reptrack.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Not a feature list. These are the real outcomes when everything lives in one system.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Log a workout in under 2 minutes"
              description="Pre-filled weights from your last session. Just update reps and move on. Your draft saves if you close the app mid-workout."
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Know your PRs the moment you hit them"
              description="Every set is checked against your history. When you beat your best, you'll see it instantly. No manual tracking needed."
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="Snap a photo, skip the calorie math"
              description="Take a picture of your meal. AI identifies the food, estimates calories and macros, and logs it for you in one tap."
            />
            <FeatureCard
              icon={<Droplets className="w-6 h-6" />}
              title="Stay hydrated without thinking about it"
              description="Quick-add 250ml to 1L with one tap. A progress ring fills up through the day so you always know where you stand."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="See what actually improves your training"
              description="Correlations between sleep, weight, volume, and performance show up automatically. You'll know if more sleep really helps your lifts."
            />
            <FeatureCard
              icon={<Dumbbell className="w-6 h-6" />}
              title="Follow a real program, not random workouts"
              description="Choose PPL, Upper/Lower, or Full Body. Each day has pre-loaded exercises with target weights and reps. Just show up and follow."
            />
          </motion.div>
        </div>
      </section>

      {/* AI Section */}
      <section id="insights" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-6">
                <Brain className="w-4 h-4" />
                AI Insights
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                Your data talks. Reptrack translates.
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                After a few weeks of logging, patterns emerge. Reptrack surfaces them as simple,
                actionable insights. You don't need to read charts or build spreadsheets.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Activity className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <span>Week-over-week volume, sleep, and strength trends</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <span>PRs, plateaus, and streaks detected automatically</span>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <span>Calorie balance with intake vs. workout expenditure</span>
                </li>
                <li className="flex items-start gap-3">
                  <Moon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <span>Sleep-to-performance correlations you can act on</span>
                </li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide mb-4">
                <PulseDot />
                AI Insights
              </div>
              <div className="space-y-4">
                <InsightCard
                  label="Pattern detected"
                  text="Your training volume is 23% higher when sleep exceeds 7 hours."
                  meta="Based on last 28 days"
                />
                <InsightCard
                  label="Recommendation"
                  text="Consider adding rest days after 3 consecutive training days."
                  meta="Based on last 28 days"
                />
                <InsightCard
                  label="Achievement"
                  text="Bench press trending up 8% over the last 4 weeks."
                  meta="Based on last 28 days"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Integration Section */}
      <section id="integrations" className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-6">
              <Bot className="w-4 h-4" />
              AI Agent Ready
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Works with your AI assistants
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Use Claude, ChatGPT, or automations to log workouts, pull stats, and generate
              summaries. MCP and API support are built in.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <IntegrationCard
              icon={<Bot className="w-8 h-8" />}
              title="MCP Server"
              description="Native Model Context Protocol support for Claude and compatible AI assistants."
            />
            <IntegrationCard
              icon={<Code2 className="w-8 h-8" />}
              title="REST API"
              description="Full-featured API to integrate with any app, automation, or AI workflow."
            />
            <IntegrationCard
              icon={<Zap className="w-8 h-8" />}
              title="Webhooks"
              description="Get notified of workouts, milestones, and goals via webhooks."
            />
          </motion.div>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Developer features are optional. The core app works without any setup.
          </p>
        </div>
      </section>

      {/* PWA Benefits Section */}
      <section id="pwa" className="py-20 px-4 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground mb-6">
              <Smartphone className="w-4 h-4" />
              Works Like an App
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Works like an app. No app store.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Add to your home screen and use it just like any other app.
              Lightweight, fast, and always up to date.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <PwaFeature
              icon={<Download className="w-5 h-5" />}
              title="No Installation"
              description="Skip the app store"
            />
            <PwaFeature
              icon={<Wifi className="w-5 h-5" />}
              title="Works Offline"
              description="Use without internet"
            />
            <PwaFeature
              icon={<Zap className="w-5 h-5" />}
              title="Lightweight"
              description="Loads fast"
            />
            <PwaFeature
              icon={<RefreshCw className="w-5 h-5" />}
              title="Auto Updates"
              description="Always latest version"
            />
            <PwaFeature
              icon={<Globe className="w-5 h-5" />}
              title="Cross Platform"
              description="iPhone, Android, Desktop"
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
            to="/signup"
            className="btn-brutalist btn-primary px-8 py-4 text-base inline-flex items-center"
          >
            Create account
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-bold tracking-widest text-foreground">REPTRACK FITNESS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
