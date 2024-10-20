varying vec2 vUv;
uniform float uProgress;
uniform int uRenderMode;
uniform vec3 uSource;
uniform float uRandomness;
uniform float uRadius;
uniform float uSpeed;
uniform sampler2D uCurrentPosition;
uniform sampler2D uDirections;
uniform vec3 uMouse;
uniform float uTime;
uniform vec3 uGravity;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
    float offset = rand(vUv);
    vec3 position = texture2D( uCurrentPosition, vUv ).xyz;
    vec4 direction = texture2D( uDirections, vUv );

    // PARTICLES
    if(uRenderMode==0){
        float life = 1.0 - clamp((uTime - direction.a)/50., 0., 1.);
        float speedLife = clamp(life, 0.3, 1.0);

        position.xyz = position.xyz + uSpeed * direction.xyz * 0.1 + uGravity * 0.01;

        gl_FragColor = vec4( position, speedLife);
    }

    // DIRECTIONS
    if(uRenderMode==1){
        float rnd1 = rand(vUv) - 0.5;
        float rnd2 = rand(vUv + vec2(0.4,0.1)) - 0.5;
        float rnd3 = rand(vUv + vec2(0.5,0.3)) - 0.5;

        gl_FragColor = vec4( uSource + vec3(rnd1, rnd2, rnd3), 1.0);
    }

    // POSITIONS
    if(uRenderMode==2){
        float rnd1 = rand(vUv) - 0.5;
        float rnd2 = rand(vUv + vec2(0.1,0.1)) - 0.5;
        float rnd3 = rand(vUv + vec2(0.3,0.3)) - 0.5;

        vec4 final = vec4( uSource + vec3(rnd1,rnd2,rnd3)*uRadius * 2.4, 1.);

        gl_FragColor = final;
    }

    
}