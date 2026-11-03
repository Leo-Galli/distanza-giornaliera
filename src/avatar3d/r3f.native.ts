// Variante Android/iOS: react-three-fiber disegna dentro una superficie expo-gl.
//
// @react-three/fiber (il motore React sopra three.js) si aspetta `THREE.LoaderUtils`, ma le
// versioni recenti di three.js l'hanno rimosso: senza questa piccola "pezza" l'app si blocca
// all'avvio su telefono. Va eseguita con `require` (non `import`, che verrebbe issato più in
// alto) prima di caricare react-three-fiber, così la pezza esiste già quando serve.
/* eslint-disable @typescript-eslint/no-require-imports */
const THREE: any = require('three'); // eslint-disable-line @typescript-eslint/no-explicit-any
if (!THREE.LoaderUtils) {
  THREE.LoaderUtils = {
    extractUrlBase(url: string): string {
      const i = url.lastIndexOf('/');
      return i === -1 ? './' : url.slice(0, i + 1);
    },
  };
}

const r3f = require('@react-three/fiber/native') as typeof import('@react-three/fiber');

export const Canvas = r3f.Canvas;
export const useFrame = r3f.useFrame;
export const useThree = r3f.useThree;
