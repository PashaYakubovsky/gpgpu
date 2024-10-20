import "./RenderMaterial";
import "./SimulationMaterial";

import { getDataTexture } from "./getDataTextures";

import { useFrame, createPortal, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { useFBO } from "@react-three/drei";

import * as THREE from "three";

// Particles data
const size = 256;
const count = size * size;
const data = new Float32Array(3 * count);
for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
        const index = 3 * (i * size + j);
        const phi = Math.acos(-1 + (2 * i) / size);
        const theta = Math.PI * (1 + Math.sqrt(5)) * j;
        data[index] = Math.cos(theta) * Math.sin(phi);
        data[index + 1] = Math.sin(theta) * Math.sin(phi);
        data[index + 2] = Math.cos(phi);
    }
}
// uvs
const refs = new Float32Array(2 * count);
for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
        const index = 2 * (i * size + j);
        refs[index] = i / size;
        refs[index + 1] = j / size;
    }
}

// get velocity data on sphere
const velocities = getDataTexture(size);
const positions = getDataTexture(size);

const Particles = () => {
    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useRef(new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 10));
    let target0 = useFBO(size, size, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    });
    let target1 = useFBO(size, size, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    });
    const mousePosRef = useRef(new THREE.Vector2(0, 0));
    const simMaterial = useRef<THREE.ShaderMaterial>();
    const renMaterial = useRef<THREE.ShaderMaterial>();

    useThree(({ gl }) => {
        gl.setClearColor(new THREE.Color("black"));
    });

    useFrame(({ clock, gl }) => {
        gl.setRenderTarget(target0);
        gl.render(scene, camera.current);
        gl.setRenderTarget(null);

        const temp = target0;
        target0 = target1;
        target1 = temp;

        if (simMaterial.current) {
            simMaterial.current.uniforms.uPosition.value = target1.texture;
            simMaterial.current.uniforms.time.value = clock.elapsedTime;
            simMaterial.current.uniforms.uMouse.value = mousePosRef.current;
        }
        if (renMaterial.current) {
            renMaterial.current.uniforms.uPosition.value = target0.texture;
            renMaterial.current.uniforms.time.value = clock.elapsedTime;
        }
    });

    return (
        <>
            {createPortal(
                <mesh>
                    <planeGeometry args={[2, 2]} />
                    <simulationMaterial
                        uPosition={positions}
                        uVelocity={velocities}
                        ref={simMaterial}
                        uOriginalPosition={positions}
                    />
                </mesh>,
                scene
            )}

            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={count}
                        array={data}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-ref"
                        count={count}
                        array={refs}
                        itemSize={2}
                    />
                </bufferGeometry>

                <renderMaterial
                    transparent
                    depthTest={false}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    ref={renMaterial}
                    uPosition={positions}
                    uVelocity={velocities}
                />
            </points>

            {/* raycast mesh */}
            <mesh
                onPointerMove={e => {
                    mousePosRef.current.x = e.point.x;
                    mousePosRef.current.y = e.point.y;
                }}>
                <planeGeometry args={[10, 10]} />
                <meshBasicMaterial color="red" visible={false} />
            </mesh>
        </>
    );
};
export default Particles;
