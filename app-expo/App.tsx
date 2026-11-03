// App Android/iOS in Expo per misurare i passi e la distanza GPS giornaliera.
import { LilitaOne_400Regular, useFonts } from '@expo-google-fonts/lilita-one';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { DailyDistanceTracker, FixResult } from './src/distanceTracker';
import { DailyStepTracker } from './src/stepTracker';
import { colors, space } from './src/theme';
import { Band, Button, Card, Panel, ProgressRing, T, TextButton } from './src/ui';

const STEP_GOAL = 10000;
const IOS_POLL_MS = 4000;

function formatDay(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function App() {
  const [fontsReady] = useFonts({ LilitaOne_400Regular });

  const distanceTrackerRef = useRef<DailyDistanceTracker>(new DailyDistanceTracker());
  const stepTrackerRef = useRef<DailyStepTracker>(new DailyStepTracker());
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const stepSubRef = useRef<{ remove: () => void } | null>(null);
  const iosPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [steps, setSteps] = useState(0);
  const [day, setDay] = useState(formatDay(new Date()));
  const [details, setDetails] = useState('In attesa del primo segnale GPS');
  const [status, setStatus] = useState('Premi AVVIA e concedi i permessi richiesti');
  const [stepsAvailable, setStepsAvailable] = useState(true);

  useEffect(() => {
    (async () => {
      await distanceTrackerRef.current.load();
      setDistanceM(distanceTrackerRef.current.totalMeters);

      await stepTrackerRef.current.load();
      setSteps(stepTrackerRef.current.totalSteps);

      if (Platform.OS === 'web') {
        setStepsAvailable(false);
      } else {
        const available = await Pedometer.isAvailableAsync().catch(() => false);
        setStepsAvailable(available);
        if (available && Platform.OS === 'ios') {
          // Su iOS il sistema registra i passi anche ad app chiusa: una lettura iniziale
          // mostra subito i passi di oggi, senza aspettare che l'utente prema AVVIA.
          const now = new Date();
          const result = await Pedometer.getStepCountAsync(startOfDay(now), now).catch(() => null);
          if (result) setSteps(result.steps);
        }
      }

      setReady(true);
    })();

    const interval = setInterval(async () => {
      const now = new Date();
      const distanceChanged = await distanceTrackerRef.current.rolloverIfNeeded(now);
      const stepsChanged = await stepTrackerRef.current.rolloverIfNeeded(now);
      setDay(formatDay(now));
      if (distanceChanged) setDistanceM(distanceTrackerRef.current.totalMeters);
      if (stepsChanged) setSteps(stepTrackerRef.current.totalSteps);
    }, 1000);

    return () => {
      clearInterval(interval);
      locationSubRef.current?.remove();
      stepSubRef.current?.remove();
      if (iosPollRef.current) clearInterval(iosPollRef.current);
    };
  }, []);

  const describeResult = (result: FixResult, latitude: number, longitude: number, accuracy: number | null) => {
    switch (result.reason) {
      case 'tratto_aggiunto':
        setDetails(`+${result.addedM.toFixed(1)} m · precisione ±${(accuracy ?? 0).toFixed(0)} m`);
        break;
      case 'precisione_insufficiente':
        setDetails('Segnale impreciso: posizione non conteggiata');
        break;
      case 'salto_gps_scartato':
        setDetails('Salto GPS anomalo scartato');
        break;
      default:
        setDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
    setDistanceM(result.totalM);
  };

  const startStepTracking = async () => {
    if (!stepsAvailable) return;

    const { status: permissionStatus } = await Pedometer.requestPermissionsAsync();
    if (permissionStatus !== 'granted') {
      setStepsAvailable(false);
      return;
    }

    if (Platform.OS === 'ios') {
      const poll = async () => {
        const now = new Date();
        const result = await Pedometer.getStepCountAsync(startOfDay(now), now).catch(() => null);
        if (result) setSteps(result.steps);
      };
      await poll();
      iosPollRef.current = setInterval(poll, IOS_POLL_MS);
    } else {
      stepTrackerRef.current.startNewSession();
      stepSubRef.current = Pedometer.watchStepCount(async (result) => {
        const total = await stepTrackerRef.current.updateSession(result.steps, new Date());
        setSteps(total);
      });
    }
  };

  const stopStepTracking = async () => {
    stepSubRef.current?.remove();
    stepSubRef.current = null;
    if (iosPollRef.current) {
      clearInterval(iosPollRef.current);
      iosPollRef.current = null;
    }
    if (Platform.OS !== 'ios') {
      await stepTrackerRef.current.save();
    }
  };

  const startTracking = async () => {
    if (tracking) return;

    const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
    if (permissionStatus !== 'granted') {
      setStatus('Senza posizione precisa l’app non può misurare');
      return;
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      setStatus('Attiva la localizzazione del dispositivo');
      return;
    }

    setStatus('Misurazione attiva · cerca il segnale GPS');
    setTracking(true);

    await startStepTracking();

    locationSubRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      async (location) => {
        const { latitude, longitude, accuracy } = location.coords;
        const result = await distanceTrackerRef.current.processFix(
          latitude,
          longitude,
          accuracy ?? null,
          new Date(location.timestamp)
        );
        describeResult(result, latitude, longitude, accuracy ?? null);
      }
    );
  };

  const stopTracking = async () => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    await stopStepTracking();
    setTracking(false);
    await distanceTrackerRef.current.save();
    setStatus('Misurazione in pausa');
  };

  const resetToday = async () => {
    await distanceTrackerRef.current.reset();
    await stepTrackerRef.current.reset();
    setDistanceM(0);
    setSteps(0);
    setDetails('In attesa del primo segnale GPS');
    setStatus('Dati di oggi azzerati');
  };

  const distanceText = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${distanceM.toFixed(0)} m`;
  const progress = Math.min(1, steps / STEP_GOAL);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Panel style={styles.panel}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="shoe-print" size={26} color="#fff" />
          <T v="h2" color="#fff" style={styles.headerTitle}>CONTAPASSI DI OGGI</T>
        </View>

        <View style={styles.body}>
          <T v="label" style={{ textAlign: 'center' }}>{day}</T>

          <View style={styles.ringWrap}>
            <ProgressRing progress={progress} size={200} strokeWidth={18}>
              <MaterialCommunityIcons name="shoe-print" size={28} color={colors.lime} />
              <T v="huge" style={{ marginTop: 2 }}>{stepsAvailable ? steps.toLocaleString('it-IT') : '--'}</T>
              <T v="label">{stepsAvailable ? `passi · obiettivo ${STEP_GOAL.toLocaleString('it-IT')}` : 'contapassi non disponibile'}</T>
            </ProgressRing>
          </View>

          <Card accent={colors.amber} style={{ width: '100%' }}>
            <MaterialCommunityIcons name="map-marker-distance" size={22} color={colors.amber} />
            <T v="big">{distanceText}</T>
            <T v="label">distanza percorsa (GPS)</T>
          </Card>

          <Band title={status} sub={tracking ? details : undefined} />

          <View style={{ height: space.sm }} />

          <Button label="AVVIA" color={colors.lime} disabled={tracking || !ready} onPress={startTracking} />
          <View style={{ height: space.sm }} />
          <Button label="PAUSA" color={colors.violet} disabled={!tracking} onPress={stopTracking} />
          <TextButton label="Azzera i dati di oggi" onPress={resetToday} />
        </View>
      </Panel>
    </View>
  );
}

const styles = {
  root: {
    flex: 1 as const,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    paddingTop: 50,
    paddingBottom: space.lg,
  },
  panel: {
    flex: 1 as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: colors.hdrGreen,
    paddingVertical: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#3F8A33',
  },
  headerTitle: {
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  body: {
    flex: 1 as const,
    padding: space.lg,
    gap: space.md,
    alignItems: 'center' as const,
  },
  ringWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: space.sm,
  },
};
