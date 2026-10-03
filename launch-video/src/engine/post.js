import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Scene (HDR, MSAA, depth) -> depth of field -> bloom -> one finishing pass:
// motion blur, chromatic aberration, ACES, HUD, flash, vignette, grain.
// Every knob is set per frame from `fx`, so shots can drive the lens.

const DOF_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uNear, uFar, uFocus, uAperture, uMaxBlur;
varying vec2 vUv;
const float GOLDEN = 2.39996323;

float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}
float coc(float z) {
  return clamp(abs(z - uFocus) / z * uAperture, 0.0, 1.0) * uMaxBlur;
}
void main() {
  vec2 px = 1.0 / uRes;
  float cz = viewZ(vUv);
  float cs = coc(cz);
  vec4 c0 = texture2D(tColor, vUv);
  vec3 col = c0.rgb;
  float tot = 1.0;
  float radius = 1.5;
  float ang = 0.0;
  for (int i = 0; i < 72; i++) {
    if (radius >= uMaxBlur) break;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * px * radius;
    vec3 sc = texture2D(tColor, tc).rgb;
    float sz = viewZ(tc);
    float ss = coc(sz);
    if (sz > cz) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, ss);
    col += mix(col / tot, sc, m);
    tot += 1.0;
    radius += 1.6 / radius * 1.0 + 0.35;
    ang += GOLDEN;
  }
  gl_FragColor = vec4(col / tot, 1.0);
}`;

const FINAL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tHud;
uniform vec2 uRes;
uniform float uExposure, uCA, uHudCA, uGrain, uVignette, uFade, uSeed, uSat, uContrast;
uniform vec2 uBlur;
uniform float uZoom;
uniform vec4 uFlash;
uniform vec3 uTint;
varying vec2 vUv;

vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 aces(vec3 color) {
  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = IN * color;
  color = RRTAndODTFit(color);
  color = OUT * color;
  return clamp(color, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec3 sampleCA(vec2 uv, vec2 d, float ca) {
  vec2 o = d * ca;
  return vec3(texture2D(tColor, uv + o).r, texture2D(tColor, uv).g, texture2D(tColor, uv - o).b);
}
void main() {
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  float r = length(d * vec2(uRes.x / uRes.y, 1.0));
  float ca = uCA * (0.25 + r * r * 2.0) / uRes.x;
  vec3 col;
  vec2 bl = uBlur + d * uZoom;
  if (dot(bl, bl) > 1e-9) {
    col = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float k = float(i) / 15.0 - 0.5;
      col += sampleCA(uv + bl * k, d, ca);
    }
    col /= 16.0;
  } else {
    col = sampleCA(uv, d, ca);
  }
  col *= uTint;
  col = aces(col);
  col = toSRGB(col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5;

  // HUD: already display-referred. Optional split on impacts.
  vec2 ho = vec2(uHudCA / uRes.x, 0.0);
  vec4 h = texture2D(tHud, uv);
  float hr = texture2D(tHud, uv + ho).a;
  float hb = texture2D(tHud, uv - ho).a;
  col = mix(col, h.rgb, h.a);
  col += vec3(0.996, 0.173, 0.333) * max(hr - h.a, 0.0) * 0.9;
  col += vec3(0.145, 0.957, 0.933) * max(hb - h.a, 0.0) * 0.9;

  col = mix(col, uFlash.rgb, uFlash.a);
  float vig = smoothstep(1.05, 0.25, r);
  col *= mix(1.0, vig, uVignette);
  col += (hash(uv * uRes + uSeed) - 0.5) * uGrain;
  col *= 1.0 - uFade;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function defaultFx() {
  return {
    exposure: 1.0,
    dof: null, // { focus, aperture, maxBlur }
    bloom: { strength: 0.7, radius: 0.45, threshold: 0.85 },
    ca: 1.2,
    hudCA: 0,
    blur: [0, 0],
    zoom: 0,
    grain: 0.045,
    vignette: 0.55,
    flash: [1, 1, 1, 0],
    fade: 0,
    tint: [1, 1, 1],
    sat: 1.0,
    contrast: 1.0,
    shake: 0,
  };
}

export class Pipeline {
  constructor(renderer, W, H, { samples = 4 } = {}) {
    this.renderer = renderer;
    this.W = W; this.H = H;
    this.scale = H / 1080;
    const depthTexture = new THREE.DepthTexture(W, H);
    depthTexture.type = THREE.UnsignedIntType;
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples, depthTexture });
    this.rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });

    this.dofMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(W, H) },
        uNear: { value: 0.1 }, uFar: { value: 100 }, uFocus: { value: 10 }, uAperture: { value: 0 }, uMaxBlur: { value: 1 },
      },
      vertexShader: VERT, fragmentShader: DOF_FRAG, depthTest: false, depthWrite: false,
    });
    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null } },
      vertexShader: VERT,
      fragmentShader: 'uniform sampler2D tColor; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tColor, vUv); }',
      depthTest: false, depthWrite: false,
    });
    this.finalMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tHud: { value: null }, uRes: { value: new THREE.Vector2(W, H) },
        uExposure: { value: 1 }, uCA: { value: 0 }, uHudCA: { value: 0 }, uGrain: { value: 0.04 }, uVignette: { value: 0.5 },
        uFade: { value: 0 }, uSeed: { value: 0 }, uBlur: { value: new THREE.Vector2() }, uZoom: { value: 0 }, uFlash: { value: new THREE.Vector4() },
        uTint: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1 }, uContrast: { value: 1 },
      },
      vertexShader: VERT, fragmentShader: FINAL_FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.dofMat);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.45, 0.85);
    this.bloom.renderToScreen = false;
  }

  render(scene, camera, fx, hudTexture, frameSeed) {
    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    // Depth of field (or a straight copy).
    if (fx.dof && fx.dof.aperture > 0) {
      const u = this.dofMat.uniforms;
      u.tColor.value = this.sceneRT.texture;
      u.tDepth.value = this.sceneRT.depthTexture;
      u.uNear.value = camera.near; u.uFar.value = camera.far;
      u.uFocus.value = fx.dof.focus;
      u.uAperture.value = fx.dof.aperture;
      u.uMaxBlur.value = (fx.dof.maxBlur ?? 14) * this.scale;
      this.quad.material = this.dofMat;
    } else {
      this.copyMat.uniforms.tColor.value = this.sceneRT.texture;
      this.quad.material = this.copyMat;
    }
    r.setRenderTarget(this.rtA);
    this.quad.render(r);

    // Bloom composites additively back into rtA.
    if (fx.bloom && fx.bloom.strength > 0) {
      this.bloom.strength = fx.bloom.strength;
      this.bloom.radius = fx.bloom.radius;
      this.bloom.threshold = fx.bloom.threshold;
      this.bloom.render(r, null, this.rtA, 0, false);
    }

    const u = this.finalMat.uniforms;
    u.tColor.value = this.rtA.texture;
    u.tHud.value = hudTexture;
    u.uExposure.value = fx.exposure;
    u.uCA.value = fx.ca * this.scale;
    u.uHudCA.value = fx.hudCA * this.scale;
    u.uGrain.value = fx.grain;
    u.uVignette.value = fx.vignette;
    u.uFade.value = fx.fade;
    u.uSeed.value = (frameSeed % 97) * 1.371;
    u.uBlur.value.set(fx.blur[0], fx.blur[1]);
    u.uZoom.value = fx.zoom;
    u.uFlash.value.set(...fx.flash);
    u.uTint.value.set(...fx.tint);
    u.uSat.value = fx.sat;
    u.uContrast.value = fx.contrast;
    this.quad.material = this.finalMat;
    r.setRenderTarget(null);
    this.quad.render(r);
  }
}
