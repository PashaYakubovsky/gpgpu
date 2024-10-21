import "./RenderMaterial";

import fragmentPositions from "./shaders/fragmentPosition.glsl";
import fragmentVelocities from "./shaders/fragmentVelocity.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import vertexShader from "./shaders/vertex.glsl";

import { generateVelocityTexture, getPointsFromObject } from "./getDataTextures";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { patchShaders } from "gl-noise/build/glNoise.m";
import * as THREE from "three";
import { GPUComputationRenderer, Variable } from "three/addons/misc/GPUComputationRenderer.js";
import CustomShaderMaterial from "three-custom-shader-material";

import matcap from "../../assets/matcap.jpg";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

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
// const velocities = generateVelocityTexture(size);
// const positions = generatePositionTexture(size);

const Particles = () => {
    const mousePosRef = useRef(new THREE.Vector2(0, 0));
    const renMaterial = useRef<THREE.ShaderMaterial>();
    const raycastMesh = useRef<THREE.Mesh>();
    const pointsRef = useRef<THREE.Points>();
    const renderer = useThree(({ gl }) => gl);
    const iRef = useRef<THREE.InstancedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null!);

    // gltf loader with draco
    // const gltfLoader = useLoader(GLTFLoader, '/maze.glb', )
    const gltfLoader = useLoader(GLTFLoader, "/maze.glb", loader => {
        const draco = new DRACOLoader();
        draco.setDecoderConfig({ type: "js" });
        draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
        loader.setDRACOLoader(draco);
    });

    useThree(({ gl }) => {
        gl.setClearColor(new THREE.Color("black"));
    });

    const uniforms = useMemo(() => {
        return {
            time: { value: 0 },
            uPosition: { value: null },
            uVelocity: { value: null },
            uMatcap: { value: new THREE.TextureLoader().load(matcap) },
        };
    }, []);

    const velocityVariable = useRef<Variable>();
    const positionVariable = useRef<Variable>();
    const gpuCompute = useRef<GPUComputationRenderer>();

    useEffect(() => {
        const refArray = new Float32Array(count * 2);
        const width = Math.sqrt(count);
        for (let i = 0; i < count; i++) {
            refArray[i * 2] = (i % width) / width;
            refArray[i * 2 + 1] = Math.floor(i / width) / width;
        }
        iRef.current.geometry.setAttribute("ref", new THREE.InstancedBufferAttribute(refArray, 2));
    }, []);

    useEffect(() => {
        const mesh = gltfLoader.scene.children[0] as THREE.Mesh;
        mesh.geometry.scale(0.1, 0.1, 0.1);
        raycastMesh.current.geometry = mesh.geometry;
        const positions = getPointsFromObject(mesh, size);
        const velocities = generateVelocityTexture(size);

        gpuCompute.current = new GPUComputationRenderer(size, size, renderer);
        velocityVariable.current = gpuCompute.current.addVariable(
            "uVelocityTexture",
            patchShaders(fragmentVelocities),
            velocities
        );
        positionVariable.current = gpuCompute.current.addVariable(
            "uPositionTexture",
            fragmentPositions,
            positions
        );

        gpuCompute.current.setVariableDependencies(velocityVariable.current, [
            positionVariable.current,
            velocityVariable.current,
        ]);
        gpuCompute.current.setVariableDependencies(positionVariable.current, [
            velocityVariable.current,
            positionVariable.current,
        ]);

        const velocityUniforms = velocityVariable.current.material.uniforms;
        const positionUniforms = positionVariable.current.material.uniforms;

        velocityUniforms.time = { value: 0.0 };
        velocityUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
        positionUniforms.time = { value: 0.0 };
        positionUniforms.uOriginalPosition = { value: positions };
        velocityUniforms.uOriginalPosition = { value: positions };
        positionUniforms.uOriginalPositionTexture = { value: positions };
        velocityUniforms.uOriginalPositionTexture = { value: positions };

        velocityVariable.current.wrapS = THREE.RepeatWrapping;
        velocityVariable.current.wrapT = THREE.RepeatWrapping;
        positionVariable.current.wrapS = THREE.RepeatWrapping;
        positionVariable.current.wrapT = THREE.RepeatWrapping;

        gpuCompute.current.init();
    }, []);

    useFrame(({ clock, raycaster, camera }) => {
        gpuCompute.current?.compute();

        // raycast
        raycaster.setFromCamera(mousePosRef.current, camera);
        const intersects = raycaster.intersectObject(raycastMesh.current);
        if (intersects.length) {
            const { point } = intersects[0];
            if (velocityVariable.current) {
                velocityVariable.current.material.uniforms.uMouse.value = point;
            }
        }

        const vText = gpuCompute.current.getCurrentRenderTarget(velocityVariable.current).texture;
        const pText = gpuCompute.current.getCurrentRenderTarget(positionVariable.current).texture;

        if (iRef.current) {
            iRef.current.material.uniforms.time.value = clock.elapsedTime;

            iRef.current.material.uniforms.uVelocity.value = vText;
            iRef.current.material.uniforms.uPosition.value = pText;
        }

        if (renMaterial.current) {
            renMaterial.current.uniforms.uPosition.value = pText;
            renMaterial.current.uniforms.uVelocity.value = vText;
        }
    });

    return (
        <>
            <instancedMesh ref={iRef} args={[null, null, count]} frustumCulled={false}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <CustomShaderMaterial
                    baseMaterial={THREE.MeshPhysicalMaterial}
                    vertexShader={patchShaders(vertexShader)}
                    fragmentShader={patchShaders(fragmentShader)}
                    uniforms={uniforms}
                    transparent
                />
            </instancedMesh>

            {/* raycast mesh */}
            <mesh
                ref={raycastMesh}
                position={[-25, -5, 10]}
                onPointerMove={e => {
                    const { clientX, clientY } = e;
                    const x = (clientX / window.innerWidth) * 2 - 1;
                    const y = -(clientY / window.innerHeight) * 2 + 1;
                    mousePosRef.current.set(x, y);
                }}>
                <bufferGeometry />
                <meshBasicMaterial
                    color="red"
                    visible={false}
                    depthTest={false}
                    depthWrite={false}
                    wireframe
                />
            </mesh>
        </>
    );
};
export default Particles;
