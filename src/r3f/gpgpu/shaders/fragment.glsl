uniform sampler2D uPosition;
uniform sampler2D uVelocity;
uniform sampler2D uMatcap;

varying vec3 vvColor;

float remap(float value, float inputMin, float inputMax, float outputMin, float outputMax) {
    return outputMin + ((value - inputMin) / (inputMax - inputMin) * (outputMax - outputMin));
}

void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
    vec3 y = cross(viewDir, x);
    vec2 uv = vec2(dot(vNormal.xyz, x), dot(y, vNormal.xyz)) * 0.495 + 0.5;

    vec4 matcapColor = texture2D(uMatcap, uv);

    vec4 color = texture2D(uPosition, uv);
    vec4 velocity = texture2D(uVelocity, uv);

    csm_DiffuseColor = matcapColor;
}