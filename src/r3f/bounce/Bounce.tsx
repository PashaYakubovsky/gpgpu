import {
    BoxProps,
    Physics,
    useBox,
    usePlane,
    useCompoundBody,
    SphereProps,
    useSphere,
    PlaneProps,
    useTrimesh,
} from "@react-three/cannon";
import { MeshProps, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import {
    MeshDiscardMaterial,
    MeshDistortMaterial,
    MeshPortalMaterial,
    MeshTransmissionMaterial,
    MeshWobbleMaterial,
} from "@react-three/drei";

const Bounce = () => {
    return (
        <Physics>
            {[...Array(5)].map((_, i) => {
                const rand = Math.random() - 0.5;
                return (
                    <BounceBox
                        key={i}
                        position={[-i * 0.1, i * 0.5, i * 0.1]}
                        scale={[1 + i * rand, 1 + i * rand, 1 + i * rand]}
                    />
                );
            })}
            {[...Array(5)].map((_, i) => (
                <BounceSphere key={i} position={[0, i * 2, 0]} />
            ))}
            <Floor />
            <ColiderBox position={[0, 2, -5]} />
            <Stand />
        </Physics>
    );
};

const ColiderBox = (props: BoxProps) => {
    const [ref] = useBox(() => ({
        mass: 1,
        position: [3, 5, 0],
        rotation: [-Math.PI / 2, 0, 0],
        args: [10, 10, 10],
        // type: "Static",
    }));

    return (
        <mesh ref={ref} receiveShadow castShadow scale={[10, 10, 10]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="red" />
        </mesh>
    );
};

const Floor = () => {
    // const [ref] = usePlane(() => ({
    //     mass: 5,
    //     position: [0, 0, 0],
    //     rotation: [-Math.PI / 2, 0, 0],
    //     type: "Static",
    // }));

    // const camera = useThree(({ camera }) => {
    //     // if (ref.current) camera.lookAt(ref.current.position);
    //     return camera;
    // });

    // useEffect(() => {
    //     if (ref.current && camera) {
    //         // camera.lookAt(ref.current.position);
    //     }
    // }, [camera, ref]);

    return (
        <mesh receiveShadow castShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
            {/* floor */}
            <planeGeometry args={[100, 100]} />
            <meshPhysicalMaterial roughness={0.2} metalness={0.5} color="black" />
        </mesh>
    );
};

const BounceBox = (props: BoxProps) => {
    const [ref, api] = useBox(() => ({
        mass: 0.5,
        velocity: [0, 0, 0],
        ...props,
    }));

    return (
        <mesh ref={ref} receiveShadow castShadow>
            <boxGeometry args={props.scale || [1, 1, 1]} />
            <MeshTransmissionMaterial color="hotpink" />
        </mesh>
    );
};

const BounceSphere = (props: SphereProps) => {
    const [ref, api] = useSphere(() => ({
        mass: 2,
        ...props,
    }));

    return (
        <mesh ref={ref} receiveShadow castShadow>
            <sphereGeometry args={[1, 32, 32]} />
            <MeshTransmissionMaterial color="hotpink" />
        </mesh>
    );
};

export default Bounce;

const Stand = props => {
    const gltf = useLoader(GLTFLoader, "/stand.glb") as GLTF;
    const standObj = useMemo(() => {
        const obj = gltf.scene.getObjectByName("Cube003") as THREE.Mesh;
        const geo = obj.geometry.clone();
        obj.geometry = geo;
        geo.scale(5, 1.5, 5);
        return obj;
    }, [gltf]);

    const [ref, api] = useTrimesh(
        () => ({
            args: [standObj.geometry.attributes.position.array, standObj.geometry.index.array],
            mass: 10,
            type: "Static",
            ...props,
        }),
        useRef()
    );

    return (
        <group ref={ref} {...props} dispose={null} onPointerDown={() => api.velocity.set(0, 5, 0)}>
            <mesh castShadow geometry={standObj.geometry}>
                <meshPhysicalMaterial metalness={1} roughness={0.2} color="black" />
            </mesh>
        </group>
    );
};
