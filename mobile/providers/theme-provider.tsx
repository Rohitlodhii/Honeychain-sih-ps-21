import { DarkTheme, DefaultTheme, ThemeProvider as RNThemeProvider } from 'expo-router/react-navigation';
import { useMemo } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/theme/colors';
import { Mode, ModeProvider, ModeStorage } from '@/providers/mode-provider';

type Props = { children: React.ReactNode; storage?: ModeStorage; storageKey?: string; defaultMode?: Mode };

export const ThemeProvider = ({ children, storage, storageKey, defaultMode }: Props) => (
  <ModeProvider storage={storage} storageKey={storageKey} defaultMode={defaultMode}>
    <NavigationTheme>{children}</NavigationTheme>
  </ModeProvider>
);

const NavigationTheme = ({ children }: { children: React.ReactNode }) => {
  const scheme = useColorScheme();
  const theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const colors = Colors[scheme];
    return { ...base, colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.card, text: colors.text, border: colors.border, notification: colors.red } };
  }, [scheme]);
  return <RNThemeProvider value={theme}>{children}</RNThemeProvider>;
};
