// Preferenze utente: avatar, obiettivo passi giornaliero e promemoria. Un unico blob persistito,
// perché sono tutte impostazioni leggere che cambiano raramente.
//
// Volutamente senza dipendenze da React/React Native (come distanceTracker.ts, stepTracker.ts e
// historyStore.ts): i colori sono letterali propri, non importati da ./theme, così questo file resta
// testabile con Jest in puro Node, senza bisogno del runtime React Native nei test.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'distanza-giornaliera:profile';

const LIME = '#4DAE3C';
const AMBER = '#F1932B';
const TEAL = '#2DB7A5';
const VIOLET = '#8B6BD8';
const RED = '#E4503F';
const GOLD = '#F6B72B';

export interface Avatar {
  icon: string;
  color: string;
  name: string;
}

export interface Profile {
  avatar: Avatar;
  goalSteps: number;
  notificationsEnabled: boolean;
}

export const AVATAR_ICONS = [
  'emoticon-happy', 'emoticon-cool', 'robot-happy', 'alien', 'cat', 'dog', 'owl', 'panda', 'rabbit', 'unicorn', 'bee', 'turtle',
];

export const AVATAR_COLORS = [LIME, AMBER, TEAL, VIOLET, RED, GOLD];

export interface GoalPreset {
  key: string;
  label: string;
  steps: number;
}

export const GOAL_PRESETS: GoalPreset[] = [
  { key: 'leggero', label: 'Leggero', steps: 5000 },
  { key: 'normale', label: 'Normale', steps: 8000 },
  { key: 'attivo', label: 'Attivo', steps: 10000 },
  { key: 'intenso', label: 'Intenso', steps: 15000 },
];

export const DEFAULT_PROFILE: Profile = {
  avatar: { icon: 'emoticon-happy', color: LIME, name: 'Camminatore' },
  goalSteps: 10000,
  notificationsEnabled: false,
};

function isValidProfile(data: unknown): data is Profile {
  if (!data || typeof data !== 'object') return false;
  const p = data as Partial<Profile>;
  return (
    !!p.avatar &&
    typeof p.avatar.icon === 'string' &&
    typeof p.avatar.color === 'string' &&
    typeof p.avatar.name === 'string' &&
    Number.isFinite(p.goalSteps) &&
    (p.goalSteps as number) > 0 &&
    typeof p.notificationsEnabled === 'boolean'
  );
}

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const data = JSON.parse(raw);
    return isValidProfile(data) ? data : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
