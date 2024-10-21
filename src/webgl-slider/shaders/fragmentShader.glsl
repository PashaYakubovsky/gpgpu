uniform float time;
uniform sampler2D uTexture;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;


void main() {
    vec4 color = texture2D(uTexture, vUv);

    float alpha = smoothstep(-0.8, 0.7, vPosition.z);

    // add light
    vec3 light = vec3(0.8, 0.1, .0);
    vec3 lightDirection = normalize(vec3(1.0, 0.0, 1.0));
    float lightIntensity = dot(light, lightDirection);

    color.rgb *= lightIntensity;

    color.a = alpha;
    gl_FragColor = color;
}