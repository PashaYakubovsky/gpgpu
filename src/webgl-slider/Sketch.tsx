import * as THREE from "three";

import fragmentShader from "./shaders/fragmentShader.glsl";
import vertexShader from "./shaders/vertexShader.glsl";
import { patchShaders } from "gl-noise/build/glNoise.m";

import VirtualScroll from "virtual-scroll";

import t1 from "../assets/1.jpg?url";
import t2 from "../assets/2.jpg?url";
import t3 from "../assets/3.jpg?url";
import gsap from "gsap";

class Sketch {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    slides: {
        mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
        progress: number;
        pos: number;
    }[] = [];
    scrollProgress = 0;
    vs: VirtualScroll | null = null;
    titlesDom: HTMLElement[];
    timeline: gsap.core.Timeline;
    dom: HTMLElement;
    progressDom: HTMLElement | null;

    constructor({ dom }: { dom: HTMLElement }) {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.dom = dom;
        this.dom.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            10
        );
        this.camera.position.z = 2;

        this.addObjects();
        this.setupScroll();

        this.renderer.setAnimationLoop(this.animate.bind(this));
        window.addEventListener("resize", this.resize.bind(this));
    }

    addDom() {
        // create titles and append to dom
        const titles = document.createElement("div");

        this.slides.forEach((slide, i) => {
            const title = document.createElement("h2");
            title.classList.add("webGl-slider__title");
            title.innerText = `Slide ${i + 1}`;
            title.style.opacity = "0";
            titles.appendChild(title);
        });

        titles.classList.add("webGl-slider__titles");
        this.dom.appendChild(titles);

        const progress = document.createElement("div");
        progress.classList.add("webGl-slider__progress");
        this.dom.appendChild(progress);

        this.progressDom = progress;

        // cursor stuff
        const coverEl = document.createElement("div");
        coverEl.classList.add("webGl-slider__cover");

        // 50px tiles on full screen
        const tilesX = window.innerWidth / 50;
        const tilesY = window.innerHeight / 50;

        for (let i = 0; i < tilesX * tilesY; i++) {
            const tile = document.createElement("div");
            tile.classList.add("webGl-slider__tile");

            coverEl.appendChild(tile);
        }

        this.dom.appendChild(coverEl);
    }

    setupScroll() {
        this.vs = new VirtualScroll();
        this.vs.on(e => {
            let prog = e.y / 1400;
            prog = THREE.MathUtils.clamp(prog, -0.7, 7.5);
            this.scrollProgress = THREE.MathUtils.lerp(this.scrollProgress, prog, 0.1);
            const curIndex = Math.round(Math.abs(this.scrollProgress) / this.slides.length);
            this.titlesDom.forEach((title, i) => {
                if (i === curIndex) {
                    title.style.opacity = "1";
                } else {
                    title.style.opacity = "0";
                }
            });
        });
    }

    getMaterial() {
        return new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable",
            },
            uniforms: {
                time: { value: 0 },
                progress: { value: 0 },
                uTexture: { value: null },
            },
            vertexShader: patchShaders(vertexShader),
            fragmentShader: patchShaders(fragmentShader),
            side: THREE.DoubleSide,
            transparent: true,
        });
    }

    addObjects() {
        const geometry = new THREE.PlaneGeometry(3, 2.5, 40, 40);
        const textures = [t1, t2, t3];
        const slides = [];

        const textureLoader = new THREE.TextureLoader();

        for (let i = 0; i < textures.length; i++) {
            const material = this.getMaterial();
            const img = new Image();
            img.src = textures[i];
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const texture = textureLoader.load(textures[i]);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.mapping = THREE.EquirectangularReflectionMapping;
                material.uniforms.uTexture.value = texture;
                const geo = geometry.clone();
                geo.scale(aspectRatio, 1, 1);

                const mesh = new THREE.Mesh(geometry, material);
                this.scene.add(mesh);

                slides.push({ mesh, progress: 0, pos: 3 * i });

                if (slides.length === textures.length) {
                    this.slides = slides;
                    this.addDom();
                    this.timeline = this.getTimeline();
                }
            };
        }
    }

    angle: number = 15;
    getTimeline() {
        const tl = gsap.timeline({
            paused: true,
        });

        this.titlesDom = [
            ...(document.querySelectorAll(".webGl-slider__title") as unknown as HTMLDivElement[]),
        ];
        const t = () => {
            return (180 + 2 * this.angle + 0.5 * this.angle) * 0.25;
        };
        this.titlesDom.forEach((title, i) => {
            tl.fromTo(
                title,
                {
                    rotateX: () => -i * 1.5 * this.angle,
                    transformOrigin: "50% 50% -300",
                },
                {
                    rotateX: () => "+=" + t(),
                    ease: "none",
                    duration: 1,
                }
            );
        }, ">");

        return tl;
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    clock = new THREE.Clock();
    animate() {
        const elTime = this.clock.getElapsedTime();

        const progress = Math.abs(this.scrollProgress) / (this.slides.length * 2.2);
        if (this.timeline) this.timeline.progress(progress);
        if (this.progressDom && this.scrollProgress > 0) {
            this.progressDom.style.clipPath = `polygon(${progress * 100}% 0, 100% 0, 100% 100%, ${
                progress * 100
            }% 100%)`;
        }
        this.slides.forEach((slide, i) => {
            slide.mesh.material.uniforms.time.value = elTime + i * 0.5;
            slide.mesh.material.uniforms.progress.value = -this.scrollProgress + slide.pos;
        });

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.renderer.domElement.remove();
        this.renderer.dispose();
        if (this.vs) {
            this.vs.destroy();
        }

        window.removeEventListener("resize", this.resize.bind(this));
    }
}

export default Sketch;
