uniform float time;
uniform sampler2D uTexture;

varying vec2 vUv;

void main() {
    vec3 pos = position;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
}