import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/theme/colors';

export function useColor(colorName: keyof typeof Colors.light & keyof typeof Colors.dark, props?: { light?: string; dark?: string }) {
  const theme = useColorScheme();
  return props?.[theme] ?? Colors[theme][colorName];
}
