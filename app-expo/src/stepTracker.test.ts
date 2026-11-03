import AsyncStorage from '@react-native-async-storage/async-storage';

import { DailyStepTracker } from './stepTracker';

const START = new Date(2026, 4, 10, 8, 0, 0); // 10 maggio 2026, 08:00 locale
const addSeconds = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000);

describe('DailyStepTracker', () => {
  let tracker: DailyStepTracker;

  beforeEach(async () => {
    await AsyncStorage.clear();
    tracker = new DailyStepTracker();
    await tracker.load();
  });

  it('parte da 0 passi', () => {
    expect(tracker.totalSteps).toBe(0);
  });

  it('una sessione di ascolto somma i passi grezzi al totale', async () => {
    tracker.startNewSession();
    await tracker.updateSession(5, START);
    const total = await tracker.updateSession(42, addSeconds(START, 30));
    expect(total).toBe(42);
    expect(tracker.totalSteps).toBe(42);
  });

  it('una nuova sessione (es. dopo PAUSA/AVVIA) continua dal totale precedente', async () => {
    tracker.startNewSession();
    await tracker.updateSession(100, START);

    // L'app viene messa in pausa e poi riavviata: il sensore si re-iscrive e riparte da 0.
    tracker.startNewSession();
    const total = await tracker.updateSession(30, addSeconds(START, 120));

    expect(total).toBe(130);
  });

  it('il totale sopravvive a un riavvio dell app (load dopo save)', async () => {
    tracker.startNewSession();
    await tracker.updateSession(250, START);

    const reloaded = new DailyStepTracker();
    await reloaded.load();
    expect(reloaded.totalSteps).toBe(250);

    reloaded.startNewSession();
    const total = await reloaded.updateSession(10, addSeconds(START, 10));
    expect(total).toBe(260);
  });

  it('un valore grezzo negativo o non finito viene ignorato', async () => {
    tracker.startNewSession();
    await tracker.updateSession(50, START);
    const total = await tracker.updateSession(-1, addSeconds(START, 5));
    expect(total).toBe(50);
  });

  it('un nuovo giorno azzera il totale', async () => {
    tracker.startNewSession();
    await tracker.updateSession(500, START);

    const nextDay = new Date(START);
    nextDay.setDate(nextDay.getDate() + 1);
    const changed = await tracker.rolloverIfNeeded(nextDay);

    expect(changed).toBe(true);
    expect(tracker.totalSteps).toBe(0);
  });

  it('azzeramento manuale riporta il totale a 0', async () => {
    tracker.startNewSession();
    await tracker.updateSession(777, START);
    await tracker.reset();
    expect(tracker.totalSteps).toBe(0);
  });
});
