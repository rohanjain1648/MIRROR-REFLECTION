
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ZennMode, MotionData } from '../types';

interface ParticleProps {
  mode: ZennMode;
  motion: MotionData;
}

const CoreParticles: React.FC<ParticleProps> = ({ mode, motion }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 4000;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 1. Dispersion based on openness
      const dispersion = 0.005 * (1 + motion.openness * 2);
      
      // 2. Tremor creates high-frequency jitter in particles
      const jitter = motion.tremor * 0.05 * Math.sin(time * 50 + i);
      
      // 3. Movement towards interaction point
      const targetX = motion.position.x * 5;
      const targetY = motion.position.y * 5;
      const dx = targetX - posArr[i3];
      const dy = targetY - posArr[i3 + 1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      const pullStrength = motion.pressure * 0.02 / (dist + 0.5);
      
      posArr[i3] += dx * pullStrength + jitter;
      posArr[i3 + 1] += dy * pullStrength + jitter;
      
      // Idle float
      posArr[i3 + 2] += Math.sin(time * 0.5 + i) * dispersion;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const color = useMemo(() => {
    switch (mode) {
      case ZennMode.ANXIETY: return new THREE.Color('#93c5fd').lerp(new THREE.Color('#ffffff'), motion.tremor); 
      case ZennMode.EXPRESSION: return new THREE.Color('#f87171').lerp(new THREE.Color('#fbbf24'), motion.pressure);
      case ZennMode.GROUNDING: return new THREE.Color('#6ee7b7');
      default: return new THREE.Color('#c084fc');
    }
  }, [mode, motion.tremor, motion.pressure]);

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.03 + motion.pressure * 0.05}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.6 - motion.tremor * 0.3}
      />
    </Points>
  );
};

const CentralCore: React.FC<{ motion: MotionData, mode: ZennMode }> = ({ motion, mode }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  const color = useMemo(() => {
    switch (mode) {
      case ZennMode.ANXIETY: return '#1d4ed8';
      case ZennMode.EXPRESSION: return '#991b1b';
      case ZennMode.GROUNDING: return '#065f46';
      default: return '#581c87';
    }
  }, [mode]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = time * 0.2;
    meshRef.current.rotation.z = time * 0.1;
    
    // Scale responds to pressure and openness
    const baseScale = 0.8 + motion.openness * 0.4;
    const pulse = Math.sin(time * (1 + motion.pressure * 2)) * 0.05;
    meshRef.current.scale.setScalar(baseScale + pulse);
    
    // Position subtle lean towards pointer
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, motion.position.x * 0.5, 0.1);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, motion.position.y * 0.5, 0.1);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 15]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.5 + motion.pressure} 
          wireframe
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  );
};

export const ZennEnvironment: React.FC<ParticleProps> = ({ mode, motion }) => {
  return (
    <div className="fixed inset-0 z-0 bg-neutral-950">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <fog attach="fog" args={['#000', 5, 15]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#fff" />
        <CoreParticles mode={mode} motion={motion} />
        <CentralCore motion={motion} mode={mode} />
      </Canvas>
    </div>
  );
};
