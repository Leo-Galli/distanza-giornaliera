# Distanza giornaliera — versione Expo (Android e iPhone)

Porting in React Native/Expo dell'app Python/Kivy nella cartella principale. Stessa logica di calcolo (`src/distanceTracker.ts`, porting 1:1 di `distance_tracker.py`, non modificata): distanza Haversine, filtri su precisione/rumore/salti GPS, azzeramento automatico a mezzanotte, salvataggio locale.

A differenza della versione Buildozer (solo Android), questa gira anche su **iPhone** (e nel browser), tramite l'app **Expo Go**.

Oltre alla distanza GPS, l'app mostra un vero **contapassi di oggi**, letto dal sensore passi del
telefono (non stimato dal GPS): più affidabile al chiuso e quando ci si muove poco. Vedi
[`COME-FUNZIONA.md`](./COME-FUNZIONA.md) per i dettagli su come funziona su ogni piattaforma.

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
npm start           # equivalente a ./start.sh senza le scelte guidate
npm test            # esegue i test del motore di calcolo (Jest)
npm run typecheck   # controllo dei tipi TypeScript
```

> Nota tecnica: questi script invocano i tool (`expo`, `jest`, `tsc`) tramite
> `node node_modules/<pacchetto>/bin/...` invece dei comandi diretti (`npx expo`, `npx jest`...).
> Su Windows gli shim `.cmd` generati da npm in `node_modules\.bin` possono rompersi se il percorso
> del progetto contiene certi caratteri speciali (es. `^`): vedi [`COME-FUNZIONA.md`](./COME-FUNZIONA.md)
> per i dettagli.

## Struttura

- `App.tsx` — interfaccia (AVVIA/PAUSA, anello dei passi, distanza del giorno, azzeramento), accesso al GPS tramite `expo-location` e al contapassi tramite `expo-sensors` (`Pedometer`).
- `src/distanceTracker.ts` — calcolo Haversine, controlli di qualità, persistenza con `@react-native-async-storage/async-storage`. **Non modificato** rispetto alla versione originale.
- `src/distanceTracker.test.ts` — porting dei test di `tests/test_distance_tracker.py`.
- `src/stepTracker.ts` — somma e persiste i passi di oggi letti dal sensore (su Android, dove il sensore riparte da 0 ad ogni sessione di ascolto; vedi `COME-FUNZIONA.md`).
- `src/theme.ts` / `src/ui.tsx` — stile grafico "chunky" (pannello crema, font Lilita One, bottoni "3D", anello di progresso) e componenti riusabili.
- `start.bat` / `start.sh` — avviano il server Expo e mostrano il QR code per Expo Go.
- `scripts/expo-cli.js` — avvia la CLI di Expo evitando gli shim `.cmd` rotti su Windows e disabilita il menu sviluppatore che si apre scuotendo il telefono (vedi `COME-FUNZIONA.md`).

## Permessi

- **Posizione** (per la distanza): Android `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`, iOS `NSLocationWhenInUseUsageDescription`. La misurazione funziona solo con l'app aperta in primo piano.
- **Attività fisica/motion** (per il contapassi): Android `ACTIVITY_RECOGNITION`, iOS `NSMotionUsageDescription`. Se il permesso viene negato, il contapassi mostra "non disponibile" ma la distanza GPS continua a funzionare normalmente.

Entrambi configurati in `app.json`.
