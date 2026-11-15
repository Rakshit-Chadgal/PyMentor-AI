'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '@/lib/storage';
import type { ThemePreference, UserPreferences } from '@/lib/types';

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const stored = loadPreferences();
      setPreferences(stored);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const applyTheme = (pref: ThemePreference) => {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const effective: 'light' | 'dark' =
        pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
      document.documentElement.classList.toggle('dark', effective === 'dark');
      queueMicrotask(() => setResolvedTheme(effective));
    };

    applyTheme(preferences.theme);

    if (preferences.theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [preferences.theme, hydrated]);

  const updatePreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  };

  const toggleTheme = () => {
    const nextTheme: ThemePreference = resolvedTheme === 'dark' ? 'light' : 'dark';
    updatePreferences({ theme: nextTheme });
  };

  return (
    <PreferencesContext.Provider
      value={{ preferences, updatePreferences, resolvedTheme, toggleTheme }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within AppProviders');
  }
  return ctx;
}
