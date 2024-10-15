import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

import fragmentShader from "./shaders/fragment.glsl";
import vertexShader from "./shaders/vertex.glsl";
import simFragmentShader from "./shaders/simFragment.glsl";
import simVertexShader from "./shaders/simVertex.glsl";
import gui from "lil-gui";

import text2Example from "./assets/exampl.jpg";

const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

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
    private positionsSampled2?: THREE.DataTexture;
    private geometry?: THREE.BufferGeometry;
    private fboScene?: THREE.Scene;
    private fboCamera?: THREE.OrthographicCamera;
    private simMaterial?: THREE.ShaderMaterial;
    private quad?: THREE.Mesh;
    private renderTarget?: THREE.WebGLRenderTarget;
    private renderTargetPong?: THREE.WebGLRenderTarget;
    private raycaster?: THREE.Raycaster;
    private raycastPlane?: THREE.Mesh;
    private gui?: gui;
    private stats?: Stats;
    size = 1024;
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

        this.initialize();

        window.addEventListener("resize", this.resize.bind(this));
    }

    debugObj = {
        progress: 0,
    };
    setupDebug() {
        this.gui = new gui();

        this.gui
            .add(this.debugObj, "progress", 0, 1)
            .onChange((value: number) => {
                if (!this.simMaterial) return;
                this.simMaterial.uniforms.uProgress.value = value;
            })
            .name("Progress");

        this.gui.domElement.style.position = "absolute";
        this.gui.domElement.style.zIndex = "100";

        this.stats = new Stats();
        this.stats.showPanel(0);
        document.body.appendChild(this.stats.dom);
    }

    getPointsFromObject(geo: THREE.BufferGeometry) {
        const data = new Float32Array(this.count * 4);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = (i * this.size + j) * 4;
                const geoIndex = i * this.size + j;

                // generate points in a sphere
                // const u = i / this.size;
                // const v = j / this.size;
                // const theta = 2 * Math.PI * u;
                // const phi = Math.acos(2 * v - 1);
                // const x = Math.sin(phi) * Math.cos(theta);
                // const y = Math.sin(phi) * Math.sin(theta);
                // const z = Math.cos(phi);

                // data[index] = x;
                // data[index + 1] = y;
                // data[index + 2] = z;
                // data[index + 3] = Math.random() - 0.5;

                // generate points in a geometry
                const x = geo.attributes.position.getX(geoIndex);
                const y = geo.attributes.position.getY(geoIndex);
                const z = geo.attributes.position.getZ(geoIndex);

                data[index] = x;
                data[index + 1] = y;
                data[index + 2] = z;

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

    private setupFbo() {
        const count = this.size * this.size;
        const data = new Float32Array(4 * count);

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = (i * this.size + j) * 4;
                data[index] = lerp(-0.5, 0.5, j / (this.size - 1));
                data[index + 1] = lerp(-0.5, 0.5, i / (this.size - 1));
                data[index + 2] = 0;
                data[index + 3] = 1;
            }
        }

        // used the buffer to create a DataTexture
        const texture = new THREE.DataTexture(
            data,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        texture.needsUpdate = true;

        const geo = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const uvs = new Float32Array(count * 2);

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;
                positions[index * 3] = j / this.size - 0.5;
                positions[index * 3 + 1] = i / this.size - 0.5;
                positions[index * 3 + 2] = Math.random() * 0.01;

                uvs[index * 2] = i / (this.size - 1);
                uvs[index * 2 + 1] = j / (this.size - 1);
            }
        }

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        this.geometry = geo;

        // create a scene and a camera for the FBO
        this.fboScene = new THREE.Scene();
        this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);
        this.fboCamera.position.z = 1;
        this.fboCamera.lookAt(new THREE.Vector3(0, 0, 0));

        const geometry = new THREE.PlaneGeometry(2, 2, 2, 2);

        this.simMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uPositionTexture: { value: this.positionsSampled },
                uPositionToTexture: { value: this.positionsSampled2 },
                uOriginalPositionTexture: { value: this.positionsSampled },
                uProgress: { value: 0 },
                time: { value: 0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            },
            fragmentShader: simFragmentShader,
            vertexShader: simVertexShader,
        });

        this.quad = new THREE.Mesh(geometry, this.simMaterial);
        this.fboScene.add(this.quad);

        this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
        });
        this.renderTargetPong = this.renderTarget.clone();
    }

    handleMouseMove(event: MouseEvent) {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.raycaster && this.raycastPlane) {
            this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
            const intersects = this.raycaster.intersectObjects([this.raycastPlane]);

            if (intersects.length > 0) {
                const { point } = intersects[0];
                if (this.simMaterial) {
                    this.simMaterial.uniforms.uMouse.value = point;
                    this.simMaterial.needsUpdate = true;
                }
            }
        }
    }
    private setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.raycastPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0,
            })
        );
        this.raycastPlane.position.z = 0;
        this.scene.add(this.raycastPlane);

        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
    }

    async initialize() {
        // const texture = await this.getPixelDataFromImage(textExample);
        const texture2 = await this.getPixelDataFromImage(text2Example);

        const texture = this.getPointsFromObject(
            new THREE.TorusKnotGeometry(2.5, 1.2, 1024, 1024, 12, 5)
        );

        this.positionsSampled = texture;
        this.positionsSampled2 = texture2;

        this.setupFbo();
        this.setupRaycaster();

        const material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0.0 },
                uMouse: { value: new THREE.Vector3(0, 0, 0) },
                uTexture: { value: this.positionsSampled },
            },
            fragmentShader,
            vertexShader,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const plane = new THREE.Points(this.geometry, material);
        plane.position.z = 0;
        this.planeMaterial = material;
        this.scene.add(plane);

        this.setupDebug();

        this.animate();
    }

    private resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        if (this.renderTarget) this.renderer.setRenderTarget(this.renderTarget);
        if (this.fboScene && this.fboCamera) this.renderer.render(this.fboScene, this.fboCamera);
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);

        // swap the render targets
        const temp = this.renderTarget;
        this.renderTarget = this.renderTargetPong;
        this.renderTargetPong = temp;

        if (this.planeMaterial && this.renderTarget) {
            this.planeMaterial.uniforms.time.value += 0.01;
            this.planeMaterial.uniforms.uTexture.value = this.renderTarget.texture;
        }
        if (this.simMaterial && this.renderTargetPong) {
            this.simMaterial.uniforms.time.value += 0.01;
            this.simMaterial.uniforms.uPositionTexture.value = this.renderTargetPong.texture;
        }
        if (this.controls) {
            this.controls.update();
        }

        if (this.stats) {
            this.stats.update();
        }

        this.rafId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("resize", this.resize);
        this.renderer.dispose();
    }
}

export default Scene;
