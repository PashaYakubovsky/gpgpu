/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GPUComputationRenderer, Variable } from "three/addons/misc/GPUComputationRenderer.js";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

import fragmentShader from "./shaders/fragment.glsl";
import vertexInstanceShader from "./shaders/vertexInstance.glsl";
import simFragmentShader from "./shaders/simFragment.glsl";
import simVelocityShader from "./shaders/simVelocity.glsl";
import matcap from "../assets/matcap.jpg?url";
import matcap2 from "../assets/matcap2.jpg?url";
import skyboxImg from "../assets/skybox.webp?url";

// post processing
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { RGBShiftShader } from "three/examples/jsm/Addons.js";

import { BladeApi, Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";

import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import gsap from "gsap";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

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
    name: string = "GPGPU";
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: MapControls;
    private rafId?: number;
    private positionsSampled?: THREE.DataTexture;
    private positionsSampled2?: THREE.DataTexture;
    private raycaster?: THREE.Raycaster;
    private raycastPlane?: THREE.Mesh;
    private guiPane?: Pane;
    private fpsGraph: BladeApi;
    private stats?: Stats;
    private container?: HTMLElement;

    private gpuCompute!: GPUComputationRenderer;
    private positionVariable?: Variable;
    private positionUniforms?: THREE.ShaderMaterial["uniforms"];
    private velocityUniforms?: THREE.ShaderMaterial["uniforms"];
    private velocityVariable?: Variable;

    private targetObject!: THREE.Mesh;
    private sampler!: MeshSurfaceSampler;
    private position!: THREE.Vector3;
    private matrix!: THREE.Matrix4;
    private geometryInstanced!: THREE.BufferGeometry;
    private mesh?: THREE.InstancedMesh;

    private gltfObject: GLTF | null = null;
    private mixer: THREE.AnimationMixer | null = null;

    private rectLight1?: THREE.RectAreaLight;
    private rectLight2?: THREE.RectAreaLight;
    private composer?: EffectComposer;
    private fxaaPass?: ShaderPass;
    private rgbShift?: ShaderPass;

    private pointLightHelper: THREE.PointLightHelper;
    private skyboxMaterial: THREE.ShaderMaterial;
    private pointLight: THREE.PointLight;

    debugObj = {
        progress: 0.01,
    };

    size = 256;
    count = this.size * this.size;

    constructor({ dom }: { dom: HTMLElement }) {
        this.container = dom;

        this.size = Number.parseInt(localStorage.getItem("gpgpu-city-size")) || 256;
        this.count = this.size * this.size;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: true,
        });
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.setPixelRatio(Math.max(2, window.devicePixelRatio));

        this.camera.position.set(3, 4, -3);
        this.camera.updateProjectionMatrix();

        this.container.appendChild(this.renderer.domElement);

        const draco = new DRACOLoader();
        draco.setDecoderConfig({ type: "js" });
        draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

        // Optional: Pre-fetch Draco WASM/JS module.
        draco.preload();

        RectAreaLightUniformsLib.init();

        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(draco);

        Promise.all([this.initialize()]).then(() => {
            this.addLight();
            this.initGPGPU();
            this.setupRaycaster();
            this.setupMixer();

            this.centerMap();
            this.setupFog();
            this.setupPostProcessing();

            this.addSky();
            this.setupDebug();
            this.animate.bind(this);
            this.animate();

            window.addEventListener("resize", this.resize.bind(this));
        });
    }

    async addSky() {
        const texture = new THREE.TextureLoader().load(skyboxImg);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.flipY = true;
        const sphereMat = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: new THREE.Uniform(texture),
                uTime: new THREE.Uniform(0),
            },
            fragmentShader: `
                uniform sampler2D uTexture;
                varying vec2 vUv;
                uniform float uTime;

                void main() {
                    vec2 uv = vUv;
                    uv.x = mod(uv.x + uTime * 0.01, 1.0); // Infinite rotation by x-axis
                    vec4 skybox = texture2D(uTexture, uv);
                    vec4 color = vec4(1.);
                    color.rgb = skybox.rgb;
                    gl_FragColor = color;
                }
            `,
            vertexShader: `
                varying vec3 vNormal;
                varying vec2 vUv;
                uniform float uTime;

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vUv = uv;
                    vec3 pos = position;
                    pos.x += sin(pos.y * 10.0 + uTime) * 0.2; // Wobble effect
                    pos.y += sin(pos.x * 10.0 + uTime) * 0.2; // Wobble effect
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            side: THREE.DoubleSide,
        });
        this.skyboxMaterial = sphereMat;

        this.scene.background = texture;
        this.scene.environment = texture;

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                color: "gray",
            })
        );
        floor.position.y = -3;
        floor.rotateX(Math.PI / 2);
        this.scene.add(floor);
    }

    centerMap() {
        // animate camera to center of the map
        gsap.to(this.camera.position, {
            x: 0,
            y: 5,
            z: 5,
            duration: 1.5,
            ease: "power2.inOut",
        });
    }

    setupDebug() {
        this.guiPane = new Pane({
            title: "Config",
            expanded: false,
        });
        this.guiPane.registerPlugin(EssentialsPlugin);

        // FPS graph
        this.fpsGraph = this.guiPane.addBlade({
            view: "fpsgraph",
            label: "fpsgraph",
        });

        this.guiPane
            .addBinding(this.debugObj, "progress", {
                min: 0,
                max: 1,
            })
            .on("change", ev => {
                const value = ev.value;
                if (!this.positionUniforms || !this.velocityUniforms) return;
                this.positionUniforms.uProgress.value = value;
                this.velocityUniforms.uProgress.value = value;
            });
        const sizeItem = this.guiPane
            .addBinding(this, "size", {
                min: 0,
                max: 1024,
            })
            .on("change", ev => {
                const val = ev.value;
                localStorage.setItem("gpgpu-city-size", String(val));
                sizeItem.label = "Refresh page to apply new progress";
            });
        // this.guiPane.addBinding(this.mesh.material, "wireframe").label = "Wireframe cubes";
        // this.guiPane.addBinding(this.targetObject.material, "wireframe").label =
        //     "Wireframe buildings";

        const fogFolder = this.guiPane.addFolder({
            title: "Fog",
        });
        const fog = this.scene.fog as THREE.Fog;
        fogFolder.addBinding(fog, "near", {
            min: 0,
            max: 50,
        }).label = "Fog near";
        fogFolder.addBinding(fog, "far", {
            min: 0,
            max: 50,
        }).label = "Fog far";

        const lightFolder = this.guiPane.addFolder({
            title: "Lights",
        });
        lightFolder.addBinding(this.rectLight1, "intensity", {
            min: 0,
            max: 10,
        }).label = "Light 1 intensity";
        lightFolder.addBinding(this.rectLight2, "intensity", {
            min: 0,
            max: 10,
        }).label = "Light 2 intensity";

        const postProcessingFolder = this.guiPane.addFolder({
            title: "Post Processing",
        });
        const fxaaBtn = postProcessingFolder.addButton({
            title: "Toggle FXAA",
        });
        fxaaBtn.on("click", () => {
            this.fxaaPass.enabled = !this.fxaaPass.enabled;
            fxaaBtn.label = this.fxaaPass.enabled ? "FXAA enabled" : "FXAA disabled";
        });
        const rgbShiftBtn = postProcessingFolder.addButton({
            title: "Toggle RGB shift",
        });
        rgbShiftBtn.on("click", () => {
            this.rgbShift.enabled = !this.rgbShift.enabled;
            rgbShiftBtn.label = this.rgbShift.enabled ? "RGB shift enabled" : "RGB shift disabled";
        });
        postProcessingFolder.addBinding(this.rgbShift.material.uniforms["amount"], "value", {
            min: 0,
            max: 0.1,
        }).label = "RGB Shift amount";

        if (this.pointLightHelper) {
            const mat = (
                this.pointLightHelper as unknown as { material: THREE.MeshPhysicalMaterial }
            ).material;
            const materialFolder = this.guiPane.addFolder({
                title: "Point Light Helper Material",
            });

            materialFolder.addBinding(mat, "roughness", {
                min: 0,
                max: 1,
            }).label = "Roughness";

            materialFolder.addBinding(mat, "metalness", {
                min: 0,
                max: 1,
            }).label = "Metalness";

            materialFolder.addBinding(mat, "transmission", {
                min: 0,
                max: 1,
            }).label = "Transmission";

            materialFolder.addBinding(mat, "emissiveIntensity", {
                min: 0,
                max: 1,
            }).label = "Emissive Intensity";

            materialFolder.addBinding(mat, "ior", {
                min: 1,
                max: 2.5,
            }).label = "IOR";

            materialFolder.addBinding(mat, "transparent").label = "Transparent";

            materialFolder.addBinding(mat, "emissive").label = "Emissive Color";
        }

        if (this.buildingsMaterial) {
            const physicalMaterial = this.buildingsMaterial as THREE.MeshPhysicalMaterial;

            const physicalMaterialFolder = this.guiPane.addFolder({
                title: "Physical Material",
            });

            physicalMaterialFolder.addBinding(physicalMaterial, "roughness", {
                min: 0,
                max: 1,
            }).label = "Roughness";

            physicalMaterialFolder.addBinding(physicalMaterial, "metalness", {
                min: 0,
                max: 1,
            }).label = "Metalness";

            physicalMaterialFolder.addBinding(physicalMaterial, "clearcoat", {
                min: 0,
                max: 1,
            }).label = "Clearcoat";

            physicalMaterialFolder.addBinding(physicalMaterial, "clearcoatRoughness", {
                min: 0,
                max: 1,
            }).label = "Clearcoat Roughness";

            physicalMaterialFolder.addBinding(physicalMaterial, "reflectivity", {
                min: 0,
                max: 1,
            }).label = "Reflectivity";

            physicalMaterialFolder.addBinding(physicalMaterial, "transmission", {
                min: 0,
                max: 1,
            }).label = "Transmission";

            physicalMaterialFolder.addBinding(physicalMaterial, "ior", {
                min: 1,
                max: 2.5,
            }).label = "IOR";

            physicalMaterialFolder.addBinding(physicalMaterial, "sheen", {
                min: 0,
                max: 1,
            }).label = "Sheen";

            physicalMaterialFolder.addBinding(physicalMaterial, "emissiveIntensity", {
                min: 0,
                max: 1,
            }).label = "Emissive Intensity";

            physicalMaterialFolder.addBinding(physicalMaterial, "emissive").label =
                "Emissive Color";
        }
    }

    setupFog() {
        this.scene.fog = new THREE.Fog(new THREE.Color("gray"), 5, 50);
    }

    setupMixer() {
        const gltf = this.gltfObject;
        if (!gltf) return;

        this.controls = new MapControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.zoomSpeed = 0.5;

        setTimeout(() => {
            if (this.positionUniforms && this.velocityUniforms) {
                this.debugObj.progress = 0.0;
                this.positionUniforms.uProgress.value = this.debugObj.progress;
                this.velocityUniforms.uProgress.value = this.debugObj.progress;
            }
        }, 2000);
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

        if (this.raycaster && this.raycastPlane) {
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
        if (!this.targetObject) return;
        this.raycastPlane = new THREE.Mesh(
            this.targetObject.geometry as THREE.BufferGeometry,
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
        const rectLight1 = new THREE.RectAreaLight("white", 3, 20, 20);
        rectLight1.position.set(0, 10, 5);
        rectLight1.rotateX(-Math.PI / 4);
        this.rectLight1 = rectLight1;
        // this.scene.add(rectLight1);

        const rectLight2 = new THREE.RectAreaLight("red", 30, 20, 20);
        rectLight2.position.set(0, 15, 0);
        rectLight2.rotateX(-Math.PI / 2);
        this.rectLight2 = rectLight2;
        // this.scene.add(rectLight2);

        const dirLight = new THREE.DirectionalLight("gray", 1);
        dirLight.position.set(5, 10, 0);
        dirLight.target.position.set(0, 0, 0);
        this.scene.add(dirLight);

        const pointLight = new THREE.PointLight("red", 10, 50);
        this.scene.add(pointLight);
        pointLight.position.y = 5;
        this.pointLight = pointLight;
        const pointLightHelper = new THREE.PointLightHelper(pointLight);
        (pointLightHelper as unknown as { material: CustomShaderMaterial }).material =
            new CustomShaderMaterial({
                baseMaterial: THREE.MeshPhysicalMaterial,
                roughness: 0,
                metalness: 0,
                transmission: 0.8,
                emissive: new THREE.Color("red"),
                emissiveIntensity: 0.05,
                ior: 2.2,
                transparent: true,
                envMap: null,
                clearcoat: 0.5,
            });

        this.pointLightHelper = pointLightHelper;
        this.scene.add(pointLightHelper);
    }

    setupPostProcessing() {
        const composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        composer.addPass(renderPass);

        const fxaaPass = new ShaderPass(FXAAShader);
        fxaaPass.material.uniforms["resolution"].value.x = 1 / window.innerWidth;
        fxaaPass.material.uniforms["resolution"].value.y = 1 / window.innerHeight;
        composer.addPass(fxaaPass);

        const rgbShift = new ShaderPass(RGBShiftShader);
        rgbShift.enabled = true;
        rgbShift.material.uniforms["amount"].value = 0.02;

        gsap.to(rgbShift.material.uniforms["amount"], {
            value: 0.0,
            duration: 4,
            ease: "power4.inOut",
        });

        composer.addPass(rgbShift);

        this.composer = composer;
        this.fxaaPass = fxaaPass;
        this.rgbShift = rgbShift;
    }

    async initialize() {
        // make a mesh
        const geometryMerger = new GeometryMerger();
        geometryMerger.gltfLoader = this.gltfLoader;
        const {
            mesh: mergedMesh,
            gltf: gltf,
            material,
        } = await geometryMerger.loadAndMergeGeometries("/city.glb");

        this.buildingsMaterial = material;

        gltf.scene.rotateY(Math.PI);
        mergedMesh.rotateY(Math.PI);
        mergedMesh.geometry.rotateY(Math.PI);
        this.scene.add(gltf.scene);

        this.targetObject = mergedMesh;
        this.gltfObject = gltf;

        this.position = new THREE.Vector3();
        this.matrix = new THREE.Matrix4();

        const texture = this.getPointsFromObject(this.targetObject);
        this.positionsSampled = texture;

        const texture2 = this.getPointsFromObject(
            new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshBasicMaterial())
        );

        this.positionsSampled2 = texture2;

        const matcapTexture = new THREE.TextureLoader().load(matcap);
        matcapTexture.wrapS = THREE.ClampToEdgeWrapping;
        matcapTexture.wrapT = THREE.ClampToEdgeWrapping;
        matcapTexture.minFilter = THREE.LinearFilter;
        matcapTexture.magFilter = THREE.LinearFilter;
        matcapTexture.mapping = THREE.EquirectangularReflectionMapping;

        const mat = new THREE.ShaderMaterial({
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
            transparent: true,
        });

        this.makeInstanced(mat);
    }

    private resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if (this.fxaaPass) {
            this.fxaaPass.material.uniforms["resolution"].value.x = 1 / window.innerWidth;
            this.fxaaPass.material.uniforms["resolution"].value.y = 1 / window.innerHeight;
        }
    }

    clock = new THREE.Clock();
    private animate() {
        if (this.fpsGraph) {
            (this.fpsGraph as any).begin();
        }
        const elapsedTime = this.clock.getElapsedTime();
        this.gpuCompute.compute();

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        if (this.mixer) {
            this.mixer.update(0.01);
        }
        if (this.positionUniforms) {
            this.positionUniforms.time.value = elapsedTime;
        }
        if (this.velocityUniforms) {
            this.velocityUniforms.time.value = elapsedTime;
        }
        if (this.pointLight) {
            this.pointLight.position.y = 5 + Math.sin(elapsedTime * 0.1) * 2;
            this.pointLight.rotation.z = Math.sin(elapsedTime * 0.1) * 2;
        }

        if (this.mesh?.material) {
            // @ts-ignore
            this.mesh.material.uniforms.time.value = elapsedTime;
            // @ts-ignore
            this.mesh.material.uniforms.uTexture.value = this.gpuCompute.getCurrentRenderTarget(
                // @ts-ignore
                this.positionVariable
            ).texture;
            // @ts-ignore
            this.mesh.material.uniforms.uVelocity.value = this.gpuCompute.getCurrentRenderTarget(
                // @ts-ignore
                this.velocityVariable
            ).texture;
        }

        if (this.controls) {
            this.controls.update();
        }

        if (this.stats) {
            this.stats.update();
        }

        if (this.fpsGraph) {
            (this.fpsGraph as any).end();
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

    makeInstanced(material: THREE.Material) {
        // Create an InstancedBufferGeometry
        this.geometryInstanced = new THREE.InstancedBufferGeometry();

        // Set up the base geometry (e.g., a box)
        const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1, 1, 1, 1);
        this.geometryInstanced.index = boxGeometry.index;
        this.geometryInstanced.attributes.position = boxGeometry.attributes.position;
        this.geometryInstanced.attributes.normal = boxGeometry.attributes.normal;

        // create a random vertices to instances geometry
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

        this.mesh = new THREE.InstancedMesh(this.geometryInstanced, material, this.count);
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
        this.positionUniforms.uPositionToTexture = { value: this.positionsSampled2 };
        this.positionUniforms.uProgress = { value: this.debugObj.progress };

        this.velocityUniforms = this.velocityVariable.material.uniforms;
        this.velocityUniforms.time = { value: 0.0 };
        this.velocityUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
        this.velocityUniforms.uOriginalPositionTexture = { value: this.positionsSampled };
        this.positionUniforms.uPositionToTexture = { value: this.positionsSampled2 };
        this.velocityUniforms.uProgress = { value: this.debugObj.progress };

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
        if (this.stats) {
            this.stats.dom.remove();
        }
        if (this.guiPane) {
            this.guiPane.dispose();
        }

        this.container?.removeChild(this.renderer.domElement);

        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("resize", this.resize);
        this.renderer.dispose();
    }
}

export default Scene;

class GeometryMerger {
    gltfLoader: GLTFLoader;

    constructor() {}

    async loadAndMergeGeometries(url: string): Promise<{
        gltf: GLTF;
        mesh: THREE.Mesh;
        material: THREE.Material;
    }> {
        const gltfScene = await this.gltfLoader.loadAsync(url);
        const scene = gltfScene.scene;
        const geometries: THREE.BufferGeometry[] = [];

        const matcapTexture = new THREE.TextureLoader().load(matcap2);
        matcapTexture.wrapS = THREE.ClampToEdgeWrapping;
        matcapTexture.wrapT = THREE.ClampToEdgeWrapping;
        matcapTexture.minFilter = THREE.LinearFilter;
        matcapTexture.magFilter = THREE.LinearFilter;
        matcapTexture.mapping = THREE.EquirectangularReflectionMapping;

        const material = new THREE.MeshPhysicalMaterial({
            side: THREE.FrontSide,
            flatShading: true,
            roughness: 0.23,
            metalness: 0.63,
            clearcoat: 0.87,
            clearcoatRoughness: 1.0,
            reflectivity: 1.0,
            transmission: 0,
            ior: 1,
            color: new THREE.Color(0x333333),
        });

        scene.traverse(child => {
            if (child instanceof THREE.Mesh) {
                if (child.name !== "group678473692") {
                    // Ensure the geometry has an index buffer
                    let geometry = child.geometry;
                    if (!geometry.index) {
                        geometry = geometry.toNonIndexed();
                    }
                    geometries.push(geometry);
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.geometry.scale(3, 3, 3);
            }
        });

        const floor = scene.getObjectByName("group678473692") as THREE.Mesh;
        floor.receiveShadow = true;
        floor.castShadow = false;
        floor.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#000333"),
            roughness: 0.9,
            metalness: 0,
            side: THREE.DoubleSide,
        });

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);

        if (!mergedGeometry) {
            throw new Error("Failed to merge geometries");
        }

        return {
            gltf: gltfScene,
            mesh: new THREE.Mesh(mergedGeometry, material),
            material,
        };
    }
}
