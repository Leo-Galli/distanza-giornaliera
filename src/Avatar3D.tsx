// Avatar del Profilo renderizzato in 3D vero (WebGL via expo-gl + three.js), non un'icona piatta:
// un personaggio fatto di forme semplici (src/avatarModel.ts) che ruota lentamente.
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { memo, useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { buildAvatarGroup } from './avatarModel';
import { AvatarSpecies } from './profile';

export const Avatar3D = memo(function Avatar3D({
  species, color, size = 120, style,
}: {
  species: AvatarSpecies;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const renderer = new Renderer({ gl, width: gl.drawingBufferWidth, height: gl.drawingBufferHeight });
    renderer.setClearColor(0xfffbf0, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 10);
    camera.position.set(0, 0.08, 3.3);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(1.4, 2, 2.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe7b0, 0.4);
    rim.position.set(-1.6, -0.5, -1.5);
    scene.add(rim);

    const group = buildAvatarGroup(species, new THREE.Color(color).getHex());
    scene.add(group);

    const start = Date.now();
    const render = () => {
      if (!mountedRef.current) return;
      frameRef.current = requestAnimationFrame(render);
      const t = (Date.now() - start) / 1000;
      group.rotation.y = t * 0.6;
      group.position.y = Math.sin(t * 1.4) * 0.045;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <GLView
      style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}
      onContextCreate={onContextCreate}
    />
  );
});
