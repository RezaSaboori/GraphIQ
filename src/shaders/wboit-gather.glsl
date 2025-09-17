#extension GL_EXT_draw_buffers : require

precision highp float;

#define PI (3.14159265359)

const float N_R = 1.0 - 0.02;
const float N_G = 1.0;
const float N_B = 1.0 + 0.02;

varying vec2 v_uv;
// Removed blurred background dependency
uniform sampler2D u_bg;
uniform sampler2D u_previousLayer; // Previous layer for layered rendering
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_mouse;
uniform float u_shapeWidth;
uniform float u_shapeHeight;
uniform float u_shapeRadius;
uniform float u_shapeRoundness;
uniform vec4 u_tint;
uniform float u_refThickness;
uniform float u_refFactor;
uniform float u_refDispersion;
uniform float u_refFresnelRange;
uniform float u_refFresnelFactor;
uniform float u_refFresnelHardness;
uniform float u_glareRange;
uniform float u_glareConvergence;
uniform float u_glareOppositeFactor;
uniform float u_glareFactor;
uniform float u_glareHardness;
uniform float u_glareAngle;
// Data texture for shape properties
uniform sampler2D u_shapeTexture;
uniform float u_shapeCount;
uniform vec2 u_shapeTextureSize;

uniform float u_mergeRatio; // Controls how much shapes blend together

uniform int STEP;

// All the helper functions from fragment-main.glsl
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

vec3 sdSuperellipse(vec2 p, float r, float n) {
  p = p / r;
  vec2 gs = sign(p);
  vec2 ps = abs(p);
  float gm = pow(ps.x, n) + pow(ps.y, n);
  float gd = pow(gm, 1.0 / n) - 1.0;
  vec2 g = gs * pow(ps, vec2(n - 1.0)) * pow(gm, 1.0 / n - 1.0);
  p = abs(p);
  if (p.y > p.x) p = p.yx;
  n = 2.0 / n;
  float s = 1.0;
  float d = 1e20;
  const int num = 24;
  vec2 oq = vec2(1.0, 0.0);
  for (int i = 1; i < num; i++) {
    float h = float(i) / float(num - 1);
    vec2 q = vec2(pow(cos(h * PI / 4.0), n), pow(sin(h * PI / 4.0), n));
    vec2 pa = p - oq;
    vec2 ba = q - oq;
    vec2 z = pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d2 = dot(z, z);
    if (d2 < d) {
      d = d2;
      s = pa.x * ba.y - pa.y * ba.x;
    }
    oq = q;
  }
  return vec3(sqrt(d) * sign(s) * r, g);
}

float superellipseCornerSDF(vec2 p, float r, float n) {
  p = abs(p);
  float v = pow(pow(p.x, n) + pow(p.y, n), 1.0 / n);
  return v - r;
}

float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {
  // 移动到中心坐标系
  p -= center;

  float cr = cornerRadius * u_dpr;

  // 计算到矩形边缘的距离
  vec2 d = abs(p) - vec2(width * u_dpr, height * u_dpr) * 0.5;

  // 对于边缘区域和角落，我们需要不同的处理
  float dist;

  if (d.x > -cr && d.y > -cr) {
    // 角落区域
    vec2 cornerCenter = sign(p) * (vec2(width * u_dpr, height * u_dpr) * 0.5 - vec2(cr));
    vec2 cornerP = p - cornerCenter;
    dist = superellipseCornerSDF(cornerP, cr, n);
  } else {
    // 内部和边缘区域
    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  return dist;
}

// Smooth minimum function for blob merging
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * (1.0 / 4.0);
}

