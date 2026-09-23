# HoneyChain Mobile (React Native + Expo)

Field app for beekeepers: login, view hives + health, view batches, verify batch QR.
Talks to the same FastAPI backend as `frontend/` (`http://<host>:8000`).

## Prereqs

- Node 18+, npm
- Backend running on `:8000` (see root `SETUP.md` / `START-NATIVE.bat`)
- For device testing: Expo Go app on your phone

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local
# Edit .env.local -> EXPO_PUBLIC_API_URL
#   web/iOS simulator : http://localhost:8000
#   Android emulator  : http://10.0.2.2:8000
#   physical device   : http://<PC-LAN-IP>:8000
```

## Run

```bash
npx expo start
# then press: w (web) | a (android) | i (iOS) | scan QR with Expo Go
```

Scripts: `npm run android | npm run ios | npm run web`, `npm start`.

## Structure

- `App.tsx` — tab MVP (Login / Hives / Batches / Verify), HoneyChain theme
- `src/api/client.ts` — axios client mirroring `frontend/lib/api.ts` (AsyncStorage JWT)
- `app.json` — Expo config (`honeychain-mobile`, scheme `honeychain`)

## Notes

- No `ios/`/`android/` dirs (Continuous Native Generation). Configure native bits in `app.json`.
- After adding native modules, use a dev build (`npx expo run:android`) — Expo Go only has bundled modules.
- Typecheck: `npx tsc --noEmit`
