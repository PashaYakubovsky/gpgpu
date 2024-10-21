import React, { memo, useRef } from "react";
import { useEffect } from "react";
import FboSketch from "./fbo-sketch/FboSketch";
import GPGPUSketch from "./gpgpu-sketch/Sketch";
import Sketch from "./r3f/basic/Sketch";
import Sketch2 from "./r3f/gpgpu/Sketch";
import WebGlSliderSketch from "./webgl-slider/Sketch";

export enum SketchList {
    "Particle emitter" = "Particle emitter",
    "GPGPU" = "GPGPU",
    "R3FB" = "R3FB",
    R3FGPGPU = "R3FGPGPU",
    WebGLSlider = "WebGLSlider",
}

const Wrapper = ({ type }: { type: string }) => {
    const currentSketch = useRef<
        (FboSketch & { name: string }) | (GPGPUSketch & { name: string }) | null
    >(null);

    useEffect(() => {
        if (type === SketchList["Particle emitter"]) {
            const sketch = new FboSketch({ dom: document.querySelector("#root")! });
            currentSketch.current = sketch;
            currentSketch.current.name = "Particle emitter";
        }
        if (type === SketchList["GPGPU"]) {
            const sketch = new GPGPUSketch({ dom: document.querySelector("#root")! });
            currentSketch.current = sketch;
            currentSketch.current.name = "GPGPU";
        }
        if (type === SketchList.WebGLSlider) {
            const sketch = new WebGlSliderSketch({ dom: document.querySelector("#root")! });
            currentSketch.current = sketch;
            currentSketch.current.name = "WebGLSlider";
        }

        return () => {
            console.log("destroy");
            currentSketch.current?.destroy();
            currentSketch.current = null;
        };
    }, [type]);

    const handleClick = (name: SketchList) => {
        window.open(`${name}`, "_self");
    };

    return (
        <>
            {type === SketchList.R3FB && <Sketch />}
            {type === SketchList.R3FGPGPU && <Sketch2 />}

            <div className="controls">
                {type === "GPGPU" && (
                    <button
                        className="center"
                        onClick={() => {
                            const sketch = currentSketch.current as GPGPUSketch;
                            sketch.centerMap();
                        }}>
                        Center map
                    </button>
                )}
            </div>
            <nav className="navigation">
                <button
                    className={type === SketchList["Particle emitter"] ? "active" : ""}
                    onClick={() => handleClick(SketchList["Particle emitter"])}>
                    Flying emitters
                </button>

                <button
                    className={type === SketchList["GPGPU"] ? "active" : ""}
                    onClick={() => handleClick(SketchList["GPGPU"])}>
                    GPGPU city
                </button>

                <button
                    className={type === SketchList["R3FB"] ? "active" : ""}
                    onClick={() => handleClick(SketchList["R3FB"])}>
                    螺旋
                </button>

                <button
                    className={type === SketchList["R3FGPGPU"] ? "active" : ""}
                    onClick={() => handleClick(SketchList["R3FGPGPU"])}>
                    GPGPU Maze
                </button>

                <button
                    className={type === SketchList.WebGLSlider ? "active" : ""}
                    onClick={() => handleClick(SketchList.WebGLSlider)}>
                    WebGL Slider
                </button>
            </nav>
        </>
    );
};

export default memo(Wrapper);
