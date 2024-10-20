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
        uRotation: 1,
        uInitHappen: 0,
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
    uniform sampler2D uOriginalPosition;
    uniform int uInitHappen;
    uniform vec3 uMouse;
    varying vec2 vUv;

    vec2 rotate(vec2 v, float a) {
        float s = sin(a);
        float c = cos(a);
        mat2 m = mat2(c, -s, s, c);
        return m * v;
    }

    void main() {
        vec2 original = texture2D( uOriginalPosition, vUv ).xy;
        vec2 velocity = texture2D( uPosition, vUv ).zw;
        vec2 position = texture2D( uPosition, vUv ).xy;
        float angle = 2.0 * 3.141592653589793238 * 20.0 * time;
        
        velocity *= 0.99;


        
        // particle attraction to shape force
        vec2 direction = normalize( original - position );
        float dist = length( original - position );
        if( dist > 0.01 ) {
            velocity += rotate( direction, 1.57 ) * 0.0001;
            velocity += direction  * 0.001;
        }
            
        // mouse repel force
        float mouseDistance = distance( position, uMouse.xy );
        float maxDistance = 1.2;
        if( mouseDistance < maxDistance ) {
            vec2 direction = normalize( position - uMouse.xy );
            velocity += direction * ( 1.0 - mouseDistance / maxDistance ) * 0.1;
        }
                
                
        position.xy += velocity;
        position += rotate( position, angle ) * 0.001;

        if(uInitHappen == 0) {
            // position = original;
            // velocity = vec2(0.0);

            // randomize position and velocity for each particle
            float angle = 3.141592653589793238 * 2.0 * fract( 0.618033988749895 * float( gl_FragCoord.x ) ) * time;
            float radius = 0.1;
            position += vec2( cos( angle ), sin( angle ) ) * radius;
        }
        if(uInitHappen == -1) {
            // lerp to original position
            position = mix( position, original, 0.1 );
            velocity = vec2(0.0);
        }
      


        gl_FragColor = vec4( position, velocity);
    }
    `
);

extend({ SimulationMaterial });
