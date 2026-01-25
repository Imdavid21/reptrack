import { useEffect, useState } from 'react';
import { Logo } from '@/components/layout/Logo';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 300);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="animate-fade-in">
          <Logo size="lg" />
        </div>

        {/* Pulse line animation */}
        <div className="w-48 h-8 relative overflow-hidden">
          <svg
            viewBox="0 0 200 40"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Static line */}
            <line
              x1="0"
              y1="20"
              x2="200"
              y2="20"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1"
              opacity="0.3"
            />
            {/* Animated pulse */}
            <polyline
              points="0,20 60,20 70,20 80,8 90,32 100,20 110,20 200,20"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse-line"
            />
          </svg>
        </div>

        {/* Loading indicator */}
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-foreground animate-pulse-dot" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-foreground animate-pulse-dot" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-foreground animate-pulse-dot" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      <style>{`
        @keyframes pulse-line {
          0%, 100% {
            opacity: 0.4;
            transform: translateX(-20px);
          }
          50% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
        
        .animate-pulse-line {
          animation: pulse-line 1.5s ease-in-out infinite;
        }
        
        .animate-pulse-dot {
          animation: pulse-dot 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
