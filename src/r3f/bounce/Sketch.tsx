import React, { memo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import Bounce from "./Bounce";

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
            <OrbitControls enableDamping />
            {/* <Particles /> */}
            <Bounce />

            <color attach="background" args={["#171720"]} />
            <ambientLight intensity={0.1} />
            <pointLight args={[0xff0000, 10, 100]} position={[-1, 3, 1]} castShadow />
            <spotLight castShadow args={["blue", 10, 100]} penumbra={1} />

            <PerspectiveCamera
                makeDefault
                position={[0, 5, 5]}
                fov={75}
                aspect={window.innerWidth / window.innerHeight}
                near={0.1}
                far={500}
            />
        </Canvas>
    );
});

export default Sketch;
