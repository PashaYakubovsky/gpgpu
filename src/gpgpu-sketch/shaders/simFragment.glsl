uniform float time;
uniform float uProgress;
uniform vec3 uMouse;
uniform sampler2D uPositionToTexture;



void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 position = texture2D(uPositionTexture, uv);
    vec4 velocity = texture2D(uVelocityTexture, uv);
    vec4 destination = texture2D(uPositionToTexture, uv);

    // mix the position with the destination based on progress
    vec4 projectedPosition = position + velocity;
    vec4 final = mix(projectedPosition, destination, uProgress);

    // final.xyz += velocity.xyz;
    gl_FragColor = final;
}