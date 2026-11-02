// App Android/iOS in Expo per misurare la distanza GPS giornaliera.
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DailyDistanceTracker, FixResult } from './src/distanceTracker';

const BACKGROUND = '#0b1019';
const CARD = '#161d29';
const TEXT = '#f0f5ff';
const MUTED = '#99adc2';
const GREEN = '#29c787';
const RED = '#ed5252';

function formatDay(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function App() {
  const trackerRef = useRef<DailyDistanceTracker>(new DailyDistanceTracker());
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const [ready, setReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [day, setDay] = useState(formatDay(new Date()));
  const [details, setDetails] = useState('In attesa del primo segnale GPS');
  const [status, setStatus] = useState('Premi AVVIA e concedi l’accesso alla posizione');

  useEffect(() => {
    (async () => {
      await trackerRef.current.load();
      setDistanceM(trackerRef.current.totalMeters);
      setReady(true);
    })();

    const interval = setInterval(async () => {
      const changed = await trackerRef.current.rolloverIfNeeded(new Date());
      setDay(formatDay(new Date()));
      if (changed) setDistanceM(trackerRef.current.totalMeters);
    }, 1000);

    return () => {
      clearInterval(interval);
      subscriptionRef.current?.remove();
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

    subscriptionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      async (location) => {
        const { latitude, longitude, accuracy } = location.coords;
        const result = await trackerRef.current.processFix(
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
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setTracking(false);
    await trackerRef.current.save();
    setStatus('Misurazione in pausa');
  };

  const resetDistance = async () => {
    await trackerRef.current.reset();
    setDistanceM(0);
    setDetails('In attesa del primo segnale GPS');
    setStatus('Totale di oggi azzerato');
  };

  const distanceText = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(2)} km` : `${distanceM.toFixed(0)} m`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.sectionLabel}>DISTANZA DI OGGI</Text>
      <Text style={styles.dayLabel}>{day}</Text>

      <View style={styles.card}>
        <Text style={styles.distance}>{distanceText}</Text>
        <Text style={styles.details}>{details}</Text>
      </View>

      <Text style={styles.status}>{status}</Text>

      <View style={styles.spacer} />

      <Pressable
        style={[styles.button, { backgroundColor: GREEN }, tracking && styles.disabled]}
        disabled={tracking || !ready}
        onPress={startTracking}
      >
        <Text style={styles.buttonTextDark}>AVVIA</Text>
      </Pressable>

      <Pressable
        style={[styles.button, { backgroundColor: '#33424f' }, !tracking && styles.disabled]}
        disabled={!tracking}
        onPress={stopTracking}
      >
        <Text style={styles.buttonText}>PAUSA</Text>
      </Pressable>

      <Pressable style={styles.resetButton} onPress={resetDistance}>
        <Text style={styles.resetText}>Azzera il totale di oggi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  sectionLabel: {
    color: MUTED,
    fontSize: 18,
    textAlign: 'center',
  },
  dayLabel: {
    color: MUTED,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  distance: {
    color: TEXT,
    fontSize: 52,
    fontWeight: '700',
  },
  details: {
    color: MUTED,
    fontSize: 15,
    textAlign: 'center',
  },
  status: {
    color: MUTED,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  spacer: {
    flex: 1,
  },
  button: {
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  buttonTextDark: {
    color: '#051410',
    fontSize: 19,
    fontWeight: '700',
  },
  buttonText: {
    color: TEXT,
    fontSize: 19,
    fontWeight: '600',
  },
  resetButton: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    color: RED,
    fontSize: 15,
  },
});
