import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import vertexShader from "./shaders/fboVertex.glsl";
import fragmentShader from "./shaders/fboFragment.glsl";

import simFragment from "./shaders/simFboFragment.glsl";
import simVertex from "./shaders/simFboVertex.glsl";
import GUI from "lil-gui";

import t1 from "../assets/logo.png";
import t2 from "../assets/super.png";

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
        this.size = 64;
        this.number = this.size * this.size;
        this.container = options.dom;
        this.scene = new THREE.Scene();

        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        this.renderer.setClearColor(0x222222, 1);
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 10);
        this.camera.position.z = 2;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.time = 0;
        Promise.all([this.getPixelDataFromImage(t1), this.getPixelDataFromImage(t2)]).then(
            textures => {
                this.data1 = this.getPointsOnSphere();
                this.data2 = this.getPointsOnSphere();
                this.getPixelDataFromImage(t1);
                this.mouseEvents();
                this.setupFBO();
                this.addObjects();
                this.setupResize();
                this.setupSettings();

                this.render();
            }
        );
    }

    setupSettings() {
        this.settings = {
            progress: 0,
        };

        this.gui = new GUI();

        this.gui
            .add(this.settings, "progress", 0, 1, 0.01)

            .onChange(val => {
                this.simMaterial.uniforms.uProgress.value = val;
            })
            .name("Emitted particles");

        this.gui.add(this.debugPlane.material, "visible", Number(false)).name("Show debug plane");
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
                uRenderMode: { value: 0 },
                uCurrentPosition: { value: this.data1 },
                uDirections: { value: null },
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

    addObjects() {
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
    }

    render() {
        this.time += 0.05;
        if (!this.init) {
            this.init = true;

            // POSITIONS
            this.simMaterial.uniforms.uRenderMode.value = 2;
            this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, 0, 0);
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
        this.geo.setDrawRange(this.currentParticles, this.settings.progress * 10);
        this.renderer.autoClear = false;

        // DIRECTIONS
        this.simMaterial.uniforms.uRenderMode.value = 1;
        this.simMaterial.uniforms.uDirections.value = null;
        this.simMaterial.uniforms.uCurrentPosition.value = null;
        this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, 1, 0);
        this.renderer.setRenderTarget(this.directions);
        this.renderer.render(this.sceneFBO, this.cameraFBO);

        // POSITIONS
        this.simMaterial.uniforms.uRenderMode.value = 2;
        this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, 0, 0);
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.sceneFBO, this.cameraFBO);
        this.simMaterial.uniforms.uCurrentPosition.value = this.initPos.texture;

        this.currentParticles += this.settings.progress * 10;
        if (this.currentParticles > this.number) {
            this.currentParticles = 0;
        }
        this.renderer.autoClear = true;

        // END OF EMIITER

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
