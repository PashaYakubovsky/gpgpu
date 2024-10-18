import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import vertexShader from "./shaders/fboVertex.glsl";
import fragmentShader from "./shaders/fboFragment.glsl";

import simFragment from "./shaders/simFboFragment.glsl";
import simVertex from "./shaders/simFboVertex.glsl";
import GUI from "lil-gui";

import t1 from "../assets/logo.png";
import t2 from "../assets/super.png";
// import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

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
        this.size = 124;
        this.number = this.size * this.size;
        this.container = options.dom;
        this.scene = new THREE.Scene();
        this.emittedVector = new THREE.Vector3(0, 0, 0);

        this.settings = {
            progress: 1,
            gravity: new THREE.Vector3(0, 0.5, 0),
            radius: 0.1,
            speed: 0.1,
            randomness: 0.1,
        };

        this.debugOptions = {};

        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 100);
        this.camera.position.z = 2;

        this.emitters = [];

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.time = 0;
        Promise.all([this.getPixelDataFromImage(t1), this.getPixelDataFromImage(t2)]).then(
            async textures => {
                this.data1 = this.getPointsOnSphere();
                this.data2 = this.getPointsOnSphere();
                this.getPixelDataFromImage(t1);
                this.mouseEvents();
                this.setupFBO();
                await this.addObjects();
                this.addLights();
                this.setupResize();
                this.setupSettings();

                this.render();
            }
        );
    }

    addLights() {
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 0, 1);

        this.scene.add(light);

        const light2 = new THREE.DirectionalLight(0xffffff, 1);
        light2.position.set(1, 0, 0);

        this.scene.add(light2);
    }

    // setupMixer() {
    //     // const gltf = this.gltfObject;
    //     this.mixer = new THREE.AnimationMixer(this.scene);
    //     this.clips = gltf.animations;
    //     console.log(this.clips);

    //     for (let i = 0; i < this.clips.length; i++) {
    //         const action = this.mixer.clipAction(this.clips[i]);
    //         const clipName = action.getClip().name;
    //         // if (["Root_2|Main|Layer0"].includes(clipName)) {
    //         //     continue;
    //         // }
    //         if (clipName === "The_Drone_Control_FreeAction") {
    //             action.loop = THREE.LoopRepeat;
    //             action.clampWhenFinished = true;
    //         } else {
    //             action.loop = THREE.LoopPingPong;
    //             action.timeScale = 2.5;
    //         }
    //         action.play();
    //         // loop all animations
    //         // action.loop = THREE.LoopRepeat;
    //         // action.clampWhenFinished = true;
    //         // action.play();
    //     }
    // }

    // async setupGltfObject() {
    //     this.gltfLoader = new GLTFLoader();
    //     this.dracoLoader = new DRACOLoader();

    //     this.dracoLoader.setDecoderConfig({ type: "js" });
    //     this.dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

    //     this.gltfLoader.setDRACOLoader(this.dracoLoader);

    //     try {
    //         const eyeDroneScene = await this.gltfLoader.loadAsync("../../public/eyeDrone.glb");
    //         this.gltfObject = eyeDroneScene;
    //         const eyeMat = new THREE.MeshNormalMaterial({
    //             visible: false,
    //         });
    //         const invisibleMat = new THREE.MeshBasicMaterial({
    //             visible: false,
    //         });
    //         eyeDroneScene.scene.traverse(child => {
    //             if (
    //                 child instanceof THREE.Mesh &&
    //                 (!child.name.startsWith("__hair_dummy_ignore__") ||
    //                     !child.name.startsWith("__hair_dummy_ignore__"))
    //             ) {
    //                 child.material = eyeMat;
    //                 console.log(child.name);
    //             } else if (child instanceof THREE.Mesh) {
    //                 child.material = invisibleMat;
    //             }
    //         });

    //         const eyeBall = eyeDroneScene.scene.getObjectByName("Sphere_3_2");
    //         eyeBall.material = new THREE.MeshBasicMaterial({
    //             color: 0xffffff,
    //             transparent: true,
    //             opacity: 0.5,
    //             side: THREE.DoubleSide,
    //         });

    //         const eyeCore = eyeDroneScene.scene.getObjectByName("Sphere_3");
    //         eyeCore.material = new THREE.MeshBasicMaterial({
    //             color: 0x000000,
    //         });

    //         const eyeOuterRing = eyeDroneScene.scene.getObjectByName("Tube");
    //         eyeOuterRing.material = new THREE.MeshBasicMaterial({
    //             color: 0x000000,
    //         });

    //         const linesMat = new THREE.MeshBasicMaterial({
    //             color: 0xffffff,
    //         });
    //         const line1 = eyeDroneScene.scene.getObjectByName("Sweep_1");
    //         const line2 = eyeDroneScene.scene.getObjectByName("Sweep_1_2");
    //         const line3 = eyeDroneScene.scene.getObjectByName("Sweep_1_3");
    //         const line4 = eyeDroneScene.scene.getObjectByName("Sweep_1_4");
    //         const line5 = eyeDroneScene.scene.getObjectByName("Sweep_1_5");
    //         const line6 = eyeDroneScene.scene.getObjectByName("Sweep_1_6");
    //         const line7 = eyeDroneScene.scene.getObjectByName("Sweep_1_7");
    //         const line8 = eyeDroneScene.scene.getObjectByName("Sweep_1_8");

    //         if (line1) line1.material = linesMat;
    //         if (line2) line2.material = linesMat;
    //         if (line3) line3.material = linesMat;
    //         if (line4) line4.material = linesMat;
    //         if (line5) line5.material = linesMat;
    //         if (line6) line6.material = linesMat;
    //         if (line7) line7.material = linesMat;
    //         if (line8) line8.material = linesMat;
    //         const boneController = eyeDroneScene.scene.getObjectByName("The_Drone_Control_Free");
    //         const cylinder = eyeDroneScene.scene.getObjectByName("Cylinder");

    //         this.scene.add(eyeDroneScene.scene);
    //     } catch (e) {
    //         console.error(e);
    //     }

    //     this.setupMixer();
    // }

    setupSettings() {
        this.gui = new GUI();

        this.gui
            .add(this.settings, "progress", 0, 1, 0.01)

            .onChange(val => {
                this.simMaterial.uniforms.uProgress.value = val;
            })
            .name("Emitted particles");

        this.gui.add(this.debugPlane.material, "visible", Number(false)).name("Show debug plane");

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
            });

        this.gui
            .add(this.settings, "speed", 0, 1, 0.001)
            .name("Speed")
            .onChange(val => {
                this.simMaterial.uniforms.uSpeed.value = val;
            });

        // fbo texture size
        const fboFold = this.gui.addFolder("FBO");
        const debugObj = {
            size: this.size,
        };
        fboFold
            .add(debugObj, "size", 10, 512, 1)
            .name("Size")
            .onChange(() => {
                this.paused = true;
                this.size = debugObj.size;
                this.number = this.size * this.size;

                // clean all textures
                this.positions.dispose();
                this.directions.dispose();
                this.initPos.dispose();
                this.renderTarget.dispose();
                this.renderTarget1.dispose();
                this.setupFBO();

                this.geo.setDrawRange(0, this.number);

                // reset particles position
                this.currentParticles = 0;
                this.paused = false;
                this.init = false;
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
        const intersects = this.raycaster.intersectObjects(this.planeMesh ? [this.planeMesh] : []);
        if (intersects.length > 0) {
            console.log(intersects[0].point);
            this.simMaterial.uniforms.uMouse.value = intersects[0].point;
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
            depthTest: false,
            depthWrite: false,
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
        // await this.setupGltfObject();

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

        const emitter = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 32, 32),
            new THREE.MeshPhysicalMaterial({
                color: 0xff0000,
            })
        );
        this.scene.add(emitter);

        [emitter].forEach(obj => {
            this.emitters.push({
                mesh: obj,
                direction: obj.position.clone(),
                previous: obj.position.clone(),
            });
        });
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
        const emit = 50 * this.settings.progress;

        this.renderer.autoClear = false;

        this.emitters.forEach(emitter => {
            emitter.mesh.getWorldDirection(this.emittedVector);

            // set direction
            emitter.direction = this.emittedVector
                .clone()
                .sub(emitter.previous)
                .multiplyScalar(100);
            this.geo.setDrawRange(this.currentParticles, emit);

            // DIRECTIONS
            this.simMaterial.uniforms.uRenderMode.value = 1;
            this.simMaterial.uniforms.uDirections.value = null;
            this.simMaterial.uniforms.uCurrentPosition.value = null;
            this.simMaterial.uniforms.uSource.value = emitter.direction;
            this.renderer.setRenderTarget(this.directions);
            this.renderer.render(this.sceneFBO, this.cameraFBO);

            // POSITIONS
            this.simMaterial.uniforms.uRenderMode.value = 2;
            this.simMaterial.uniforms.uSource.value = emitter.mesh.position;
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.sceneFBO, this.cameraFBO);
            this.simMaterial.uniforms.uCurrentPosition.value = this.initPos.texture;

            this.currentParticles += emit;
            if (this.currentParticles > this.number) {
                this.currentParticles = 0;
            }
            this.renderer.autoClear = true;

            emitter.previous = this.emittedVector.clone();
        });

        // .copy(this.emitter.position)
        //     .sub(this.emitterPrevDirection)
        //     .multiplyScalar(100);

        // END OF EMIITER

        // if (this.mixer) {
        //     this.mixer.update(0.01);
        // }

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

        this.debugPlane.material.map = this.renderTarget.texture;

        window.requestAnimationFrame(this.render.bind(this));
    }

    destroy() {
        this.container.removeChild(this.renderer.domElement);
        window.removeEventListener("resize", this.resize.bind(this));
        window.removeEventListener("mousemove", this.handleMouseMove.bind(this));
        this.renderer.dispose();
        this.gui.destroy();
    }
}