float mainSDF(vec2 p) {
  float minDist = 1e20;
  int shapeCount = int(u_shapeCount);
  
  for (int i = 0; i < 1000; i++) { // Loop up to a max limit
    if (i >= shapeCount) break;

    // Fetch shape data from texture
    float u_shapeVisibilities = 1.0; // Assuming all in texture are visible
    vec2 texCoord1 = vec2((float(i) * 3.0 + 0.5) / u_shapeTextureSize.x, 0.5);
    vec2 texCoord2 = vec2((float(i) * 3.0 + 1.5) / u_shapeTextureSize.x, 0.5);
    
    vec4 data1 = texture2D(u_shapeTexture, texCoord1);
    vec4 data2 = texture2D(u_shapeTexture, texCoord2);

    vec2 u_shapePositions = data1.xy;
    vec2 u_shapeSizes = data1.zw;
    float u_shapeRadii = data2.x;
    float u_shapeRoundnesses = data2.y;
    float u_shapeZIndices = data2.z;
    float u_isHoverShape = data2.w;

    // Convert shape position from screen to normalized coordinates
    vec2 shapePos = (u_shapePositions - u_resolution.xy * 0.5) / u_resolution.y;
    vec2 shapeSize = u_shapeSizes / u_resolution.y;
    float shapeRadius = (u_shapeRadii / 100.0) * 0.1; // Fixed radius reference independent of shape size
    float shapeRoundness = u_shapeRoundnesses;
    
    vec2 pn = shapePos + p / u_resolution.y;
    
    float dist;
    
    // Check if this is a hover shape - use perfect circle for hover shapes
    if (u_isHoverShape > 0.5) {
      // Perfect circle SDF for hover shapes
      float circleRadius = min(shapeSize.x, shapeSize.y) * 0.5;
      dist = sdCircle(pn, circleRadius);
    } else {
      // Regular rounded rectangle SDF for other shapes
      dist = roundedRectSDF(
        pn,
        vec2(0.0),
        shapeSize.x,
        shapeSize.y,
        shapeRadius,
        shapeRoundness
      );
    }
    
    // Use smooth minimum for blob merging effect
    if (minDist == 1e20) {
      minDist = dist;
    } else {
      minDist = smin(minDist, dist, u_mergeRatio); // Use merge ratio control
    }
  }
  
  return minDist;
}

vec2 getNormal(vec2 p) {
  // Use isotropic, pixel-sized central differences to avoid directional bias
  float eps = 1.0; // 1 screen pixel
  float dx = mainSDF(p + vec2(eps, 0.0)) - mainSDF(p - vec2(eps, 0.0));
  float dy = mainSDF(p + vec2(0.0, eps)) - mainSDF(p - vec2(0.0, eps));
  vec2 grad = vec2(dx, dy);
  return normalize(grad);
}

vec2 getNormal2(vec2 p) {
  float eps = 0.7071 * 0.0005; // ~1/sqrt(2) * epsilon
  vec2 e1 = vec2(1.0, 1.0);
  vec2 e2 = vec2(-1.0, 1.0);
  vec2 e3 = vec2(1.0, -1.0);
  vec2 e4 = vec2(-1.0, -1.0);

  return normalize(
    e1 * mainSDF(p + eps * e1) +
      e2 * mainSDF(p + eps * e2) +
      e3 * mainSDF(p + eps * e3) +
      e4 * mainSDF(p + eps * e4)
  );
}

