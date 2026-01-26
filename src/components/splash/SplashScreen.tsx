import { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 800 }: SplashScreenProps) {
  useEffect(() => {
    // Hide the HTML splash and complete
    const timer = setTimeout(() => {
      // Hide HTML splash if it exists
      const splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 300);
      }
      onComplete();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  // Return null - the HTML splash handles the visual
  return null;
}
