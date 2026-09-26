import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`civi-theme-toggle ${compact ? 'civi-theme-toggle--compact' : ''}`} role="group" aria-label="Theme mode">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={theme === 'light' ? 'is-active' : ''}
        aria-pressed={theme === 'light'}
        title="Light mode"
      >
        <Sun className="h-3.5 w-3.5" />
        {!compact && <span>Light</span>}
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={theme === 'dark' ? 'is-active' : ''}
        aria-pressed={theme === 'dark'}
        title="Dark mode"
      >
        <Moon className="h-3.5 w-3.5" />
        {!compact && <span>Dark</span>}
      </button>
    </div>
  );
};
