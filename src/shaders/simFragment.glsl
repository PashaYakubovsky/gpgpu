uniform float time;
uniform float uProgress;
uniform vec3 uMouse;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 position = texture2D(uPositionTexture, uv);
    vec4 velocity = texture2D(uVelocityTexture, uv);

    position += velocity;
    gl_FragColor = position;
}