# HoneyChain Wear MVP (isolated — phone app untouched)

`App.watch.tsx` in this folder is a **standalone React Native watch screen**.
It is NOT imported by `../App.tsx`, `../app.json`, or `../src/screens/*`.
Delete this folder and the phone app is byte-identical.

## What it does

- Watch login (same JWT as phone app via shared `../src/api/client`)
- Hive switcher (`‹ Hive A ›` — glove/crown friendly, no dropdown)
- Big SOS status ring: `HEALTHY (green) / WATCH (amber) / HIGH_RISK (red + buzz)`
  from existing `GET /api/hives/{id}/health`
- **Switch 1 — Apiary Mode:** ON = auto-refresh every 30s, OFF = manual
- **Switch 2 — Mute SOS 2H:** acknowledge/mute per hive (local, vibrates)
- `+ LOG` = one-tap `POST /api/hives/{id}/readings` (preset brood values)
- Round-screen layout: black bg, max-width 260, min 56px touch targets

## Preview without touching the phone app

Option A — temporary local preview only (revert after):
```tsx
// in a SCRATCH file only, never commit:
// import WatchApp from './wear/App.watch';
// <WatchApp />
```

Option B — Expo Snack / Wear OS Small Round emulator:
1. `adb devices` with watch emulator running
2. Build phone dev client as usual, sideload watch APK later

## Standalone watch build (later, still no phone change)

1. Create separate `app.watch.json` with `android.package: com.honeychain.watch`
2. `npx expo run:android --variant ...` targeting the watch emulator
3. Share only `src/api/client.ts` + theme (read-only import, as done here)

## Files

- `App.watch.tsx` — entire MVP, zero new dependencies
  (`react-native`, `expo-haptics`, `../src/api/client` only)
