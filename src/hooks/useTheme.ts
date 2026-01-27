import { useState, useEffect } from 'react';

const THEME_KEY = 'fittrack-theme';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY);
      return stored ? stored === 'dark' : true;
    }
    return true;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('light');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      html.classList.add('light');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return { isDark, toggleTheme };
}
