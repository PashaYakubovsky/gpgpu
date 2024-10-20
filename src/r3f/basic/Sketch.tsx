import React, { memo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
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

            {/* <EffectComposer> */}
            {/* <FXAA blendFunction={1} /> */}
            {/* <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} /> */}
            {/* <Vignette eskil={false} offset={0.1} darkness={1.1} /> */}
            {/* <Autofocus /> */}
            {/* </EffectComposer> */}
        </Canvas>
    );
});

export default Sketch;
