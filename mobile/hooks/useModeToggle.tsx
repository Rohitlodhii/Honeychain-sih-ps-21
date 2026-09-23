import { Mode, useModeContext } from '@/providers/mode-provider';

export function useModeToggle() {
  const context = useModeContext();
  if (!context) throw new Error('useModeToggle requires a ThemeProvider.');
  const { mode, setMode, scheme } = context;
  const toggleMode = () => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  return { isDark: scheme === 'dark', mode, setMode: setMode as (mode: Mode) => void, currentMode: scheme, toggleMode };
}
