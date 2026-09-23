import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Geist_400Regular, Geist_500Medium, Geist_700Bold } from '@expo-google-fonts/geist';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n, { initI18n } from './src/i18n';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import OnboardingWelcomeScreen from './src/screens/OnboardingWelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

SplashScreen.setOptions({ duration: 400, fade: true });

type OnboardingStep = 'language' | 'auth' | 'home';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_700Bold,
  });
  const [i18nReady, setI18nReady] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('language');

  useEffect(() => {
    (async () => {
      try {
        await initI18n();
      } finally {
        setI18nReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (i18nReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [i18nReady, fontsLoaded, fontError]);

  if (!i18nReady || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <StatusBar style="dark" />
        {step === 'language' ? (
          <LanguageSelectionScreen onGetStarted={() => setStep('auth')} />
        ) : step === 'auth' ? (
          <OnboardingWelcomeScreen onBack={() => setStep('language')} onAuthenticated={() => setStep('home')} />
        ) : (
          <HomeScreen />
        )}
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
