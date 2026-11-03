// Storico dei giorni passati (passi + distanza), usato dalla schermata Statistiche e per
// calcolare la serie di giorni consecutivi in cui è stato raggiunto l'obiettivo passi.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'distanza-giornaliera:history';
const MAX_DAYS = 30;

export interface DayEntry {
  day: string; // 'YYYY-MM-DD'
  steps: number;
  distanceM: number;
}

export async function loadHistory(): Promise<DayEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (e): e is DayEntry =>
        e && typeof e.day === 'string' && Number.isFinite(e.steps) && Number.isFinite(e.distanceM)
    );
  } catch {
    return [];
  }
}

/** Aggiorna (o crea) la voce del giorno indicato con i totali correnti e la salva. */
export async function upsertDay(entry: DayEntry): Promise<DayEntry[]> {
  const list = await loadHistory();
  const idx = list.findIndex((e) => e.day === entry.day);
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  list.sort((a, b) => a.day.localeCompare(b.day));
  const trimmed = list.slice(-MAX_DAYS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

/**
 * Conta i giorni consecutivi (a ritroso da `today`) in cui i passi hanno raggiunto l'obiettivo.
 * Se oggi non ha ancora raggiunto l'obiettivo, la serie viene comunque calcolata a partire da ieri
 * (oggi è "in sospeso": completarlo estende la serie, ma non averlo ancora fatto non la rompe finché
 * la giornata non è finita).
 */
function localIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAY_LABELS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** Ultimi `n` giorni fino a `today` incluso, in ordine cronologico, con 0 per i giorni senza dati. */
export function lastNDays(history: DayEntry[], n: number, today: string): (DayEntry & { label: string })[] {
  const byDay = new Map(history.map((e) => [e.day, e]));
  const [y, m, d] = today.split('-').map(Number);
  const out: (DayEntry & { label: string })[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(y, m - 1, d - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const entry = byDay.get(key);
    out.push({ day: key, steps: entry?.steps ?? 0, distanceM: entry?.distanceM ?? 0, label: WEEKDAY_LABELS[date.getDay()] });
  }
  return out;
}

export function computeStreak(history: DayEntry[], goalSteps: number, today: string): number {
  const byDay = new Map(history.map((e) => [e.day, e]));
  let streak = 0;
  const todayEntry = byDay.get(today);
  if (todayEntry && todayEntry.steps >= goalSteps) {
    streak += 1;
  }

  const [y, m, d] = today.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  for (;;) {
    cursor.setDate(cursor.getDate() - 1);
    const entry = byDay.get(localIso(cursor));
    if (!entry || entry.steps < goalSteps) break;
    streak += 1;
  }
  return streak;
}
