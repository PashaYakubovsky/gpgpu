uniform float time;
uniform sampler2D uPosition;
uniform sampler2D uVelocity;

varying vec2 vUv;
attribute vec2 ref;
varying vec3 vvColor;


vec3 rotate3D(vec3 v, vec3 vel) {
    vec3 newpos = v;
    vec3 up = vec3(0, 1, 0);
    vec3 axis = normalize(cross(up, vel));
    float angle = acos(dot(up, normalize(vel)));
    newpos = newpos * cos(angle) + cross(axis, newpos) * sin(angle) + axis * dot(axis, newpos) * (1. - cos(angle));
    return newpos;
}


void main() {
    vec4 text = texture2D(uPosition, ref);
    vec4 velocity = texture2D(uVelocity, ref);
    vec3 newpos = text.xyz;

    vec3 pos = position;

     if(length(velocity.xyz) < 0.0001) {
        velocity.xyz = vec3(0,0.0001, 0.0001);
    }
    pos.y *= max(1.0, length(velocity.xyz));
    pos = rotate3D(pos, velocity.xyz );

    pos.xyz = pos.xyz + newpos.xyz;
   
    vec4 mvPosition2 = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
    csm_PositionRaw = projectionMatrix * mvPosition2;
    csm_Position = pos;
}