uniform float time;
uniform sampler2D uPositionTexture;
uniform sampler2D uPositionToTexture;
uniform sampler2D uOriginalPositionTexture;
uniform float uProgress;
uniform vec3 uMouse;
uniform vec2 uResolution;

varying vec2 vUv;

//	Simplex 3D Noise 
//	by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

float sdCross( in vec2 p, in vec2 b, float r ) 
{
    p = abs(p); p = (p.y>p.x) ? p.yx : p.xy;
    vec2  q = p - b;
    float k = max(q.y,q.x);
    vec2  w = (k>0.0) ? q : vec2(b.y-p.x,-k);
    return sign(k)*length(max(w,0.0)) + r;
}

vec2 rotate2d(vec2 _st, float _angle){
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle), sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main() {
    vec4 position = texture2D(uPositionTexture, vUv);
    vec3 positionFrom = texture2D(uPositionToTexture, vUv).xyz;
    vec3 positionTo = texture2D(uOriginalPositionTexture, vUv).xyz;
    float offset = rand(vUv) * 0.1;

    vec3 finalPosition = mix(positionFrom, positionTo, uProgress);

    // velocity *= 0.88;
    // float noise = snoise(vec3(position.xy * 50.0, time * 0.1)) * 0.1;

    // mouse repel force
    vec3 pCord = position.xyz - uMouse.xyz;
    float mouseDistance = length(pCord);
    float maxDist = 3.3;

    if(mouseDistance < maxDist) {   
        float force = (maxDist - mouseDistance) * 0.001;
        vec3 direction = normalize(pCord);
        position.xyz += direction * force;
    }
   
    // lifespan
    float lifespan = 5.0;
    float age = mod(time+ lifespan * offset, lifespan);
    if(age < 0.1) {
        // velocity = vec2(0.0, 0.001);
        position.xyz = finalPosition;
    } else {
        position.xyz += (finalPosition - position.xyz) * 0.001;
    }

    // part of the particle is moving to top
    // if(offset<0.001) {
    //     position.y += 0.001;
    // } else {
    //     // particle attraction force
    //     vec2 direction = normalize(finalPosition - position.xy);
    //     float dist = length(finalPosition - position.xy);

    //     if(dist > 0.01) {
    //         velocity.xy += direction * 0.001;
    //     }
    // }


    // position.xy += velocity;;
    

    gl_FragColor = position;
}