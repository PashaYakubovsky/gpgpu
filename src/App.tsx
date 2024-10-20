import { useRef, useState } from "react";
import { useEffect } from "react";
import FboSketch from "./fbo-sketch/FboSketch";
import GPGPUSketch from "./gpgpu-sketch/Sketch";
import Sketch from "./r3f/basic/Sketch";

enum SketchList {
    "Particle emitter" = "Particle emitter",
    "GPGPU" = "GPGPU",
    "R3FB" = "R3FB",
}

function App() {
    const [active, setActive] = useState<SketchList>(SketchList.GPGPU);
    const currentSketch = useRef<
        (FboSketch & { name: string }) | (GPGPUSketch & { name: string }) | null
    >(null);

    useEffect(() => {
        const query = window.location.search;
        const urlParams = new URLSearchParams(query);
        const active = urlParams.get("active") || SketchList.GPGPU;
        setActive(active as SketchList);

        if (active === SketchList["Particle emitter"]) {
            const sketch = new FboSketch({ dom: document.querySelector("#root")! });
            currentSketch.current = sketch;
            currentSketch.current.name = "Particle emitter";
        }
        if (active === SketchList["GPGPU"]) {
            const sketch = new GPGPUSketch({ dom: document.querySelector("#root")! });
            currentSketch.current = sketch;
            currentSketch.current.name = "GPGPU";
        }

        return () => {
            console.log("destroy");
            currentSketch.current?.destroy();
            currentSketch.current = null;
        };
    }, []);

    const handleClick = (name: SketchList) => {
        currentSketch.current?.destroy();

        if (name === "Particle emitter") {
            const sketch = new FboSketch({ dom: document.querySelector("#root")! });
            currentSketch.current = sketch;
            currentSketch.current.name = "Particle emitter";
        }
        if (name === "GPGPU") {
            const sketch = new GPGPUSketch({ dom: document.querySelector("#root")! });
            currentSketch.current = sketch;
            currentSketch.current.name = "GPGPU";
        }
        if (name === "R3FB") {
            currentSketch.current = null;
        }

        setActive(name);

        const query = window.location.search;
        const urlParams = new URLSearchParams(query);
        urlParams.set("active", name);
        window.history.replaceState(null, "", "?" + urlParams.toString());
    };

    return (
        <>
            {active === SketchList.R3FB && <Sketch />}

            <div className="controls">
                {active === "GPGPU" && (
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
                    className={active === "Particle emitter" ? "active" : ""}
                    onClick={() => handleClick(SketchList["Particle emitter"])}>
                    {SketchList["Particle emitter"]}
                </button>

                <button
                    className={active === "GPGPU" ? "active" : ""}
                    onClick={() => handleClick(SketchList["GPGPU"])}>
                    {SketchList["GPGPU"]}
                </button>

                <button
                    className={active === "R3FB" ? "active" : ""}
                    onClick={() => handleClick(SketchList["R3FB"])}>
                    {SketchList["R3FB"]}
                </button>
            </nav>
        </>
    );
}

export default App;
