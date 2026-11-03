// Costruisce il personaggio 3D dell'avatar con primitive Three.js: niente modelli esterni da
// scaricare, solo sfere/coni/cilindri assemblati in base alla "specie" scelta, colorati con il
// colore dell'avatar. Tenuto a basso numero di poligoni (segmenti ridotti) perché deve girare
// fluido anche su telefoni modesti.
import * as THREE from 'three';

import { AvatarSpecies } from './profile';

const DARK = 0x2a1f14;

function material(colorHex: number, opts?: { roughness?: number; metalness?: number }) {
  return new THREE.MeshStandardMaterial({ color: colorHex, roughness: opts?.roughness ?? 0.55, metalness: opts?.metalness ?? 0.08 });
}

function addFace(group: THREE.Group, big = false) {
  const eyeGeo = new THREE.SphereGeometry(big ? 0.09 : 0.065, 10, 8);
  const eyeMat = material(DARK, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.22, 0.4, 0.53);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.22;
  group.add(eyeL, eyeR);

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 16, Math.PI), eyeMat);
  mouth.position.set(0, 0.2, 0.56);
  mouth.rotation.z = Math.PI;
  group.add(mouth);
}

/** Assembla il gruppo 3D del personaggio. `colorHex` è il colore scelto dall'utente. */
export function buildAvatarGroup(species: AvatarSpecies, colorHex: number): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = material(colorHex);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 14), bodyMat);
  body.scale.set(1, 0.8, 1);
  body.position.y = -0.56;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), bodyMat);
  head.position.y = 0.32;
  group.add(head);

  switch (species) {
    case 'robot': {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), material(DARK));
      stem.position.set(0, 1.0, 0);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), material(0xf6b72b, { metalness: 0.4, roughness: 0.3 }));
      ball.position.set(0, 1.16, 0);
      group.add(stem, ball);
      addFace(group);
      break;
    }
    case 'gatto': {
      const earGeo = new THREE.ConeGeometry(0.17, 0.3, 4);
      const earL = new THREE.Mesh(earGeo, bodyMat);
      earL.position.set(-0.36, 0.82, 0);
      earL.rotation.z = 0.25;
      const earR = earL.clone();
      earR.position.x = 0.36;
      earR.rotation.z = -0.25;
      group.add(earL, earR);
      addFace(group);
      break;
    }
    case 'coniglio': {
      const earGeo = new THREE.CapsuleGeometry(0.08, 0.42, 4, 8);
      const earL = new THREE.Mesh(earGeo, bodyMat);
      earL.position.set(-0.22, 1.02, -0.05);
      earL.rotation.z = -0.12;
      const earR = earL.clone();
      earR.position.x = 0.22;
      earR.rotation.z = 0.12;
      group.add(earL, earR);
      addFace(group);
      break;
    }
    case 'alieno': {
      head.scale.set(0.82, 1.28, 0.82);
      head.position.y = 0.42;
      addFace(group, true);
      break;
    }
    case 'panda': {
      const earGeo = new THREE.SphereGeometry(0.16, 12, 10);
      const darkMat = material(DARK, { roughness: 0.5 });
      const earL = new THREE.Mesh(earGeo, darkMat);
      earL.position.set(-0.38, 0.78, -0.05);
      const earR = earL.clone();
      earR.position.x = 0.38;
      group.add(earL, earR);

      const patchGeo = new THREE.SphereGeometry(0.17, 12, 10);
      const patchL = new THREE.Mesh(patchGeo, darkMat);
      patchL.scale.set(1, 1.3, 0.4);
      patchL.position.set(-0.22, 0.42, 0.45);
      const patchR = patchL.clone();
      patchR.position.x = 0.22;
      group.add(patchL, patchR);
      addFace(group);
      break;
    }
    case 'unicorno': {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 10), material(0xf6b72b, { metalness: 0.5, roughness: 0.25 }));
      horn.position.set(0, 1.05, 0.1);
      horn.rotation.x = -0.25;
      group.add(horn);
      addFace(group);
      break;
    }
    case 'ape': {
      const wingGeo = new THREE.SphereGeometry(0.22, 12, 10);
      const wingMat = material(0xfffbe8, { roughness: 0.2, metalness: 0 });
      const wingL = new THREE.Mesh(wingGeo, wingMat);
      wingL.scale.set(1, 0.5, 0.15);
      wingL.position.set(-0.3, 0.55, -0.35);
      wingL.rotation.y = 0.5;
      const wingR = wingL.clone();
      wingR.position.x = 0.3;
      wingR.rotation.y = -0.5;
      group.add(wingL, wingR);

      const antennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.26, 6);
      const antL = new THREE.Mesh(antennaGeo, material(DARK));
      antL.position.set(-0.14, 0.95, 0.1);
      antL.rotation.z = 0.4;
      const antR = antL.clone();
      antR.position.x = 0.14;
      antR.rotation.z = -0.4;
      group.add(antL, antR);
      addFace(group);
      break;
    }
    case 'tondo':
    default:
      addFace(group);
      break;
  }

  return group;
}
