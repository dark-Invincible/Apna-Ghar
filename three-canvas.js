import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';

function HouseModel({ width, length, height, roofType, color }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18; // Smooth rotation
    }
  });

  // Mathematically lock the boundary boxes.
  // 1 unit in 3D = 10 feet. So a 40x60ft plot at 20ft height will map strictly to a 4x6x2 box.
  const scaleX = width / 10;
  const scaleZ = length / 10;
  const scaleY = height / 10;

  return (
    <group ref={groupRef}>
      {/* Land Plot Bounds Border */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[scaleX + 0.2, 0.02, scaleZ + 0.2]} />
        <meshStandardMaterial color="#c59038" roughness={1.0} wireframe />
      </mesh>

      {/* Foundation Base */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[scaleX, 0.1, scaleZ]} />
        <meshStandardMaterial color="#68736f" roughness={0.8} />
      </mesh>

      {/* Main Building Volume (strictly locked to size vectors) */}
      <mesh position={[0, scaleY / 2 + 0.1, 0]}>
        <boxGeometry args={[scaleX, scaleY, scaleZ]} />
        <meshStandardMaterial color={color || '#eae5d8'} roughness={0.3} metalness={0.15} />
      </mesh>

      {/* Front Balcony / Glass Facade */}
      <mesh position={[0, scaleY * 0.6 + 0.1, scaleZ / 2 + 0.01]}>
        <boxGeometry args={[scaleX * 0.8, scaleY * 0.4, 0.02]} />
        <meshStandardMaterial color="#a9d3d5" roughness={0.05} transparent opacity={0.7} metalness={0.9} />
      </mesh>

      {/* Back Facade Glass Window */}
      <mesh position={[0, scaleY * 0.6 + 0.1, -scaleZ / 2 - 0.01]}>
        <boxGeometry args={[scaleX * 0.6, scaleY * 0.3, 0.02]} />
        <meshStandardMaterial color="#a9d3d5" roughness={0.05} transparent opacity={0.7} metalness={0.9} />
      </mesh>

      {/* Main Doorway */}
      <mesh position={[0, scaleY * 0.25 + 0.1, scaleZ / 2 + 0.02]}>
        <boxGeometry args={[scaleX * 0.18, scaleY * 0.45, 0.02]} />
        <meshStandardMaterial color="#8b3a2b" roughness={0.7} />
      </mesh>

      {/* Roof Structure */}
      {roofType === 'gabled' ? (
        <mesh position={[0, scaleY + 0.1 + (scaleX * 0.2), 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[scaleX * 0.72, scaleX * 0.4, 4]} />
          <meshStandardMaterial color="#913a2b" roughness={0.4} />
        </mesh>
      ) : (
        <group position={[0, scaleY + 0.15, 0]}>
          <mesh>
            <boxGeometry args={[scaleX, 0.08, scaleZ]} />
            <meshStandardMaterial color="#c59038" roughness={0.6} />
          </mesh>
          {/* Parapet walls */}
          <mesh position={[0, 0.1, scaleZ / 2 - 0.03]}>
            <boxGeometry args={[scaleX, 0.12, 0.06]} />
            <meshStandardMaterial color={color || '#eae5d8'} />
          </mesh>
          <mesh position={[0, 0.1, -scaleZ / 2 + 0.03]}>
            <boxGeometry args={[scaleX, 0.12, 0.06]} />
            <meshStandardMaterial color={color || '#eae5d8'} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function App3D({ width, length, height, roofType, color }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'radial-gradient(circle, #273b35 0%, #172421 100%)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}>
      <Canvas camera={{ position: [scaleCameraPos(width), 3.5, scaleCameraPos(length)], fov: 42 }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[10, 12, 6]} intensity={1.3} castShadow />
        <directionalLight position={[-10, -5, -6]} intensity={0.25} />
        <pointLight position={[0, height / 10 + 0.5, 0]} intensity={0.5} color="#c59038" />
        <HouseModel width={width} length={length} height={height} roofType={roofType} color={color} />
        <gridHelper args={[24, 24, '#c59038', '#2a443d']} position={[0, 0, 0]} />
      </Canvas>
      
      {/* Permanent visual overlay watermark */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        right: '12px',
        padding: '10px 14px',
        background: 'rgba(20, 32, 28, 0.82)',
        border: '1px solid rgba(197, 144, 56, 0.45)',
        borderRadius: '8px',
        color: '#f6ebd7',
        fontFamily: '"DM Mono", monospace',
        fontSize: '9.5px',
        textAlign: 'center',
        fontWeight: '800',
        letterSpacing: '0.6px',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 6px 15px rgba(0,0,0,0.3)',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        CONCEPT DESIGN - REQUIRE ARCHITECT VALIDATION BEFORE BOQ
      </div>
    </div>
  );
}

// Dynamically scales camera distance based on building footprint size
function scaleCameraPos(dimension) {
  const norm = dimension / 10;
  return Math.max(5.5, norm * 1.3);
}

// Mount function to be called from the dashboard page
window.mount3DCanvas = function (container, { width, length, height, roofType, color }) {
  try {
    if (window.reactRootInstance) {
      window.reactRootInstance.unmount();
    }
  } catch (e) {
    console.warn("Error unmounting previous root:", e);
  }
  
  const root = createRoot(container);
  window.reactRootInstance = root;
  root.render(
    React.createElement(App3D, { width, length, height, roofType, color })
  );
};
