// App Android/iOS in Expo per misurare i passi e la distanza GPS giornaliera.
import { LilitaOne_400Regular, useFonts } from '@expo-google-fonts/lilita-one';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { DailyDistanceTracker, FixResult } from './src/distanceTracker';
import { computeStreak, DayEntry, loadHistory, upsertDay } from './src/historyStore';
import { cancelDailyReminder, requestNotificationPermission, scheduleDailyReminder } from './src/notifications';
import { Avatar, DEFAULT_PROFILE, loadProfile, Profile, saveProfile, SPECIES_ICON } from './src/profile';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { DailyStepTracker } from './src/stepTracker';
import { colors, space } from './src/theme';
import { Icon, Panel, T, TabBar } from './src/ui';

const IOS_POLL_MS = 4000;

type Tab = 'oggi' | 'statistiche' | 'profilo';
const TABS: { key: Tab; label: string; icon: string; title: string }[] = [
  { key: 'oggi', label: 'Oggi', icon: 'shoe-print', title: 'OGGI' },
  { key: 'statistiche', label: 'Statistiche', icon: 'chart-bar', title: 'STATISTICHE' },
  { key: 'profilo', label: 'Profilo', icon: 'account-circle', title: 'PROFILO' },
];

function formatDay(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function App() {
  useFonts({ LilitaOne_400Regular });

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
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [tab, setTab] = useState<Tab>('oggi');

  const todayIso = isoDay(new Date());
  const streak = useMemo(() => computeStreak(history, profile.goalSteps, todayIso), [history, profile.goalSteps, todayIso]);

  useEffect(() => {
    (async () => {
      await distanceTrackerRef.current.load();
      setDistanceM(distanceTrackerRef.current.totalMeters);

      await stepTrackerRef.current.load();
      setSteps(stepTrackerRef.current.totalSteps);

      setHistory(await loadHistory());
      setProfile(await loadProfile());

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

  // Tiene lo storico (per le Statistiche e per la serie) allineato ai totali di oggi.
  useEffect(() => {
    if (!ready) return;
    upsertDay({ day: todayIso, steps, distanceM }).then(setHistory);
  }, [ready, todayIso, steps, distanceM]);

  // Riprogramma il promemoria quando cambia la serie, finché l'utente lo tiene attivo.
  useEffect(() => {
    if (!ready || !profile.notificationsEnabled) return;
    scheduleDailyReminder(streak).catch(() => {});
  }, [ready, profile.notificationsEnabled, streak]);

  const updateProfile = (next: Profile) => {
    setProfile(next);
    saveProfile(next).catch(() => {});
  };

  const onChangeAvatar = (avatar: Avatar) => updateProfile({ ...profile, avatar });
  const onChangeGoal = (goalSteps: number) => updateProfile({ ...profile, goalSteps });

  const onToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await scheduleDailyReminder(streak);
      updateProfile({ ...profile, notificationsEnabled: true });
    } else {
      await cancelDailyReminder();
      updateProfile({ ...profile, notificationsEnabled: false });
    }
  };

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
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.shell}>
      <Panel style={styles.panel}>
        <View style={styles.header}>
          <Icon name={activeTab.icon} size={24} color="#fff" />
          <T v="h2" color="#fff" style={styles.headerTitle}>{activeTab.title}</T>
          <View style={[styles.avatarPill, { borderColor: profile.avatar.color }]}>
            <Icon name={SPECIES_ICON[profile.avatar.species]} size={18} color={profile.avatar.color} />
          </View>
        </View>

        <View style={styles.screen}>
          {tab === 'oggi' && (
            <TodayScreen
              day={day}
              steps={steps}
              stepsAvailable={stepsAvailable}
              goalSteps={profile.goalSteps}
              distanceText={distanceText}
              tracking={tracking}
              ready={ready}
              status={status}
              details={details}
              onStart={startTracking}
              onStop={stopTracking}
              onReset={resetToday}
            />
          )}
          {tab === 'statistiche' && (
            <StatsScreen history={history} goalSteps={profile.goalSteps} streak={streak} today={todayIso} />
          )}
          {tab === 'profilo' && (
            <ProfileScreen
              avatar={profile.avatar}
              onChangeAvatar={onChangeAvatar}
              goalSteps={profile.goalSteps}
              onChangeGoal={onChangeGoal}
              notificationsEnabled={profile.notificationsEnabled}
              onToggleNotifications={onToggleNotifications}
              streak={streak}
            />
          )}
        </View>

        <TabBar tabs={TABS} value={tab} onChange={setTab} />
      </Panel>
      </View>
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
  shell: {
    flex: 1 as const,
    width: '100%' as const,
    maxWidth: 480,
    alignSelf: 'center' as const,
    minWidth: 0,
  },
  panel: {
    flex: 1 as const,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: colors.hdrGreen,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    borderBottomWidth: 4,
    borderBottomColor: '#3F8A33',
  },
  headerTitle: {
    flex: 1 as const,
    textAlign: 'center' as const,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  avatarPill: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  screen: {
    flex: 1 as const,
    minWidth: 0,
  },
};
