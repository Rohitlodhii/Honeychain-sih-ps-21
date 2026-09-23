import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import hi from './hi';
import mr from './mr';

export type SupportedLanguageCode = 'en' | 'hi' | 'mr';

export interface SupportedLanguage {
  code: SupportedLanguageCode;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
];

export const LANGUAGE_CODES: SupportedLanguageCode[] = ['en', 'hi', 'mr'];

export const LANGUAGE_STORAGE_KEY = '@honeychain:language';

export function isSupportedLanguage(code: string | null | undefined): code is SupportedLanguageCode {
  return code === 'en' || code === 'hi' || code === 'mr';
}

export function getDeviceLanguage(): SupportedLanguageCode {
  try {
    const locales = Localization.getLocales();
    const deviceCode = locales?.[0]?.languageCode ?? null;
    if (isSupportedLanguage(deviceCode)) {
      return deviceCode;
    }
  } catch {
    // Fall through to default.
  }
  return 'en';
}

export async function loadStoredLanguage(): Promise<SupportedLanguageCode | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to device language.
  }
  return null;
}

export async function saveLanguage(code: SupportedLanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Non-fatal: language still applies for the current session.
  }
  if (i18n.isInitialized && i18n.language !== code) {
    await i18n.changeLanguage(code);
  }
}

let initPromise: Promise<typeof i18n> | null = null;

export function initI18n(): Promise<typeof i18n> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const stored = await loadStoredLanguage();
    const lng = stored ?? getDeviceLanguage();

    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        resources: {
          en: { translation: en },
          hi: { translation: hi },
          mr: { translation: mr },
        },
        lng,
        fallbackLng: 'en',
        supportedLngs: LANGUAGE_CODES,
        nonExplicitSupportedLngs: true,
        interpolation: { escapeValue: false },
        returnEmptyString: false,
      });
    } else if (i18n.language !== lng) {
      await i18n.changeLanguage(lng);
    }

    return i18n;
  })();

  return initPromise;
}

export default i18n;
