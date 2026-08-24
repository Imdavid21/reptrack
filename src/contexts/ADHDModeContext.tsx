import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'reptrack-adhd-mode';

type ADHDModeContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
};

const ADHDModeContext = createContext<ADHDModeContextValue | null>(null);

export function ADHDModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(KEY) === '1';
  });

  const setEnabled = (next: boolean) => {
    setEnabledState(next);
    if (typeof window !== 'undefined') localStorage.setItem(KEY, next ? '1' : '0');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('adhd-mode', enabled);
    return () => document.documentElement.classList.remove('adhd-mode');
  }, [enabled]);

  const value = useMemo(() => ({ enabled, setEnabled, toggle: () => setEnabled(!enabled) }), [enabled]);
  return <ADHDModeContext.Provider value={value}>{children}</ADHDModeContext.Provider>;
}

export function useADHDMode() {
  const value = useContext(ADHDModeContext);
  if (!value) throw new Error('useADHDMode must be used inside ADHDModeProvider');
  return value;
}
