// Il personaggio vero e proprio: testa + corpo + faccia "viva" (occhi a più strati, non un
// pallino piatto) più dettagli diversi per ciascuna delle 8 specie. Tutti i pezzi sono avvolti in
// <Merged>, quindi anche un personaggio con 15-20 forme costa alla GPU solo un paio di mesh.
import { AvatarSpecies } from '../profile';
import { Ball, Blush, Cap, Cone, Cylinder, Eye, Eyebrow, material, RBox, Ring } from './prims';
import { Merged } from './Merged';

const DARK = 0x2a1f14;
const GOLD = 0xf6b72b;
const MANE_TUFTS: Array<[number, number, number, number]> = [
  [-0.08, 0.95, -0.28, 0xffb3d9],
  [0.05, 1.0, -0.3, 0xb3e0ff],
  [0.16, 0.92, -0.25, 0xd9b3ff],
];

function Face({ color, wide }: { color: number; wide?: boolean }) {
  const dark = shadeDark(color);
  return (
    <>
      <Eye pos={[-0.21, 0.4, 0.5]} side={-1} size={wide ? 1.25 : 1} />
      <Eye pos={[0.21, 0.4, 0.5]} side={1} size={wide ? 1.25 : 1} />
      <Eyebrow pos={[-0.21, 0.52, 0.5]} side={-1} color={dark} />
      <Eyebrow pos={[0.21, 0.52, 0.5]} side={1} color={dark} />
      <Ring pos={[0, 0.2, 0.56]} r={0.12} tube={0.018} color={DARK} rot={[0, 0, Math.PI]} arc={Math.PI} />
      <Blush pos={[-0.34, 0.26, 0.5]} />
      <Blush pos={[0.34, 0.26, 0.5]} />
    </>
  );
}

/** Occhi grandi e scuri, senza sclera bianca: lo sguardo tipico di un alieno da fumetto. */
function AlienFace() {
  return (
    <>
      <Ball pos={[-0.17, 0.46, 0.56]} r={0.1} color={0x15110c} rough={0.15} scale={[0.8, 1.3, 0.7]} />
      <Ball pos={[0.17, 0.46, 0.56]} r={0.1} color={0x15110c} rough={0.15} scale={[0.8, 1.3, 0.7]} />
      <Ball pos={[-0.19, 0.5, 0.62]} r={0.022} color={0xffffff} />
      <Ball pos={[0.15, 0.5, 0.62]} r={0.022} color={0xffffff} />
    </>
  );
}

function shadeDark(color: number): number {
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  const f = (c: number) => Math.max(0, Math.round(c * 0.45));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

export function Character3D({ species, color }: { species: AvatarSpecies; color: number }) {
  const dark = shadeDark(color);

  return (
    <Merged>
      {/* corpo */}
      <Ball pos={[0, -0.56, 0]} r={0.72} color={color} scale={[1, 0.8, 1]} />
      {/* testa */}
      <Ball pos={[0, 0.32, 0]} r={0.6} color={color} />

      {species === 'alieno' ? (
        <Ball pos={[0, 0.42, 0]} r={0.6} color={color} scale={[0.82, 1.3, 0.82]} />
      ) : null}

      {species === 'robot' ? (
        <>
          <RBox pos={[-0.17, 0.42, 0.59]} size={[0.16, 0.1, 0.05]} color={0x7de0ff} />
          <RBox pos={[0.17, 0.42, 0.59]} size={[0.16, 0.1, 0.05]} color={0x7de0ff} />
          <RBox pos={[0, 0.2, 0.61]} size={[0.22, 0.045, 0.04]} color={DARK} />
          <Cylinder pos={[0, 1.0, 0]} r={0.03} h={0.28} color={DARK} />
          <Ball pos={[0, 1.16, 0]} r={0.08} color={GOLD} rough={0.25} />
          <Blush pos={[-0.34, 0.24, 0.48]} color={0xffc98a} />
          <Blush pos={[0.34, 0.24, 0.48]} color={0xffc98a} />
        </>
      ) : species === 'alieno' ? (
        <AlienFace />
      ) : (
        <Face color={color} wide={species === 'panda'} />
      )}

      {species === 'gatto' ? (
        <>
          <Cone pos={[-0.36, 0.82, 0]} r={0.17} h={0.3} color={color} rot={[0, 0, 0.25]} />
          <Cone pos={[0.36, 0.82, 0]} r={0.17} h={0.3} color={color} rot={[0, 0, -0.25]} />
          <Cone pos={[0, 0.12, 0.58]} r={0.035} h={0.06} color={0xe88a8a} rot={[Math.PI, 0, 0]} />
          {[-1, 1].map((side) =>
            [-0.08, 0, 0.08].map((dy, i) => (
              <Cap key={`${side}-${i}`} pos={[side * 0.5, 0.18 + dy, 0.4]} r={0.006} len={0.22} color={dark} rot={[0, 0, (Math.PI / 2) - side * 0.15]} />
            ))
          )}
        </>
      ) : null}

      {species === 'coniglio' ? (
        <>
          <Cap pos={[-0.22, 1.0, -0.04]} r={0.08} len={0.42} color={color} rot={[0, 0, -0.12]} />
          <Cap pos={[0.22, 1.0, -0.04]} r={0.08} len={0.42} color={color} rot={[0, 0, 0.12]} />
          <Ball pos={[-0.22, 1.0, -0.04]} r={0.065} color={0xffd4e0} scale={[0.6, 1, 0.6]} />
          <Ball pos={[0.22, 1.0, -0.04]} r={0.065} color={0xffd4e0} scale={[0.6, 1, 0.6]} />
        </>
      ) : null}

      {species === 'panda' ? (
        <>
          <Ball pos={[-0.38, 0.76, -0.05]} r={0.16} color={DARK} />
          <Ball pos={[0.38, 0.76, -0.05]} r={0.16} color={DARK} />
          <Ball pos={[-0.21, 0.42, 0.44]} r={0.17} color={DARK} scale={[1, 1.3, 0.35]} />
          <Ball pos={[0.21, 0.42, 0.44]} r={0.17} color={DARK} scale={[1, 1.3, 0.35]} />
        </>
      ) : null}

      {species === 'unicorno' ? (
        <>
          <Cone pos={[0, 1.02, 0.12]} r={0.065} h={0.38} color={GOLD} rot={[-0.3, 0, 0]} segments={6} />
          {MANE_TUFTS.map(([x, y, z, c], i) => (
            <Ball key={i} pos={[x, y, z]} r={0.09} color={c} rough={0.4} />
          ))}
        </>
      ) : null}

      {species === 'ape' ? (
        <>
          <RBox pos={[0, -0.56, 0]} size={[1.0, 0.1, 1.0]} color={DARK} />
          <Ball pos={[-0.32, 0.5, -0.32]} r={0.22} color={0xfffbe8} rough={0.2} scale={[1, 0.45, 0.14]} />
          <Ball pos={[0.32, 0.5, -0.32]} r={0.22} color={0xfffbe8} rough={0.2} scale={[1, 0.45, 0.14]} />
          <Cap pos={[-0.12, 0.92, 0.12]} r={0.018} len={0.24} color={DARK} rot={[0, 0, 0.5]} />
          <Cap pos={[0.12, 0.92, 0.12]} r={0.018} len={0.24} color={DARK} rot={[0, 0, -0.5]} />
        </>
      ) : null}
    </Merged>
  );
}
