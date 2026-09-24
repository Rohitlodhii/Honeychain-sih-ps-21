import { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue, type OptionType } from '@/components/ui/combobox';
import { SUPPORTED_LANGUAGES, isSupportedLanguage, saveLanguage, type SupportedLanguageCode } from '../i18n';

interface LanguageSelectionScreenProps { onGetStarted: () => void; }

export default function LanguageSelectionScreen({ onGetStarted }: LanguageSelectionScreenProps) {
  const { t, i18n } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [slide, setSlide] = useState(0);
  const imageSize = Math.min(width - 4, height * 0.34, 320);
  const initial: SupportedLanguageCode = isSupportedLanguage(i18n.language) ? i18n.language : 'en';
  const [selected, setSelected] = useState<SupportedLanguageCode>(initial);
  const selectedLanguage = SUPPORTED_LANGUAGES.find((language) => language.code === selected) ?? SUPPORTED_LANGUAGES[0];
  const selectedOption: OptionType = { value: selectedLanguage.code, label: selectedLanguage.label };
  const slides = [
    { title: 'Every hive, connected.', description: 'Keep your hives, harvests, and daily work in one simple place.', image: require('../../assets/img1.png'), imageLabel: 'Connected honey hives' },
    { title: 'Know your hives better.', description: 'Record hive health and activity so you can make confident decisions.', image: require('../../assets/img2.png'), imageLabel: 'Happy bee' },
    { title: 'Trust in every jar.', description: 'Trace each batch from the apiary to the people who enjoy your honey.', image: require('../../assets/img3.png'), imageLabel: 'Beekeeper holding honey' },
  ];
  const activeSlide = slides[slide];
  const handleLanguageChange = async (option: OptionType | null) => {
    if (!option || !isSupportedLanguage(option.value)) return;
    setSelected(option.value);
    await saveLanguage(option.value);
  };
  const advance = () => (slide === slides.length - 1 ? onGetStarted() : setSlide(slide + 1));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="HoneyChain logo" />
        <Combobox value={selectedOption} onValueChange={handleLanguageChange}>
          <ComboboxTrigger style={styles.languageTrigger}>
            <ComboboxValue placeholder="English" style={styles.languageValue} />
          </ComboboxTrigger>
          <ComboboxContent maxHeight={270}>
            <ComboboxInput placeholder={t('onboarding.language.placeholder')} />
            <ComboboxList>{SUPPORTED_LANGUAGES.map((language) => <ComboboxItem key={language.code} value={language.code}>{language.label}</ComboboxItem>)}</ComboboxList>
            <ComboboxEmpty>No languages found</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
      </View>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.imageWrap, { width: imageSize, height: imageSize }]}>
            <Image source={activeSlide.image} style={styles.cover} resizeMode="contain" accessibilityLabel={activeSlide.imageLabel} />
          </View>
          <View style={styles.copy}>
            <Text variant="heading" style={styles.title}>{activeSlide.title}</Text>
            <Text style={styles.description}>{activeSlide.description}</Text>
          </View>
        </View>
        <View style={styles.form}>
          <View style={styles.dots}>
            {slides.map((_, index) => <TouchableOpacity key={index} onPress={() => setSlide(index)} accessibilityLabel={`Go to onboarding step ${index + 1}`}><View style={[styles.dot, index === slide && styles.activeDot]} /></TouchableOpacity>)}
          </View>
          <Button label={slide === slides.length - 1 ? t('onboarding.language.getStarted') : 'Next'} size="lg" style={styles.button} onPress={advance}>{slide === slides.length - 1 ? t('onboarding.language.getStarted') : 'Next'}</Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  topBar: { height: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 42, height: 42 },
  hero: { flex: 1, justifyContent: 'center' },
  imageWrap: { alignSelf: 'center' },
  cover: { width: '100%', height: '100%' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20, justifyContent: 'space-between' },
  copy: { marginTop: 18, alignItems: 'center' },
  title: { color: '#FFFFFF', fontFamily: 'Geist_700Bold', fontSize: 30, lineHeight: 36, textAlign: 'center' },
  description: { color: '#A1A1AA', fontFamily: 'Geist_400Regular', fontSize: 16, lineHeight: 23, marginTop: 10, maxWidth: 340, textAlign: 'center', alignSelf: 'center' },
  form: { gap: 16 },
  languageTrigger: { height: 38, width: 112, paddingHorizontal: 8, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent' },
  languageValue: { fontFamily: 'Geist_500Medium', color: '#FFFFFF' },
  button: { width: '100%', borderRadius: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#52525B' },
  activeDot: { width: 24, backgroundColor: '#F97316' },
});
