

varying vec2 vUv;
uniform float time;

uniform sampler2D uTexture;


void main() {
    vUv = uv;
    vec3 newpos = position;
    vec4 posTexture = texture2D( uTexture, vUv );
    newpos.xyz = posTexture.xyz;
    vec4 mvPosition = modelViewMatrix * vec4( newpos, 1.0 );
    gl_PointSize =  ( 2. / -mvPosition.z );
    gl_Position = projectionMatrix * mvPosition;

}
