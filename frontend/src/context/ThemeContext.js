import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Create context
const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'theme';
const THEME_MODE_STORAGE_KEY = 'mcm.themeMode';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

const normalizeThemeMode = (value) => {
  const normalized = (value || '').toString().trim().toUpperCase();
  if (normalized === 'LIGHT' || normalized === 'DARK' || normalized === 'SYSTEM') {
    return normalized;
  }
  return null;
};

export const ThemeProvider = ({ children }) => {
  const getSystemTheme = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light';
    }

    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
  }, []);

  const resolveThemeFromMode = useCallback((mode) => {
    if (mode === 'DARK') {
      return 'dark';
    }

    if (mode === 'LIGHT') {
      return 'light';
    }

    return getSystemTheme();
  }, [getSystemTheme]);

  const getInitialThemeMode = useCallback(() => {
    if (typeof window === 'undefined') {
      return 'SYSTEM';
    }

    const savedMode = normalizeThemeMode(localStorage.getItem(THEME_MODE_STORAGE_KEY));
    if (savedMode) {
      return savedMode;
    }

    // Backward compatibility for legacy light/dark storage.
    const legacyTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (legacyTheme === 'dark') {
      return 'DARK';
    }
    if (legacyTheme === 'light') {
      return 'LIGHT';
    }

    return 'SYSTEM';
  }, []);

  const applyTheme = useCallback((newTheme) => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = window.document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Keep legacy key for existing code paths.
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [theme, setTheme] = useState(() => resolveThemeFromMode(getInitialThemeMode()));

  useEffect(() => {
    const resolvedTheme = resolveThemeFromMode(themeMode);
    setTheme(resolvedTheme);

    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    }
  }, [themeMode, resolveThemeFromMode]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia || themeMode !== 'SYSTEM') {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    const handleChange = () => {
      setTheme(getSystemTheme());
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [themeMode, getSystemTheme]);

  const setThemePreference = useCallback((preferredMode) => {
    const normalized = normalizeThemeMode(preferredMode) || 'SYSTEM';
    setThemeMode(normalized);
  }, []);

  // Function to toggle between light/dark
  const toggleTheme = useCallback(() => {
    setThemeMode((prevMode) => {
      const resolved = resolveThemeFromMode(prevMode);
      return resolved === 'dark' ? 'LIGHT' : 'DARK';
    });
  }, [resolveThemeFromMode]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
