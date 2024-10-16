

uniform float time;
uniform sampler2D uTexture;
uniform sampler2D uVelocity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

attribute vec2 uvRef;


vec3 rotate3D(vec3 v, vec3 vel) {
    vec3 newpos = v;
    vec3 up = vec3(0, 1, 0);
    vec3 axis = normalize(cross(up, vel));
    float angle = acos(dot(up, normalize(vel)));
    newpos = newpos * cos(angle) + cross(axis, newpos) * sin(angle) + axis * dot(axis, newpos) * (1. - cos(angle));
    return newpos;
}

void main() {


    vec4 color = texture2D( uTexture, uvRef );
    vec4 velocity = texture2D( uVelocity, uvRef );

    vec3 transformed = position;
    if(length(velocity.xyz) < 0.0001) {
        velocity.xyz = vec3(0,0.0001, 0.0001);
    }
    transformed.y *= max(1.0, length(velocity.xyz) * 10.);
    transformed = rotate3D(transformed, velocity.xyz );

    vec3 newpos = color.xyz;

    mat4 instanceMat = instanceMatrix;
    instanceMat[3].x = newpos.x;
    instanceMat[3].y = newpos.y;
    instanceMat[3].z = newpos.z;
   
    vec4 mvPosition = modelViewMatrix * instanceMat * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vUv = uvRef;
    vNormal = normal;
    vViewPosition = -mvPosition.xyz;

}
