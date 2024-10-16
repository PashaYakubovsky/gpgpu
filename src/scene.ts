import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { GPUComputationRenderer, Variable } from "three/addons/misc/GPUComputationRenderer.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

import fragmentShader from "./shaders/fragment.glsl";
import vertexInstanceShader from "./shaders/vertexInstance.glsl";
import simFragmentShader from "./shaders/simFragment.glsl";
import simVelocityShader from "./shaders/simVelocity.glsl";
import matcap from "./assets/matcap.jpg";

import gui from "lil-gui";

const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

const randomizeMatrix = (function () {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    return function (matrix: THREE.Matrix4) {
        position.x = Math.random() * 40 - 20;
        position.y = Math.random() * 40 - 20;
        position.z = Math.random() * 40 - 20;

        quaternion.random();

        scale.x = scale.y = scale.z = Math.random() * 1;

        matrix.compose(position, quaternion, scale);
    };
})();

const loadImage = (path: string) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // to avoid CORS if used with Canvas
        img.src = path;
        img.onload = () => {
            resolve(img);
        };
        img.onerror = e => {
            reject(e);
        };
    });
};

class Scene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private planeMaterial?: THREE.ShaderMaterial;
    private rafId?: number;
    private positionsSampled?: THREE.DataTexture;
    private geometry?: THREE.BufferGeometry;
    private raycaster?: THREE.Raycaster;
    private raycastPlane?: THREE.Mesh;
    private gui?: gui;
    private stats?: Stats;

    private gpuCompute!: GPUComputationRenderer;
    private positionVariable?: Variable;
    private positionUniforms?: THREE.ShaderMaterial["uniforms"];
    private velocityUniforms?: THREE.ShaderMaterial["uniforms"];
    private velocityVariable?: Variable;

    private leePerrySmith!: THREE.Mesh;
    private points?: THREE.Points;
    private sampler!: MeshSurfaceSampler;
    private position!: THREE.Vector3;
    private matrix!: THREE.Matrix4;
    private geometryInstanced!: THREE.BufferGeometry;
    private mesh?: THREE.InstancedMesh;

    size = 256;
    count = this.size * this.size;

    constructor(canvas: HTMLCanvasElement | null) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas as HTMLCanvasElement,
            antialias: true,
            powerPreference: "high-performance",
            alpha: true,
        });
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.camera.position.set(0, 0, 1);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        const draco = new DRACOLoader();
        draco.setDecoderConfig({ type: "js" });
        draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

        // Optional: Pre-fetch Draco WASM/JS module.
        draco.preload();

        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(draco);

        Promise.all([this.initialize()]).then(() => {
            this.addLight();
            this.initGPGPU();
            this.setupRaycaster();
            this.setupDebug();
            this.animate();

            window.addEventListener("resize", this.resize.bind(this));
        });
    }

    debugObj = {
        progress: 0,
    };
    setupDebug() {
        this.gui = new gui();

        this.gui
            .add(this.debugObj, "progress", 0, 1)
            .onChange((value: number) => {
                if (!this.positionUniforms || !this.velocityUniforms) return;
                this.positionUniforms.uProgress.value = value;
                this.velocityUniforms.uProgress.value = value;
            })
            .name("Progress");

        this.gui.domElement.style.position = "absolute";
        this.gui.domElement.style.zIndex = "100";

        this.stats = new Stats();
        this.stats.showPanel(0);
        document.body.appendChild(this.stats.dom);
    }

    fillVelocityTexture(texture: THREE.DataTexture) {
        const theArray = texture.image.data;

        for (let k = 0, kl = theArray.length; k < kl; k += 4) {
            theArray[k + 0] = 0;
            theArray[k + 1] = 0;
            theArray[k + 2] = 0;
            theArray[k + 3] = 0;
        }
    }

    getPointsFromObject(m: THREE.Mesh) {
        // Create a sampler for a Mesh surface.
        this.sampler = new MeshSurfaceSampler(m).setWeightAttribute("color").build();

        const data = new Float32Array(this.count * 4);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = (i * this.size + j) * 4;
                // sample points from the geometry
                this.sampler.sample(this.position);
                this.matrix.makeTranslation(this.position.x, this.position.y, this.position.z);

                data[index] = this.position.x;
                data[index + 1] = this.position.y;
                data[index + 2] = this.position.z;

                data[index + 3] = Math.random() - 0.5;
            }
        }

        const texture = new THREE.DataTexture(
            data,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType
        );

        texture.needsUpdate = true;

        return texture;
    }

    async getPixelDataFromImage(url: string) {
        const img = (await loadImage(url)) as HTMLImageElement;
        const canvasElement = document.createElement("canvas");

        const aspectRatio = img.width / img.height;
        const width = 200 * aspectRatio;
        const height = 200;

        canvasElement.width = width;
        canvasElement.height = height;

        const context = canvasElement.getContext("2d");
        if (!context || !img) return;

        context.drawImage(img, 0, 0, width, height);
        const imgData = context.getImageData(0, 0, width, height).data;

        const pixels = [];

        for (let i = 0; i < imgData.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor(i / 4 / width);

            if (imgData[i] < 150) {
                pixels.push({
                    x: lerp(-0.77 * aspectRatio, 0.77 * aspectRatio, x / width),
                    y: lerp(0.77, -0.77, y / height),
                });
            }
        }

        const count = this.size * this.size;
        const data = new Float32Array(4 * count);

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = (i * this.size + j) * 4;

                const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];

                data[index] = randomPixel.x + (Math.random() - 0.5) * 0.005;
                data[index + 1] = randomPixel.y + (Math.random() - 0.5) * 0.005;
                data[index + 2] = (Math.random() - 0.5) * 0.01;
                data[index + 3] = (Math.random() - 0.5) * 0.01;
            }
        }

        const texture = new THREE.DataTexture(
            data,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        texture.needsUpdate = true;

        return texture;
    }

    handleMouseMove(event: MouseEvent) {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.raycaster) {
            this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
            const intersects = this.raycaster.intersectObjects([this.raycastPlane]);

            if (intersects.length > 0) {
                const { point } = intersects[0];

                if (this.positionUniforms) {
                    this.positionUniforms.uMouse.value = point;
                }
                if (this.velocityUniforms) {
                    this.velocityUniforms.uMouse.value = point;
                }
            }
        }
    }
    private setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.raycastPlane = new THREE.Mesh(
            this.leePerrySmith.geometry as THREE.BufferGeometry,
            new THREE.MeshBasicMaterial({
                color: new THREE.Color("white"),
                wireframe: false,
                transparent: true,
                visible: false,
                opacity: 0.05,
            })
        );
        this.raycastPlane.position.z = 0;
        this.scene.add(this.raycastPlane);

        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
    }

    private gltfLoader: GLTFLoader;

    addLight() {
        const light = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(light);
    }

    async initialize() {
        const headScene = await this.gltfLoader.loadAsync("/head.glb");
        const head = headScene.scene.getObjectByName("LeePerrySmith") as THREE.Mesh;
        head.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        head.scale.set(0.2, 0.2, 0.2);
        head.geometry.scale(0.2, 0.2, 0.2);
        this.leePerrySmith = head;

        this.position = new THREE.Vector3();
        this.matrix = new THREE.Matrix4();

        const texture = this.getPointsFromObject(this.leePerrySmith);
        this.positionsSampled = texture;

        const matcapTexture = new THREE.TextureLoader().load(matcap);
        const material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0.0 },
                uMouse: { value: new THREE.Vector3(0, 0, 0) },
                uTexture: { value: this.positionsSampled },
                uVelocity: { value: null },
                uMatcap: { value: matcapTexture },
            },
            fragmentShader,
            vertexShader: vertexInstanceShader,
        });

        this.geometryInstanced = new THREE.ConeGeometry(0.005, 0.01, 5, 5).toNonIndexed();
        const uvInstanced = new Float32Array(this.count * 2);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;
                uvInstanced[2 * index] = j / (this.size - 1);
                uvInstanced[2 * index + 1] = i / (this.size - 1);
            }
        }
        this.geometryInstanced.setAttribute(
            "uvRef",
            new THREE.InstancedBufferAttribute(uvInstanced, 2)
        );

        // this.scene.add(this.mesh);
        this.makeInstanced(this.geometryInstanced, material);
    }

    private resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    clock = new THREE.Clock();
    private animate() {
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        this.gpuCompute.compute();
        this.renderer.render(this.scene, this.camera);

        if (this.positionUniforms) {
            this.positionUniforms.time.value = elapsedTime;
        }
        if (this.velocityUniforms) {
            this.velocityUniforms.time.value = elapsedTime;
        }

        // if (this.planeMaterial && this.positionVariable) {
        //     this.planeMaterial.uniforms.time.value = elapsedTime;
        //     this.planeMaterial.uniforms.uTexture.value = this.gpuCompute.getCurrentRenderTarget(
        //         this.positionVariable
        //     ).texture;
        // }

        if (this.mesh) {
            this.mesh.material.uniforms.time.value = elapsedTime;
            this.mesh.material.uniforms.uTexture.value = this.gpuCompute.getCurrentRenderTarget(
                this.positionVariable
            ).texture;
            this.mesh.material.uniforms.uVelocity.value = this.gpuCompute.getCurrentRenderTarget(
                this.velocityVariable
            ).texture;
        }

        if (this.controls) {
            this.controls.update();
        }

        if (this.stats) {
            this.stats.update();
        }

        this.rafId = requestAnimationFrame(() => this.animate());
    }

    getGeometryByteLength(geometry: THREE.BufferGeometry) {
        let total = 0;

        if (geometry.index) total += geometry.index.array.byteLength;

        for (const name in geometry.attributes) {
            total += geometry.attributes[name].array.byteLength;
        }

        return total;
    }

    makeInstanced(geometry: THREE.BufferGeometry, material: THREE.Material) {
        const matrix = new THREE.Matrix4();
        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

        // for (let i = 0; i < this.count; i++) {
        //     // get position for a this.positionsSampled

        //     randomizeMatrix(matrix);
        //     this.mesh.setMatrixAt(i, matrix);
        // }

        this.scene.add(this.mesh);
    }

    private initGPGPU() {
        if (!this.positionsSampled) return;

        this.gpuCompute = new GPUComputationRenderer(this.size, this.size, this.renderer);

        const texture1 = this.gpuCompute.createTexture();
        this.fillVelocityTexture(texture1);

        this.velocityVariable = this.gpuCompute.addVariable(
            "uVelocityTexture",
            simVelocityShader,
            texture1
        );
        this.positionVariable = this.gpuCompute.addVariable(
            "uPositionTexture",
            simFragmentShader,
            this.positionsSampled
        );

        this.gpuCompute.setVariableDependencies(this.velocityVariable, [
            this.positionVariable,
            this.velocityVariable,
        ]);
        this.gpuCompute.setVariableDependencies(this.positionVariable, [
            this.positionVariable,
            this.velocityVariable,
        ]);

        this.positionUniforms = this.positionVariable.material.uniforms;
        this.positionUniforms.time = { value: 0.0 };
        this.positionUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
        this.positionUniforms.uOriginalPositionTexture = { value: this.positionsSampled };
        this.positionUniforms.uProgress = { value: 0 };

        this.velocityUniforms = this.velocityVariable.material.uniforms;
        this.velocityUniforms.time = { value: 0.0 };
        this.velocityUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
        this.velocityUniforms.uOriginalPositionTexture = { value: this.positionsSampled };
        this.velocityUniforms.uProgress = { value: 0 };

        this.positionVariable.wrapS = THREE.RepeatWrapping;
        this.positionVariable.wrapT = THREE.RepeatWrapping;

        this.velocityVariable.wrapS = THREE.RepeatWrapping;
        this.velocityVariable.wrapT = THREE.RepeatWrapping;

        const error = this.gpuCompute.init();

        if (error !== null) {
            console.error(error);
        }
    }

    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.gpuCompute) {
            this.gpuCompute.dispose();
        }
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("resize", this.resize);
        this.renderer.dispose();
    }
}

export default Scene;
