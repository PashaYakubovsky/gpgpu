

uniform float time;
uniform sampler2D uTexture;

varying float vLife;
varying vec2 vUv;

void main() {
    vec3 newpos = position;
    vec4 simPosition = texture2D( uTexture, uv );
    
    newpos.xyz = simPosition.xyz;

    vec4 mvPosition = modelViewMatrix * vec4( newpos, 1.0 );

    gl_PointSize =  5.*( 2.0 / -mvPosition.z );
    gl_Position = projectionMatrix * mvPosition;

    vUv = uv;
    vLife = simPosition.w;
}
