uniform float time;
uniform float uProgress;
uniform vec3 uMouse;

vec2 rotate2d(vec2 _st, float _angle){
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}



void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 position = texture2D(uPositionTexture, uv);
    vec4 velocity = texture2D(uVelocityTexture, uv);

    vec4 projectedPosition = position + velocity * .01;

    // rotation
    float angle = time * 0.1;
    vec2 rotatedUv = rotate2d(uv, angle);
    vec4 rotatedPosition = texture2D(uPositionTexture, rotatedUv);
    vec4 rotatedVelocity = texture2D(uVelocityTexture, rotatedUv);
    vec4 rotatedProjectedPosition = rotatedPosition + rotatedVelocity * .01;


    gl_FragColor = projectedPosition;

}