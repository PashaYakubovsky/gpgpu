import "./index.css";

import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// react-dom_client.js?v=b3395d54:21141 Uncaught Error: createRoot(...): Target container is not a DOM element.

const rootEl = document.getElementById("root");

if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<App />);
}
