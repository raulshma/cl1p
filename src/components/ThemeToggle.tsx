'use client';

import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const getNextTheme = (): 'light' | 'dark' | 'system' => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'system';
    return 'light';
  };

  const getIcon = () => {
    if (theme === 'system') {
      return actualTheme === 'dark' ? '🌙' : '☀️';
    }
    return theme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (theme === 'system') {
      return `System (${actualTheme})`;
    }
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  return (
    <Button
      onClick={() => setTheme(getNextTheme())}
      variant="outline"
      size="sm"
      className="gap-2"
      data-testid="theme-toggle-button"
      aria-label="Toggle theme"
    >
      <span className="text-lg" role="img" aria-label={actualTheme}>
        {getIcon()}
      </span>
      <span>{getLabel()}</span>
    </Button>
  );
}
