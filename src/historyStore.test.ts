import AsyncStorage from '@react-native-async-storage/async-storage';

import { computeStreak, DayEntry, lastNDays, loadHistory, upsertDay } from './historyStore';

const GOAL = 10000;

describe('upsertDay / loadHistory', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('crea una voce nuova per un giorno mai visto', async () => {
    const list = await upsertDay({ day: '2026-05-10', steps: 4000, distanceM: 3000 });
    expect(list).toEqual([{ day: '2026-05-10', steps: 4000, distanceM: 3000 }]);
  });

  it('aggiorna la voce esistente invece di duplicarla', async () => {
    await upsertDay({ day: '2026-05-10', steps: 4000, distanceM: 3000 });
    const list = await upsertDay({ day: '2026-05-10', steps: 9000, distanceM: 6500 });
    expect(list).toHaveLength(1);
    expect(list[0].steps).toBe(9000);
  });

  it('mantiene le voci ordinate per giorno e persiste tra riletture', async () => {
    await upsertDay({ day: '2026-05-11', steps: 1000, distanceM: 500 });
    await upsertDay({ day: '2026-05-09', steps: 2000, distanceM: 900 });
    const reloaded = await loadHistory();
    expect(reloaded.map((e) => e.day)).toEqual(['2026-05-09', '2026-05-11']);
  });

  it('tiene al massimo gli ultimi 30 giorni', async () => {
    const base = new Date(2026, 0, 1);
    for (let i = 0; i < 35; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await upsertDay({ day, steps: 100, distanceM: 50 });
    }
    const list = await loadHistory();
    expect(list.length).toBe(30);
    expect(list[0].day).toBe('2026-01-06');
    expect(list[29].day).toBe('2026-02-04');
  });
});

describe('computeStreak', () => {
  const entry = (day: string, steps: number): DayEntry => ({ day, steps, distanceM: steps * 0.7 });

  it('e 0 senza storico', () => {
    expect(computeStreak([], GOAL, '2026-05-10')).toBe(0);
  });

  it('conta oggi se l obiettivo e gia raggiunto', () => {
    const history = [entry('2026-05-10', 12000)];
    expect(computeStreak(history, GOAL, '2026-05-10')).toBe(1);
  });

  it('non si interrompe se oggi non ha ancora raggiunto l obiettivo', () => {
    const history = [entry('2026-05-09', 11000), entry('2026-05-10', 500)];
    expect(computeStreak(history, GOAL, '2026-05-10')).toBe(1);
  });

  it('conta i giorni consecutivi a ritroso e si ferma al primo giorno mancante', () => {
    const history = [
      entry('2026-05-06', 500), // sotto obiettivo: interrompe la catena prima di questo giorno
      entry('2026-05-07', 11000),
      entry('2026-05-08', 10500),
      entry('2026-05-09', 10000),
      entry('2026-05-10', 15000),
    ];
    expect(computeStreak(history, GOAL, '2026-05-10')).toBe(4);
  });

  it('un giorno mancante nello storico interrompe la serie', () => {
    const history = [entry('2026-05-08', 12000), entry('2026-05-10', 12000)];
    // manca il 2026-05-09
    expect(computeStreak(history, GOAL, '2026-05-10')).toBe(1);
  });
});

describe('lastNDays', () => {
  it('riempie con 0 i giorni senza dati e include oggi', () => {
    const history: DayEntry[] = [{ day: '2026-05-10', steps: 1234, distanceM: 900 }];
    const days = lastNDays(history, 3, '2026-05-10');
    expect(days.map((d) => d.day)).toEqual(['2026-05-08', '2026-05-09', '2026-05-10']);
    expect(days.map((d) => d.steps)).toEqual([0, 0, 1234]);
  });

  it('attraversa correttamente il cambio di mese', () => {
    const days = lastNDays([], 3, '2026-03-01');
    expect(days.map((d) => d.day)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
});
