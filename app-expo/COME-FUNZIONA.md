# Come funziona la versione Expo e perché gira su tutti i dispositivi

Questo documento spiega due cose:

1. **Come** la porta Expo/React Native (`app-expo/`) riesce a girare sia su Android sia su
   iPhone (e anche sul Web) partendo dallo stesso codice, a differenza della versione
   Python/Kivy originale nella cartella principale (che gira solo su Android via Buildozer).
2. **Quale problema** impediva ai comandi (`npm start`, `npm test`, ecc.) di funzionare su
   questo PC Windows, e come è stato risolto — senza toccare l'app Python originale.

L'app Python/Kivy (`distance_tracker.py`, `main.py`, `buildozer.spec`) **non è stata
modificata**: resta la versione "storica", compilabile solo per Android tramite Buildozer.
Tutto quello che segue riguarda esclusivamente `app-expo/`.

## 1. Perché la stessa app gira su Android, iPhone e Web

### Un solo codice, tre piattaforme

- **Logica di calcolo** (`src/distanceTracker.ts`): è un porting 1:1, in TypeScript puro,
  di `distance_tracker.py` (formula di Haversine, filtri su precisione/rumore/salti GPS,
  azzeramento a mezzanotte). Non dipende da nessuna API di piattaforma, quindi è identica
  su Android, iPhone e Web, ed è testata con lo stesso identico set di casi di
  `tests/test_distance_tracker.py` (vedi `src/distanceTracker.test.ts`).
- **Interfaccia** (`App.tsx`): scritta con i componenti base di React Native
  (`View`, `Text`, `Pressable`, `StyleSheet`). Questi componenti non sono Android o iOS:
  React Native li traduce, al momento della build, nei widget nativi di ciascuna
  piattaforma (es. `Pressable` diventa un bottone nativo Android *e* un bottone nativo
  iOS). Non c'è bisogno di scrivere due interfacce separate.
- **Accesso al GPS** (`expo-location`): è un modulo "unificato" di Expo. Espone le stesse
  funzioni (`requestForegroundPermissionsAsync`, `watchPositionAsync`, ecc.) sia su Android
  sia su iOS sia su Web, ma dietro le quinte chiama l'API nativa corretta per ciascuna
  piattaforma (`FusedLocationProvider` su Android, `CoreLocation` su iOS, `navigator.geolocation`
  sul Web). L'app non deve sapere su quale sistema operativo si trova.
- **Salvataggio locale** (`@react-native-async-storage/async-storage`): stesso discorso,
  un'unica API che su Android/iOS scrive in uno storage nativo persistente e sul Web usa
  `localStorage`.

In breve: il codice è scritto una volta sola contro delle **API multipiattaforma**; chi
traduce verso il sistema operativo specifico è il framework (React Native + Expo), non noi.

### Perché basta "Expo Go" e non serve Xcode/Android Studio

**Expo Go** è un'app già pubblicata su App Store e Play Store che sa interpretare ed
eseguire qualunque progetto Expo scaricandolo via rete (Wi-Fi o tunnel) come se fosse un
pacchetto dati, non un'installazione vera e propria. Per questo:

- Su Android non serve nessun account né nessuna build: Expo Go scarica ed esegue il
  bundle JavaScript al volo.
- Su iPhone è uguale, con l'unica differenza che Apple richiede un account Expo gratuito
  per autorizzare il download all'interno di Expo Go (politica di Apple, non di Expo).
- Non serve un Mac per sviluppare/testare su iPhone, perché non si sta compilando
  un'app nativa: si esegue dentro un "contenitore" (Expo Go) già compilato e già
  approvato dagli store.

Questo è il motivo per cui la versione Kivy/Buildozer gira solo su Android (Buildozer
compila un APK nativo e non ha un equivalente per iOS che non richieda un Mac + Xcode),
mentre la versione Expo gira su entrambi usando lo stesso meccanismo di Expo Go.

### E per un'app "vera" installabile, senza Expo Go?

Quando un giorno servirà un'app standalone installabile (icona propria, pubblicabile su
Play Store / App Store, senza passare da Expo Go), si usa **EAS Build**
(`npx eas-cli@latest build --platform android` oppure `--platform ios`): Expo compila un
APK/AAB o un IPA nativo nel cloud, a partire dallo stesso identico codice, senza bisogno
di installare Android Studio o Xcode in locale. La build per iOS richiede comunque un
account Apple Developer (a pagamento) per la firma, per via delle regole Apple — non è
una limitazione di Expo.

## 2. Il problema che bloccava `npm start` / `npm test` su questo PC

### Sintomo

Qualunque comando che risolve un pacchetto locale (`npx expo ...`, `npx tsc ...`,
`npx jest`, `npm run ...` quando lo script lancia `expo`/`tsc`/`jest`) falliva con:

