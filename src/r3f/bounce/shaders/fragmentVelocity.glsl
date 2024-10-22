uniform float time;
uniform sampler2D uOriginalPositionTexture;
uniform vec3 uMouse;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(uPositionTexture, uv).xyz;
    vec4 velocity = texture2D(uVelocityTexture, uv);
    vec3 original = texture2D(uOriginalPositionTexture, uv).xyz;
    float offset = rand(uv);

    velocity *= 0.9;

    vec3 n = gln_curl(position) * 0.1;

    // particle attraction to shape force
    vec3 direction = normalize( original - position );
    float dist = length( original - position );
    if( dist > 0.1) {
        velocity.xyz += direction * 0.1;
    }


    // mouse repel force
    float mouseDistance = distance( position, uMouse );
    float maxDistance = 5.6;
    if( mouseDistance < maxDistance ) {
        vec3 direction = normalize( position - uMouse );
        velocity.xyz += direction * (1.0 - (mouseDistance / maxDistance)) * .7;
    }

    // rotation
    velocity.xyz += n*0.4;

    gl_FragColor = velocity;
}