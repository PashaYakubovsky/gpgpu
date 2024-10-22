import "./index.css";

import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Wrapper, { SketchList } from "./Wrapper";
import { rickroll } from "./rickroll";

const rootEl = document.getElementById("root");

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <nav className="nav">
                <a href={"/" + SketchList["GPGPU"]}>GPGPU City</a>
                <a href={"/" + SketchList["R3FB"]}>螺旋</a>
                <a href={"/" + SketchList["Particle emitter"]}>Flying Emitters</a>
                <a href={"/" + SketchList["R3FGPGPU"]}>GPGPU Maze</a>
                <a href={"/" + SketchList["WebGLSlider"]}>WebGl slider</a>
                <a href={"/" + SketchList["Bounce"]}>Physics</a>
            </nav>
        ),
    },
    {
        path: "/" + SketchList.GPGPU,
        element: <Wrapper type={SketchList.GPGPU} />,
    },
    {
        path: "/" + SketchList.R3FB,
        element: <Wrapper type={SketchList.R3FB} />,
    },
    {
        path: "/" + SketchList["Particle emitter"],
        element: <Wrapper type={SketchList["Particle emitter"]} />,
    },
    {
        path: "/" + SketchList["R3FGPGPU"],
        element: <Wrapper type={SketchList["R3FGPGPU"]} />,
    },
    {
        path: "/" + SketchList["WebGLSlider"],
        element: <Wrapper type={SketchList["WebGLSlider"]} />,
    },
    {
        path: "/" + SketchList["Bounce"],
        element: <Wrapper type={SketchList["Bounce"]} />,
    },
]);

if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<RouterProvider router={router} />);

    if (!import.meta.env.DEV) {
        rickroll.init();
    }
}
