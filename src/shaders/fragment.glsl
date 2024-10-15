varying vec2 vUv;
uniform sampler2D uTexture;

void main() {
    vec4 color = texture2D( uTexture, vUv );
    // create circle mask for point
    vec2 fragCoord = gl_PointCoord - vec2(0.5);
    color.a = 1.0 - length(fragCoord);
    // color.rgb = vec3(1.0);
    gl_FragColor = vec4(vec3(1.0), color.a);
}