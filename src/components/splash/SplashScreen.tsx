import { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

declare global {
  interface Window {
    hideSplash?: () => void;
  }
}

export function SplashScreen({ onComplete, minDuration = 800 }: SplashScreenProps) {
  useEffect(() => {
    // Hide the HTML splash and complete
    const timer = setTimeout(() => {
      window.hideSplash?.();
      onComplete();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  // Return null - the HTML splash handles the visual
  return null;
}
