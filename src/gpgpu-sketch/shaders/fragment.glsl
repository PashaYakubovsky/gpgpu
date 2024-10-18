uniform sampler2D uTexture;
uniform sampler2D uVelocity;
uniform sampler2D uMatcap;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;


float remap(float value, float inputMin, float inputMax, float outputMin, float outputMax) {
    return outputMin + ((value - inputMin) / (inputMax - inputMin) * (outputMax - outputMin));
}

void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
    vec3 y = cross(viewDir, x);
    vec2 uv = vec2(dot(vNormal, x), dot(y, vNormal)) * 0.495 + 0.5;

    vec4 matcapColor = texture2D(uMatcap, uv);
    matcapColor.a = 0.5;

    vec4 color = texture2D(uTexture, vUv);
    vec4 velocity = texture2D(uVelocity, vUv);

    vec4 final = vec4(vec3(0.0), .0);

    // make bezier curve
    // remap velocity to 0-1

    final = mix(final , matcapColor,  velocity.x * 633.);
    // final.a = mix(0.0, 1.0, velocity.x * 100.5);
    // final.rgb *= 1.0 - velocity.x * 0.5;
    // if(final.a > 0.00001) {
    //     final.a = 1.0;
    // }

    // final = mix(final , matcapColor,  velocity.y * 633.);
    final.a = mix(0.0, 1.0, velocity.y * 330.5);
    // if(final.a > 0.05) {
    //     final.a = 1.0;
    // }
    gl_FragColor = final;
    // gl_FragColor = matcapColor;
    
}