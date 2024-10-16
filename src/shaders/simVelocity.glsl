uniform float time;
uniform sampler2D uOriginalPositionTexture;
uniform float uProgress;
uniform vec3 uMouse;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(uPositionTexture, uv).xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;
    vec3 original = texture2D(uOriginalPositionTexture, uv).xyz;
    float offset = rand(uv) ;

    velocity *= 0.9;

    // particle attraction to shape force
    vec3 direction = normalize( original - position );
    float dist = length( original - position );
    if( dist > 0.01 ) {
        velocity += direction  * 0.0005;
    }

    // mouse repel force
    float mouseDistance = distance( position, uMouse );
    float maxDistance = 0.21;
    if( mouseDistance < maxDistance ) {
        vec3 direction = normalize( position - uMouse );
        velocity += direction * ( 1.0 - mouseDistance / maxDistance ) * 0.0033;
    }


    gl_FragColor = vec4(velocity, 1.);
}