uniform float time;
uniform sampler2D uTexture;
uniform float progress;

varying vec2 vUv;
varying vec3 vPosition;


void main() {
    vec4 color = texture2D(uTexture, vUv);

    float alpha = smoothstep(-2., 2., vPosition.z);

    // add light
    vec3 light = vec3(0.8, 0.1, .0);
    vec3 lightDirection = normalize(vec3(1.0, 0.0, 1.0));
    float lightIntensity = dot(light, lightDirection);

    // color.rgb += mix(vec3(0.0), vec3(1.0), lightIntensity);

    color.a = alpha;
    csm_DiffuseColor = color;
}