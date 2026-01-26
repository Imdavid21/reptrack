import { useEffect, useState } from 'react';
import { Logo } from '@/components/layout/Logo';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 15 + 5;
      });
    }, 150);
    
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, 300);
      }, 200);
    }, minDuration);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete, minDuration]);

  // Generate ASCII progress bar
  const totalBlocks = 20;
  const filledBlocks = Math.floor((Math.min(progress, 100) / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const progressBar = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}]`;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="animate-fade-in">
          <Logo size="lg" />
        </div>

        {/* ASCII Progress Bar */}
        <div className="font-mono text-sm text-foreground/80 tracking-tight">
          {progressBar}
        </div>
      </div>
    </div>
  );
}
