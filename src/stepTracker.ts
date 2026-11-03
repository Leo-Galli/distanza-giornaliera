// Conteggio e persistenza dei passi giornalieri letti dal contapassi del telefono (Android).
// Stessa filosofia robusta di distanceTracker.ts: un totale "di oggi" persistito, che si azzera
// da solo a mezzanotte e che non si rompe se l'app viene chiusa e riaperta.
//
// Il sensore passi di Android (Sensor.TYPE_STEP_COUNTER, esposto da expo-sensors) riparte da 0
// ogni volta che ci si iscrive con watchStepCount: non è un totale assoluto, ma "passi da quando
// ho iniziato ad ascoltare ora". Per avere un totale di giornata che sopravvive a riavvii
// dell'app, bisogna sommare ogni nuova sessione di ascolto al totale già confermato in precedenza.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'distanza-giornaliera:steps';

interface StoredState {
  day: string;
  totalSteps: number;
}

function todayIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class DailyStepTracker {
  private day: string;
  /** Passi confermati oggi prima della sessione di ascolto corrente. */
  private baseSteps = 0;
  /** Valore grezzo più recente riportato dalla sessione di ascolto corrente (riparte da 0 ad ogni watchStepCount). */
  private sessionSteps = 0;

  constructor() {
    this.day = todayIso(new Date());
  }

  get currentDay(): string {
    return this.day;
  }

  get totalSteps(): number {
    return this.baseSteps + this.sessionSteps;
  }

  async load(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: StoredState = JSON.parse(raw);
      const savedTotal = Number(data.totalSteps);
      if (!Number.isFinite(savedTotal) || savedTotal < 0) {
        throw new Error('Totale non valido');
      }
      this.day = String(data.day);
      this.baseSteps = savedTotal;
      this.sessionSteps = 0;
    } catch {
      // Un dato danneggiato non deve impedire l'avvio dell'app.
      this.baseSteps = 0;
      this.sessionSteps = 0;
    }
  }

  async save(): Promise<void> {
    const payload: StoredState = { day: this.day, totalSteps: this.totalSteps };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  async rolloverIfNeeded(now: Date): Promise<boolean> {
    const currentDay = todayIso(now);
    if (currentDay === this.day) return false;
    this.day = currentDay;
    this.baseSteps = 0;
    this.sessionSteps = 0;
    await this.save();
    return true;
  }

  /** Da chiamare quando si (ri)comincia ad ascoltare il sensore (es. Pedometer.watchStepCount),
   *  per non perdere né raddoppiare i passi della sessione precedente. */
  startNewSession(): void {
    this.baseSteps = this.totalSteps;
    this.sessionSteps = 0;
  }

  /** Da chiamare ad ogni evento del sensore, con il valore grezzo riportato dalla sessione corrente. */
  async updateSession(rawSessionSteps: number, now: Date): Promise<number> {
    await this.rolloverIfNeeded(now);
    if (Number.isFinite(rawSessionSteps) && rawSessionSteps >= 0) {
      this.sessionSteps = rawSessionSteps;
    }
    await this.save();
    return this.totalSteps;
  }

  async reset(): Promise<void> {
    this.baseSteps = 0;
    this.sessionSteps = 0;
    await this.save();
  }
}
