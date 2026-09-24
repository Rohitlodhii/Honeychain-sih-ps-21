import { useState } from 'react';
import {
  ScrollView,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Input } from '@/components/ui/input';
import { InputOTP } from '@/components/ui/input-otp';
import { authAPI, setToken } from '../api/client';

function formatIndianPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return `+91${digits.replace(/^0/, '').slice(-10)}`;
}

interface OnboardingWelcomeScreenProps {
  onBack: () => void;
  onAuthenticated: () => void;
}

type Screen = 'login' | 'register';
type RegisterStep = 1 | 2 | 3 | 4;

export default function OnboardingWelcomeScreen({ onBack, onAuthenticated }: OnboardingWelcomeScreenProps) {
  const [screen, setScreen] = useState<Screen>('login');

  if (screen === 'register') {
    return <RegisterFlow onBack={() => setScreen('login')} onAuthenticated={onAuthenticated} />;
  }

  return <LoginScreen onBack={onBack} onCreateAccount={() => setScreen('register')} onAuthenticated={onAuthenticated} />;
}

function LoginScreen({ onBack, onCreateAccount, onAuthenticated }: OnboardingWelcomeScreenProps & { onCreateAccount: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!phone.trim() || !password) {
      setError('Enter your phone number and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(formatIndianPhone(phone), password);
      await setToken(response.data.access_token);
      onAuthenticated();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to sign in. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell onBack={onBack} step={1}>
      <View style={styles.loginLayout}>
        <View>
          <Text style={styles.eyebrow}>FOR BEEKEEPERS</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage your hives and honey batches.</Text>

          <View style={styles.loginInputs}>
            <FormInput label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
            <FormInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <View style={styles.loginActions}>
          <Button animation={false} size="lg" style={styles.fullButton} onPress={signIn} loading={loading}>
            Sign in
          </Button>
          <Button variant="link" onPress={onCreateAccount}>
            Create a new account
          </Button>
        </View>
      </View>
    </ScreenShell>
  );
}

function RegisterFlow({ onBack, onAuthenticated }: { onBack: () => void; onAuthenticated: () => void }) {
  const [step, setStep] = useState<RegisterStep>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const goToOtp = () => {
    if (!phone.trim()) {
      setError('Enter a phone number to continue.');
      return;
    }
    setError('');
    setDemoOtp(String(Math.floor(100000 + Math.random() * 900000)));
    setStep(2);
  };

  const verifyOtp = () => {
    if (otp !== demoOtp) {
      setError('Enter the demo code shown above.');
      return;
    }
    setError('');
    setStep(3);
  };

  const saveProfile = () => {
    if (!name.trim() || !email.trim()) {
      setError('Enter your name and email address.');
      return;
    }
    setError('');
    setStep(4);
  };

  const createAccount = async () => {
    if (password.length < 6) {
      setError('Use at least 6 characters for your password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formattedPhone = formatIndianPhone(phone);
      await authAPI.register({
        name: name.trim(),
        phone: formattedPhone,
        email: email.trim(),
        password,
        role: 'beekeeper',
      });
      const loginResponse = await authAPI.login(formattedPhone, password);
      await setToken(loginResponse.data.access_token);
      onAuthenticated();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to create your account.'));
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 1) onBack();
    else {
      setError('');
      setStep((current) => (current - 1) as RegisterStep);
    }
  };

  const stepContent = {
    1: {
      title: 'Your phone number',
      subtitle: 'We will use it to keep your beekeeper account secure.',
      field: <FormInput label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />,
      action: goToOtp,
      button: 'Send code',
    },
    2: {
      title: 'Verify your number',
      subtitle: `Demo code: ${demoOtp}`,
      field: (
        <View>
          <Text style={styles.inputLabel}>One-time code</Text>
          <InputOTP length={6} value={otp} onChangeText={setOtp} containerStyle={styles.otpInput} slotStyle={styles.otpSlot} />
        </View>
      ),
      action: verifyOtp,
      button: 'Verify code',
    },
    3: {
      title: 'About you',
      subtitle: 'These details identify your beekeeper account.',
      field: <View style={styles.inputGroup}><FormInput label="Full name" value={name} onChangeText={setName} autoComplete="name" /><FormInput label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /></View>,
      action: saveProfile,
      button: 'Continue',
    },
    4: {
      title: 'Create a password',
      subtitle: 'Use at least six characters to protect your account.',
      field: <FormInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />,
      action: createAccount,
      button: 'Create account',
    },
  }[step];

  return (
    <ScreenShell onBack={goBack} step={step}>
      <View style={styles.registerLayout}>
        <View>
          <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
          <Text style={styles.title}>{stepContent.title}</Text>
          <Text style={styles.subtitle}>{stepContent.subtitle}</Text>
          <View style={styles.registerInputs}>
            {stepContent.field}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>
        <View style={styles.registerActions}>
          <Button animation={false} size="lg" style={styles.fullButton} onPress={stepContent.action} loading={loading}>
            {stepContent.button}
          </Button>
        </View>
      </View>
    </ScreenShell>
  );
}

function ScreenShell({ children, onBack, step }: { children: React.ReactNode; onBack: () => void; step: number }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.keyboard}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back">
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="HoneyChain logo" />
          <Text style={styles.step}>Step {step} of 4</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
          <AvoidKeyboard />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function FormInput({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <Input variant="outline" placeholder={label} inputStyle={styles.inputText} {...props} />
    </View>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return fallback;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  keyboard: { flex: 1 },
  nav: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { minWidth: 76, flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  backText: { color: '#FFFFFF', fontFamily: 'Geist_500Medium', fontSize: 16 },
  step: { color: '#A1A1AA', fontFamily: 'Geist_500Medium', fontSize: 14 },
  logo: { width: 34, height: 34 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32 },
  eyebrow: { color: '#F97316', fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 1.3 },
  title: { color: '#FFFFFF', fontFamily: 'Geist_700Bold', fontSize: 32, marginTop: 10 },
  subtitle: { color: '#A1A1AA', fontFamily: 'Geist_400Regular', fontSize: 16, lineHeight: 23, marginTop: 10 },
  loginLayout: { flex: 1 },
  loginInputs: { marginTop: 24, gap: 16 },
  loginActions: { marginTop: 'auto', width: '100%', gap: 16, alignItems: 'stretch' },
  registerLayout: { flex: 1 },
  registerInputs: { marginTop: 24, gap: 16 },
  registerActions: { marginTop: 'auto', paddingTop: 24, width: '100%' },
  inputGroup: { gap: 16 },
  inputLabel: { color: '#E4E4E7', fontFamily: 'Geist_500Medium', fontSize: 14, marginBottom: 8 },
  inputText: { textAlign: 'left' },
  fullButton: { width: '100%', borderRadius: 14 },
  otpInput: { width: '100%' },
  otpSlot: { flex: 1, width: undefined, height: 54 },
  error: { color: '#FF6B6B', fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 20 },
});
