import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";

const SimulationMaterial = shaderMaterial(
    {
        time: 0,
        uPosition: null,
        uOriginalPosition: null,
        uVelocity: null,
        uMouse: new THREE.Vector3(-10, -10, 0),
    },
    // vertex shader
    `
    varying vec2 vUv;
    uniform float time;

    void main() {
        vUv = uv;
        vec3 pos = position;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 5.0;
    }
    `,
    // fragment shader
    `
    uniform float time;
    uniform sampler2D uPosition;
    uniform sampler2D uVelocity;
    uniform sampler2D uOriginalPosition;
    uniform vec3 uMouse;
    varying vec2 vUv;

    void main() {
        vec2 original = texture2D( uOriginalPosition, vUv ).xy;
        vec2 velocity = texture2D( uPosition, vUv ).zw;
        vec2 position = texture2D( uPosition, vUv ).xy;


        velocity *= 0.98;

        // particle attraction to shape force
        vec2 direction = normalize( original - position );
        float dist = length( original - position );
        if( dist > 0.01 ) {
            velocity += direction  * 0.001;
        }
        



        // mouse repel force
        float mouseDistance = distance( position, uMouse.xy );
        float maxDistance = 0.4;
        if( mouseDistance < maxDistance ) {
            vec2 direction = normalize( position - uMouse.xy );
            velocity += direction * ( 1.0 - mouseDistance / maxDistance ) * 0.01;
        }


        position.xy += velocity;

        
        gl_FragColor = vec4( position, velocity);

    }
    `
);

extend({ SimulationMaterial });
