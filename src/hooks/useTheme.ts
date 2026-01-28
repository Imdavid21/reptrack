import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'fittrack-theme';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) {
        return stored === 'dark';
      }
      // Default to LIGHT unless the user explicitly chose dark.
      // (System preference often makes the app feel "randomly green" on first load.)
      return false;
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      html.classList.remove('light');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);

  return { isDark, toggleTheme, setIsDark };
}
