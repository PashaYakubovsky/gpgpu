import React, { memo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
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
            <Environment preset="night" />

            <PerspectiveCamera
                makeDefault
                position={[0, 0, 10]}
                fov={75}
                aspect={window.innerWidth / window.innerHeight}
                near={0.1}
                far={100}
            />
        </Canvas>
    );
});

export default Sketch;
