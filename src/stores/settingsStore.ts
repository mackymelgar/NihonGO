import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Session UI settings. These mirror the corresponding profile columns; the
 * profile is the source of truth on load, and changes here are written back to
 * the profile by the settings page. Persisted locally so guests keep prefs and
 * so the UI has values before the profile query resolves.
 */
interface SettingsState {
  romajiEnabled: boolean;
  furiganaEnabled: boolean;
  ttsRate: number;
  theme: 'light' | 'dark';
  setRomaji: (v: boolean) => void;
  setFurigana: (v: boolean) => void;
  setTtsRate: (v: number) => void;
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  /** Hydrate from a freshly loaded profile without triggering writes. */
  hydrateFromProfile: (p: {
    romaji_enabled: boolean;
    furigana_enabled: boolean;
    tts_rate: number;
  }) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      romajiEnabled: true,
      furiganaEnabled: true,
      ttsRate: 0.9,
      theme:
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
      setRomaji: (v) => set({ romajiEnabled: v }),
      setFurigana: (v) => set({ furiganaEnabled: v }),
      setTtsRate: (v) => set({ ttsRate: v }),
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      hydrateFromProfile: (p) =>
        set({
          romajiEnabled: p.romaji_enabled,
          furiganaEnabled: p.furigana_enabled,
          ttsRate: p.tts_rate,
        }),
    }),
    { name: 'nihongo-settings' },
  ),
);

/** Applies the current theme to <html> and keeps it in sync. */
export function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}
