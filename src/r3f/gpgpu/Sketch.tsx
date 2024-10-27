import React, { memo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, Stats } from "@react-three/drei";
import Particles from "./Particles";

const Sketch = memo(() => {
    return (
        <Canvas
            color="black"
            gl={{ antialias: true, powerPreference: "high-performance" }}
            style={{
                width: "100vw",
                height: "100vh",
                display: "block",
                position: "absolute",
                top: 0,
                left: 0,
            }}>
            <OrbitControls />
            <Particles />
            <ambientLight intensity={3.1} color="white" />

            <directionalLight intensity={0.5} position={[0, 0, 5]} color="white" />
            <directionalLight intensity={0.5} position={[0, 0, -5]} color="red" />
            <directionalLight intensity={0.5} position={[0, 5, 0]} color="blue" />

            <Stats />
            <Environment preset="park" />

            <PerspectiveCamera makeDefault position={[-3, 50, 0]} fov={75} near={0.1} far={10000} />
        </Canvas>
    );
});

export default Sketch;
