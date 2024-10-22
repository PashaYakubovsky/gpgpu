import { BoxProps, Physics, useBox, usePlane, useCompoundBody } from "@react-three/cannon";
import { MeshProps, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

const Bounce = () => {
    return (
        <Physics>
            {[...Array(10)].map((_, i) => (
                <BounceItem key={i} position={[0, i * 2, 0]} />
            ))}
            <Floor />
            <ColiderBox position={[0, 5, -5]} />
        </Physics>
    );
};

const ColiderBox = (props: BoxProps) => {
    const [ref] = useBox(() => ({
        mass: 100,
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
    const [ref] = usePlane(() => ({
        mass: 10,
        position: [0, 0, 0],
        rotation: [-Math.PI / 2, 0, 0],
        type: "Static",
    }));

    return (
        <mesh ref={ref} receiveShadow castShadow>
            {/* floor */}
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="white" />
        </mesh>
    );
};

const BounceItem = (props: BoxProps) => {
    const [ref, api] = useBox(() => ({
        mass: 10,
        velocity: [0, 2, 0],
        ...props,
    }));

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
    });

    return (
        <mesh ref={ref}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="hotpink" />
        </mesh>
    );
};

export default Bounce;
