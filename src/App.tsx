import { useEffect, useRef } from "react";
import Sketch from "./scene";

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sketchRef = useRef<Sketch | null>(null);
    useEffect(() => {
        if (!canvasRef.current || sketchRef.current) return;

        const sketch = new Sketch(canvasRef.current);
        sketchRef.current = sketch;

        return () => {
            sketch.destroy();
        };
    }, [canvasRef.current]);

    return (
        <>
            <canvas ref={canvasRef} />
        </>
    );
}

export default App;
