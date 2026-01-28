import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function AnimatedCheckbox({ 
  checked, 
  onChange, 
  label, 
  disabled,
  className 
}: AnimatedCheckboxProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    setIsAnimating(true);
    haptic(checked ? 'light' : 'success');
    onChange(!checked);
    
    setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 transition-all",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div
        className={cn(
          "w-5 h-5 border-2 flex items-center justify-center transition-all duration-200",
          checked 
            ? "bg-primary border-primary" 
            : "border-muted-foreground bg-transparent",
          isAnimating && "scale-110"
        )}
      >
        <Check 
          className={cn(
            "h-3 w-3 text-primary-foreground transition-all duration-200",
            checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )} 
        />
      </div>
      {label && (
        <span className={cn(
          "text-sm transition-colors",
          checked ? "text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </span>
      )}
    </button>
  );
}

interface ProgressCelebrationProps {
  progress: number; // 0-100
  milestones?: number[];
}

export function ProgressCelebration({ 
  progress, 
  milestones = [25, 50, 75, 100] 
}: ProgressCelebrationProps) {
  const [lastMilestone, setLastMilestone] = useState(0);

  // Check if we crossed a milestone
  const currentMilestone = [...milestones].reverse().find(m => progress >= m) || 0;
  
  if (currentMilestone > lastMilestone) {
    haptic('success');
    setLastMilestone(currentMilestone);
  }

  return (
    <div className="relative">
      <div className="progress-bar">
        <div
          className="progress-bar-fill transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Milestone markers */}
      <div className="absolute inset-0 flex items-center pointer-events-none">
        {milestones.slice(0, -1).map(milestone => (
          <div
            key={milestone}
            className={cn(
              "absolute w-0.5 h-3 -top-0.5 transition-colors",
              progress >= milestone ? "bg-foreground/50" : "bg-muted-foreground/30"
            )}
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onSwipeRight, 
  onSwipeLeft,
  className 
}: SwipeableCardProps) {
  const [startX, setStartX] = useState(0);
  const [deltaX, setDeltaX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    setDeltaX(currentX - startX);
  };

  const handleTouchEnd = () => {
    const threshold = 100;
    
    if (deltaX > threshold && onSwipeRight) {
      haptic('medium');
      onSwipeRight();
    } else if (deltaX < -threshold && onSwipeLeft) {
      haptic('medium');
      onSwipeLeft();
    }
    
    setDeltaX(0);
    setIsSwiping(false);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("transition-transform", className)}
      style={{ 
        transform: isSwiping ? `translateX(${deltaX * 0.3}px)` : undefined 
      }}
    >
      {children}
    </div>
  );
}
