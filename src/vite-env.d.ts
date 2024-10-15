/// <reference types="vite/client" />

// declare glsl
declare module "*.glsl" {
    const value: string;
    export default value;
}