```
Error: Cannot find module 'C:\Users\leoga\Desktop\5 SUPERIORE\...\node_modules\expo\bin\cli'
```

Si nota che nel percoro dell'errore manca il carattere `^` che invece è presente nel vero
nome della cartella (`5^ SUPERIORE`): il percorso viene "corrotto" prima ancora di arrivare
a Node.js.

### Causa reale

Su Windows, `npm`/`npx` creano per ogni pacchetto installato localmente un file
`node_modules\.bin\<nome>.cmd` (uno script batch "shim" che poi richiama il vero file
JavaScript). Questi file generati automaticamente contengono una riga del tipo:

```bat
... & "%_prog%"  "%dp0%\..\expo\bin\cli" %*
```

`%dp0%` viene espanso con il percorso assoluto del progetto (quello con `5^ SUPERIORE`
dentro). Siccome questa riga usa gli operatori `&`/`||` di `cmd.exe`, l'intera riga — *già
espansa* — viene **riletta una seconda volta** dall'interprete dei comandi di Windows. In
questa seconda lettura, `cmd.exe` interpreta `^` come carattere di escape (è il suo
significato standard in un file batch) e lo rimuove dal percorso, che diventa così
invalido. Il risultato è l'errore "Cannot find module" qui sopra, per **qualunque**
pacchetto locale invocato tramite questi shim: `expo`, `tsc`, `jest`, ecc.

Non è un problema del progetto Expo in sé, né della cartella in generale: è una
limitazione nota del meccanismo di generazione degli shim `.cmd` di npm su Windows quando
il percorso del progetto contiene certi caratteri speciali di `cmd.exe` (`^`, `&`, `%`,
`!`, ...). Rinominare la cartella `5^ SUPERIORE` avrebbe risolto il sintomo, ma significava
modificare una cartella del Desktop esterna al progetto — non è stato fatto.

### Soluzione applicata

In `app-expo/package.json`, `start.bat` e `start.sh`, i comandi non passano più dagli shim
`.cmd` generati (`expo`, `tsc`, `jest` chiamati "per nome"), ma invocano direttamente il
file JavaScript del pacchetto tramite Node:

```jsonc
// package.json
"scripts": {
  "start": "node node_modules/expo/bin/cli start",
  "test": "node node_modules/jest/bin/jest.js",
  "typecheck": "node node_modules/typescript/bin/tsc --noEmit",
  ...
}
```

`node.exe` risolve da solo il percorso relativo passato come argomento (senza passare da
nessuno script batch intermedio), quindi il carattere `^` non viene mai ri-processato da
`cmd.exe` e il percorso resta intatto. Stessa modifica è stata applicata dentro
`start.bat`/`start.sh` per i comandi `expo start`, `expo login`, `expo whoami`.

Questa soluzione:

- **Funziona da qualunque cartella**, non solo su questo PC: è semplicemente più robusta,
  indipendentemente dal nome del percorso.
- **Non richiede di rinominare nessuna cartella** del Desktop/progetto.
- **Non tocca l'app Python/Kivy originale**: riguarda solo gli script di avvio di
  `app-expo/`.

Comandi "sicuri" da usare da ora in poi in questo progetto:

```bash
npm start            # avvia il server Expo (equivalente a "expo start")
npm run android      # avvia con target Android
npm run ios          # avvia con target iOS
npm run web          # avvia la versione Web
npm test             # esegue i test Jest
npm run typecheck    # controllo dei tipi TypeScript
npm run login        # login all'account Expo (necessario su iPhone)
npm run whoami       # mostra l'account Expo attualmente collegato
```

Evitare invece di digitare `npx expo ...`, `npx tsc ...` o `npx jest` direttamente in
questo progetto: tornerebbero a passare dagli shim `.cmd` rotti. Se serve uno strumento
non ancora presente in `package.json`, aggiungere un nuovo script seguendo lo stesso
schema (`node node_modules/<pacchetto>/bin/<entrypoint> ...`).

### Altro sistemato in questo intervento

Durante la verifica è emerso anche un disallineamento tra `package-lock.json` e le
versioni effettivamente installate in `node_modules` (`expo` risultava installato in una
versione diversa da quella bloccata nel lockfile), oltre a `jest`/`@types/jest` non
allineati alla versione raccomandata per Expo SDK 58. È stato eseguito un reinstall pulito
(`npm ci`) seguito da `expo install --fix`, che ha aggiornato `jest` e `@types/jest` alle
versioni compatibili. Risultato verificato:

- `node node_modules/expo/bin/cli install --check` → `Dependencies are up to date`
- `npm test` → 10/10 test passati
- `npm run typecheck` → nessun errore
- `npm start` → il server Metro si avvia e serve correttamente il bundle JavaScript
  dell'app (verificato scaricando il bundle per Android via HTTP).
