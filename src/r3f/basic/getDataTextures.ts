import * as THREE from "three";
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
