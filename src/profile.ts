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

/** Le "specie" del personaggio 3D (vedi src/avatar3d/Character3D.tsx per come vengono disegnate). */
export const AVATAR_SPECIES = ['tondo', 'robot', 'gatto', 'coniglio', 'alieno', 'panda', 'unicorno', 'ape'] as const;
export type AvatarSpecies = (typeof AVATAR_SPECIES)[number];

/** Icona piatta (MaterialCommunityIcons) per rappresentare ogni specie nel selettore: il
 *  selettore resta leggero (niente contesti WebGL per 8 celle), l'avatar vero è in 3D. */
export const SPECIES_ICON: Record<AvatarSpecies, string> = {
  tondo: 'emoticon-happy',
  robot: 'robot-happy',
  gatto: 'cat',
  coniglio: 'rabbit',
  alieno: 'alien',
  panda: 'panda',
  unicorno: 'unicorn',
  ape: 'bee',
};

export const SPECIES_LABEL: Record<AvatarSpecies, string> = {
  tondo: 'Tondo',
  robot: 'Robot',
  gatto: 'Gatto',
  coniglio: 'Coniglio',
  alieno: 'Alieno',
  panda: 'Panda',
  unicorno: 'Unicorno',
  ape: 'Ape',
};

function isAvatarSpecies(value: unknown): value is AvatarSpecies {
  return typeof value === 'string' && (AVATAR_SPECIES as readonly string[]).includes(value);
}

export interface Avatar {
  species: AvatarSpecies;
  color: string;
  name: string;
}

export interface Profile {
  avatar: Avatar;
  goalSteps: number;
  notificationsEnabled: boolean;
}

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
  avatar: { species: 'tondo', color: LIME, name: 'Camminatore' },
  goalSteps: 10000,
  notificationsEnabled: false,
};

function isValidProfile(data: unknown): data is Profile {
  if (!data || typeof data !== 'object') return false;
  const p = data as Partial<Profile>;
  return (
    !!p.avatar &&
    isAvatarSpecies(p.avatar.species) &&
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
