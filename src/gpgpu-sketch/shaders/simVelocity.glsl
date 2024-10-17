uniform float time;
uniform sampler2D uOriginalPositionTexture;
uniform sampler2D uPositionToTexture;
uniform float uProgress;
uniform vec3 uMouse;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(uPositionTexture, uv).xyz;
    vec3 destination = texture2D(uPositionToTexture, uv).xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;
    vec3 original = texture2D(uOriginalPositionTexture, uv).xyz;
    float offset = rand(uv) ;

    // mix the position with the destination based on progress
    // vec3 projectedPosition = position + velocity;
    // vec3 projectedDestination = destination + velocity;
    vec3 final = mix(position,destination, uProgress);

    velocity *= 0.9;

    // particle attraction to shape force
    vec3 direction = normalize( original - final );
    float dist = length( original - final );
    if( dist > 0.1) {
        velocity += direction  * 0.001;
    }

    // mouse repel force
    float mouseDistance = distance( final, uMouse );
    float maxDistance = 0.51;
    if( mouseDistance < maxDistance ) {
        vec3 direction = normalize( final - uMouse );
        velocity += direction * ( 2. - mouseDistance / maxDistance ) * 0.005;
    }

    gl_FragColor = vec4(velocity, 1.0);
}