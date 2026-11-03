# Flowchart dell'applicazione

Schema visivo di come è fatta l'app e di come scorrono i dati, utile per orientarsi nel codice
senza doverlo leggere tutto. Per la spiegazione testuale dettagliata di ciascun pezzo vedi
[`COME-FUNZIONA.md`](./COME-FUNZIONA.md); questo file mostra solo i flussi.

## 1. Architettura generale

Chi dipende da cosa, ad alto livello. `App.tsx` è l'unico punto che tiene lo stato e lo passa
alle tre schede; le schede non parlano mai direttamente tra loro.

```mermaid
flowchart TB
    App["App.tsx<br/>(stato, GPS, contapassi, notifiche)"]

    subgraph Schede["src/screens/"]
        Oggi["TodayScreen.tsx"]
        Stats["StatsScreen.tsx"]
        Prof["ProfileScreen.tsx"]
    end

    subgraph Logica["Logica pura (testata con Jest)"]
        Dist["distanceTracker.ts<br/>(invariato dall'originale Python)"]
        Step["stepTracker.ts"]
        Hist["historyStore.ts"]
        Prof2["profile.ts"]
    end

    subgraph Piattaforma["API di sistema (expo-*)"]
        Loc["expo-location"]
        Ped["expo-sensors (Pedometer)"]
        Notif["expo-notifications"]
        Storage["AsyncStorage"]
    end

    subgraph Grafica["src/ui.tsx, theme.ts, Avatar3D.tsx"]
        UI["Componenti chunky<br/>(Card, Button, ProgressRing, BarChart, TabBar...)"]
        Avatar3D["Avatar3D.tsx + avatarModel.ts<br/>(expo-gl + three.js)"]
    end

    App --> Oggi & Stats & Prof
    Oggi --> UI
    Stats --> UI
    Prof --> UI
    Prof --> Avatar3D

    App --> Dist --> Storage
    App --> Step --> Storage
    App --> Hist --> Storage
    App --> Prof2 --> Storage

    App --> Loc
    App --> Ped
    App --> Notif
```

## 2. Avvio dell'app

Cosa succede tra l'apertura dell'app e la prima schermata utile.

```mermaid
flowchart TD
    Start(["Apertura app"]) --> LoadFonts["Carica il font Lilita One<br/>(useFonts)"]
    LoadFonts --> LoadDist["distanceTracker.load()<br/>legge il totale di oggi"]
    LoadDist --> LoadStep["stepTracker.load()<br/>legge i passi di oggi (Android)"]
    LoadStep --> LoadHist["historyStore.loadHistory()<br/>ultimi 30 giorni"]
    LoadHist --> LoadProf["profile.loadProfile()<br/>avatar, obiettivo, notifiche"]
    LoadProf --> CheckPlatform{"Piattaforma?"}

    CheckPlatform -- Web --> NoPed["Contapassi non disponibile"]
    CheckPlatform -- "Android/iOS" --> CheckAvail{"Pedometer<br/>disponibile sul device?"}
    CheckAvail -- No --> NoPed
    CheckAvail -- Sì --> CheckIOS{"iOS?"}
    CheckIOS -- Sì --> InitialQuery["getStepCountAsync(inizio giornata, ora)<br/>mostra subito i passi di oggi"]
    CheckIOS -- "No (Android)" --> WaitStart["Aspetta che l'utente prema AVVIA"]

    NoPed --> Ready
    InitialQuery --> Ready
    WaitStart --> Ready
    Ready(["App pronta — mostra la scheda Oggi"])

    Ready --> Timer["Timer ogni 1s:<br/>controlla se è cambiato il giorno"]
    Timer -->|giorno cambiato| Rollover["Azzera distanza e passi,<br/>salva il nuovo giorno"]
    Rollover --> Timer
    Timer -->|stesso giorno| Timer
```

## 3. AVVIA / PAUSA — tracciamento di oggi

Il cuore dell'app: cosa succede quando si preme AVVIA, e come si dividono GPS e contapassi.

