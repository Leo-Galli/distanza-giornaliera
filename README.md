# Distanza giornaliera — app Android in Python

Applicazione che usa il **GPS del cellulare** per calcolare la distanza percorsa nella giornata. Il GPS è preferibile all’accelerometro: quest’ultimo, da solo, non permette una misura affidabile della distanza senza una stima del passo e produce rapidamente errori.

## Funzioni

- avvio e pausa della misurazione;
- distanza del giorno in metri o chilometri;
- azzeramento automatico al cambio di data;
- azzeramento manuale;
- salvataggio locale del totale alla chiusura;
- filtri per coordinate non valide, segnale impreciso, rumore GPS, salti anomali e posizioni fuori sequenza;
- nessun account e nessun invio dei dati: il totale resta sul telefono.

## Limite della versione 1.0

La misurazione funziona **con l’app aperta e in primo piano**. Quando l’app viene messa in pausa, il GPS viene arrestato. Il tracciamento continuo a schermo spento richiede un servizio Android in primo piano, una notifica permanente e ulteriori permessi.

## File del progetto

- `main.py`: interfaccia Kivy e accesso al GPS Android tramite Plyer;
- `distance_tracker.py`: calcolo Haversine, controlli di qualità e salvataggio;
- `buildozer.spec`: configurazione per creare l’APK Android;
- `tests/test_distance_tracker.py`: test automatici del motore di calcolo.

## Eseguire i test

I test non richiedono Kivy né un telefono. Dalla cartella del progetto:

```bash
python3 -m unittest discover -s tests -v
```

## Creare l’APK

Buildozer è consigliato su Linux; su Windows si può usare WSL. Installare Python, Buildozer e le dipendenze di sistema richieste da Buildozer, quindi aprire un terminale nella cartella del progetto:

```bash
python3 -m pip install buildozer
buildozer android debug
```

La prima compilazione scarica gli strumenti Android e può richiedere parecchio tempo. Al termine, l’APK si trova nella cartella `bin/`. Copiarlo sul telefono e installarlo, autorizzando eventualmente l’installazione da origini esterne.

## Uso sul telefono

1. Attivare la localizzazione del dispositivo.
2. Aprire l’app e concedere l’autorizzazione alla **posizione precisa**.
3. Premere **AVVIA** e attendere il segnale GPS.
4. Muoversi normalmente: il totale aumenta a ogni tratto valido.
5. Premere **PAUSA** per interrompere la misurazione.

All’aperto il segnale è generalmente più preciso. Gallerie, edifici e risparmio energetico possono peggiorare la misura; i tratti con accuratezza superiore a 50 metri vengono scartati. Il consumo della batteria dipende dall’uso continuativo del GPS.

## Versione Expo (Android e iPhone)

La cartella [`app-expo/`](app-expo) contiene un porting identico (stessa logica Haversine, stessi filtri su precisione/rumore/salti GPS) in React Native/Expo, che gira sia su **Android** sia su **iPhone** tramite l'app Expo Go — senza bisogno di Mac né di un account sviluppatore Apple.

Per avviarlo:

```bash
cd app-expo
./start.sh        # Windows: start.bat
```

Lo script installa le dipendenze al primo avvio, mostra il QR code da inquadrare con Expo Go (Android) o con la Fotocamera (iPhone) e stampa le istruzioni passo-passo. Dettagli in [`app-expo/README.md`](app-expo/README.md).
