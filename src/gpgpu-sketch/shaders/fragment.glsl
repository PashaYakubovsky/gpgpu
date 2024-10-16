uniform sampler2D uTexture;
uniform sampler2D uVelocity;
uniform sampler2D uMatcap;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;



void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
    vec3 y = cross(viewDir, x);
    vec2 uv = vec2(dot(vNormal, x), dot(y, vNormal)) * 0.495 + 0.5;

    vec4 matcapColor = texture2D(uMatcap, uv);

    vec4 color = texture2D(uTexture, vUv);
    vec4 velocity = texture2D(uVelocity, vUv);

    vec4 final = vec4(vec3(0.0), 0.0);

    final = mix(final , matcapColor, 0.1 + velocity.y * 1000.);

    gl_FragColor = final;
    // gl_FragColor = matcapColor;
    
}