vec2 getNormal3(vec2 p) {
  float eps = 0.0005;
  vec2 e = vec2(eps, 0.0);

  float dx = mainSDF(p + e.xy) - mainSDF(p - e.xy); // ∂f/∂x
  float dy = mainSDF(p + e.yx) - mainSDF(p - e.yx); // ∂f/∂y

  return normalize(vec2(dx, dy));
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// from https://github.com/Rachmanin0xFF/GLSL-Color-Functions/blob/main/color-functions.glsl
//                          0.3127/0.3290  1.0  (1.0-0.3127-0.3290)/0.329
const vec3 D65_WHITE = vec3(0.95045592705, 1.0, 1.08905775076);
//                          0.3457/0.3585  1.0  (1.0-0.3457-0.3585)/0.3585
const vec3 D50_WHITE = vec3(0.96429567643, 1.0, 0.82510460251);
vec3 WHITE = D65_WHITE;
const mat3 RGB_TO_XYZ_M = mat3(
  0.4124, 0.3576, 0.1805,
  0.2126, 0.7152, 0.0722,
  0.0193, 0.1192, 0.9505
);
const mat3 XYZ_TO_XYZ50_M = mat3(
   1.0479298208405488  ,  0.022946793341019088, -0.05019222954313557 ,
   0.029627815688159344,  0.990434484573249   , -0.01707382502938514 ,
  -0.009243058152591178,  0.015055144896577895,  0.7518742899580008
);
const mat3 XYZ_TO_RGB_M = mat3(
   3.2406255, -1.537208 , -0.4986286,
  -0.9689307,  1.8757561,  0.0415175,
   0.0557101, -0.2040211,  1.0569959
);
const mat3 XYZ50_TO_XYZ_M = mat3(
   0.9554734527042182  , -0.023098536874261423,  0.0632593086610217  ,
  -0.028369706963208136,  1.0099954580058226  ,  0.021041398966943008,
   0.012314001688319899, -0.020507696433477912,  1.3303659366080753
);
float UNCOMPAND_SRGB(float a) {
  return a > 0.04045
    ? pow((a + 0.055) / 1.055, 2.4)
    : a / 12.92;
}
float COMPAND_RGB(float a) {
  return a <= 0.0031308
    ? 12.92 * a
    : 1.055 * pow(a, 0.41666666666) - 0.055;
}
vec3 RGB_TO_XYZ(vec3 rgb) {
  return WHITE == D65_WHITE
    ? rgb * RGB_TO_XYZ_M
    : rgb * RGB_TO_XYZ_M * XYZ_TO_XYZ50_M;
}
vec3 SRGB_TO_RGB(vec3 srgb) {
  return vec3(UNCOMPAND_SRGB(srgb.x), UNCOMPAND_SRGB(srgb.y), UNCOMPAND_SRGB(srgb.z));
}
vec3 RGB_TO_SRGB(vec3 rgb) {
  return vec3(COMPAND_RGB(rgb.x), COMPAND_RGB(rgb.y), COMPAND_RGB(rgb.z));
}
vec3 SRGB_TO_XYZ(vec3 srgb) {
  return RGB_TO_XYZ(SRGB_TO_RGB(srgb));
}
float XYZ_TO_LAB_F(float x) {
  //          (24/116)^3                         1/(3*(6/29)^2)     4/29
  return x > 0.00885645167
    ? pow(x, 0.333333333)
    : 7.78703703704 * x + 0.13793103448;
}
vec3 XYZ_TO_LAB(vec3 xyz) {
  vec3 xyz_scaled = xyz / WHITE;
  xyz_scaled = vec3(
    XYZ_TO_LAB_F(xyz_scaled.x),
    XYZ_TO_LAB_F(xyz_scaled.y),
    XYZ_TO_LAB_F(xyz_scaled.z)
  );
  return vec3(
    116.0 * xyz_scaled.y - 16.0,
    500.0 * (xyz_scaled.x - xyz_scaled.y),
    200.0 * (xyz_scaled.y - xyz_scaled.z)
  );
}
vec3 SRGB_TO_LAB(vec3 srgb) {
  return XYZ_TO_LAB(SRGB_TO_XYZ(srgb));
}
vec3 LAB_TO_LCH(vec3 Lab) {
  return vec3(Lab.x, sqrt(dot(Lab.yz, Lab.yz)), atan(Lab.z, Lab.y) * 57.2957795131);
}
vec3 SRGB_TO_LCH(vec3 srgb) {
  return LAB_TO_LCH(SRGB_TO_LAB(srgb));
}
vec3 XYZ_TO_RGB(vec3 xyz) {
  return WHITE == D65_WHITE
    ? xyz * XYZ_TO_RGB_M
    : xyz * XYZ50_TO_XYZ_M * XYZ_TO_RGB_M;
}
vec3 XYZ_TO_SRGB(vec3 xyz) {
  return RGB_TO_SRGB(XYZ_TO_RGB(xyz));
}
float LAB_TO_XYZ_F(float x) {
  //                                     3*(6/29)^2         4/29
  return x > 0.206897
    ? x * x * x
    : 0.12841854934 * (x - 0.137931034);
}
vec3 LAB_TO_XYZ(vec3 Lab) {
  float w = (Lab.x + 16.0) / 116.0;
  return WHITE *
  vec3(LAB_TO_XYZ_F(w + Lab.y / 500.0), LAB_TO_XYZ_F(w), LAB_TO_XYZ_F(w - Lab.z / 200.0));
}
vec3 LAB_TO_SRGB(vec3 lab) {
  return XYZ_TO_SRGB(LAB_TO_XYZ(lab));
}
vec3 LCH_TO_LAB(vec3 LCh) {
  return vec3(LCh.x, LCh.y * cos(LCh.z * 0.01745329251), LCh.y * sin(LCh.z * 0.01745329251));
}
vec3 LCH_TO_SRGB(vec3 lch) {
  return LAB_TO_SRGB(LCH_TO_LAB(lch));
}

float vec2ToAngle(vec2 v) {
  float angle = atan(v.y, v.x);
  if (angle < 0.0) angle += 2.0 * PI;
  return angle;
}

vec3 vec2ToRgb(vec2 v) {
  float angle = atan(v.y, v.x);
  if (angle < 0.0) angle += 2.0 * PI;
  float hue = angle / (2.0 * PI);
  vec3 hsv = vec3(hue, 1.0, 1.0);
  return hsv2rgb(hsv);
}

vec4 getTextureDispersion(sampler2D tex, vec2 offset, float factor) {
  // Physics-based chromatic dispersion using wavelength-dependent refractive indices
  vec4 pixel = vec4(1.0);
  pixel.r = texture2D(tex, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  pixel.g = texture2D(tex, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  pixel.b = texture2D(tex, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;
  return pixel;
}

void main() {
  vec2 u_resolution1x = u_resolution.xy / u_dpr;
  // Calculate distance to all shapes
  float merged = mainSDF(gl_FragCoord.xy);

  vec4 outColor = vec4(0.0);
  if (merged < 0.005) {
    float nmerged = -1.0 * (merged * u_resolution1x.y);

    // calculate refraction edge factor:
    float x_R_ratio = 1.0 - nmerged / u_refThickness;
    float thetaI = asin(pow(x_R_ratio, 2.0));
    float thetaT = asin(1.0 / u_refFactor * sin(thetaI));
    float edgeFactor = -1.0 * tan(thetaT - thetaI);
    // Will have value > 0 inside of shape, force normalize here
    if (nmerged >= u_refThickness) {
      edgeFactor = 0.0;
    }

    vec2 refractionOffset;
    if (edgeFactor <= 0.0) {
      refractionOffset = vec2(0.0);
    } else {
      vec2 normal = getNormal(gl_FragCoord.xy);
      refractionOffset = -normal *
        edgeFactor *
        0.05 *
        u_dpr *
        vec2(
          u_resolution.y / (u_resolution1x.x * u_dpr), /* resolution independent */
          1.0
        );
    }
    
    vec4 blurredPixel = getTextureDispersion(u_bg, refractionOffset, u_refDispersion);
    vec4 previousLayerPixel = getTextureDispersion(u_previousLayer, refractionOffset, u_refDispersion);
    
    vec4 combinedRefraction = mix(blurredPixel, previousLayerPixel, 0.4);
    
    outColor = mix(combinedRefraction, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);

    float fresnelFactor = clamp(
      pow(
        1.0 +
          merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) +
          u_refFresnelHardness,
        5.0
      ),
      0.0,
      1.0
    );

    vec3 fresnelTintLCH = SRGB_TO_LCH(
      mix(vec3(1.0), vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)
    );
    fresnelTintLCH.x += 20.0 * fresnelFactor * u_refFresnelFactor;
    fresnelTintLCH.x = clamp(fresnelTintLCH.x, 0.0, 100.0);

    outColor = mix(
      outColor,
      vec4(LCH_TO_SRGB(fresnelTintLCH), 1.0),
      fresnelFactor * u_refFresnelFactor * 0.7
    );

    float glareGeoFactor = clamp(
      pow(
        1.0 +
          merged * u_resolution1x.y / 1500.0 * pow(500.0 / u_glareRange, 2.0) +
          u_glareHardness,
        5.0
      ),
      0.0,
      1.0
    );

    vec2 glareNormal = getNormal(gl_FragCoord.xy);
    float glareAngleValue = (vec2ToAngle(normalize(glareNormal)) - PI / 4.0 + u_glareAngle) * 2.0;
    int glareFarside = 0;
    if (
      glareAngleValue > PI * (2.0 - 0.5) && glareAngleValue < PI * (4.0 - 0.5) ||
      glareAngleValue < PI * (0.0 - 0.5)
    ) {
      glareFarside = 1;
    }
    
    float glareAngleFactor =
      (0.5 + sin(glareAngleValue) * 0.5) *
      (glareFarside == 1
        ? 1.2 * u_glareOppositeFactor
        : 1.2) *
      u_glareFactor;
    glareAngleFactor = clamp(pow(glareAngleFactor, 0.1 + u_glareConvergence * 2.0), 0.0, 1.0);

    vec3 glareTintLCH = SRGB_TO_LCH(
      mix(combinedRefraction.rgb, vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)
    );
    glareTintLCH.x += 150.0 * glareAngleFactor * glareGeoFactor;
    glareTintLCH.y += 30.0 * glareAngleFactor * glareGeoFactor;
    glareTintLCH.x = clamp(glareTintLCH.x, 0.0, 120.0);

    outColor = mix(
      outColor,
      vec4(LCH_TO_SRGB(glareTintLCH), 1.0),
      glareAngleFactor * glareGeoFactor
    );
  } else {
    // This is a transparent fragment outside of any shape, so we discard it.
    discard;
  }

  // WBOIT calculations
  float alpha = outColor.a * u_tint.a; // Make sure to factor in global tint alpha
  outColor.a = alpha;

  // A simple weight function.
  // The factor '20.0' and power '2.0' are scene-dependent and may need tuning.
  // The weight function is key for quality. This is a common one.
  float weight = clamp(pow(min(1.0, alpha * 10.0) + 0.01, 3.0) * max(1e-2, 3.0 / (1e-5 + pow(gl_FragCoord.z / 200.0, 4.0))), 1e-2, 3e3);
  
  // 1. Accumulation buffer: stores weighted, premultiplied color and un-weighted alpha
  gl_FragData[0] = vec4(outColor.rgb * alpha * weight, alpha);
  
  // 2. Revealage buffer: stores alpha. The blending will handle the revealage calculation.
  gl_FragData[1] = vec4(alpha);
}
