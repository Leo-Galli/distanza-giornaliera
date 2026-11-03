// Avatar del Profilo renderizzato in 3D vero (react-three-fiber sopra expo-gl/WebGL), non
// un'icona piatta: un personaggio dettagliato (src/avatar3d/Character3D.tsx) che ruota lentamente.
//
// Per restare fluido anche con un personaggio "complesso" (15-20 forme), si combinano tre
// accorgimenti, tutti già rodati in un altro progetto Expo dell'autore che usa la stessa tecnica:
// 1. <Merged> (src/avatar3d/Merged.tsx) unisce tutte le forme in 1-2 mesh, non una per pezzo.
// 2. frameloop="demand": il canvas NON ridisegna automaticamente 60 volte al secondo; un piccolo
//    timer richiede un nuovo frame circa 30 volte al secondo, quanto basta per un'animazione
//    fluida senza tenere la GPU impegnata al massimo per un personaggio che occupa un cerchio
//    piccolo dello schermo.
// 3. dpr limitato: niente dettaglio sprecato oltre la risoluzione a cui l'avatar viene davvero
//    mostrato.
import { memo, useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { AvatarSpecies } from './profile';
import { Character3D } from './avatar3d/Character3D';
import { Canvas, useFrame, useThree } from './avatar3d/r3f';

/** Richiede un nuovo frame a ritmo costante finché il componente resta montato (frameloop="demand"). */
function FrameDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = setInterval(() => invalidate(), 33);
    return () => clearInterval(id);
  }, [invalidate]);
  return null;
}

function Spinner({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = performance.now() / 1000;
    if (group.current) {
      group.current.rotation.y = t * 0.55;
      group.current.position.y = Math.sin(t * 1.4) * 0.045;
    }
  });
  return <group ref={group}>{children}</group>;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[1.4, 2, 2.2]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[-1.6, -0.4, -1.4]} intensity={0.35} color="#ffe7b0" />
    </>
  );
}

export const Avatar3D = memo(function Avatar3D({
  species, color, size = 120, style,
}: {
  species: AvatarSpecies;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colorHex = new THREE.Color(color).getHex();

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}>
      <Canvas
        style={{ width: size, height: size } as never}
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 52, near: 0.1, far: 10, position: [0, 0.08, 2.8] }}
        onCreated={({ scene, gl }) => {
          scene.background = null;
          gl.setClearColor(0x000000, 0);
        }}
      >
        <FrameDriver />
        <Lights />
        <Spinner key={`${species}-${color}`}>
          <Character3D species={species} color={colorHex} />
        </Spinner>
      </Canvas>
    </View>
  );
});
