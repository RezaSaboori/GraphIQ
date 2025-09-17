 #version 300 es
// Individual shape shader for layered refraction system
precision highp float;

#define PI (3.14159265359)

const float N_R = 1.0 - 0.02;
const float N_G = 1.0;
const float N_B = 1.0 + 0.02;

in vec2 v_uv;
uniform sampler2D u_bg;
uniform sampler2D u_bg;
uniform sampler2D u_previousLayer; // The accumulated layers behind this shape
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_mouse;
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

// Single shape properties
uniform vec2 u_currentShapePosition;
uniform vec2 u_currentShapeSize;
uniform float u_currentShapeRadius;
uniform float u_currentShapeRoundness;
uniform float u_currentShapeVisible;
uniform float u_currentShapeZIndex;

uniform int STEP;
uniform bool u_isFirstLayer; // Whether this is the first shape layer

out vec4 fragColor;

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
  // Move to center coordinate system
  p -= center;

  float cr = cornerRadius * u_dpr;

  // Calculate distance to rectangle edge
  vec2 d = abs(p) - vec2(width * u_dpr, height * u_dpr) * 0.5;

  // Different handling for edge regions and corners
  float dist;

  if (d.x > -cr && d.y > -cr) {
    // Corner region
    vec2 cornerCenter = sign(p) * (vec2(width * u_dpr, height * u_dpr) * 0.5 - vec2(cr));
    vec2 cornerP = p - cornerCenter;
    dist = superellipseCornerSDF(cornerP, cr, n);
  } else {
    // Interior and edge regions
    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  return dist;
}

// SDF for only the current shape
float currentShapeSDF(vec2 p) {
  if (u_currentShapeVisible < 0.5) {
    return 1e20; // Return large distance if shape is not visible
  }
  
  // Convert shape position from screen to normalized coordinates
  vec2 shapePos = (u_currentShapePosition - u_resolution.xy * 0.5) / u_resolution.y;
  vec2 shapeSize = u_currentShapeSize / u_resolution.y;
  float shapeRadius = (u_currentShapeRadius / 100.0) * min(shapeSize.x, shapeSize.y) * 0.5;
  float shapeRoundness = u_currentShapeRoundness;
  
  vec2 pn = shapePos + p / u_resolution.y;
  
  float dist = roundedRectSDF(
    pn,
    vec2(0.0),
    shapeSize.x,
    shapeSize.y,
    shapeRadius,
    shapeRoundness
  );
  
  return dist;
}

