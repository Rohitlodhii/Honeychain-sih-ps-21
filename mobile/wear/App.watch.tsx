import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { authAPI, getToken, hiveAPI, setToken } from '../src/api/client';

// ---------------------------------------------------------------------------
// HoneyChain Wear MVP — ISOLATED file.
// This file is NOT imported by App.tsx / phone app. It only READS the shared
// API client (../src/api/client). Safe to delete/ignore for phone builds.
// Preview: temporarily render <WatchApp /> from a scratch entry, or copy this
// file into an Expo Snack. Do not change App.tsx permanently for this.
// ---------------------------------------------------------------------------

type Hive = { id: string; name: string; location: string; species: string };
type HealthStatus = 'HEALTHY' | 'WATCH' | 'HIGH_RISK';
type Health = {
  health: { status: HealthStatus; confidence: number; reasons: string[] };
  latest_reading?: {
    temperature_c: number;
    humidity_pct: number;
    weight_kg: number;
    sound_hz?: number;
  };
};

const STATUS_COLOR: Record<HealthStatus, string> = {
  HEALTHY: '#22C55E',
  WATCH: '#F59E0B',
  HIGH_RISK: '#EF4444',
};

// Preset reading for one-tap field logging (matches brood-zone defaults).
const QUICK_READING = {
  temperature_c: 34.5,
  humidity_pct: 58,
  weight_kg: 26,
  sound_hz: 220,
};

