import * as THREE from "three";

import vertexShader from "./shaders/fboVertex.glsl";
import fragmentShader from "./shaders/fboFragment.glsl";

import simFragment from "./shaders/simFboFragment.glsl";
import simVertex from "./shaders/simFboVertex.glsl";
import GUI from "lil-gui";

import t1 from "../assets/logo.png";
import t2 from "../assets/super.png";

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { MapControls } from "three/examples/jsm/Addons.js";
import gsap from "gsap";

/**
 *
 * @param {number} a
 * @param {number} b
 * @param {number} n
 * @returns {number}
 * @description Linear interpolation
 */
function lerp(a, b, n) {
    return (1 - n) * a + n * b;
}

/**
 * @param {string} path
 * @returns {Promise<HTMLImageElement>}
 * @description Load an image from a path
 */
const loadImage = path => {
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

/**
 * @typedef {Object} IFboSketch
 * @property {HTMLElement} container
 * @property {() => void} destroy
 * @property {() => void} render
 * @property {() => void} resize
 * @property {() => void} setupFBO
 * @property {() => void} setupResize
 * @property {() => void} addObjects
 * @property {() => void} setupSettings
 * @property {() => any} getPointsOnSphere
 * @property {(image: HTMLImageElement) => any} getPixelDataFromImage
 * @property {(event: MouseEvent) => void} handleMouseMove
 * @property {() => void} mouseEvents
 * @property {boolean} init
 * @property {number} currentParticles
 * @property {number} size
 * @property {number} number
 * @property {THREE.Scene} scene
 * @property {number} width
 * @property {number} height
 * @property {string} name
 */

/**
 * @class
 * @implements {IFboSketch}
 */

export default class FboSketch {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.dom
     */
    constructor(options) {
        this.name = "Particle emitter";
        this.init = false;
        this.currentParticles = 0;
        this.size = 256;
        this.number = this.size * this.size;
        this.container = options.dom;
        this.scene = new THREE.Scene();
        this.emittedVector = new THREE.Vector3(0, 0, 0);

        this.settings = {
            progress: 1,
            gravity: new THREE.Vector3(0, 0, 5),
            radius: 0.19,
            speed: 0.1,
            randomness: 0.5,
        };

        this.debugOptions = {};

        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
        });
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);

        this.loadingManager = new THREE.LoadingManager();
        this.loadingManager.onStart = () => {
            console.log("Loading started");
        };
        this.loadingManager.onLoad = () => {
            console.log("Loading finished");
        };
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            console.log(`Loading file: ${url}. ${itemsLoaded} of ${itemsTotal} loaded`);
        };

        this.gltfLoader = new GLTFLoader(this.loadingManager);
        this.dracoLoader = new DRACOLoader();

        this.dracoLoader.setDecoderConfig({ type: "js" });
        this.dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

        this.gltfLoader.setDRACOLoader(this.dracoLoader);

        this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);
        this.camera.position.z = -10;
        // this.camera.position.y = 10;
        // this.camera.position.x = 8;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        new RGBELoader().setPath("/").load("blue_lagoon_night_1k.hdr", texture => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
        });

        this.emitters = [];

        this.addLoadingBar();

        this.gltfLoader.load("../../public/bird_0.glb", gltf => {
            this.gltf = gltf;
            gsap.to(this.loadingMat.uniforms.uProgress, {
                value: 1,
                duration: 5,
                delay: 1,
                onComplete: () => {
                    this.paused = false;
                    if (this.loadingMesh) this.scene.remove(this.loadingMesh);
                    this.loadingMesh = null;
                    this.addObjects();
                },
            });
        });

        this.controls = new MapControls(this.camera, this.renderer.domElement);

        this.time = 0;
        Promise.all([this.getPixelDataFromImage(t1), this.getPixelDataFromImage(t2)]).then(
            async textures => {
                this.data1 = this.getPointsOnSphere();
                this.data2 = this.getPointsOnSphere();
                this.getPixelDataFromImage(t1);
                this.mouseEvents();
                this.setupFBO();
                this.addLights();
                this.setupResize();
                this.setupSettings();

                this.render();
            }
        );
    }

    addLoadingBar() {
        // create 2d game like loading bar
        this.loadingMat = new THREE.ShaderMaterial({
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uProgress: { value: 0 },
            },
            vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
            `,
            fragmentShader: `
            varying vec2 vUv;
            uniform float uProgress;
            void main() {
                if(vUv.x > uProgress) discard;
                gl_FragColor = vec4(1.0);
            }
            `,
        });

        const lGeo = new THREE.PlaneGeometry(10, 2, 1, 1);
        const lMesh = new THREE.Mesh(lGeo, this.loadingMat);
        lMesh.position.set(0, 0, 10);

        // rotate front to camera
        lMesh.lookAt(this.camera.position);
        this.loadingMesh = lMesh;
        this.scene.add(lMesh);
    }

    addLights() {
        const width = 10;
        const height = 10;
        const intensity = 5;
        const rectLight = new THREE.RectAreaLight(0xff0000, intensity, width, height);
        rectLight.position.set(10, 8, 0);
        rectLight.lookAt(0, 0, 0);
        this.scene.add(rectLight);

        const rectLight2 = new THREE.RectAreaLight(0xfffff0, intensity, width, height);
        rectLight2.position.set(0, 4, 20);
        rectLight2.lookAt(0, 0, 0);
        this.scene.add(rectLight2);

        const rectLight3 = new THREE.RectAreaLight(0xff0000, intensity, width, height);
        rectLight3.position.set(-10, 7, 0);
        rectLight3.lookAt(0, 0, 0);
        this.scene.add(rectLight3);

        // add helpers
        // const helper = new RectAreaLightHelper(rectLight);
        // this.scene.add(helper);

        // const helper2 = new RectAreaLightHelper(rectLight2);
        // this.scene.add(helper2);

        // const helper3 = new RectAreaLightHelper(rectLight3);
        // this.scene.add(helper3);
    }

    async setupGltfObject() {
        try {
            const diamondMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xffffff, // White color
                metalness: 0, // Diamonds are not metallic
                roughness: 0, // Very smooth surface
                transmission: 1, // Fully transmissive
                thickness: 0.5, // Refraction thickness
                envMapIntensity: 0.1,
                envMap: this.scene.environment,
                clearcoat: 0.1, // Add clearcoat
                clearcoatRoughness: 0,
                ior: 2.4, // Index of refraction for diamond
                reflectivity: 1,
            });
            this.diamondMaterial = diamondMaterial;

            this.gltf.scene.traverse(m => {
                if (m instanceof THREE.Mesh && m.geometry.attributes.position.array.length < 120) {
                    this.emitters.push({
                        mesh: m,
                        prev: m.position.clone(),
                        dir: new THREE.Vector3(0, 0, 0),
                    });
                    m.visible = false;
                } else if (m instanceof THREE.Mesh) {
                    m.material = diamondMaterial;
                    m.castShadow = true;
                }
            });

            // add points to the bird
            const rootNode = this.gltf.scene.getObjectByName("RootNode").clone();
            const pointsMat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.01,
                blending: THREE.AdditiveBlending,
            });

            const meshes = [];
            rootNode.children.map(c => {
                if (c.name == "Left_Wing" || c.name == "Right_Wing") {
                    c.children.forEach(cc => {
                        if (cc.children[0] instanceof THREE.Mesh) {
                            cc.children[0].material = pointsMat;
                            meshes.push(cc.children[0]);
                        }
                    });
                } else {
                    c.visible = false;
                }
            });

            // Mixer setup
            this.mixer = new THREE.AnimationMixer(this.gltf.scene);
            console.log(this.gltf.animations);
            const flyClip = this.mixer.clipAction(this.gltf.animations[0]);
            flyClip.loop = THREE.LoopRepeat;
            flyClip.clampWhenFinished = true;
            flyClip.play();
            flyClip.timeScale = 1.5;

            this.scene.add(this.gltf.scene);
        } catch (e) {
            console.error(e);
        }
    }

    setupSettings() {
        this.gui = new GUI();

        this.gui
            .add(this.settings, "progress", 0, 1, 0.01)

            .onChange(val => {
                this.simMaterial.uniforms.uProgress.value = val;
            })
            .name("Emitted particles");

        if (this.debugPlane?.material)
            this.gui
                .add(this.debugPlane.material, "visible", Number(false))
                .name("Show debug plane");

        const gFold = this.gui.addFolder("Gravity");
        gFold
            .add(this.settings.gravity, "x", -10, 10, 0.001)
            .name("X")
            .onChange(val => {
                this.simMaterial.uniforms.uGravity.value = new THREE.Vector3(
                    val,
                    this.settings.gravity.y,
                    this.settings.gravity.z
                );
            });
        gFold
            .add(this.settings.gravity, "y", -10, 10, 0.001)
            .name("Y")
            .onChange(val => {
                this.simMaterial.uniforms.uGravity.value = new THREE.Vector3(
                    this.settings.gravity.x,
                    val,
                    this.settings.gravity.z
                );
            });
        gFold
            .add(this.settings.gravity, "z", -10, 10, 0.001)
            .name("Z")
            .onChange(val => {
                this.simMaterial.uniforms.uGravity.value = new THREE.Vector3(
                    this.settings.gravity.x,
                    this.settings.gravity.y,
                    val
                );
            });

        // btn to reset particles
        this.gui
            .add(
                {
                    reset: () => {
                        this.currentParticles = 0;
                        this.settings.progress = 0;
                        this.simMaterial.uniforms.uProgress.value = 0;
                        this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, 0, 0);
                        this.simMaterial.uniforms.uGravity.value = new THREE.Vector3(0, 0, 0);
                    },
                },
                "reset"
            )
            .name("Reset particles")
            .onFinishChange(() => {
                this.currentParticles = 0;
            });

        this.gui
            .add(this.settings, "radius", 0, 10, 0.001)
            .name("Radius")
            .onChange(val => {
                this.simMaterial.uniforms.uRadius.value = val;
                this.simMaterial.needsUpdate = true;
            });

        this.gui
            .add(this.settings, "speed", 0, 1, 0.001)
            .name("Speed")
            .onChange(val => {
                this.simMaterial.uniforms.uSpeed.value = val;
            });

        // random particles
        this.gui
            .add(this.settings, "randomness", 0, 1, 0.001)
            .name("Randomness")
            .onChange(val => {
                this.simMaterial.uniforms.uRandomness.value = val;
            });
    }

    getPointsOnSphere() {
        const data = new Float32Array(4 * this.number);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;

                // generate point on a sphere
                let theta = Math.random() * Math.PI * 2;
                let phi = Math.acos(Math.random() * 2 - 1); //
                // let phi = Math.random()*Math.PI; //
                let x = Math.sin(phi) * Math.cos(theta);
                let y = Math.sin(phi) * Math.sin(theta);
                let z = Math.cos(phi);

                data[4 * index] = x;
                data[4 * index + 1] = y;
                data[4 * index + 2] = z;
                data[4 * index + 3] = (Math.random() - 0.5) * 0.01;
            }
        }

        let dataTexture = new THREE.DataTexture(
            data,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        dataTexture.needsUpdate = true;

        return dataTexture;
    }

    async getPixelDataFromImage(url) {
        let img = await loadImage(url);
        let width = 200;
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = width;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, width);
        let canvasData = ctx.getImageData(0, 0, width, width).data;

        let pixels = [];
        for (let i = 0; i < canvasData.length; i += 4) {
            let x = (i / 4) % width;
            let y = Math.floor(i / 4 / width);
            if (canvasData[i] < 5) {
                pixels.push({ x: x / width - 0.5, y: 0.5 - y / width });
            }
        }

        const data = new Float32Array(4 * this.number);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;
                let randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
                if (Math.random() > 0.9) {
                    randomPixel = {
                        x: 3 * (Math.random() - 0.5),
                        y: 3 * (Math.random() - 0.5),
                    };
                }
                data[4 * index] = randomPixel.x + (Math.random() - 0.5) * 0.01;
                data[4 * index + 1] = randomPixel.y + (Math.random() - 0.5) * 0.01;
                data[4 * index + 2] = (Math.random() - 0.5) * 0.01;
                data[4 * index + 3] = (Math.random() - 0.5) * 0.01;
            }
        }

        let dataTexture = new THREE.DataTexture(
            data,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        dataTexture.needsUpdate = true;

        return dataTexture;
    }

    /**
     * @param {MouseEvent} e
     * @description Handle mouse move event
     * @returns {void}
     * @memberof FboSketch
     * @instance FboSketch
     * @method handleMouseMove
     */
    handleMouseMove(e) {
        this.pointer.x = (e.clientX / this.width) * 2 - 1;
        this.pointer.y = -(e.clientY / this.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // @ts-ignore
        const intersects = this.raycaster.intersectObjects(this.floorMesh ? [this.floorMesh] : []);
        if (intersects.length > 0) {
            console.log(intersects[0].point);
            this.simMaterial.uniforms.uMouse.value = intersects[0].point;
            this.destinationPos = intersects[0].point;
        }
    }
    mouseEvents() {
        window.addEventListener("mousemove", this.handleMouseMove.bind(this), false);
    }

    setupResize() {
        window.addEventListener("resize", this.resize.bind(this));
    }

    setupFBO() {
        // create data Texture
        const data = new Float32Array(4 * this.number);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;
                data[4 * index] = lerp(-0.5, 0.5, j / (this.size - 1));
                data[4 * index + 1] = lerp(-0.5, 0.5, i / (this.size - 1));
                data[4 * index + 2] = 0;
                data[4 * index + 3] = 1;
            }
        }

        this.positions = new THREE.DataTexture(
            data,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        this.positions.needsUpdate = true;

        // create FBO scene
        this.sceneFBO = new THREE.Scene();
        let viewArea = this.size / 2 + 0.01;
        this.cameraFBO = new THREE.OrthographicCamera(
            -viewArea,
            viewArea,
            viewArea,
            -viewArea,
            -2,
            2
        );
        this.cameraFBO.position.z = 1;
        this.cameraFBO.lookAt(new THREE.Vector3(0, 0, 0));

        let geo = new THREE.PlaneGeometry(2, 2, 2, 2);
        this.geo = new THREE.BufferGeometry();
        let pos = new Float32Array(this.number * 3);
        let uv = new Float32Array(this.number * 2);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;

                pos[3 * index] = this.size * lerp(-0.5, 0.5, j / (this.size - 1));
                pos[3 * index + 1] = this.size * lerp(-0.5, 0.5, i / (this.size - 1));
                pos[3 * index + 2] = 0;

                uv[2 * index] = j / (this.size - 1);
                uv[2 * index + 1] = i / (this.size - 1);
            }
        }
        this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        this.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

        // this.geo.setDrawRange(3, 10);

        this.simMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uMouse: { value: new THREE.Vector3(0, 0, 0) },
                uProgress: { value: 0 },
                uTime: { value: 0 },
                uSource: { value: new THREE.Vector3(0, 0, 0) },
                uRandomness: { value: this.settings?.randomness || 0.1 },
                uRenderMode: { value: 0 },
                uCurrentPosition: { value: this.data1 },
                uDirections: { value: null },
                uGravity: { value: this.settings?.gravity || new THREE.Vector3(0, 0, 0) },
                uRadius: { value: this.settings?.radius || 0.1 },
                uSpeed: { value: this.settings?.speed || 0.1 },
            },
            vertexShader: simVertex,
            fragmentShader: simFragment,
        });
        this.simMesh = new THREE.Points(this.geo, this.simMaterial);
        this.sceneFBO.add(this.simMesh);

        this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        });
        this.directions = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        });

        this.initPos = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        });

        this.renderTarget1 = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        });
    }

    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;

        this.camera.updateProjectionMatrix();
    }

    async addObjects() {
        await this.setupGltfObject();

        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.number * 3);
        const uvs = new Float32Array(this.number * 2);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;

                positions[3 * index] = j / this.size - 0.5;
                positions[3 * index + 1] = i / this.size - 0.5;
                positions[3 * index + 2] = 0;
                uvs[2 * index] = j / (this.size - 1);
                uvs[2 * index + 1] = i / (this.size - 1);
            }
        }
        this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

        this.material = new THREE.MeshNormalMaterial();

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                // uTexture: { value: new THREE.TextureLoader().load(texture) },
                uTexture: { value: this.positions },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            depthWrite: false,
            depthTest: false,
            transparent: true,
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.mesh);

        this.debugPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1, 1, 1),
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(t1),
                visible: false,
            })
        );
        this.debugPlane.position.set(1.5, 0, 0);
        this.scene.add(this.debugPlane);

        this.emitterDirection = new THREE.Vector3(0, 0, 0);
        this.emitterPrevDirection = new THREE.Vector3(0, 0, 0);
    }

    render() {
        if (this.paused) {
            window.requestAnimationFrame(this.render.bind(this));
            return;
        }
        this.time += 0.05;
        if (!this.init) {
            this.init = true;

            // DIRECTIONS
            this.simMaterial.uniforms.uRenderMode.value = 1;
            this.simMaterial.uniforms.uDirections.value = null;
            this.simMaterial.uniforms.uTime.value = -100;
            this.simMaterial.uniforms.uCurrentPosition.value = null;
            this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, 0, 0);
            this.renderer.setRenderTarget(this.directions);
            this.renderer.render(this.sceneFBO, this.cameraFBO);

            // POSITIONS
            this.simMaterial.uniforms.uRenderMode.value = 2;
            this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, 100, 0);
            this.renderer.setRenderTarget(this.initPos);
            this.renderer.render(this.sceneFBO, this.cameraFBO);
            this.simMaterial.uniforms.uCurrentPosition.value = this.initPos.texture;
        }

        if (this.material instanceof THREE.ShaderMaterial) {
            this.material.uniforms.time.value = this.time;
        }

        // SIMULATION
        this.simMaterial.uniforms.uDirections.value = this.directions.texture;
        this.simMaterial.uniforms.uRenderMode.value = 0;
        this.geo.setDrawRange(0, this.number);
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.sceneFBO, this.cameraFBO);

        // BEGIN EMITTER

        if (!this.loadingMesh) {
            let emit = this.settings.progress * this.size * 0.03;
            this.renderer.autoClear = false;

            this.emitters.forEach(emitter => {
                this.v = this.emitterDirection;
                this.v1 = this.emitterPrevDirection;

                emitter.mesh.getWorldPosition(this.v);
                this.v1 = this.v.clone();
                let flip = Math.random() > 0.5;

                emitter.dir = this.v.clone().sub(emitter.prev).multiplyScalar(100);
                this.geo.setDrawRange(this.currentParticles, emit);

                // DIRECTIONS
                this.simMaterial.uniforms.uRenderMode.value = 1;
                this.simMaterial.uniforms.uDirections.value = null;
                this.simMaterial.uniforms.uCurrentPosition.value = null;
                if (flip) emitter.dir.x *= -1;
                this.simMaterial.uniforms.uSource.value = emitter.dir;
                this.renderer.setRenderTarget(this.directions);
                this.renderer.render(this.sceneFBO, this.cameraFBO);

                // POSITIONS
                this.simMaterial.uniforms.uRenderMode.value = 2;
                if (flip) this.v1.x *= -1;
                this.simMaterial.uniforms.uSource.value = this.v1;
                this.renderer.setRenderTarget(this.renderTarget);
                this.renderer.render(this.sceneFBO, this.cameraFBO);

                this.currentParticles += emit;
                if (this.currentParticles > this.number) {
                    this.currentParticles = 0;
                }

                emitter.prev = this.v.clone();
            });
            this.renderer.autoClear = true;
        }

        // END OF EMIITER

        if (this.mixer) {
            this.mixer.update(0.01);
        }
        if (this.controls) {
            this.controls.update();
        }

        // RENDER SCENE
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);

        // swap render targets
        const tmp = this.renderTarget;
        this.renderTarget = this.renderTarget1;
        this.renderTarget1 = tmp;

        if (this.material instanceof THREE.ShaderMaterial) {
            this.material.uniforms.uTexture.value = this.renderTarget.texture;
        }
        this.simMaterial.uniforms.uCurrentPosition.value = this.renderTarget1.texture;
        this.simMaterial.uniforms.uTime.value = this.time;
        if (this.debugPlane) this.debugPlane.material.map = this.renderTarget.texture;
        window.requestAnimationFrame(this.render.bind(this));
    }

    destroy() {
        this.container.removeChild(this.renderer.domElement);
        window.removeEventListener("resize", this.resize.bind(this));
        window.removeEventListener("mousemove", this.handleMouseMove.bind(this));

        // clean all fbo textures
        this.positions.dispose();
        this.directions.dispose();
        this.initPos.dispose();
        this.renderTarget.dispose();
        this.renderTarget1.dispose();

        this.renderer.dispose();
        this.gui.destroy();
    }
}