vec2 getNormal(vec2 p) {
  // Use scene-scale adaptive eps
  vec2 h = vec2(max(abs(dFdx(p.x)), 0.0001), max(abs(dFdy(p.y)), 0.0001));

  vec2 grad =
    vec2(
      currentShapeSDF(p + vec2(h.x, 0.0)) - currentShapeSDF(p - vec2(h.x, 0.0)),
      currentShapeSDF(p + vec2(0.0, h.y)) - currentShapeSDF(p - vec2(0.0, h.y))
    ) /
    (2.0 * h);

  return grad * 1.414213562 * 1000.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Color space conversion functions (truncated for brevity - same as original)
const vec3 D65_WHITE = vec3(0.95045592705, 1.0, 1.08905775076);
vec3 WHITE = D65_WHITE;
const mat3 RGB_TO_XYZ_M = mat3(
  0.4124, 0.3576, 0.1805,
  0.2126, 0.7152, 0.0722,
  0.0193, 0.1192, 0.9505
);
const mat3 XYZ_TO_RGB_M = mat3(
   3.2406255, -1.537208 , -0.4986286,
  -0.9689307,  1.8757561,  0.0415175,
   0.0557101, -0.2040211,  1.0569959
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
  return rgb * RGB_TO_XYZ_M;
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
  return xyz * XYZ_TO_RGB_M;
}

vec3 XYZ_TO_SRGB(vec3 xyz) {
  return RGB_TO_SRGB(XYZ_TO_RGB(xyz));
}

float LAB_TO_XYZ_F(float x) {
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
  vec4 pixel = vec4(1.0);
  pixel.r = texture(tex, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  pixel.g = texture(tex, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  pixel.b = texture(tex, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;
  return pixel;
}

void main() {
  vec2 u_resolution1x = u_resolution.xy / u_dpr;
  
  // Calculate distance to current shape only
  float shapeDist = currentShapeSDF(gl_FragCoord.xy);

  vec4 outColor;
  
  if (STEP <= 9) {
    if (shapeDist < 0.005) {
      float nShapeDist = -1.0 * (shapeDist * u_resolution1x.y);

      // Calculate refraction edge factor
      float x_R_ratio = 1.0 - nShapeDist / u_refThickness;
      float thetaI = asin(pow(x_R_ratio, 2.0));
      float thetaT = asin(1.0 / u_refFactor * sin(thetaI));
      float edgeFactor = -1.0 * tan(thetaT - thetaI);
      
      // Normalize edge factor
      if (nShapeDist >= u_refThickness) {
        edgeFactor = 0.0;
      }

      if (edgeFactor <= 0.0) {
        // Inside the shape - use the appropriate texture with tint
        if (u_isFirstLayer) {
          outColor = texture(u_bg, v_uv);
        } else {
          outColor = texture(u_previousLayer, v_uv);
        }
        outColor = mix(outColor, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);
      } else {
        // Edge of the shape - apply refraction effect
        vec2 normal = getNormal(gl_FragCoord.xy);
        
        // Apply refraction with chromatic dispersion
        vec4 refractedPixel;
        if (u_isFirstLayer) {
          refractedPixel = getTextureDispersion(
            u_bg,
            -normal *
              edgeFactor *
              0.05 *
              u_dpr *
              vec2(
                u_resolution.y / (u_resolution1x.x * u_dpr),
                1.0
              ),
            u_refDispersion
          );
        } else {
          refractedPixel = getTextureDispersion(
            u_previousLayer,
            -normal *
              edgeFactor *
              0.05 *
              u_dpr *
              vec2(
                u_resolution.y / (u_resolution1x.x * u_dpr),
                1.0
              ),
            u_refDispersion
          );
        }

        // Basic tint
        outColor = mix(refractedPixel, vec4(u_tint.r, u_tint.g, u_tint.b, 1.0), u_tint.a * 0.8);

        // Add fresnel effect
        float fresnelFactor = clamp(
          pow(
            1.0 +
              shapeDist * u_resolution1x.y / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) +
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

        // Add glare effect
        float glareGeoFactor = clamp(
          pow(
            1.0 +
              shapeDist * u_resolution1x.y / 1500.0 * pow(500.0 / u_glareRange, 2.0) +
              u_glareHardness,
            5.0
          ),
          0.0,
          1.0
        );

        float glareAngle = (vec2ToAngle(normalize(normal)) - PI / 4.0 + u_glareAngle) * 2.0;
        int glareFarside = 0;
        if (
          glareAngle > PI * (2.0 - 0.5) && glareAngle < PI * (4.0 - 0.5) ||
          glareAngle < PI * (0.0 - 0.5)
        ) {
          glareFarside = 1;
        }
        
        float glareAngleFactor =
          (0.5 + sin(glareAngle) * 0.5) *
          (glareFarside == 1
            ? 1.2 * u_glareOppositeFactor
            : 1.2) *
          u_glareFactor;
        glareAngleFactor = clamp(pow(glareAngleFactor, 0.1 + u_glareConvergence * 2.0), 0.0, 1.0);

        vec3 glareTintLCH = SRGB_TO_LCH(
          mix(refractedPixel.rgb, vec3(u_tint.r, u_tint.g, u_tint.b), u_tint.a * 0.5)
        );
        glareTintLCH.x += 150.0 * glareAngleFactor * glareGeoFactor;
        glareTintLCH.y += 30.0 * glareAngleFactor * glareGeoFactor;
        glareTintLCH.x = clamp(glareTintLCH.x, 0.0, 120.0);

        outColor = mix(
          outColor,
          vec4(LCH_TO_SRGB(glareTintLCH), 1.0),
          glareAngleFactor * glareGeoFactor
        );
      }
      
      // Smooth transition to background only at edges
      if (u_isFirstLayer) {
        outColor = mix(outColor, texture(u_bg, v_uv), smoothstep(-0.0005, 0.0005, shapeDist));
      } else {
        outColor = mix(outColor, texture(u_previousLayer, v_uv), smoothstep(-0.0005, 0.0005, shapeDist));
      }
    } else {
      // Outside the shape - pass through the previous layer or background
      if (u_isFirstLayer) {
        outColor = texture(u_bg, v_uv);
      } else {
        outColor = texture(u_previousLayer, v_uv);
      }
    }
  } else {
    // Debug modes - simplified for individual shapes
    if (u_isFirstLayer) {
      outColor = texture(u_bg, v_uv);
    } else {
      outColor = texture(u_previousLayer, v_uv);
    }
  }

  fragColor = outColor;
}
