import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [glsl(), react()],
    resolve: {
        extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    },
    esbuild: {
        jsxInject: `import React from 'react'`,
    },
    optimizeDeps: {
        esbuildOptions: {
            target: "es2020",
        },
    },
});
