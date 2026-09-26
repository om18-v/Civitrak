import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('civitrak-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* storage may be unavailable */ }
    return 'light';
  });

  const setTheme = (next: ThemeMode) => setThemeState(next);
  const toggleTheme = () => setThemeState((current) => current === 'light' ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('civitrak-theme', theme); } catch { /* storage may be unavailable */ }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
