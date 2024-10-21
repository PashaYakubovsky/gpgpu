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
                <a href="/gpgpu-city">GPGPU City</a>
                <a href="/r3fb">螺旋</a>
                <a href="/particle-emitter">Flying Emitters</a>
                <a href="/particle-emitter">GPGPU Maze</a>
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
]);

if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<RouterProvider router={router} />);

    if (!import.meta.env.DEV) {
        rickroll.init();
    }
}
