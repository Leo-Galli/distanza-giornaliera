// Promemoria giornaliero in stile Duolingo: una notifica locale alla sera che ricorda di tornare
// a camminare, menzionando la serie di giorni consecutivi se ce n'è una da non perdere.
// Solo notifiche locali (programmate sul telefono): niente server, niente push da remoto.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'promemoria-giornaliero';
const REMINDER_HOUR = 20;
const REMINDER_MINUTE = 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function reminderBody(streak: number): string {
  if (streak > 0) {
    return `Hai una serie di ${streak} ${streak === 1 ? 'giorno' : 'giorni'}! Fai due passi oggi per non perderla.`;
  }
  return 'Apri l’app e segna i passi di oggi.';
}

/** Riprogramma il promemoria delle 20:00 con il testo aggiornato in base alla serie attuale. */
export async function scheduleDailyReminder(streak: number): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Promemoria giornaliero',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Distanza giornaliera',
      body: reminderBody(streak),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
