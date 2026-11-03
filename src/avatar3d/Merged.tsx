// Disegna tutte le forme (statiche) al suo interno come una manciata di mesh invece di dozzine:
// dopo che i figli sono stati creati, le loro geometrie vengono unite per tipo di materiale con
// il colore "cotto" nei vertici. Così un personaggio fatto di 15-20 pezzi costa alla GPU quanto
// un paio di mesh, invece di una chiamata di disegno per pezzo — è questo che permette di avere
// personaggi dettagliati senza rallentare il telefono.
import { useLayoutEffect, useRef } from 'react';
import { Group, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const solid = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.08 });
const flatMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });

interface Bucket {
  material: Material;
  geos: BufferGeometry[];
}

export function Merged({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    root.updateWorldMatrix(true, true);
    const inv = new Matrix4().copy(root.matrixWorld).invert();
    const buckets = new Map<string, Bucket>();
    const hidden: Mesh[] = [];

    root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || mesh.userData.merged) return;
      const mt = mesh.material as MeshStandardMaterial | MeshBasicMaterial;
      if (Array.isArray(mt) || !mt || (mt as Material).type === undefined) return;

      const isBasic = mt.type === 'MeshBasicMaterial';
      const key = isBasic ? 'basic' : 'standard';
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material: isBasic ? flatMat : solid, geos: [] };
        buckets.set(key, bucket);
      }

      mesh.updateWorldMatrix(true, false);
      const local = new Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
      let geo = mesh.geometry.clone();
      if (geo.index) geo = geo.toNonIndexed();
      geo.applyMatrix4(local);
      for (const name of Object.keys(geo.attributes)) {
        if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
      }

      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const c = (mt as MeshStandardMaterial).color;
      for (let i = 0; i < count; i++) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new BufferAttribute(colors, 3));

      bucket.geos.push(geo);
      hidden.push(mesh);
    });

    const made: Mesh[] = [];
    buckets.forEach((bucket) => {
      if (!bucket.geos.length) return;
      const merged = mergeGeometries(bucket.geos, false);
      bucket.geos.forEach((g) => g.dispose());
      if (!merged) return;
      const mesh = new Mesh(merged, bucket.material);
      mesh.userData.merged = true;
      root.add(mesh);
      made.push(mesh);
    });
    hidden.forEach((m) => {
      m.visible = false;
    });

    return () => {
      made.forEach((m) => {
        root.remove(m);
        m.geometry.dispose();
      });
      hidden.forEach((m) => {
        m.visible = true;
      });
    };
  }, []);

  return <group ref={ref}>{children}</group>;
}
