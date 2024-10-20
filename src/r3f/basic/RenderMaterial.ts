import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

const RenderMaterial = shaderMaterial(
    {
        time: 0,
        uPosition: null,
        uVelocity: null,
    },
    // vertex shader
    `
    uniform float time;
    uniform sampler2D uPosition;
    uniform sampler2D uVelocity;

    varying vec2 vUv;
    varying vec3 vColor;

    attribute vec2 ref;

    void main() {
        vec3 pos = position;
        vec4 position = texture2D(uPosition, ref);
        vec4 velocity = texture2D(uVelocity, ref);

        pos.xyz = position.xyz;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (1.0 / -mvPosition.z) * 10.0;

        vUv = uv;
        vColor = gl_PointSize * 0.5 * vec3(.2, .1, .7);
    }
    `,
    // fragment shader
    `
    uniform float time;
    varying vec2 vUv;
    varying vec3 vColor;

    void main() {
        vec2 uv = vUv;
        
        // make circle
        float dist = distance(gl_PointCoord, vec2(0.5));
        if(dist > 0.5) {
            discard;
        }
    

        gl_FragColor = vec4(vColor, 1.0);
    }
    `
);

extend({ RenderMaterial });
