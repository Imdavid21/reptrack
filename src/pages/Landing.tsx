import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Sun, Moon, Dumbbell, Droplets, Bot, BarChart3,
  Smartphone, Camera, Trophy, Clock,
} from 'lucide-react';

import LiveStatTicker from '@/components/landing/LiveStatTicker';
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
    transition: { staggerChildren: 0.1 },
  },
};

const DEMO_ITEMS = [
  { label: 'Tap weight, tap reps, done.' },
  { label: 'One tap between sets.' },
  { label: 'Snap a photo. Get macros.' },
];

function DemoCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement;
    if (child) {
      container.scrollTo({ left: child.offsetLeft - container.offsetLeft, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    autoScrollRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % 3;
        scrollToIndex(next);
        return next;
      });
    }, 3500);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [scrollToIndex]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const childWidth = (container.children[0] as HTMLElement)?.offsetWidth || 1;
      const index = Math.round(scrollLeft / (childWidth + 16));
      setActiveIndex(Math.min(index, 2));
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    if (autoScrollRef.current) { clearInterval(autoScrollRef.current); autoScrollRef.current = null; }
  }, []);

  const demos = [<MiniWorkoutDemo />, <MiniWaterDemo />, <MiniCalorieDemo />];

  return (
    <div className="md:hidden">
      <div
        ref={scrollRef}
        onTouchStart={pauseAutoScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-6 px-6 scrollbar-hide"
      >
        {DEMO_ITEMS.map((item, i) => (
          <div key={i} className="snap-center shrink-0 w-[80vw] max-w-xs text-center flex flex-col">
            <div className="flex-1">{demos[i]}</div>
            <p className="text-xs text-muted-foreground mt-2">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {DEMO_ITEMS.map((_, i) => (
          <button
            key={i}
            onClick={() => { pauseAutoScroll(); scrollToIndex(i); setActiveIndex(i); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground/30'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

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
          <a href="#hero" onClick={(e) => scrollToSection(e, 'hero')} className="z-10">
            <Logo size="md" />
          </a>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-all active:scale-95 shadow-sm"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-20 px-6 md:px-4">
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
        </motion.div>
      </section>

      {/* Reptrack vs Others */}
      <section className="py-16 md:py-24 px-6 md:px-4 border-t border-border">
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
      <section className="py-20 px-6 md:px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3 md:mb-4">
              Logging takes seconds.
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
              No complicated menus. No wasted time. Just tap and move on.
            </p>
          </motion.div>

          {/* Desktop: 3-col grid */}
          <motion.div
            className="hidden md:grid md:grid-cols-3 gap-8 items-stretch"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1"><MiniWorkoutDemo /></div>
              <p className="text-xs text-muted-foreground mt-3">Tap weight, tap reps, done.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1"><MiniWaterDemo /></div>
              <p className="text-xs text-muted-foreground mt-3">One tap between sets.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center flex flex-col">
              <div className="flex-1"><MiniCalorieDemo /></div>
              <p className="text-xs text-muted-foreground mt-3">Snap a photo. Get macros.</p>
            </motion.div>
          </motion.div>

          {/* Mobile: carousel */}
          <DemoCarousel />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 md:px-4 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3 md:mb-4">
              One app. Zero excuses.
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto">
              Workouts, nutrition, hydration, and recovery all live here.
            </p>
          </motion.div>

          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <FeatureCard icon={<Clock className="w-6 h-6" />} title="2-second logging" description="Last session's weights pre-filled. Just update reps and go." />
            <FeatureCard icon={<Trophy className="w-6 h-6" />} title="PRs you'd miss" description="Hit a new max? Reptrack catches it before you forget." />
            <FeatureCard icon={<Camera className="w-6 h-6" />} title="Photo-to-calories" description="Take a photo of your plate. AI handles the math." />
            <FeatureCard icon={<Droplets className="w-6 h-6" />} title="Water accountability" description="Tap between sets. See your progress ring fill up." />
            <FeatureCard icon={<BarChart3 className="w-6 h-6" />} title="Patterns you can't see" description="Correlates sleep, weight, and volume so you stop guessing." />
            <FeatureCard icon={<Dumbbell className="w-6 h-6" />} title="Programs that work" description="PPL, Upper/Lower, Full Body. Pick one and start lifting." />
            <FeatureCard icon={<Moon className="w-6 h-6" />} title="Recovery matters" description="Sleep and energy tracked. Know when to push, when to rest." />
            <FeatureCard icon={<Bot className="w-6 h-6" />} title="AI that knows you" description="Coaching tips based on your data, not generic advice." />
            <FeatureCard icon={<Smartphone className="w-6 h-6" />} title="No app store needed" description="Install from browser. Works offline. Feels native." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 md:px-4 border-t border-border">
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
          <Logo size="sm" />
          <nav className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
