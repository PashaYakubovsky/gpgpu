// vertex
precision highp float;

uniform float time;
uniform float progress;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;

#define PI 3.14159265359

mat4 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
    0.0,                                0.0,                                0.0,                                1.0
  );
}

vec3 rotateX(vec3 v, float angle) {
  return (rotation3d(vec3(1.0, 0.0, 0.0), -angle) * vec4(v, 1.0)).xyz;
}

vec3 rotateY(vec3 v, float angle) {
  return (rotation3d(vec3(0.0, 1.0, 0.0), -angle) * vec4(v, 1.0)).xyz;
}

void main() {
    vec3 pos = position;

    pos.y -= progress;

    pos = rotateX(pos, 1.0 * cos(smoothstep(-4.0, 4.0,sin(pos.y)) * 3.4) * 1.1);
    pos.xz = rotateY(pos, 1.0 * cos(smoothstep(-4.0, 4.0,sin(pos.y)) * 3.4) * 1.1).xz;

    vec3 worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;


    vPosition = pos;
    vWorldPosition = worldPosition;
    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
}