import { useState, useEffect, useCallback } from 'react';

interface RestTimerProps {
  initialSeconds?: number;
  onSkip?: () => void;
  onComplete?: () => void;
}

export function RestTimer({ 
  initialSeconds = 150, // 2:30 default
  onSkip,
  onComplete 
}: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || seconds <= 0) {
      if (seconds <= 0 && onComplete) {
        onComplete();
      }
      return;
    }

    const interval = setInterval(() => {
      setSeconds(s => s - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, seconds, onComplete]);

  const formatTime = useCallback((s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleSkip = () => {
    setIsRunning(false);
    onSkip?.();
  };

  return (
    <div className="text-center py-8">
      <div className="label-v3 mb-4">REST</div>
      <div className="timer-v3">{formatTime(seconds)}</div>
      {onSkip && (
        <button 
          onClick={handleSkip}
          className="btn-v3 mt-6"
        >
          SKIP REST
        </button>
      )}
    </div>
  );
}
