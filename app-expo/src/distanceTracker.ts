// Calcolo e persistenza della distanza giornaliera basata su posizioni GPS.
// Porting 1:1 della logica di distance_tracker.py (Python).

import AsyncStorage from '@react-native-async-storage/async-storage';

const EARTH_RADIUS_M = 6_371_008.8;
const STORAGE_KEY = 'distanza-giornaliera:distance';

export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export type FixReason =
  | 'coordinate_non_valide'
  | 'precisione_insufficiente'
  | 'punto_iniziale'
  | 'posizione_fuori_sequenza'
  | 'nuovo_segmento'
  | 'salto_gps_scartato'
  | 'rumore_gps'
  | 'tratto_aggiunto';

export interface FixResult {
  accepted: boolean;
  addedM: number;
  totalM: number;
  reason: FixReason;
}

interface LastFix {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  timestampMs: number;
}

interface StoredState {
  day: string;
  totalM: number;
}

function todayIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class DailyDistanceTracker {
  private day: string;
  private totalM = 0;
  private lastFix: LastFix | null = null;

  private readonly maxAccuracyM: number;
  private readonly minDistanceM: number;
  private readonly maxSpeedMps: number;
  private readonly maxGapS: number;

  constructor(options?: {
    maxAccuracyM?: number;
    minDistanceM?: number;
    maxSpeedMps?: number;
    maxGapS?: number;
  }) {
    this.maxAccuracyM = options?.maxAccuracyM ?? 50.0;
    this.minDistanceM = options?.minDistanceM ?? 5.0;
    this.maxSpeedMps = options?.maxSpeedMps ?? 70.0;
    this.maxGapS = options?.maxGapS ?? 300.0;
    this.day = todayIso(new Date());
  }

  get currentDay(): string {
    return this.day;
  }

  get totalMeters(): number {
    return this.totalM;
  }

  private static validCoordinate(latitude: number, longitude: number): boolean {
    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90.0 &&
      latitude <= 90.0 &&
      longitude >= -180.0 &&
      longitude <= 180.0
    );
  }

  async load(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: StoredState = JSON.parse(raw);
      const savedTotal = Number(data.totalM);
      if (!Number.isFinite(savedTotal) || savedTotal < 0) {
        throw new Error('Totale non valido');
      }
      this.day = String(data.day);
      this.totalM = savedTotal;
    } catch {
      // Un dato danneggiato non deve impedire l'avvio dell'app.
      this.totalM = 0;
      this.lastFix = null;
    }
  }

  async save(): Promise<void> {
    const payload: StoredState = { day: this.day, totalM: this.totalM };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  async rolloverIfNeeded(now: Date): Promise<boolean> {
    const currentDay = todayIso(now);
    if (currentDay === this.day) return false;
    this.day = currentDay;
    this.totalM = 0;
    this.lastFix = null;
    await this.save();
    return true;
  }

  async reset(): Promise<void> {
    this.totalM = 0;
    this.lastFix = null;
    await this.save();
  }

  async processFix(
    latitude: number,
    longitude: number,
    accuracyM: number | null,
    timestamp: Date
  ): Promise<FixResult> {
    await this.rolloverIfNeeded(timestamp);

    if (!DailyDistanceTracker.validCoordinate(latitude, longitude)) {
      return this.result(false, 0, 'coordinate_non_valide');
    }

    if (accuracyM !== null) {
      if (!Number.isFinite(accuracyM) || accuracyM <= 0 || accuracyM > this.maxAccuracyM) {
        return this.result(false, 0, 'precisione_insufficiente');
      }
    }

    const currentFix: LastFix = { latitude, longitude, accuracyM, timestampMs: timestamp.getTime() };
    const previous = this.lastFix;
    if (previous === null) {
      this.lastFix = currentFix;
      return this.result(true, 0, 'punto_iniziale');
    }

    const elapsedS = (currentFix.timestampMs - previous.timestampMs) / 1000;
    if (elapsedS <= 0) {
      return this.result(false, 0, 'posizione_fuori_sequenza');
    }

    const segmentM = haversineDistanceM(previous.latitude, previous.longitude, latitude, longitude);

    // Dopo una lunga interruzione il percorso intermedio è sconosciuto:
    // si riparte dal nuovo punto senza inventare il tratto mancante.
    if (elapsedS > this.maxGapS) {
      this.lastFix = currentFix;
      return this.result(true, 0, 'nuovo_segmento');
    }

    if (segmentM / elapsedS > this.maxSpeedMps) {
      // Aggiornare il riferimento permette di recuperare dopo un salto GPS.
      this.lastFix = currentFix;
      return this.result(false, 0, 'salto_gps_scartato');
    }

    // Mezza accuratezza stimata riduce il rumore senza imporre soglie
    // eccessive; il riferimento resta fermo finché non c'è movimento reale.
    const accuracyThreshold = (accuracyM ?? 0) * 0.5;
    const thresholdM = Math.max(this.minDistanceM, accuracyThreshold);
    if (segmentM < thresholdM) {
      return this.result(false, 0, 'rumore_gps');
    }

    this.totalM += segmentM;
    this.lastFix = currentFix;
    await this.save();
    return this.result(true, segmentM, 'tratto_aggiunto');
  }

  private result(accepted: boolean, addedM: number, reason: FixReason): FixResult {
    return { accepted, addedM, totalM: this.totalM, reason };
  }
}