```mermaid
flowchart TD
    Avvia(["Utente preme AVVIA"]) --> PermLoc{"Permesso posizione<br/>concesso?"}
    PermLoc -- No --> ErrLoc["Mostra: serve la posizione precisa"]
    PermLoc -- Sì --> GPSOn{"GPS del telefono<br/>attivo?"}
    GPSOn -- No --> ErrGPS["Mostra: attiva la localizzazione"]
    GPSOn -- Sì --> StartBoth["tracking = true"]

    StartBoth --> StepFlow & GPSFlow

    subgraph GPSFlow["Distanza (GPS)"]
        WatchPos["Location.watchPositionAsync<br/>un evento per ogni nuova posizione"] --> ProcessFix["distanceTracker.processFix(lat, lon, precisione, orario)"]
        ProcessFix --> Valid{"Fix valido?"}
        Valid -- "coordinate non valide / precisione scarsa / salto anomalo" --> Discard["Scartato: non si somma nulla"]
        Valid -- "primo punto / nuovo segmento" --> SetRef["Nuovo riferimento, nessuna somma"]
        Valid -- "movimento plausibile" --> AddDist["Somma la distanza Haversine<br/>al totale di oggi e salva"]
    end

    subgraph StepFlow["Passi"]
        PermPed{"Permesso attività fisica<br/>concesso?"}
        PermPed -- No --> NoStepUI["Contapassi: non disponibile<br/>(la distanza continua comunque)"]
        PermPed -- Sì --> PlatformCheck{"iOS o Android?"}
        PlatformCheck -- iOS --> Poll["Interroga getStepCountAsync<br/>ogni 4 secondi (fonte: il sistema operativo)"]
        PlatformCheck -- Android --> Watch["Pedometer.watchStepCount<br/>(riparte da 0 ad ogni sessione)"]
        Watch --> Accumulate["stepTracker: somma la sessione<br/>al totale già confermato, poi salva"]
    end

    AddDist --> Live["Aggiorna l'anello/distanza a schermo in diretta"]
    Accumulate --> Live
    Poll --> Live

    Live --> Pausa(["Utente preme PAUSA"])
    Pausa --> StopAll["Ferma GPS e contapassi,<br/>salva i totali finali"]
```

## 4. Statistiche, obiettivo e serie ("streak")

Come i numeri di "Oggi" diventano lo storico e la serie mostrata in Statistiche/Profilo.

```mermaid
flowchart LR
    Live2["Passi e distanza di oggi<br/>(stato in App.tsx)"] -->|"ad ogni variazione"| Upsert["historyStore.upsertDay(oggi, passi, distanza)"]
    Upsert --> History[("Storico<br/>ultimi 30 giorni")]
    History --> Chart["StatsScreen: grafico a barre<br/>ultimi 7 giorni + totali + miglior giorno"]
    History --> Streak["computeStreak(storico, obiettivo, oggi)"]
    Goal["Obiettivo scelto nel Profilo<br/>(Leggero/Normale/Attivo/Intenso)"] --> Streak
    Streak --> StreakUI["Mostrata in Statistiche e Profilo<br/>(🔥 N giorni)"]
    Streak -->|"se il promemoria è attivo"| Reschedule["notifications.scheduleDailyReminder(streak)<br/>testo aggiornato con la serie attuale"]
```

## 5. Profilo: avatar 3D, obiettivo, promemoria

```mermaid
flowchart TD
    ProfScreen(["Scheda Profilo"]) --> PickSpecies["Scegli la specie<br/>(8 icone piatte nella griglia)"]
    ProfScreen --> PickColor["Scegli il colore<br/>(6 pallini)"]
    ProfScreen --> TypeName["Scrivi il nome"]
    PickSpecies --> SaveProfile["profile.saveProfile(...)"]
    PickColor --> SaveProfile
    TypeName --> SaveProfile
    SaveProfile --> Render3D["Avatar3D.tsx: ricostruisce la scena Three.js<br/>(avatarModel.ts: forma in base alla specie, colore scelto)"]
    Render3D --> Spin["Ciclo di rendering: ruota + 'respira'<br/>finché la scheda resta montata"]

    ProfScreen --> PickGoal["Scegli l'obiettivo giornaliero"]
    PickGoal --> SaveProfile

    ProfScreen --> ToggleNotif{"Attiva il promemoria?"}
    ToggleNotif -- Sì --> AskPerm{"Permesso notifiche<br/>concesso?"}
    AskPerm -- No --> Revert["Interruttore torna su OFF"]
    AskPerm -- Sì --> Schedule["Programma la notifica locale<br/>giornaliera delle 20:00"]
    ToggleNotif -- No --> Cancel["Cancella la notifica programmata"]
```
