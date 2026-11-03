import AsyncStorage from '@react-native-async-storage/async-storage';

import { DailyDistanceTracker, haversineDistanceM } from './distanceTracker';

const START = new Date(2026, 4, 10, 8, 0, 0); // 10 maggio 2026, 08:00 locale
const addSeconds = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000);

describe('haversineDistanceM', () => {
  it('misura circa 111.195 m per 0.001 gradi di latitudine', () => {
    expect(haversineDistanceM(45.0, 9.0, 45.001, 9.0)).toBeCloseTo(111.195, 1);
  });

  it('restituisce 0 per lo stesso punto', () => {
    expect(haversineDistanceM(45.0, 9.0, 45.0, 9.0)).toBe(0);
  });
});

describe('DailyDistanceTracker', () => {
  let tracker: DailyDistanceTracker;

  beforeEach(async () => {
    await AsyncStorage.clear();
    tracker = new DailyDistanceTracker();
    await tracker.load();
  });

  const addFix = (lat: number, lon: number, seconds = 0, accuracy: number | null = 5) =>
    tracker.processFix(lat, lon, accuracy, addSeconds(START, seconds));

  it('il primo punto imposta il riferimento senza aggiungere distanza', async () => {
    const result = await addFix(45.0, 9.0);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('punto_iniziale');
    expect(tracker.totalMeters).toBe(0);
  });

  it('un movimento valido viene sommato e salvato', async () => {
    await addFix(45.0, 9.0);
    const result = await addFix(45.001, 9.0, 100);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('tratto_aggiunto');
    expect(tracker.totalMeters).toBeCloseTo(111.195, 1);
  });

  it('il rumore GPS piccolo non viene sommato', async () => {
    await addFix(45.0, 9.0);
    const result = await addFix(45.00001, 9.0, 10);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('rumore_gps');
    expect(tracker.totalMeters).toBe(0);
  });

  it('una posizione imprecisa viene scartata', async () => {
    await addFix(45.0, 9.0);
    const result = await addFix(45.001, 9.0, 100, 100);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('precisione_insufficiente');
    expect(tracker.totalMeters).toBe(0);
  });

  it('un salto impossibile viene scartato', async () => {
    await addFix(45.0, 9.0);
    const result = await addFix(46.0, 10.0, 1);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('salto_gps_scartato');
    expect(tracker.totalMeters).toBe(0);
  });

  it('una lunga interruzione avvia un nuovo segmento', async () => {
    await addFix(45.0, 9.0);
    const result = await addFix(45.01, 9.0, 1000);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('nuovo_segmento');
    expect(tracker.totalMeters).toBe(0);
  });

  it('coordinate non valide vengono scartate', async () => {
    const result = await addFix(100.0, 9.0);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('coordinate_non_valide');
  });

  it('azzeramento manuale riporta il totale a 0', async () => {
    await addFix(45.0, 9.0);
    await addFix(45.001, 9.0, 100);
    await tracker.reset();
    expect(tracker.totalMeters).toBe(0);
  });
});
