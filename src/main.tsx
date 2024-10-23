import "./index.css";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Navigation from "./Navigation";
import Wrapper, { SketchList } from "./Wrapper";
import { rickroll } from "./rickroll";

const rootEl = document.getElementById("root");

const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigation />,
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
