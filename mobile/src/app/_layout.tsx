import { Stack } from 'expo-router';
import { ThemeProvider } from '@/providers/theme-provider';

export default function RootLayout() {
  return (
    <ThemeProvider defaultMode="light">
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
