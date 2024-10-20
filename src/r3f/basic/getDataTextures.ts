import * as THREE from "three";

export const getDataTexture = (size: number): THREE.DataTexture => {
    const data = new Float32Array(size * size * 4);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = 4 * (i * size + j);

            // generate points on a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(-1 + (2 * i) / size);
            const x = Math.cos(theta) * Math.sin(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(phi);

            data[index] = 5 * (i / size - 0.5);
            data[index + 1] = 5 * (j / size - 0.5);
            data[index + 2] = 0;
            data[index + 3] = (Math.random() - 0.5) * 0.1;
        }
    }

    const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    return dataTexture;
};
