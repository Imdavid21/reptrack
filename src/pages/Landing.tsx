import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
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
  ArrowRight,
  Bot,
  Code2,
  BarChart3,
  Smartphone,
  Wifi,
  Download,
  RefreshCw,
  Globe
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect logged-in users to app
  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold tracking-widest animate-pulse">
          REPTRACK<span className="text-muted-foreground">/</span>FITNESS
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-widest">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </Link>
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
      <section className="pt-32 pb-20 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              AI-Powered Health Tracking
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6"
          >
            One app to track
            <br />
            <span className="text-muted-foreground">your entire health</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Track fitness, water intake, calories, sleep, and more.
            Get AI-powered insights and smart workout plans.
            All in one unified dashboard.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/signup"
              className="btn-brutalist btn-primary px-8 py-4 text-base flex items-center justify-center gap-2"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/signin"
              className="btn-brutalist bg-secondary text-secondary-foreground px-8 py-4 text-base"
            >
              Sign In
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need, unified
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stop juggling multiple apps. Track all your health metrics in one place.
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
              icon={<Dumbbell className="w-6 h-6" />}
              title="Workout Tracking"
              description="Log exercises set-by-set. Track personal records, volume, and progress over time."
            />
            <FeatureCard
              icon={<Droplets className="w-6 h-6" />}
              title="Hydration Tracking"
              description="Monitor daily water intake with quick-add buttons and visual progress."
            />
            <FeatureCard
              icon={<Flame className="w-6 h-6" />}
              title="Calorie Tracking"
              description="Track meals, calculate macros, and maintain calorie awareness."
            />
            <FeatureCard
              icon={<Moon className="w-6 h-6" />}
              title="Sleep & Vitals"
              description="Log sleep hours, track energy levels, and monitor weight trends."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Advanced Analytics"
              description="Visualize trends with charts, heatmaps, and correlation insights."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Smart Routines"
              description="Create and follow structured workout routines with PPL support."
            />
          </motion.div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-20 px-4 bg-card border-y border-border">
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
                AI-Powered
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                Intelligence built in
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Get personalized insights, workout recommendations, and health correlations
                powered by machine learning. Understand patterns in your data that you might miss.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Activity className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <span>ML-powered health insights and recommendations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <span>Auto-detect personal records and progress</span>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <span>Correlate sleep, energy, and performance</span>
                </li>
              </ul>
            </div>
            <div className="bg-background border border-border rounded-2xl p-8">
              <div className="text-sm text-muted-foreground uppercase tracking-wide mb-4">AI Insights</div>
              <div className="space-y-4">
                <InsightCard
                  label="Pattern Detected"
                  text="Your workout volume increases 23% when sleep exceeds 7 hours"
                />
                <InsightCard
                  label="Recommendation"
                  text="Consider adding rest days after 3 consecutive training days"
                />
                <InsightCard
                  label="Achievement"
                  text="Bench press trending up 8% over the last 4 weeks"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 px-4">
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
              Connect with Claude, ChatGPT, and other AI agents via MCP and REST API.
              Let your AI assistant log workouts, query your health data, and provide insights.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
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
        </div>
      </section>

      {/* PWA Benefits Section */}
      <section className="py-20 px-4 border-t border-border">
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
              No app store required
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
              description="Under 2MB total"
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
      <section className="py-20 px-4 bg-card border-t border-border">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Start tracking today
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of users who have unified their health tracking.
            Free to start, no credit card required.
          </p>
          <Link
            to="/signup"
            className="btn-brutalist btn-primary px-8 py-4 text-base inline-flex items-center gap-2"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-card border border-border rounded-2xl p-6 hover:border-muted-foreground/30 transition-colors"
    >
      <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </motion.div>
  );
}

function InsightCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}

function IntegrationCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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

function PwaFeature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="text-center p-4"
    >
      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </motion.div>
  );
}
