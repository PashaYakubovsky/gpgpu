import { useRef, useState } from "react";
import { useEffect } from "react";
import FboSketch from "./fbo-sketch/FboSketch";
import GPGPUSketch from "./gpgpu-sketch/Sketch";

enum SketchList {
    "Particle emitter" = "Particle emitter",
    "GPGPU" = "GPGPU",
}

function App() {
    const [active, setActive] = useState<SketchList>(SketchList["Particle emitter"]);
    const currentSketch = useRef<
        (FboSketch & { name: string }) | (GPGPUSketch & { name: string }) | null
    >(null);

    useEffect(() => {
        const query = window.location.search;
        const urlParams = new URLSearchParams(query);
        const active = urlParams.get("active") as "Particle emitter" | "GPGPU";

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
            currentSketch.current?.destroy();
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

        setActive(name);

        const query = window.location.search;
        const urlParams = new URLSearchParams(query);
        urlParams.set("active", name);
        window.history.replaceState(null, "", "?" + urlParams.toString());
    };

    return (
        <>
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
            </nav>
        </>
    );
}

export default App;