export default function WatchApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [hives, setHives] = useState<Hive[]>([]);
  const [index, setIndex] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // The two "switches" for the demo.
  const [apiaryMode, setApiaryMode] = useState(true);
  const [mutedUntil, setMutedUntil] = useState<Record<string, number>>({});
  const [logging, setLogging] = useState(false);

  const hive = hives[index] ?? null;
  const muted = hive ? (mutedUntil[hive.id] ?? 0) > Date.now() : false;

  useEffect(() => {
    getToken().then((t) => setAuthed(!!t));
  }, []);

  const loadHives = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await hiveAPI.list();
      const list = res.data as Hive[];
      setHives(list);
      if (index >= list.length) setIndex(0);
    } catch {
      setError('No connection. Phone hotspot / WiFi?');
    } finally {
      setLoading(false);
    }
  }, [index]);

  const loadHealth = useCallback(async (hiveId: string) => {
    setError('');
    try {
      const res = await hiveAPI.getHealth(hiveId);
      setHealth(res.data as Health);
      const status = (res.data as Health)?.health?.status;
      if (status === 'HIGH_RISK') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } catch {
      setHealth(null);
      setError('Health unavailable');
    }
  }, []);

  useEffect(() => {
    if (authed) loadHives();
  }, [authed, loadHives]);

  useEffect(() => {
    if (authed && hive) loadHealth(hive.id);
  }, [authed, hive, loadHealth]);

  // Apiary Mode ON = auto-refresh every 30s while on wrist.
  useEffect(() => {
    if (!authed || !apiaryMode || !hive) return;
    const id = setInterval(() => loadHealth(hive.id), 30000);
    return () => clearInterval(id);
  }, [authed, apiaryMode, hive, loadHealth]);

  const handleLogin = async () => {
    if (!phone || !password) {
      setLoginError('Enter phone + password');
      return;
    }
    setLoginBusy(true);
    setLoginError('');
    try {
      const res = await authAPI.login(phone.trim(), password);
      await setToken(res.data?.access_token ?? null);
      setAuthed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setLoginError('Login failed. Check phone app creds.');
    } finally {
      setLoginBusy(false);
    }
  };

  const toggleMute = () => {
    if (!hive) return;
    Haptics.selectionAsync().catch(() => {});
    setMutedUntil((prev) =>
      (prev[hive.id] ?? 0) > Date.now()
        ? { ...prev, [hive.id]: 0 }
        : { ...prev, [hive.id]: Date.now() + 2 * 60 * 60 * 1000 },
    );
  };

  const quickLog = async () => {
    if (!hive) return;
    setLogging(true);
    setNotice('');
    try {
      const base = health?.latest_reading;
      await hiveAPI.createReading(hive.id, {
        temperature_c: base?.temperature_c ?? QUICK_READING.temperature_c,
        humidity_pct: base?.humidity_pct ?? QUICK_READING.humidity_pct,
        weight_kg: (base?.weight_kg ?? QUICK_READING.weight_kg) + 0.1,
        sound_hz: base?.sound_hz ?? QUICK_READING.sound_hz,
      });
      setNotice('Logged ✓');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      loadHealth(hive.id);
    } catch {
      setNotice('Log failed — offline?');
    } finally {
      setLogging(false);
    }
  };

  const step = (dir: 1 | -1) => {
    if (!hives.length) return;
    Haptics.selectionAsync().catch(() => {});
    setHealth(null);
    setNotice('');
    setIndex((i) => (i + dir + hives.length) % hives.length);
  };

  if (authed === null) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator color="#E3A530" />
      </SafeAreaView>
    );
  }

  if (!authed) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.round}>
          <Text style={styles.brand}>HONEYCHAIN</Text>
          <Text style={styles.title}>Watch login</Text>
          <Text style={styles.hint}>Use same phone-app account</Text>
          <TextInput
            style={styles.input}
            placeholder="+91..."
            placeholderTextColor="#71717A"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="password"
            placeholderTextColor="#71717A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {!!loginError && <Text style={styles.err}>{loginError}</Text>}
          <TouchableOpacity style={styles.bigBtn} onPress={handleLogin} disabled={loginBusy}>
            <Text style={styles.bigBtnText}>{loginBusy ? '...' : 'LOGIN'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const status = health?.health?.status;
  const color = status ? STATUS_COLOR[status] : '#52525B';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.round} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>HONEYCHAIN · WATCH</Text>

        {/* Switch 1: Apiary Mode */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Apiary Mode</Text>
          <Switch
            value={apiaryMode}
            onValueChange={(v) => {
              setApiaryMode(v);
              Haptics.selectionAsync().catch(() => {});
            }}
            trackColor={{ false: '#3F3F46', true: '#E3A530' }}
            thumbColor="#000"
          />
        </View>

        {/* Hive switcher — crown / glove friendly */}
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => step(-1)}>
            <Text style={styles.stepTxt}>‹</Text>
          </TouchableOpacity>
          <View style={styles.hiveName}>
            <Text style={styles.hiveTxt} numberOfLines={1}>
              {loading ? '...' : hive?.name ?? 'No hives'}
            </Text>
            <Text style={styles.hint}>
              {hives.length ? `${index + 1}/${hives.length}` : 'add hive on phone'}
            </Text>
          </View>
          <TouchableOpacity style={styles.stepBtn} onPress={() => step(1)}>
            <Text style={styles.stepTxt}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Big SOS status circle = the "switch" visual */}
        <View style={[styles.statusRing, { borderColor: color }]}>
          {health ? (
            <>
              <Text style={[styles.statusTxt, { color }]}>{status}</Text>
              <Text style={styles.metrics}>
                {health.latest_reading
                  ? `${health.latest_reading.temperature_c}°C · ${health.latest_reading.humidity_pct}%`
                  : 'no reading'}
              </Text>
              {muted && <Text style={styles.mutedTag}>MUTED 2H</Text>}
            </>
          ) : (
            <Text style={styles.metrics}>{loading ? 'loading...' : 'tap refresh'}</Text>
          )}
        </View>

        {!!error && <Text style={styles.err}>{error}</Text>}
        {!!notice && <Text style={styles.ok}>{notice}</Text>}

        {/* Switch 2: SOS mute */}
        <TouchableOpacity
          style={[styles.bigBtn, muted && styles.bigBtnOff]}
          onPress={toggleMute}
          disabled={!hive}
        >
          <Text style={styles.bigBtnText}>{muted ? 'UNMUTE SOS' : 'MUTE SOS · 2H'}</Text>
        </TouchableOpacity>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.halfBtn} onPress={() => hive && loadHealth(hive.id)}>
            <Text style={styles.bigBtnText}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.halfBtn} onPress={quickLog} disabled={logging || !hive}>
            <Text style={styles.bigBtnText}>{logging ? '...' : '+ LOG'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={loadHives}>
          <Text style={styles.hint}>refresh hives · {hive?.location ?? ''}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  // Narrow centered column = readable on small round watches.
  round: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 26,
    gap: 10,
    maxWidth: 260,
    width: '100%',
    alignSelf: 'center',
  },
  brand: { color: '#E3A530', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  hint: { color: '#71717A', fontSize: 11, textAlign: 'center' },
  err: { color: '#EF4444', fontSize: 12, textAlign: 'center' },
  ok: { color: '#22C55E', fontSize: 12, textAlign: 'center' },
  input: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#18181B',
    color: '#fff',
    paddingHorizontal: 14,
    fontSize: 15,
  },
  switchRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  stepper: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { color: '#fff', fontSize: 28, lineHeight: 30 },
  hiveName: { flex: 1, alignItems: 'center' },
  hiveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusRing: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0A0A0A',
  },
  statusTxt: { fontSize: 19, fontWeight: '800', letterSpacing: 1 },
  metrics: { color: '#D4D4D8', fontSize: 12 },
  mutedTag: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  bigBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#E3A530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigBtnOff: { backgroundColor: '#3F3F46' },
  bigBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  btnRow: { width: '100%', flexDirection: 'row', gap: 10 },
  halfBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
