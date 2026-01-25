import { useEffect, useState } from 'react';
import { Logo } from '@/components/layout/Logo';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    // Show pulse animation after logo appears
    const pulseTimer = setTimeout(() => setShowPulse(true), 300);
    
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 300);
    }, minDuration);

    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Heartbeat Animation */}
        <div className={`w-64 h-16 relative overflow-hidden transition-opacity duration-500 ${showPulse ? 'opacity-100' : 'opacity-0'}`}>
          <svg
            viewBox="0 0 240 60"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Static baseline */}
            <line
              x1="0"
              y1="30"
              x2="240"
              y2="30"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1"
              opacity="0.2"
            />
            {/* Animated heartbeat line */}
            <polyline
              points="0,30 50,30 60,30 75,30 85,10 95,50 105,30 115,30 125,30 135,10 145,50 155,30 165,30 240,30"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse-line"
            />
          </svg>
        </div>

        {/* Logo */}
        <div className="animate-fade-in">
          <Logo size="lg" />
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-foreground/60 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-foreground/60 animate-pulse-dot" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-foreground/60 animate-pulse-dot" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      <style>{`
        @keyframes pulse-line {
          0% {
            stroke-dashoffset: 500;
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
        }
        
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-pulse-line {
          stroke-dasharray: 500;
          animation: pulse-line 2s ease-in-out infinite;
        }
        
        .animate-pulse-dot {
          animation: pulse-dot 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
