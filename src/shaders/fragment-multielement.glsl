#version 300 es
precision highp float;

#define PI (3.14159265359)
#define MAX_ELEMENTS 50
#define ELEMENT_TYPE_SHAPE 0
#define ELEMENT_TYPE_TEXT 1
#define ELEMENT_TYPE_ICON 2

in vec2 v_uv;

uniform sampler2D u_bg;
uniform sampler2D u_bg;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_mouse;

uniform float u_elementCount;
uniform vec2 u_elementPositions[MAX_ELEMENTS];
uniform vec2 u_elementSizes[MAX_ELEMENTS];
uniform vec4 u_elementColors[MAX_ELEMENTS];
uniform vec4 u_elementCustomData[MAX_ELEMENTS];
uniform float u_elementTypes[MAX_ELEMENTS];

uniform vec4 u_tint;
uniform float u_refThickness;
uniform float u_refFactor;
uniform float u_refDispersion;
uniform float u_mergeRatio;

out vec4 fragColor;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float superellipseCorner(vec2 p, float r, float n) {
  p = abs(p);
  float v = pow(pow(p.x, n) + pow(p.y, n), 1.0 / n);
  return v - r;
}

float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {
  p -= center;
  float cr = cornerRadius * u_dpr;
  vec2 d = abs(p) - vec2(width * u_dpr, height * u_dpr) * 0.5;
  float dist;
  if (d.x > -cr && d.y > -cr) {
    vec2 cornerCenter = sign(p) * (vec2(width * u_dpr, height * u_dpr) * 0.5 - vec2(cr));
    vec2 cornerP = p - cornerCenter;
    dist = superellipseCorner(cornerP, cr, n);
  } else {
    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }
  return dist;
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float elementSDF(vec2 p, int idx) {
  if (idx >= int(u_elementCount)) return 1e20;
  int et = int(u_elementTypes[idx]);
  vec2 pos = (u_elementPositions[idx] - u_resolution.xy * 0.5) / u_resolution.y;
  vec2 size = u_elementSizes[idx] / u_resolution.y;
  vec2 pn = pos + p / u_resolution.y;

  if (et == ELEMENT_TYPE_SHAPE) {
    float radius = (u_elementCustomData[idx].x / 100.0) * min(size.x, size.y) * 0.5;
    float roundness = u_elementCustomData[idx].y;
    return roundedRectSDF(pn, vec2(0.0), size.x, size.y, radius, roundness);
  } else if (et == ELEMENT_TYPE_TEXT) {
    float pad = size.y * 0.1;
    return roundedRectSDF(pn, vec2(0.0), size.x + pad, size.y + pad, size.y * 0.2, 2.0);
  } else if (et == ELEMENT_TYPE_ICON) {
    float r = min(size.x, size.y) * 0.5;
    return sdCircle(pn, r);
  }
  return 1e20;
}

float mainSDF(vec2 p) {
  float d = 1e20;
  for (int i = 0; i < MAX_ELEMENTS; i++) {
    if (i >= int(u_elementCount)) break;
    float di = elementSDF(p, i);
    if (d == 1e20) d = di; else d = smin(d, di, u_mergeRatio);
  }
  return d;
}

vec2 getNormal(vec2 p) {
  float eps = 1.0;
  float dx = mainSDF(p + vec2(eps, 0.0)) - mainSDF(p - vec2(eps, 0.0));
  float dy = mainSDF(p + vec2(0.0, eps)) - mainSDF(p - vec2(0.0, eps));
  return normalize(vec2(dx, dy));
}

const float N_R = 1.0 - 0.02;
const float N_G = 1.0;
const float N_B = 1.0 + 0.02;

vec4 getTextureDispersion(sampler2D tex, vec2 offset, float factor) {
  vec4 pixel = vec4(1.0);
  pixel.r = texture(tex, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  pixel.g = texture(tex, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  pixel.b = texture(tex, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;
  return pixel;
}

void main() {
  vec2 res1x = u_resolution.xy / u_dpr;
  float merged = mainSDF(gl_FragCoord.xy);

  if (merged < 0.005) {
    float nmerged = -merged * res1x.y;
    float x_R_ratio = 1.0 - nmerged / u_refThickness;
    float thetaI = asin(pow(x_R_ratio, 2.0));
    float thetaT = asin(1.0 / u_refFactor * sin(thetaI));
    float edgeFactor = -tan(thetaT - thetaI);
    if (nmerged >= u_refThickness) edgeFactor = 0.0;

    vec2 refractionOffset = edgeFactor > 0.0
      ? -getNormal(gl_FragCoord.xy) * edgeFactor * 0.05 * u_dpr * vec2(u_resolution.y / res1x.x, 1.0)
      : vec2(0.0);

    vec4 blurredPixel = getTextureDispersion(u_bg, refractionOffset, u_refDispersion);
    vec4 finalColor = mix(blurredPixel, u_tint, u_tint.a * 0.8);
    fragColor = finalColor;
  } else {
    fragColor = texture(u_bg, v_uv);
  }
  fragColor = mix(fragColor, texture(u_bg, v_uv), smoothstep(-0.0005, 0.0005, merged));
}


