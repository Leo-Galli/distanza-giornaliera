# Come funziona la versione Expo e perché gira su tutti i dispositivi

Questo documento spiega:

1. **Come** la porta Expo/React Native (questa app, alla radice del repository) riesce a girare
   sia su Android sia su iPhone (e anche sul Web) partendo dallo stesso codice, a differenza
   della versione Python/Kivy originale in [`python-kivy/`](python-kivy) (che gira solo su
   Android via Buildozer).
2. **Quale problema** impediva ai comandi (`npm start`, `npm test`, ecc.) di funzionare su
   questo PC Windows, e come è stato risolto.
3. **Come funziona il contapassi** aggiunto in un secondo momento, e perché è più affidabile
   della sola distanza GPS.
4. Perché **scuotere il telefono non apre più il menu sviluppatore** di Expo Go.
5. Da dove viene lo **stile grafico** dell'interfaccia.
6. Come funzionano **statistiche, obiettivi, serie ("streak"), avatar 3D e promemoria** in
   stile Duolingo.
7. Come viene generato e pubblicato l'**APK Android** tramite EAS Build.

La versione Python/Kivy in [`python-kivy/`](python-kivy) (`distance_tracker.py`, `main.py`,
`buildozer.spec`) **non è stata modificata**: resta la versione "storica", compilabile solo
per Android tramite Buildozer. Tutto quello che segue riguarda esclusivamente questa app.

## 1. Perché la stessa app gira su Android, iPhone e Web

### Un solo codice, tre piattaforme

- **Logica di calcolo** (`src/distanceTracker.ts`): è un porting 1:1, in TypeScript puro,
  di `python-kivy/distance_tracker.py` (formula di Haversine, filtri su precisione/rumore/salti
  GPS, azzeramento a mezzanotte). Non dipende da nessuna API di piattaforma, quindi è identica
  su Android, iPhone e Web, ed è testata con lo stesso identico set di casi di
  `python-kivy/tests/test_distance_tracker.py` (vedi `src/distanceTracker.test.ts`).
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

In `package.json`, `start.bat` e `start.sh`, i comandi non passano più dagli shim
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
- **Non tocca l'app Python/Kivy originale** in `python-kivy/`: riguarda solo gli script di
  avvio di questa app.

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

Mancavano anche `react-dom` e `react-native-web`: senza queste due dipendenze `npm run web`
non riusciva a compilare (`expo start --web` richiede entrambe per qualunque progetto Expo,
non solo per questo). Sono state installate con `expo install`; ora anche la build Web
compila correttamente.

## 3. Come funziona il contapassi

La distanza GPS (`src/distanceTracker.ts`, invariata) resta il modo più preciso per misurare
**quanta strada** si fa all'aperto, ma non è pensata per contare i passi: al chiuso, o quando
ci si muove poco, il segnale GPS è impreciso o assente e i filtri anti-rumore del tracker
(necessari per non "inventare" distanza per colpa del rumore GPS) finiscono per non contare
niente. Per un vero contapassi si usa invece il sensore passi dedicato del telefono
(accelerometro + coprocessore di movimento), tramite `Pedometer` di `expo-sensors` — la stessa
componentistica hardware usata dai contapassi nativi di Android e iOS, molto più precisa al
chiuso e indipendente dal GPS.

Le due funzioni restano indipendenti nell'app: se il permesso "attività fisica" viene negato,
il contapassi mostra "non disponibile" ma la distanza GPS continua a funzionare come prima
(e viceversa).

### iOS: il sistema tiene già il conto

