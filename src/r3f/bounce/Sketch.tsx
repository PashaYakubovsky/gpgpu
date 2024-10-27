import React, { memo } from "react";
import { Canvas } from "@react-three/fiber";
import {
    Environment,
    OrbitControls,
    OrthographicCamera,
    PerspectiveCamera,
} from "@react-three/drei";
import Bounce from "./Bounce";
import * as THREE from "three";

const Sketch = memo(() => {
    return (
        <Canvas
            gl={{ antialias: true, powerPreference: "high-performance" }}
            style={{
                width: "100vw",
                height: "100vh",
                display: "block",
                position: "absolute",
                top: 0,
                left: 0,
            }}>
            {/* <OrbitControls makeDefault /> */}

            <Bounce />
            <Environment preset="park" />

            <color attach="background" args={["#000"]} />
            <ambientLight intensity={0.1} />
            <directionalLight
                castShadow
                intensity={3}
                color={new THREE.Color("red")}
                position={[0, 5, 0]}
            />

            <PerspectiveCamera
                makeDefault
                position={[5, 10, 20]}
                rotation={new THREE.Euler(0, THREE.MathUtils.degToRad(-70), 0)}
                fov={75}
                near={0.1}
                far={500}
            />
        </Canvas>
    );
});

export default Sketch;
