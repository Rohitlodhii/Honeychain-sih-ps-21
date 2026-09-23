import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  type OptionType,
} from '@/components/ui/combobox';
import {
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  saveLanguage,
  type SupportedLanguageCode,
} from '../i18n';

interface LanguageSelectionScreenProps {
  onGetStarted: () => void;
}

export default function LanguageSelectionScreen({ onGetStarted }: LanguageSelectionScreenProps) {
  const { t, i18n } = useTranslation();
  const initial: SupportedLanguageCode = isSupportedLanguage(i18n.language)
    ? i18n.language
    : 'en';
  const [selected, setSelected] = useState<SupportedLanguageCode>(initial);

  const selectedLanguage = SUPPORTED_LANGUAGES.find((language) => language.code === selected)
    ?? SUPPORTED_LANGUAGES[0];
  const selectedOption: OptionType = {
    value: selectedLanguage.code,
    label: selectedLanguage.label,
  };

  const handleLanguageChange = async (option: OptionType | null) => {
    if (!option || !isSupportedLanguage(option.value)) return;
    setSelected(option.value);
    await saveLanguage(option.value);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.imageWrap}>
        <Image
          source={require('../../assets/newcover.png')}
          style={styles.cover}
          resizeMode="cover"
          accessibilityLabel="Beekeeper tending a honeycomb in a flowering apiary"
        />
      </View>

      <View style={styles.content}>
        <Text variant="heading" style={styles.brand}>Beelink</Text>

        <View style={styles.form}>
          <Combobox value={selectedOption} onValueChange={handleLanguageChange}>
            <ComboboxTrigger style={styles.comboboxTrigger}>
              <ComboboxValue placeholder={t('onboarding.language.placeholder')} style={styles.comboboxValue} />
            </ComboboxTrigger>
            <ComboboxContent maxHeight={270}>
              <ComboboxInput placeholder={t('onboarding.language.placeholder')} />
              <ComboboxList>
                {SUPPORTED_LANGUAGES.map((language) => (
                  <ComboboxItem key={language.code} value={language.code}>
                    {language.label}
                  </ComboboxItem>
                ))}
              </ComboboxList>
              <ComboboxEmpty>No languages found</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>

          <Button
            label={t('onboarding.language.getStarted')}
            size="lg"
            style={styles.button}
            onPress={onGetStarted}
          >
            {t('onboarding.language.getStarted')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageWrap: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  brand: {
    fontFamily: 'Geist_700Bold',
    fontSize: 30,
  },
  form: {
    marginTop: 26,
    gap: 16,
  },
  comboboxTrigger: {
    height: 56,
    borderRadius: 14,
    borderColor: '#D8D8D8',
  },
  comboboxValue: {
    fontFamily: 'Geist_500Medium',
  },
  button: {
    width: '100%',
    borderRadius: 14,
  },
});
