# Distanza giornaliera — versione Expo (Android e iPhone)

Porting in React Native/Expo dell'app Python/Kivy nella cartella principale. Stessa logica di calcolo (`src/distanceTracker.ts`, porting 1:1 di `distance_tracker.py`): distanza Haversine, filtri su precisione/rumore/salti GPS, azzeramento automatico a mezzanotte, salvataggio locale.

A differenza della versione Buildozer (solo Android), questa gira anche su **iPhone**, tramite l'app **Expo Go**.

## Avvio rapido

Richiede [Node.js](https://nodejs.org) 20.19+ (LTS).

```bash
./start.sh        # Windows: start.bat
```

Alla prima esecuzione lo script installa le dipendenze (`npm install`), poi avvia il server Expo in modalità LAN e mostra un QR code nel terminale.

1. Installa **Expo Go** dal Play Store (Android) o dall'App Store (iPhone).
2. Il telefono e il computer devono essere sulla stessa rete Wi-Fi.
3. Scansiona il QR code: su Android dall'app Expo Go, su iPhone con l'app Fotocamera.
   - Su iPhone, Expo Go richiede un account Expo gratuito ([expo.dev/signup](https://expo.dev/signup)): accedi nel terminale quando richiesto e con lo stesso account dentro l'app.
   - Su Android non serve nessun account.
4. Tieni il terminale aperto: l'app si ricarica automaticamente a ogni modifica del codice.

Se la rete Wi-Fi blocca la connessione diretta (reti aziendali/scolastiche, telefono su rete dati), usa la modalità tunnel:

```bash
./start.sh tunnel
```

## Comandi utili

```bash
npm start       # equivalente a ./start.sh senza le scelte guidate
npm test        # esegue i test del motore di calcolo (Jest)
npx tsc --noEmit   # controllo dei tipi TypeScript
```

## Struttura

- `App.tsx` — interfaccia (stessa UI della versione Kivy: AVVIA/PAUSA, distanza del giorno, azzeramento) e accesso al GPS tramite `expo-location`.
- `src/distanceTracker.ts` — calcolo Haversine, controlli di qualità, persistenza con `@react-native-async-storage/async-storage`.
- `src/distanceTracker.test.ts` — porting dei test di `tests/test_distance_tracker.py`.
- `start.bat` / `start.sh` — avviano il server Expo e mostrano il QR code per Expo Go.

## Permessi posizione

L'app richiede l'autorizzazione "posizione precisa" (foreground) sia su Android (`ACCESS_FINE_LOCATION`) sia su iOS (`NSLocationWhenInUseUsageDescription`), configurati in `app.json`. Come nella versione originale, la misurazione funziona solo con l'app aperta in primo piano.
