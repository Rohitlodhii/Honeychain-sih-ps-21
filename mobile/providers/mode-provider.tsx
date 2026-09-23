import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme as useRNColorScheme } from 'react-native';

export type Mode = 'light' | 'dark' | 'system';
export type ModeStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
};

type ModeContextValue = { mode: Mode; setMode: (mode: Mode) => void; scheme: 'light' | 'dark' };
const ModeContext = createContext<ModeContextValue | null>(null);
const isMode = (value: unknown): value is Mode => value === 'light' || value === 'dark' || value === 'system';

function syncNativeAppearance(mode: Mode) {
  if (typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }
}

type Props = { children: React.ReactNode; storage?: ModeStorage; storageKey?: string; defaultMode?: Mode };

export const ModeProvider = ({ children, storage, storageKey = 'bna-ui.mode', defaultMode = 'system' }: Props) => {
  const [mode, setModeState] = useState<Mode>(defaultMode);
  const systemScheme = useRNColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    Promise.resolve().then(() => storage.getItem(storageKey)).then((saved) => {
      if (!cancelled && isMode(saved)) {
        setModeState(saved);
        syncNativeAppearance(saved);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [storage, storageKey]);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    syncNativeAppearance(next);
    if (storage) Promise.resolve().then(() => storage.setItem(storageKey, next)).catch(() => {});
  }, [storage, storageKey]);

  const value = useMemo(() => ({ mode, setMode, scheme: mode === 'system' ? systemScheme : mode }), [mode, setMode, systemScheme]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

export function useModeContext() { return useContext(ModeContext); }