Su iOS, `Pedometer.getStepCountAsync(inizioGiornata, adesso)` chiede direttamente al sistema
operativo quanti passi sono già stati fatti oggi (Apple registra i passi in background tramite
il coprocessore di movimento, indipendentemente dal fatto che l'app sia aperta). L'app si limita
a interrogare questa API ogni pochi secondi mentre è in primo piano: non deve salvare o sommare
nulla, perché la fonte di verità è sempre il sistema operativo. Per questo su iOS non esiste
`src/stepTracker.ts` nel percorso di codice: l'informazione è già corretta "di fabbrica".

### Android: il sensore riparte da 0 ad ogni ascolto

Su Android non esiste un equivalente di `getStepCountAsync` (lo riporta anche la libreria:
"Getting step count for date range is not supported on Android yet"). L'unica via è
`Pedometer.watchStepCount(...)`, che però segue il sensore nativo `TYPE_STEP_COUNTER`: il
modulo nativo di Expo **azzera il contatore ogni volta che ci si mette in ascolto** (vedi
`PedometerModule.kt` nel codice sorgente di `expo-sensors`), quindi il valore ricevuto è
"passi da quando ho premuto AVVIA l'ultima volta", non il totale di oggi.

`src/stepTracker.ts` (`DailyStepTracker`) risolve il problema con la stessa filosofia già usata
per la distanza in `distanceTracker.ts`: un totale "di oggi" persistito con
`@react-native-async-storage/async-storage`, che si azzera da solo a mezzanotte. Ad ogni nuova
sessione di ascolto (`startNewSession()`) il totale già confermato viene "congelato" come base,
e i nuovi passi della sessione corrente (`updateSession(...)`) si sommano sopra quella base — così
chiudere e riaprire l'app, o premere PAUSA e poi AVVIA di nuovo, non fa perdere né raddoppiare
passi già contati. La logica è testata in `src/stepTracker.test.ts`.

## 4. Perché scuotere il telefono non apre più il menu di Expo Go

Scuotere il telefono (o premere `Ctrl+Cmd+Z`/tre dita sullo schermo) apre normalmente il "menu
sviluppatore" di Expo Go — comodo durante lo sviluppo, ma indesiderato mentre si usa l'app come
se fosse già quella finita. A partire da Expo SDK 58, la CLI supporta la variabile d'ambiente
`EXPO_NO_DEV_MENU=1`, che avvia il progetto con il menu sviluppatore disattivato (oltre a
nascondere il pulsante degli strumenti e saltare l'onboarding).

`scripts/expo-cli.js` (il wrapper usato da tutti gli script, vedi sezione 2) imposta questa
variabile automaticamente prima di avviare `expo start`, quindi non serve nessuna azione manuale:
basta usare `npm start` / `start.bat` / `start.sh` come sempre. La variabile riguarda solo la
sessione di sviluppo con Expo Go: non esiste equivalente da disattivare in un'app pubblicata,
perché il menu sviluppatore (e il suo gesto di attivazione) non esistono già più nelle build di
produzione.

## 5. Da dove viene lo stile grafico

L'interfaccia (pannello crema con bordo spesso, intestazione colorata, bottoni "3D" con
ombreggiatura in basso, font arrotondato "Lilita One", anello di progresso per i passi) riusa lo
stesso linguaggio visivo già usato in un altro progetto Expo dell'autore
(`C:\Users\leoga\Desktop\gioco`, vedi `src/ui/theme.ts` e `src/ui/Primitives.tsx` di
quel progetto): stessi colori, stesso font (pacchetto pubblico `@expo-google-fonts/lilita-one`,
licenza Google Fonts, non un file copiato), stessa tecnica per i bottoni "a rilievo" e per
l'ombra "da adesivo" sul testo colorato. `src/theme.ts` e `src/ui.tsx` in questo progetto sono
una versione ridotta e adattata di quei due file, con solo i componenti che servono qui (niente
suoni, navigazione o economia di gioco, che non hanno senso in questa app).

L'anello di progresso dei passi usa `react-native-svg` (incluso in Expo Go), con un cerchio
tratteggiato la cui lunghezza visibile rappresenta la percentuale rispetto all'obiettivo
giornaliero scelto nel Profilo (vedi sezione 6).

## 6. Statistiche, obiettivi, serie e promemoria

Queste funzioni sono tutte "meccaniche" aggiuntive sopra ai due numeri di base (passi e
distanza): non cambiano come vengono calcolati, solo come vengono presentati e usati per
motivare a tornare ogni giorno.

### Storico e statistiche

`src/historyStore.ts` salva, per ciascuno degli ultimi 30 giorni, i passi e la distanza totali
di quel giorno (`upsertDay`, richiamato da `App.tsx` ogni volta che uno dei due numeri cambia,
quindi anche "in diretta" per il giorno corrente). La scheda **Statistiche**
(`src/screens/StatsScreen.tsx`) legge questo storico per mostrare un grafico a barre degli
ultimi 7 giorni, i totali settimanali e il giorno migliore.

### Obiettivo giornaliero e serie ("streak")

`src/profile.ts` definisce 4 livelli di obiettivo passi (`GOAL_PRESETS`: Leggero 5.000,
Normale 8.000, Attivo 10.000, Intenso 15.000), scelti con lo slider a segmenti nel Profilo e
salvati insieme al resto delle preferenze. `computeStreak` in `src/historyStore.ts` conta
quanti giorni consecutivi (andando a ritroso da oggi) hanno raggiunto quell'obiettivo: oggi
"non rompe" la serie finché la giornata non è finita (va soltanto a confermarla se l'obiettivo
viene raggiunto), esattamente come il concetto di "streak" di Duolingo. La logica è coperta da
`src/historyStore.test.ts`.

### Avatar in 3D vero, dettagliato ma senza rallentare il telefono

L'avatar scelto nella scheda Profilo non è un'icona piatta: è un personaggio renderizzato in 3D
con una vera pipeline grafica WebGL — luci, materiali, una ventina di forme per personaggio —
esattamente come in un piccolo videogioco, non un trucco fatto con ombre su un'immagine 2D.
La tecnica usata è la stessa, collaudata, di un altro progetto Expo dell'autore che disegna
decine di personaggi 3D in tempo reale su schermo.

- **`expo-gl`** fornisce un contesto WebGL dentro un componente `<GLView>` (incluso in Expo Go,
  nessuna build nativa richiesta).
- **`@react-three/fiber`** (r3f) è il "React" sopra **`three.js`** — permette di descrivere la
  scena 3D con componenti JSX (`<mesh>`, `<ambientLight>`, ecc.) invece che con chiamate
  imperative. `src/avatar3d/r3f.ts` e `r3f.native.ts` sono due file "gemelli": Metro sceglie
  automaticamente quello giusto in base alla piattaforma (suffisso `.native.ts` per
  Android/iOS, altrimenti il file `.ts` semplice per il Web), così il resto del codice importa
  sempre `./r3f` senza doversi preoccupare della differenza. La variante nativa include anche una
  piccola "pezza" per `THREE.LoaderUtils`, che le versioni recenti di three.js hanno rimosso ma
  che react-three-fiber si aspetta ancora di trovare.
- **`src/avatar3d/prims.tsx`** definisce i "mattoncini" (sfera, capsula, scatola con spigoli
  arrotondati, cono, occhio a tre strati con pupilla e un puntino di luce) usati per comporre il
  personaggio, con le geometrie e i materiali tenuti in cache per non ricrearli ad ogni render.
- **`src/avatar3d/Character3D.tsx`** assembla testa, corpo e faccia, più i dettagli che
  distinguono ciascuna delle 8 specie (Tondo, Robot, Gatto, Coniglio, Alieno, Panda, Unicorno,
  Ape): orecchie, baffi, antenna, corno, ali... Il colore scelto dall'utente tinge il materiale
  di corpo/testa; i dettagli scuri (occhi, bocca) restano fissi.
- **`src/avatar3d/Merged.tsx`** è l'ingrediente che rende possibile avere un personaggio
  "complesso" (15-20 forme) senza rallentare nulla: appena il personaggio è montato, unisce tutte
  le sue forme statiche in 1-2 mesh sole (con il colore di ciascun pezzo "cotto" nei vertici),
  nascondendo gli originali. Il telefono disegna così un paio di mesh invece di venti, con lo
  stesso risultato visivo.
- **`src/Avatar3D.tsx`** mette in scena tutto questo: usa `frameloop="demand"` (il canvas non
  ridisegna automaticamente 60 volte al secondo) insieme a un piccolo timer che richiede un nuovo
  frame circa 30 volte al secondo, quanto basta per una rotazione fluida senza tenere la GPU
  impegnata al massimo per un cerchietto piccolo di schermo. Il `dpr` (pixel per punto) è anche
  limitato, perché un avatar di ~140 px non ha bisogno della risoluzione piena di un telefono di
  fascia alta.

Il selettore dell'avatar (la griglia delle 8 specie) resta invece fatto di semplici icone piatte
di `@expo/vector-icons`: aprire 8 contesti WebGL contemporaneamente solo per un selettore
sarebbe uno spreco di risorse sul telefono. Lo stesso vale per il pallino dell'avatar
nell'intestazione, visibile in ogni schermata: mostra l'icona piatta della specie scelta, non il
rendering 3D in continuo, per non tenere un contesto grafico attivo per l'intera sessione. Solo
l'anteprima grande nella scheda Profilo usa la pipeline 3D completa.

### Promemoria giornaliero ("torna domani")

Se l'utente attiva l'interruttore "Promemoria giornaliero" nel Profilo, `src/notifications.ts`
programma (con `expo-notifications`) una notifica locale **ricorrente ogni giorno alle 20:00**,
il cui testo menziona la serie attuale ("Hai una serie di N giorni! Fai due passi oggi per non
perderla.") per spingere a tornare prima che la giornata finisca — lo stesso meccanismo usato
da app come Duolingo per il promemoria giornaliero. È sempre e solo una notifica **locale**,
programmata sul telefono stesso: non esiste nessun server che tiene traccia degli utenti o
invia notifiche da remoto. Ogni volta che la serie cambia, il testo programmato viene
aggiornato (`scheduleDailyReminder` cancella e riprogramma la notifica).

## 7. Come viene pubblicato l'APK Android

L'app viene compilata in un vero file `.apk` installabile (non solo eseguita dentro Expo Go)
tramite [EAS Build](https://docs.expo.dev/build/introduction/), il servizio cloud di Expo che
compila l'app nativa senza bisogno di Android Studio in locale.

- `eas.json` definisce un profilo `production` con `"android": { "buildType": "apk" }`: per
  impostazione predefinita EAS Build produce un `.aab` (pensato solo per essere caricato sul
  Play Store), mentre un `.apk` si può installare direttamente su un telefono.
- Il progetto è collegato a un account Expo (`npx eas-cli@latest init`, che ha scritto
  `extra.eas.projectId` in `app.json`) necessario perché EAS sappia a quale progetto cloud
  associare le build.
- Ogni build parte con `npx eas-cli@latest build --platform android --profile production`;
  l'opzione `"autoIncrement": true` nel profilo fa incrementare da sola il numero di build
  (`android.versionCode`) ad ogni nuova build, così due APK diversi non hanno mai lo stesso
  numero di versione.
- L'APK compilato viene scaricato e allegato a una **Release su GitHub** di questo repository
  (`gh release create`), così chiunque possa scaricarlo dalla pagina delle Release senza
  bisogno di un account Expo né di Expo Go — vedi il link in cima al `README.md`.
