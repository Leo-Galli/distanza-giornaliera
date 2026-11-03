// Linguaggio visivo "casual chunky" (pannelli crema, accenti caldi, bottoni "3D"),
// la stessa identità grafica usata in altri progetti Expo dell'autore.
import { Platform } from 'react-native';

export const colors = {
  bg: '#241B3A', // viola scuro dietro al pannello
  panel: '#FFF4DE', // corpo crema del pannello
  card: '#FFFBF0',
  band: '#F7E7C4',
  border: '#E2C998',
  borderDark: '#B8925A',
  text: '#3A2A1C',
  muted: '#8C7355',
  onDark: '#FFF6E5',
  onDarkMuted: '#CDBBE6',
  lime: '#4DAE3C', // passi / cammino
  amber: '#F1932B', // distanza
  teal: '#2DB7A5',
  red: '#E4503F', // stop / azzera
  violet: '#8B6BD8',
  gold: '#F6B72B',
  hdrGreen: '#58B947',
};

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;
/** Font "chunky" da titolo (Lilita One, caricato in App.tsx). Finché non è pronto si usa il font di sistema. */
export const display = 'LilitaOne_400Regular';
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 10, md: 16, lg: 22 };

/** Schiarisce (amt > 0) o scurisce (amt < 0) un colore #RRGGBB. */
export function shade(hex: string, amt: number): string {
  const m = /^#([0-9a-f]{6})/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Ombra "da adesivo" per il testo chiaro sopra riempimenti colorati. */
export const stickerShadow = { textShadowColor: 'rgba(60,30,10,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 } as const;
