import { useColorScheme as useRNColorScheme } from 'react-native';
import { useModeContext } from '@/providers/mode-provider';

export function useColorScheme(): 'light' | 'dark' {
  const system = useRNColorScheme() === 'dark' ? 'dark' : 'light';
  return useModeContext()?.scheme ?? system;
}
