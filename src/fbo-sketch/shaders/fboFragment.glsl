uniform sampler2D uTexture;

varying vec2 vUv;
varying float vLife;

void main() {
    // if(vLife <= 0.001) {
    //     discard;
    // }
    vec4 color = texture2D( uTexture, vUv );

    float dist = distance(gl_PointCoord, vec2(0.5));
    if(dist > 0.5) {
        discard;
    }

    gl_FragColor = vec4( 1.,1.,1., 1.2 * vLife );
    // gl_FragColor = color;
}