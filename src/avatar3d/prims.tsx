// Mattoncini riusabili per costruire il personaggio: ogni forma viene creata una sola volta e
// riusata (cache per parametri), perché saranno comunque "cotte" insieme da <Merged> — qui conta
// solo non ricreare le stesse geometrie/materiali ad ogni render.
import {
  BufferGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, Material, MeshStandardMaterial, SphereGeometry, TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const geos = new Map<string, BufferGeometry>();
const mats = new Map<string, Material>();

function cachedGeo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = geos.get(key);
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g;
}

export function material(color: number, roughness = 0.55): Material {
  const key = `${color}|${roughness}`;
  let m = mats.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness, metalness: 0.06 });
    mats.set(key, m);
  }
  return m;
}

type P3 = [number, number, number];

export function Ball({
  pos, r, color, scale, rough,
}: { pos: P3; r: number; color: number; scale?: P3; rough?: number }) {
  const geo = cachedGeo(`sp|${r.toFixed(3)}`, () => new SphereGeometry(r, 18, 12));
  return <mesh geometry={geo} material={material(color, rough)} position={pos} scale={scale} />;
}

/** Capsula liscia: usata per orecchie lunghe, antenne, zampine. */
export function Cap({
  pos, r, len, color, rot,
}: { pos: P3; r: number; len: number; color: number; rot?: P3 }) {
  const geo = cachedGeo(`cap|${r.toFixed(3)}|${len.toFixed(3)}`, () => new CapsuleGeometry(r, len, 4, 10));
  return <mesh geometry={geo} material={material(color)} position={pos} rotation={rot} />;
}

/** Scatola con gli spigoli arrotondati: dà il tocco "giocattolo morbido" coerente con l'interfaccia. */
export function RBox({
  pos, size, color, rot,
}: { pos: P3; size: P3; color: number; rot?: P3 }) {
  const radius = Math.min(0.1, Math.min(...size) * 0.4);
  const key = `rb|${size.map((s) => s.toFixed(3)).join('|')}|${radius.toFixed(3)}`;
  const geo = cachedGeo(key, () => new RoundedBoxGeometry(size[0], size[1], size[2], 2, radius));
  return <mesh geometry={geo} material={material(color)} position={pos} rotation={rot} />;
}

export function Cone({
  pos, r, h, color, rot, segments = 10,
}: { pos: P3; r: number; h: number; color: number; rot?: P3; segments?: number }) {
  const geo = cachedGeo(`cone|${r.toFixed(3)}|${h.toFixed(3)}|${segments}`, () => new ConeGeometry(r, h, segments));
  return <mesh geometry={geo} material={material(color)} position={pos} rotation={rot} />;
}

export function Cylinder({
  pos, r, h, color, rot,
}: { pos: P3; r: number; h: number; color: number; rot?: P3 }) {
  const geo = cachedGeo(`cyl|${r.toFixed(3)}|${h.toFixed(3)}`, () => new CylinderGeometry(r, r, h, 8));
  return <mesh geometry={geo} material={material(color)} position={pos} rotation={rot} />;
}

export function Ring({
  pos, r, tube, color, rot, arc,
}: { pos: P3; r: number; tube: number; color: number; rot?: P3; arc?: number }) {
  const geo = cachedGeo(`ring|${r.toFixed(3)}|${tube.toFixed(3)}|${arc ?? 'full'}`, () => new TorusGeometry(r, tube, 8, 20, arc ?? Math.PI * 2));
  return <mesh geometry={geo} material={material(color)} position={pos} rotation={rot} />;
}

const WHITE = 0xffffff;
const PUPIL = 0x241a12;

/** Occhio "vivo": sclera bianca + pupilla + un puntino di luce, non un pallino piatto. */
export function Eye({ pos, side, size = 1 }: { pos: P3; side: 1 | -1; size?: number }) {
  const [x, y, z] = pos;
  return (
    <>
      <Ball pos={[x, y, z]} r={0.082 * size} color={WHITE} rough={0.25} />
      <Ball pos={[x + side * 0.012 * size, y - 0.006 * size, z + 0.05 * size]} r={0.05 * size} color={PUPIL} rough={0.2} />
      <Ball pos={[x + side * 0.03 * size, y + 0.018 * size, z + 0.078 * size]} r={0.014 * size} color={WHITE} rough={0.1} />
    </>
  );
}

/** Guancia arrossata: un piccolo tocco di colore che rende il personaggio simpatico, non inquietante. */
export function Blush({ pos, color = 0xff9b85 }: { pos: P3; color?: number }) {
  return <Ball pos={pos} r={0.075} color={color} scale={[1, 0.62, 0.3]} rough={0.6} />;
}

export function Eyebrow({ pos, side, color }: { pos: P3; side: 1 | -1; color: number }) {
  return <Cap pos={pos} r={0.016} len={0.09} color={color} rot={[0, 0, side * 0.35]} />;
}
