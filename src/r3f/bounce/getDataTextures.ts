import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

export const getDataTexture = (
    size: number,
    branches: number,
    bounds: { min: number; max: number }
): THREE.DataTexture => {
    const data = new Float32Array(size * size * 4);
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = Math.min(centerX, centerY);

    for (let i = 0; i < size * size; i++) {
        const index = i * 4;

        // Generate points in a spiral pattern
        const t = i / (size * size);
        const angle = 2 * Math.PI * branches * t;
        const radius = t * maxRadius;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        // Normalize to [-1, 1] range
        const normalizedX = x / maxRadius;
        const normalizedY = y / maxRadius;

        // Map to the specified bounds
        // position xy
        data[index] = (normalizedX * (bounds.max - bounds.min)) / 2 + (bounds.max + bounds.min) / 2;
        data[index + 1] =
            (normalizedY * (bounds.max - bounds.min)) / 2 + (bounds.max + bounds.min) / 2;
        // velocity zw
        data[index + 2] = 0;
        data[index + 3] = 0;
    }

    const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    return dataTexture;
};

export const generatePositionTexture = (size: number) => {
    const data = new Float32Array(size * size * 4);
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = 5;

    for (let i = 0; i < size * size; i++) {
        const index = i * 4;

        // Generate points in in grid pattern
        const x = (i % size) - centerX;
        const y = Math.floor(i / size) - centerY;
        const z = (Math.random() - 0.5) * maxRadius * 2;

        // Normalize to [-1, 1] range
        const normalizedX = x / maxRadius / 2;
        const normalizedY = y / maxRadius / 2;
        const normalizedZ = z;

        // Map to the specified bounds
        data[index] = normalizedX;
        data[index + 1] = normalizedY;
        data[index + 2] = normalizedZ;
        data[index + 3] = 0;
    }

    const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    return dataTexture;
};

export const generateVelocityTexture = (size: number) => {
    const data = new Float32Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const index = i * 4;
        data[index] = (Math.random() - 0.5) * 5;
        data[index + 1] = (Math.random() - 0.5) * 5;
        data[index + 2] = (Math.random() - 0.5) * 5;
        data[index + 3] = 0;
    }

    const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    return dataTexture;
};

export const getPointsFromObject = (m: THREE.Mesh, size: number) => {
    // Create a sampler for a Mesh surface.
    const sampler = new MeshSurfaceSampler(m).setWeightAttribute("color").build();
    const count = size * size;
    const data = new Float32Array(count * 4);
    const position = new THREE.Vector3();
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = (i * size + j) * 4;
            // sample points from the geometry
            sampler.sample(position);
            matrix.makeTranslation(position.x, position.y, position.z);

            data[index] = position.x - 25;
            data[index + 1] = position.y - 5;
            data[index + 2] = position.z + 10;

            data[index + 3] = Math.random() - 0.5;
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);

    texture.needsUpdate = true;

    return texture;
};
