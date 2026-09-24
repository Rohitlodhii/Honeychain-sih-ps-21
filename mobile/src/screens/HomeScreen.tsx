import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, Bluetooth, ChevronLeft, CircleUserRound, Cpu, Droplets, Hexagon, House, Package, PackagePlus, Plus, Thermometer, User, Weight, Wind } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ShareButton } from '@/components/ui/share';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { authAPI, batchAPI, hiveAPI, setToken } from '../api/client';

type Destination = 'home' | 'hives' | 'batches' | 'iot' | 'profile';
type FormScreen = 'hive' | 'reading' | 'batch' | 'event' | null;
type Hive = { id: string; name: string; location: string; species: string };
type Reading = { temperature_c: number; humidity_pct: number; weight_kg: number; sound_hz?: number; recorded_at: string };
type Health = { health: { status: 'HEALTHY' | 'WATCH' | 'HIGH_RISK'; confidence: number; reasons: string[] }; productivity: { yield_estimate_kg: number; trend: string; confidence: number; next_harvest_days?: number | null; recommendation: string }; latest_reading: Reading };
type Batch = { id: string; hive_id: string; honey_type: string; quantity_kg: number; apiary_location: string; moisture_pct?: number; purity_score?: number; status: string; harvest_date: string };
type UserProfile = { name: string; phone: string; email?: string | null; role: string; cluster?: string | null };

const statusVariant = (status?: string) => status === 'HEALTHY' || status === 'PASS' ? 'success' : status === 'HIGH_RISK' || status === 'REJECT' ? 'destructive' : 'secondary';
const shortId = (id: string) => id.slice(0, 6).toUpperCase();
const date = (value?: string) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const message = (error: unknown, fallback: string) => typeof error === 'object' && error && 'response' in error && typeof (error as any).response?.data?.detail === 'string' ? (error as any).response.data.detail : fallback;

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tab, setTab] = useState<Destination>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hives, setHives] = useState<Hive[]>([]);
  const [health, setHealth] = useState<Record<string, Health | undefined>>({});
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHive, setSelectedHive] = useState<Hive | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [reportBatch, setReportBatch] = useState<Batch | null>(null);
  const [formScreen, setFormScreen] = useState<FormScreen>(null);
  const [iotPrefill, setIotPrefill] = useState<{ hive_id: string; moisture_pct: number } | null>(null);
  const [iotReadingPrefill, setIotReadingPrefill] = useState<{ temperature_c: number; humidity_pct: number; weight_kg: number; sound_hz: number } | null>(null);
  const iot = useFakeIot(hives);

  const load = useCallback(async () => {
    try {
      const [profileRes, hiveRes, batchRes] = await Promise.all([authAPI.me(), hiveAPI.list(), batchAPI.list()]);
      const nextHives = hiveRes.data as Hive[];
      setUser(profileRes.data); setHives(nextHives); setBatches(batchRes.data as Batch[]);
      const checks = await Promise.all(nextHives.map(async (hive) => {
        try { return [hive.id, (await hiveAPI.getHealth(hive.id)).data] as const; } catch { return [hive.id, undefined] as const; }
      }));
      setHealth(Object.fromEntries(checks));
    } catch (error) { toast.error('Unable to load your apiary', message(error, 'Try again.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const openReading = (hive?: Hive) => {
    const nextHive = hive ?? hives[0] ?? null;
    if (!nextHive) return Alert.alert('Add a hive first', 'Create a hive before recording a reading.');
    setIotReadingPrefill(null);
    setSelectedHive(nextHive); setFormScreen('reading');
  };
  const openReadingFromIot = (hiveId: string, live: { temperature_c: number; humidity_pct: number; weight_kg: number; sound_hz: number }) => {
    const nextHive = hives.find((h) => h.id === hiveId) ?? hives[0] ?? null;
    if (!nextHive) return Alert.alert('Add a hive first', 'Create a hive before recording a reading.');
    setSelectedHive(nextHive);
    setIotReadingPrefill(live);
    setFormScreen('reading');
  };
  const openBatch = () => {
    if (!hives.length) return Alert.alert('Add a hive first', 'Create a hive before creating a batch.');
    if (iot.phase === 'live') {
      const targetId = iot.targetHiveId || hives[0].id;
      setIotPrefill({ hive_id: targetId, moisture_pct: iot.live.moisture_pct });
    } else setIotPrefill(null);
    setFormScreen('batch');
  };
  const openBatchFromIot = (hiveId: string, moisture: number) => {
    setIotPrefill({ hive_id: hiveId, moisture_pct: moisture });
    setFormScreen('batch');
  };
  const counts = useMemo(() => hives.reduce((acc, hive) => { const value = health[hive.id]?.health.status; if (value) acc[value] += 1; return acc; }, { HEALTHY: 0, WATCH: 0, HIGH_RISK: 0 }), [hives, health]);
  if (formScreen) return <FormPage title={formScreen === 'hive' ? 'Add Hive' : formScreen === 'batch' ? 'Create Batch' : formScreen === 'reading' ? 'Add Reading' : 'Update Batch'} onBack={() => setFormScreen(null)}>{formScreen === 'hive' ? <HiveForm onDone={() => { setFormScreen(null); toast.success('Hive added'); load(); }} /> : formScreen === 'reading' ? <ReadingForm hive={selectedHive} hives={hives} initial={iotReadingPrefill} onDone={() => { setFormScreen(null); setIotReadingPrefill(null); toast.success('Reading saved'); load(); }} /> : formScreen === 'batch' ? <BatchForm hives={hives} initial={iotPrefill} iotMoisture={iot.phase === 'live' ? iot.live.moisture_pct : null} onDone={(batch: Batch) => { setFormScreen(null); setIotPrefill(null); toast.success('Harvest recorded', `Batch #${shortId(batch.id)}`); load(); setSelectedBatch(batch); }} /> : selectedBatch && <EventForm batch={selectedBatch} onDone={() => { setFormScreen(null); toast.success('Batch updated'); }} />}</FormPage>;
  if (reportBatch) return <ComplianceReport batch={reportBatch} onBack={() => setReportBatch(null)} />;
  const content = selectedHive ? <HiveDetail hive={selectedHive} health={health[selectedHive.id]} onBack={() => setSelectedHive(null)} onReading={() => openReading(selectedHive)} onRefresh={load} /> : selectedBatch ? <BatchDetail batch={selectedBatch} onBack={() => setSelectedBatch(null)} onEvent={() => setFormScreen('event')} onReport={() => setReportBatch(selectedBatch)} /> : tab === 'home' ? <Dashboard user={user} hives={hives} health={health} batches={batches} counts={counts} loading={loading} onHives={() => setTab('hives')} onBatches={() => setTab('batches')} onHive={setSelectedHive} onReading={openReading} onHiveAdd={() => setFormScreen('hive')} onBatch={openBatch} /> : tab === 'hives' ? <HiveList hives={hives} health={health} loading={loading} onAdd={() => setFormScreen('hive')} onHive={setSelectedHive} /> : tab === 'batches' ? <BatchList batches={batches} loading={loading} onAdd={openBatch} onBatch={setSelectedBatch} /> : tab === 'iot' ? <IoTScreen hives={hives} loading={loading} iot={iot} onRefresh={load} onUseForBatch={openBatchFromIot} onRecordReading={openReadingFromIot} /> : <Profile user={user} onLogout={async () => { await setToken(null); onLogout(); }} />;
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.page}>{content}</View>{!selectedHive && !selectedBatch && <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 12) }]}>{([{ key: 'home', label: 'Home', icon: House }, { key: 'hives', label: 'Hives', icon: Hexagon }, { key: 'batches', label: 'Batches', icon: Package }, { key: 'iot', label: 'IoT', icon: Cpu }, { key: 'profile', label: 'Profile', icon: User }] as const).map(({ key, label, icon: Icon }) => <TouchableOpacity key={key} style={styles.navItem} onPress={() => setTab(key)}><Icon size={22} color={tab === key ? '#F97316' : '#A1A1AA'} /><Text style={[styles.navLabel, tab === key && styles.active]}>{label}</Text>{key === 'iot' && <View style={[styles.iotDot, iot.phase === 'live' && styles.iotDotOn]} />}</TouchableOpacity>)}</View>}</SafeAreaView>;
}

function FormPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) { return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={formPageStyles.header}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={formPageStyles.backButton} onPress={onBack}><ChevronLeft size={28} color="#FFFFFF" /></TouchableOpacity><Text style={formPageStyles.title}>{title}</Text><View style={formPageStyles.spacer}/></View><ScrollView contentContainerStyle={formPageStyles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>; }

function Screen({ children, refresh, title, action }: { children: React.ReactNode; refresh?: () => void; title?: string; action?: React.ReactNode }) { const [refreshing, setRefreshing] = useState(false); return <ScrollView contentContainerStyle={styles.scroll} refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} tintColor="#F97316" /> : undefined}>{title && <View style={styles.header}><Text style={styles.screenTitle}>{title}</Text>{action}</View>}{children}</ScrollView>; }
function Dashboard({ user, hives, health, batches, counts, loading, onHives, onBatches, onHive, onReading, onHiveAdd, onBatch }: any) {
  const actions = [[Hexagon, 'Add Hive', onHiveAdd], [PackagePlus, 'Create Batch', onBatch], [Plus, 'Record Reading', onReading]];
  return <Screen><Text style={styles.greeting}>Good morning, {user?.name?.split(' ')[0] ?? 'Beekeeper'}</Text><Text style={styles.subtitle}>Here's how your apiary is doing today.</Text><View style={styles.actions}>{actions.map(([Icon, label, press]: any) => <TouchableOpacity key={label} style={styles.action} onPress={press}><Icon size={20} color="#F97316"/><Text style={styles.actionText}>{label}</Text></TouchableOpacity>)}</View><Section title="Hive summary" link="View all hives →" onLink={onHives}/>{loading ? <Skeleton style={styles.skeleton}/> : <Card style={styles.summary}><Text style={styles.total}>{hives.length}</Text><Text style={styles.muted}>Total hives</Text><View style={styles.statusRow}>{(['HEALTHY','WATCH','HIGH_RISK'] as const).map(key => <View key={key}><Text style={styles.statusNum}>{counts[key]}</Text><Text style={styles.muted}>{key === 'HIGH_RISK' ? 'High risk' : key === 'WATCH' ? 'Needs watch' : 'Healthy'}</Text></View>)}</View></Card>}<Section title="Hive health"/>{hives.slice(0, 3).map((hive: Hive) => <HiveCard key={hive.id} hive={hive} health={health[hive.id]} onPress={() => onHive(hive)}/>)}{!loading && !hives.length && <Empty title="No hives yet" body="Add your first hive to start monitoring your apiary." action="Add Hive" onAction={onHiveAdd}/>}<Section title="Production outlook"/>{hives.filter((hive: Hive) => health[hive.id]).slice(0, 2).map((hive: Hive) => <Card key={hive.id} style={styles.product}><Text style={styles.cardTitle}>{hive.name}</Text><Text style={styles.yield}>{health[hive.id].productivity.yield_estimate_kg} kg</Text><Text style={styles.muted}>{health[hive.id].productivity.trend} · next harvest {health[hive.id].productivity.next_harvest_days ?? '—'} days</Text></Card>)}<Section title="Recent honey batches" link="View all batches →" onLink={onBatches}/>{batches.slice(0, 3).map((batch: Batch) => <BatchCard key={batch.id} batch={batch}/>)}</Screen>;
}
function HiveList({ hives, health, loading, onAdd, onHive }: any) { return <Screen title="My Hives" action={<Button size="icon" onPress={onAdd}><Plus size={20}/></Button>}>{loading ? <Skeleton style={styles.skeleton}/> : hives.map((hive: Hive) => <HiveCard key={hive.id} hive={hive} health={health[hive.id]} onPress={() => onHive(hive)}/>)}{!loading && !hives.length && <Empty title="No hives yet" body="Add your first hive to start monitoring your apiary." action="Add Hive" onAction={onAdd}/>}</Screen>; }
function HiveCard({ hive, health, onPress }: { hive: Hive; health?: Health; onPress?: () => void }) { const r = health?.latest_reading; return <TouchableOpacity onPress={onPress} disabled={!onPress}><Card style={styles.card}><View style={styles.row}><View><Text style={styles.cardTitle}>{hive.name}</Text><Text style={styles.muted}>{hive.location} · {hive.species}</Text></View>{health && <Badge variant={statusVariant(health.health.status) as any}>{health.health.status}</Badge>}</View>{r ? <View style={styles.metrics}><Metric icon={Thermometer} value={`${r.temperature_c}°C`}/><Metric icon={Droplets} value={`${r.humidity_pct}% RH`}/><Metric icon={Weight} value={`${r.weight_kg} kg`}/><Metric icon={Wind} value={`${r.sound_hz ?? '—'} Hz`}/></View> : <Text style={styles.muted}>No readings yet</Text>}</Card></TouchableOpacity>; }
function HiveDetail({ hive, health, onBack, onReading, onRefresh }: any) { const [readings, setReadings] = useState<Reading[]>([]); const [metric, setMetric] = useState<keyof Reading>('temperature_c'); const loadReadings = useCallback(async () => { try { setReadings((await hiveAPI.readings(hive.id)).data); } catch {} }, [hive.id]); useEffect(() => { loadReadings(); }, [loadReadings]); const r = health?.latest_reading; return <Screen refresh={async () => { await Promise.all([loadReadings(), onRefresh()]); }}><Back title={hive.name} subtitle={hive.location} onBack={onBack}/>{health ? <><Section title="Hive health"/><Card style={styles.card}><Badge variant={statusVariant(health.health.status) as any}>{health.health.status}</Badge><Text style={styles.confidence}>{Math.round(health.health.confidence * 100)}% confidence</Text>{health.health.reasons.map((reason: string) => <Text key={reason} style={styles.reason}>• {reason}</Text>)}</Card><Section title="Current metrics"/><View style={styles.metricGrid}>{[[Thermometer, `${r.temperature_c}°C`, 'Temperature'],[Droplets, `${r.humidity_pct}%`, 'Humidity'],[Weight, `${r.weight_kg} kg`, 'Weight'],[Wind, `${r.sound_hz ?? '—'} Hz`, 'Sound']].map(([icon, value, label]: any) => <Card key={label} style={styles.metricCard}><Metric icon={icon} value={value}/><Text style={styles.muted}>{label}</Text></Card>)}</View><Section title="Productivity"/><Card style={styles.card}><Text style={styles.yield}>{health.productivity.yield_estimate_kg} kg</Text><Text style={styles.muted}>{health.productivity.trend} · {Math.round(health.productivity.confidence * 100)}% confidence</Text><Text style={styles.reason}>{health.productivity.recommendation}</Text></Card></> : <Empty title="No readings yet" body="Record your first sensor reading to start tracking hive health." action="Record Reading" onAction={onReading}/>}<Section title="Sensor history"/>{readings.length > 1 ? <Card style={styles.card}><View style={styles.tabs}>{(['temperature_c','humidity_pct','weight_kg','sound_hz'] as const).map(key => <TouchableOpacity key={key} onPress={() => setMetric(key)}><Text style={[styles.tab, metric === key && styles.active]}>{key.split('_')[0]}</Text></TouchableOpacity>)}</View>{readings.slice(0, 8).reverse().map((item, index) => <View key={index} style={styles.chartRow}><Text style={styles.muted}>{date(item.recorded_at)}</Text><View style={[styles.bar, { width: `${Math.min(100, Math.max(8, Number(item[metric]) || 0))}%` }]} /><Text style={styles.muted}>{String(item[metric] ?? '—')}</Text></View>)}</Card> : <Text style={styles.muted}>Not enough readings yet. Record more readings to see trends.</Text>}<Button size="lg" style={styles.fullButton} animation={false} onPress={onReading}>Record Reading</Button></Screen>; }
type FakeDevice = { id: string; name: string; rssi: number; kind: string };
type LiveReading = { temperature_c: number; humidity_pct: number; weight_kg: number; sound_hz: number; moisture_pct: number; heatIndex_c: number; battery_pct: number };
const FAKE_DEVICES: FakeDevice[] = [
  { id: 'esp32-a1', name: 'ESP32_HiveMonitor_A1', rssi: -62, kind: 'DHT11' },
  { id: 'hc05-02', name: 'HC-05_DHT11_Hive_02', rssi: -74, kind: 'DHT11' },
  { id: 'esp32-03', name: 'ESP32_HiveMonitor_03', rssi: -81, kind: 'DHT11' },
];
const round1 = (n: number) => Math.round(n * 10) / 10;
const heatIndex = (t: number, rh: number) => round1(t + (rh - 50) / 20);
function makeLiveReading(): LiveReading {
  const temperature_c = round1(34.5 + (Math.random() * 2 - 1));
  const humidity_pct = round1(58 + (Math.random() * 6 - 3));
  const weight_kg = round1(26 + (Math.random() * 1.2 - 0.4));
  const sound_hz = Math.round(220 + (Math.random() * 40 - 20));
  const moisture_pct = round1(18 + (Math.random() * 2 - 1));
  return { temperature_c, humidity_pct, weight_kg, sound_hz, moisture_pct, heatIndex_c: heatIndex(temperature_c, humidity_pct), battery_pct: Math.round(70 + Math.random() * 25) };
}
function jitterLive(prev: LiveReading): LiveReading {
  const temperature_c = round1(Math.min(39, Math.max(29, prev.temperature_c + (Math.random() * 0.6 - 0.3))));
  const humidity_pct = round1(Math.min(85, Math.max(40, prev.humidity_pct + (Math.random() * 1.6 - 0.8))));
  const weight_kg = round1(Math.max(0, prev.weight_kg + (Math.random() * 0.2 - 0.08)));
  const sound_hz = Math.max(120, Math.round(prev.sound_hz + (Math.random() * 10 - 5)));
  const moisture_pct = round1(Math.min(25, Math.max(14, prev.moisture_pct + (Math.random() * 0.4 - 0.2))));
  return { temperature_c, humidity_pct, weight_kg, sound_hz, moisture_pct, heatIndex_c: heatIndex(temperature_c, humidity_pct), battery_pct: prev.battery_pct };
}
function previewStatus(temp: number) { return temp >= 33 && temp <= 36 ? 'HEALTHY' : temp >= 30 && temp <= 38 ? 'WATCH' : 'HIGH_RISK'; }
function useFakeIot(hives: Hive[]) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'found' | 'live'>('idle');
  const [devices, setDevices] = useState<FakeDevice[]>([]);
  const [device, setDevice] = useState<FakeDevice | null>(null);
  const [live, setLive] = useState<LiveReading>(() => makeLiveReading());
  const [targetHiveId, setTargetHiveId] = useState<string>('');
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!targetHiveId && hives?.length) setTargetHiveId(hives[0].id);
  }, [hives, targetHiveId]);

  useEffect(() => () => { if (scanTimer.current) clearTimeout(scanTimer.current); }, []);

  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => setLive((prev) => jitterLive(prev)), 2000);
    return () => clearInterval(id);
  }, [phase, device?.id]);

  const findDevices = () => {
    if (phase === 'scanning') return;
    setPhase('scanning'); setDevices([]); setDevice(null);
    scanTimer.current = setTimeout(() => setDevices(FAKE_DEVICES), 2500);
  };

  useEffect(() => {
    if (phase === 'scanning' && devices.length) setPhase('found');
  }, [devices, phase]);

  const connect = (d: FakeDevice) => {
    setDevice(d); setLive(makeLiveReading()); setPhase('live');
  };
  const disconnect = () => { setPhase('found'); setDevice(null); };
  const rescan = () => findDevices();

  const targetHive = hives?.find((h: Hive) => h.id === targetHiveId) ?? hives?.[0] ?? null;
  const status = previewStatus(live.temperature_c);
  return { phase, devices, device, live, targetHiveId, setTargetHiveId, targetHive, status, findDevices, connect, disconnect, rescan };
}
const iotStyles = StyleSheet.create({
  hiveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deviceList: { gap: 10, marginTop: 10 },
  liveWrap: { gap: 12 },
});
function IoTScreen({ hives, loading, iot, onRefresh, onUseForBatch, onRecordReading }: any) {
  const toast = useToast();
  const { phase, devices, device, live, targetHiveId, setTargetHiveId, targetHive, status, findDevices, connect, disconnect, rescan } = iot;
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const saveReading = async () => {
    if (!targetHive) return Alert.alert('Add a hive first', 'Create a hive before saving IoT readings.');
    setSaving(true);
    try {
      await hiveAPI.createReading(targetHive.id, { temperature_c: live.temperature_c, humidity_pct: live.humidity_pct, weight_kg: live.weight_kg, sound_hz: live.sound_hz });
      setSavedAt(new Date().toLocaleTimeString());
      toast.success('IoT reading saved', `${targetHive.name} · ${live.temperature_c}°C`);
      onRefresh?.();
    } catch (e) { Alert.alert('Unable to save reading', message(e, 'The reading was not saved.')); }
    finally { setSaving(false); }
  };

  const useForBatch = () => {
    if (!targetHive) return Alert.alert('Add a hive first', 'Create a hive before creating a batch.');
    onUseForBatch?.(targetHive.id, live.moisture_pct);
  };

  const recordReading = () => {
    if (!targetHive) return Alert.alert('Add a hive first', 'Create a hive before recording a reading.');
    onRecordReading?.(targetHive.id, { temperature_c: live.temperature_c, humidity_pct: live.humidity_pct, weight_kg: live.weight_kg, sound_hz: live.sound_hz });
  };

  return <Screen title="IoT Sensors" action={phase === 'live' ? <Button size="sm" variant="outline" onPress={disconnect}>Disconnect</Button> : undefined}>
    <Text style={styles.muted}>Simulated BLE DHT11 monitor. Scan, connect, then push live values into Hive readings &amp; Batches.</Text>
    {hives?.length ? <View style={iotStyles.hiveRow}>{hives.map((h: Hive) => <TouchableOpacity key={h.id} onPress={() => setTargetHiveId(h.id)}><Card style={targetHiveId === h.id || (!targetHiveId && hives[0]?.id === h.id) ? styles.selected : undefined}><Text style={styles.cardTitle}>{h.name}</Text></Card></TouchableOpacity>)}</View> : <Text style={styles.muted}>No hives yet — readings will be disabled until you add one.</Text>}
    {phase === 'idle' && <Card style={styles.card}><Bluetooth size={28} color="#F97316" /><Text style={styles.cardTitle}>No device connected</Text><Text style={styles.muted}>Fake BLE scan finds nearby ESP32 / HC-05 DHT11 nodes.</Text><Button size="lg" style={styles.fullButton} onPress={findDevices}>Find Devices</Button></Card>}
    {phase === 'scanning' && <Card style={styles.card}><ActivityIndicator size="large" color="#F97316" /><Text style={styles.cardTitle}>Scanning for BLE devices…</Text><Text style={styles.muted}>Looking for DHT11 sensor nodes (2–3s)…</Text></Card>}
    {(phase === 'found' || phase === 'scanning') && !!devices.length && <View><Section title={`Devices found (${devices.length})`} /><Button variant="outline" onPress={rescan}>Rescan</Button><View style={iotStyles.deviceList}>{devices.map((d: FakeDevice) => <TouchableOpacity key={d.id} onPress={() => { connect(d); setSavedAt(null); }}><Card style={styles.card}><View style={styles.row}><View><Text style={styles.cardTitle}>{d.name}</Text><Text style={styles.muted}>{d.kind} · {d.rssi} dBm</Text></View><Badge variant="secondary">TAP TO CONNECT</Badge></View></Card></TouchableOpacity>)}</View></View>}
    {phase === 'live' && device && <View style={iotStyles.liveWrap}>
      <Card style={styles.card}><View style={styles.row}><View><Text style={styles.cardTitle}>{device.name}</Text><Text style={styles.muted}>Connected · live · {device.rssi} dBm</Text></View><Badge variant={statusVariant(status) as any}>{status}</Badge></View><Text style={styles.muted}>Streaming into: {targetHive?.name ?? '—'}</Text></Card>
      <View style={styles.metricGrid}>
        <Card style={styles.metricCard}><Metric icon={Thermometer} value={`${live.temperature_c}°C`} /><Text style={styles.muted}>Temp (DHT11)</Text></Card>
        <Card style={styles.metricCard}><Metric icon={Droplets} value={`${live.humidity_pct}%`} /><Text style={styles.muted}>Humidity (DHT11)</Text></Card>
        <Card style={styles.metricCard}><Metric icon={Cpu} value={`${live.heatIndex_c}°C`} /><Text style={styles.muted}>Heat index*</Text></Card>
        <Card style={styles.metricCard}><Metric icon={Weight} value={`${live.weight_kg} kg`} /><Text style={styles.muted}>Weight (load cell)*</Text></Card>
        <Card style={styles.metricCard}><Metric icon={Wind} value={`${live.sound_hz} Hz`} /><Text style={styles.muted}>Sound (mic)*</Text></Card>
        <Card style={styles.metricCard}><Metric icon={Droplets} value={`${live.moisture_pct}%`} /><Text style={styles.muted}>Honey moisture*</Text></Card>
      </View>
      <Text style={styles.muted}>* simulated alongside DHT11 — DHT11 hardware only measures temp + humidity.</Text>
      <Button size="lg" loading={saving} style={styles.fullButton} onPress={saveReading}>{`Save as Reading -> ${targetHive?.name ?? 'Hive'}`}</Button>
      <Button size="lg" variant="outline" style={styles.fullButton} onPress={recordReading}>{`Auto-fill Reading Form -> ${targetHive?.name ?? 'Hive'}`}</Button>
      <Button size="lg" variant="outline" style={styles.fullButton} onPress={useForBatch}>{`Use moisture ${live.moisture_pct}% for Batch`}</Button>
      {savedAt && <Text style={styles.muted}>Last saved at {savedAt}. Check Hives → {targetHive?.name} → Sensor history, and Batches after harvest.</Text>}
    </View>}
    {loading && <Text style={styles.muted}>Loading hives…</Text>}
  </Screen>;
}
function BatchList({ batches, loading, onAdd, onBatch }: any) { return <Screen title="Honey Batches" action={<Button size="sm" onPress={onAdd}>Create Batch</Button>}>{loading ? <Skeleton style={styles.skeleton}/> : batches.map((batch: Batch) => <TouchableOpacity key={batch.id} onPress={() => onBatch(batch)}><BatchCard batch={batch}/></TouchableOpacity>)}{!loading && !batches.length && <Empty title="No honey batches yet" body="Create a batch when you harvest honey." action="Create Batch" onAction={onAdd}/>}</Screen>; }
function BatchCard({ batch }: { batch: Batch }) { const purity = batch.purity_score ?? 0; return <Card style={styles.card}><View style={styles.row}><View><Text style={styles.cardTitle}>#{shortId(batch.id)}</Text><Text style={styles.muted}>{batch.honey_type}</Text></View><Badge variant={statusVariant(purity >= 80 ? 'PASS' : purity >= 60 ? 'CAUTION' : 'REJECT') as any}>{batch.status}</Badge></View><View style={styles.row}><Text style={styles.quantity}>{batch.quantity_kg} kg</Text><Text style={styles.muted}>Purity {purity} · {date(batch.harvest_date)}</Text></View></Card>; }
function BatchDetail({ batch, onBack, onEvent, onReport }: any) { const [verify, setVerify] = useState<any>(); useEffect(() => { batchAPI ? import('../api/client').then(({ verifyAPI }) => verifyAPI.batch(batch.id).then(r => setVerify(r.data)).catch(() => {})) : undefined; }, [batch.id]); return <Screen><Back title={`Batch #${shortId(batch.id)}`} subtitle={batch.honey_type} onBack={onBack}/><Section title="Purity screening"/><Card style={styles.card}><Text style={styles.yield}>{batch.purity_score ?? '—'}</Text><Text style={styles.muted}>Score · moisture {batch.moisture_pct ?? '—'}%</Text><Badge variant={statusVariant((batch.purity_score ?? 0) >= 80 ? 'PASS' : 'CAUTION') as any}>{(batch.purity_score ?? 0) >= 80 ? 'PASS' : 'CAUTION'}</Badge></Card><Section title="Consumer verification"/><Card style={styles.qr}><Image source={{ uri: batchAPI.getQR(batch.id) }} style={styles.qrImage}/><Text style={styles.muted}>Scan to verify this batch publicly.</Text></Card><Button size="lg" animation={false} style={styles.fullButton} onPress={onReport}>View Compliance Report</Button><Section title="Traceability"/>{verify?.ledger_timeline?.map((event: any) => <View key={event.index} style={styles.timeline}><View style={styles.dot}/><View><Text style={styles.cardTitle}>{event.event_type.replace('_',' ')}</Text><Text style={styles.muted}>{date(event.timestamp_str)}</Text></View></View>)}<Button size="lg" animation={false} style={styles.fullButton} onPress={onEvent}>Update Batch</Button></Screen>; }
function ComplianceReport({ batch, onBack }: { batch: Batch; onBack: () => void }) {
  const qrUrl = batchAPI.getQR(batch.id);
  const verifyUrl = batchAPI.verifyUrl(batch.id);
  const reportHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>body{font-family:Arial,sans-serif;color:#18181b;padding:28px}h1{color:#C2410C;margin-bottom:4px}.muted{color:#52525b}.card{border:1px solid #d4d4d8;border-radius:12px;padding:16px;margin:18px 0}img{width:180px;height:180px;display:block;margin:18px auto}</style></head><body><h1>HoneyChain Compliance Report</h1><p class="muted">Batch #${shortId(batch.id)} · ${date(batch.harvest_date)}</p><div class="card"><p><b>Honey type:</b> ${batch.honey_type}</p><p><b>Quantity:</b> ${batch.quantity_kg} kg</p><p><b>Apiary location:</b> ${batch.apiary_location}</p><p><b>Moisture:</b> ${batch.moisture_pct ?? '—'}%</p><p><b>Purity score:</b> ${batch.purity_score ?? '—'}</p><p><b>Status:</b> ${batch.status}</p></div><h2>Verification QR code</h2><img src="${qrUrl}"/><p class="muted">Scan this code to view the public batch traceability record.</p></body></html>`;
  const sharePdf = async (printInstead = false) => { try { if (printInstead) return await Print.printAsync({ html: reportHtml }); const { uri } = await Print.printToFileAsync({ html: reportHtml }); if (!await Sharing.isAvailableAsync()) return Alert.alert('PDF created', `Saved at ${uri}`); await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Share compliance report' }); } catch { Alert.alert('Unable to create report', 'Please try again.'); } };
  const printQr = async () => { try { await Print.printAsync({ html: `<!DOCTYPE html><html><body style="text-align:center;padding:32px;font-family:Arial"><h1>HoneyChain Batch #${shortId(batch.id)}</h1><img src="${qrUrl}" style="width:300px;height:300px"/><p>Scan to verify this honey batch.</p></body></html>` }); } catch { Alert.alert('Unable to print QR code', 'Please try again.'); } };
  const copyLink = async () => { try { await Clipboard.setStringAsync(verifyUrl); Alert.alert('Link copied', verifyUrl); } catch { Alert.alert('Unable to copy link', 'Please try again.'); } };
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><Screen><Back title="Compliance Report" subtitle={`Batch #${shortId(batch.id)}`} onBack={onBack}/><Card style={styles.card}><Text style={styles.cardTitle}>{batch.honey_type}</Text><Text style={styles.muted}>{batch.quantity_kg} kg · {batch.apiary_location}</Text><View style={styles.row}><Text style={styles.muted}>Purity score</Text><Text style={styles.quantity}>{batch.purity_score ?? '—'}</Text></View><Text style={styles.muted}>Moisture {batch.moisture_pct ?? '—'}% · {date(batch.harvest_date)}</Text><Badge variant={statusVariant(batch.status) as any}>{batch.status}</Badge></Card><Section title="Verification QR"/><Card style={styles.qr}><Image source={{ uri: qrUrl }} style={styles.qrImage}/><Text style={styles.muted}>Print this code for product labels or in-store verification.</Text></Card><View style={reportStyles.actions}><Button size="lg" onPress={copyLink}>Copy link</Button><ShareButton content={{ title: 'HoneyChain verification', message: `Verify HoneyChain batch #${shortId(batch.id)}`, url: verifyUrl }} variant="outline" size="lg">Share link</ShareButton><Button variant="outline" size="lg" onPress={printQr}>Print QR code</Button></View><Section title="Export report"/><Text style={styles.muted}>Create a PDF containing the screening details and verification QR code.</Text><View style={reportStyles.actions}><Button size="lg" onPress={() => sharePdf()}>Share PDF report</Button><Button variant="outline" size="lg" onPress={() => sharePdf(true)}>Print report</Button></View></Screen></SafeAreaView>;
}
function Profile({ user, onLogout }: any) { return <Screen title="Profile"><Card style={styles.card}><Text style={styles.cardTitle}>{user?.name ?? '—'}</Text><Text style={styles.muted}>{user?.phone}</Text>{user?.email && <Text style={styles.muted}>{user.email}</Text>}<Text style={styles.reason}>{user?.role} · {user?.cluster ?? 'No cluster'}</Text></Card>{['Account','Notifications','Help'].map(item => <Card key={item} style={styles.setting}><Text style={styles.cardTitle}>{item}</Text></Card>)}<Button variant="outline" size="lg" animation={false} style={styles.fullButton} onPress={onLogout}>Logout</Button></Screen>; }
function Field({ label, ...inputProps }: any) { return <View style={formPageStyles.field}><Text style={formPageStyles.label}>{label}</Text><Input {...inputProps}/></View>; }
function FormFooter({ children }: { children: React.ReactNode }) { return <View style={formPageStyles.footer}>{children}</View>; }
function HiveForm({ onDone }: any) { const [name, setName] = useState(''); const [location, setLocation] = useState(''); const [species, setSpecies] = useState('apis_mellifera'); const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null); const [locating, setLocating] = useState(false); const [saving, setSaving] = useState(false); const findLocation = async () => { setLocating(true); try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status !== 'granted') return Alert.alert('Location permission needed', 'You can enter the apiary location manually.'); const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); const nextCoords = { latitude: current.coords.latitude, longitude: current.coords.longitude }; setCoords(nextCoords); const [address] = await Location.reverseGeocodeAsync(nextCoords); const readable = [address?.name, address?.city ?? address?.subregion, address?.region].filter(Boolean).join(', '); if (readable) setLocation(readable); } catch { Alert.alert('Location unavailable', 'Enter the apiary location manually.'); } finally { setLocating(false); } }; useEffect(() => { findLocation(); }, []); return <View style={formPageStyles.form}><View style={formPageStyles.fields}><Field label="Hive name" placeholder="e.g. Hive A" value={name} onChangeText={setName}/><Field label="Location" placeholder="Apiary location" value={location} onChangeText={setLocation}/><Button variant="outline" loading={locating} onPress={findLocation}>{locating ? 'Finding location…' : 'Use current location'}</Button>{coords && <Text style={styles.muted}>Location coordinates will be saved with this hive.</Text>}<Field label="Species" value={species} onChangeText={setSpecies}/></View><FormFooter><Button size="lg" loading={saving} onPress={async () => { if (!name || !location || !species) return Alert.alert('Complete all required fields'); setSaving(true); try { await hiveAPI.create({ name, location, species, ...coords }); onDone(); } catch (e) { Alert.alert('Unable to add hive', message(e,'Try again.')); } finally { setSaving(false); }}}>Add Hive</Button></FormFooter></View>; }
function ReadingForm({ hive, hives, initial, onDone }: any) { const [temp,setTemp]=useState(initial?.temperature_c != null ? String(initial.temperature_c) : ''); const [humidity,setHumidity]=useState(initial?.humidity_pct != null ? String(initial.humidity_pct) : ''); const [weight,setWeight]=useState(initial?.weight_kg != null ? String(initial.weight_kg) : ''); const [sound,setSound]=useState(initial?.sound_hz != null ? String(initial.sound_hz) : ''); const [saving,setSaving]=useState(false); useEffect(() => { if (initial) { setTemp(String(initial.temperature_c)); setHumidity(String(initial.humidity_pct)); setWeight(String(initial.weight_kg)); setSound(String(initial.sound_hz)); } }, [initial]); return <View style={formPageStyles.form}><View style={formPageStyles.fields}><Text style={styles.muted}>{hive?.name ?? hives[0]?.name ?? 'Add a hive first'}</Text><Field label="Temperature °C" keyboardType="decimal-pad" value={temp} onChangeText={setTemp}/><Field label="Humidity %" keyboardType="decimal-pad" value={humidity} onChangeText={setHumidity}/><Field label="Weight kg" keyboardType="decimal-pad" value={weight} onChangeText={setWeight}/><Field label="Sound Hz" keyboardType="decimal-pad" value={sound} onChangeText={setSound}/></View><FormFooter><Button size="lg" loading={saving} onPress={async () => { const values=[temp,humidity,weight].map(Number); if (!hive || values.some(Number.isNaN) || Number(humidity)<0 || Number(humidity)>100 || Number(weight)<0) return Alert.alert('Enter valid reading values'); setSaving(true); try { await hiveAPI.createReading(hive.id,{ temperature_c:Number(temp),humidity_pct:Number(humidity),weight_kg:Number(weight),sound_hz:sound ? Number(sound) : undefined }); onDone(); } catch(e){Alert.alert('Unable to record reading',message(e,'The reading was not saved.'));} finally {setSaving(false);} }}>Save Reading</Button></FormFooter></View>; }
function BatchForm({ hives, initial, iotMoisture, onDone }: any) { const [hive,setHive]=useState(initial?.hive_id ?? hives[0]?.id ?? ''); const [type,setType]=useState('Wildflower Honey'); const [quantity,setQuantity]=useState(''); const [location,setLocation]=useState(hives.find((h: any) => h.id === (initial?.hive_id ?? hives[0]?.id))?.location ?? ''); const [moisture,setMoisture]=useState(initial?.moisture_pct != null ? String(initial.moisture_pct) : ''); const [saving,setSaving]=useState(false); return <View style={formPageStyles.form}><View style={formPageStyles.fields}><Field label="Hive ID" value={hive} onChangeText={setHive}/><Field label="Honey type" value={type} onChangeText={setType}/><Field label="Quantity kg" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity}/><Field label="Apiary location" value={location} onChangeText={setLocation}/><Field label="Moisture %" keyboardType="decimal-pad" value={moisture} onChangeText={setMoisture}/>{iotMoisture != null && <Button variant="outline" onPress={() => setMoisture(String(iotMoisture))}>{`Use live IoT moisture ${iotMoisture}%`}</Button>}</View><FormFooter><Button size="lg" loading={saving} onPress={async () => { if (!hive || !type || !location || Number(quantity)<=0 || Number(moisture)<0 || Number(moisture)>100) return Alert.alert('Enter valid harvest details'); setSaving(true); try { const response=await batchAPI.create({ hive_id:hive,honey_type:type,quantity_kg:Number(quantity),apiary_location:location,moisture_pct:Number(moisture) }); onDone(response.data); } catch(e){Alert.alert('Unable to create batch',message(e,'The harvest was not saved.'));} finally {setSaving(false);} }}>Create Batch</Button></FormFooter></View>; }
function EventForm({ batch, onDone }: any) { const [event,setEvent]=useState('QUALITY_TEST'); const [owner,setOwner]=useState(''); return <View style={formPageStyles.form}><View style={formPageStyles.fields}>{['QUALITY_TEST','TRANSFER','PACKAGE','SALE'].map(value => <TouchableOpacity key={value} onPress={() => setEvent(value)}><Card style={event===value ? styles.selected : undefined}><Text style={styles.cardTitle}>{value.replace('_',' ')}</Text></Card></TouchableOpacity>)}{event==='TRANSFER' && <Field label="New owner" value={owner} onChangeText={setOwner}/>}</View><FormFooter><Button size="lg" onPress={async () => { try { await batchAPI.addEvent(batch.id,{ event_type:event,payload:event==='TRANSFER'?{new_owner:owner}:{} }); onDone(); } catch(e){Alert.alert('Unable to update batch',message(e,'Try again.'));} }}>Save Update</Button></FormFooter></View>; }
function Metric({ icon: Icon, value }: any) { return <View style={styles.metric}><Icon size={16} color="#F97316"/><Text style={styles.metricText}>{value}</Text></View>; }
function Section({ title, link, onLink }: any) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{link && <TouchableOpacity onPress={onLink}><Text style={styles.link}>{link}</Text></TouchableOpacity>}</View>; }
function Empty({ title, body, action, onAction }: any) { return <Card style={styles.empty}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.muted}>{body}</Text><Button onPress={onAction}>{action}</Button></Card>; }
function Back({ title, subtitle, onBack }: any) { return <View style={styles.back}><TouchableOpacity onPress={onBack}><ChevronLeft size={26} color="#FFFFFF"/></TouchableOpacity><View><Text style={styles.screenTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View></View>; }

const reportStyles = StyleSheet.create({ actions: { gap: 10 } });

const formPageStyles = StyleSheet.create({
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: 'Geist_700Bold', fontSize: 18 },
  spacer: { width: 40 },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 20 },
  form: { flex: 1 },
  fields: { gap: 14 },
  field: { gap: 7 },
  label: { color: '#E4E4E7', fontFamily: 'Geist_500Medium', fontSize: 14 },
  footer: { marginTop: 'auto', paddingTop: 20 },
});

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:'#000'},page:{flex:1},scroll:{padding:20,paddingBottom:116,gap:14},greeting:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:28},subtitle:{color:'#A1A1AA',fontSize:15,marginTop:4},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},screenTitle:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:27},actions:{flexDirection:'row',gap:10,marginTop:10},action:{flex:1,minHeight:80,borderRadius:14,padding:12,backgroundColor:'#18181B',justifyContent:'space-between'},actionText:{color:'#fff',fontFamily:'Geist_500Medium',fontSize:13},section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8},sectionTitle:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:20},link:{color:'#F97316',fontSize:13},card:{gap:10},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},cardTitle:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:16},muted:{color:'#A1A1AA',fontSize:13},summary:{gap:12},total:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:38},statusRow:{flexDirection:'row',justifyContent:'space-between'},statusNum:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:19},metrics:{flexDirection:'row',flexWrap:'wrap',gap:12},metric:{flexDirection:'row',gap:5,alignItems:'center'},metricText:{color:'#E4E4E7',fontSize:13},product:{gap:4},yield:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:28},quantity:{color:'#fff',fontFamily:'Geist_700Bold',fontSize:18},empty:{alignItems:'flex-start',gap:12,paddingVertical:28},skeleton:{height:150,width:'100%',borderRadius:16},metricGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},metricCard:{width:'47%',gap:8},confidence:{color:'#fff',fontSize:22,fontFamily:'Geist_700Bold'},reason:{color:'#D4D4D8',fontSize:14,lineHeight:20},fullButton:{width:'100%',marginTop:8},tabs:{flexDirection:'row',justifyContent:'space-between',gap:5},tab:{color:'#A1A1AA',textTransform:'capitalize',fontSize:12},active:{color:'#F97316',fontFamily:'Geist_700Bold'},chartRow:{flexDirection:'row',alignItems:'center',gap:8},bar:{height:8,borderRadius:8,backgroundColor:'#F97316',flexShrink:1},back:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:6},qr:{alignItems:'center',gap:10},qrImage:{width:190,height:190,backgroundColor:'#fff'},timeline:{flexDirection:'row',gap:12,alignItems:'center'},dot:{width:12,height:12,borderRadius:9,backgroundColor:'#F97316'},setting:{paddingVertical:20},form:{gap:14,paddingBottom:30},selected:{borderWidth:1,borderColor:'#F97316'},nav:{flexDirection:'row',justifyContent:'space-around',backgroundColor:'#18181B',borderTopWidth:1,borderTopColor:'#27272A',paddingTop:10},navItem:{alignItems:'center',minWidth:60,gap:3},navLabel:{color:'#A1A1AA',fontSize:11},iotDot:{width:6,height:6,borderRadius:3,backgroundColor:'transparent',marginTop:2},iotDotOn:{backgroundColor:'#F97316'}, });
