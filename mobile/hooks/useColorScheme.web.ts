import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useModeContext } from '@/providers/mode-provider';

export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => { setHasHydrated(true); }, []);
  const system = useRNColorScheme() === 'dark' ? 'dark' : 'light';
  const scheme = useModeContext()?.scheme ?? system;
  return hasHydrated ? scheme : 'light';
}
