uniform sampler2D uTexture;

varying vec2 vUv;
varying float vLife;
varying vec3 vColor;
varying vec3 vWorldPosition;

void main() {
    // if(vLife <= 0.001) {
    //     discard;
    // }
    vec4 color = texture2D( uTexture, vUv );

    float dist = distance(gl_PointCoord, vec2(0.5));
    if(dist > 0.5) {
        discard;
    }

    vec3 final = vec3(0.2, 0.1, 0.8);
    // make visible color from 0.2 to 0.9 of the life
    float life = 1.2 * vLife;
    final = mix(vec3(0.0),final, vLife);
    gl_FragColor = vec4( final * 3.3,life );
    // gl_FragColor = color;
}