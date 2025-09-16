#version 300 es
// Depth Peeling Shader
precision highp float;

#define PI (3.14159265359)
#define SHAPE_LIMIT 20
#define MAX_Z 1000.0

const float N_R = 1.0 - 0.02;
const float N_G = 1.0;
const float N_B = 1.0 + 0.02;

in vec2 v_uv;

// Textures
uniform sampler2D u_previousDepth;
uniform sampler2D u_blurredBg; // For refraction
uniform sampler2D u_bg;        // For fallback

// Resolution and mouse
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_mouse;

// Shape uniforms (for up to SHAPE_LIMIT shapes)
uniform int u_shapeCount;
uniform vec2 u_shapePositions[SHAPE_LIMIT];
uniform vec2 u_shapeSizes[SHAPE_LIMIT];
uniform float u_shapeRadii[SHAPE_LIMIT];
uniform float u_shapeRoundnesses[SHAPE_LIMIT];
uniform float u_shapeVisibilities[SHAPE_LIMIT];
uniform float u_shapeZIndices[SHAPE_LIMIT];
uniform float u_isHoverShape[SHAPE_LIMIT];
uniform vec4 u_shapeTints[SHAPE_LIMIT];
uniform float u_mergeRatio;

// Material/effect uniforms
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

out vec4 fragColor;

// SDF functions (from fragment-main.glsl)
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float superellipseCornerSDF(vec2 p, float r, float n) {
  p = abs(p);
  float v = pow(pow(p.x, n) + pow(p.y, n), 1.0 / n);
  return v - r;
}

float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {
  p -= center;
  float cr = cornerRadius;
  vec2 d = abs(p) - vec2(width, height) * 0.5;
  
  float dist;
  if (d.x > -cr && d.y > -cr) {
    vec2 cornerCenter = sign(p) * (vec2(width, height) * 0.5 - vec2(cr));
    vec2 cornerP = p - cornerCenter;
    dist = superellipseCornerSDF(cornerP, cr, n);
  } else {
    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }
  return dist;
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * (1.0 / 4.0);
}

// Calculate SDF for a single shape
float shapeSDF(vec2 p, int index) {
    vec2 shapePos = u_shapePositions[index];
    vec2 shapeSize = u_shapeSizes[index];
    float shapeRadius = u_shapeRadii[index] / 100.0 * min(shapeSize.x, shapeSize.y) * 0.5;
    float shapeRoundness = u_shapeRoundnesses[index];

    vec2 p_shape_space = gl_FragCoord.xy - u_resolution * 0.5 - shapePos;

    if (u_isHoverShape[index] > 0.5) {
        return sdCircle(p_shape_space, min(shapeSize.x, shapeSize.y) * 0.5);
    } else {
        return roundedRectSDF(p_shape_space, vec2(0.0), shapeSize.x, shapeSize.y, shapeRadius, shapeRoundness);
    }
}

// Calculate merged SDF for a specific z-index
float mergedSDFForZ(vec2 p, float targetZ) {
    float minDist = 1e20;
    for (int i = 0; i < SHAPE_LIMIT; i++) {
        if (i >= u_shapeCount) break;
        if (u_shapeVisibilities[i] < 0.5) continue;
        
        if (abs(u_shapeZIndices[i] - targetZ) < 0.1) {
            float dist = shapeSDF(p, i);
            if (minDist > 1e19) {
                minDist = dist;
            } else {
                minDist = smin(minDist, dist, u_mergeRatio);
            }
        }
    }
    return minDist;
}

vec2 getNormalForZ(vec2 p, float targetZ) {
  float eps = 1.0;
  float dx = mergedSDFForZ(p + vec2(eps, 0.0), targetZ) - mergedSDFForZ(p - vec2(eps, 0.0), targetZ);
  float dy = mergedSDFForZ(p + vec2(0.0, eps), targetZ) - mergedSDFForZ(p - vec2(0.0, eps), targetZ);
  return normalize(vec2(dx, dy));
}


vec4 getTextureDispersion(sampler2D tex, vec2 offset, float factor) {
  vec4 pixel;
  pixel.r = texture(tex, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  pixel.g = texture(tex, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  pixel.b = texture(tex, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;
  pixel.a = texture(tex, v_uv + offset).a;
  return pixel;
}

// Main color calculation logic (adapted from fragment-main.glsl)
vec4 calculateGlassColor(float mergedDist, vec2 normal, vec4 tint) {
    float nmerged = -1.0 * (mergedDist);

    float x_R_ratio = 1.0 - nmerged / u_refThickness;
    float thetaI = asin(pow(x_R_ratio, 2.0));
    float thetaT = asin(1.0 / u_refFactor * sin(thetaI));
    float edgeFactor = -1.0 * tan(thetaT - thetaI);
    if (nmerged >= u_refThickness || edgeFactor < 0.0) {
        edgeFactor = 0.0;
    }

    vec2 refractionOffset = -normal * edgeFactor * 0.05 * vec2(u_resolution.y / u_resolution.x, 1.0);

    vec4 refractedColor = getTextureDispersion(u_blurredBg, refractionOffset, u_refDispersion);

    vec4 finalColor = mix(refractedColor, vec4(tint.rgb, 1.0), tint.a * 0.8);

    // Fresnel
    float fresnelFactor = clamp(pow(1.0 + mergedDist / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) + u_refFresnelHardness, 5.0), 0.0, 1.0);
    finalColor.rgb = mix(finalColor.rgb, vec3(1.0), fresnelFactor * u_refFresnelFactor);

    // Glare
    float glareGeoFactor = clamp(pow(1.0 + mergedDist / 1500.0 * pow(500.0 / u_glareRange, 2.0) + u_glareHardness, 5.0), 0.0, 1.0);
    float angle = atan(normal.y, normal.x);
    float glareAngleFactor = 0.5 + 0.5 * sin((angle - PI / 4.0 + u_glareAngle) * 2.0);
    glareAngleFactor = pow(glareAngleFactor, 0.1 + u_glareConvergence * 2.0);
    finalColor.rgb = mix(finalColor.rgb, vec3(1.0), glareAngleFactor * glareGeoFactor * u_glareFactor);

    return finalColor;
}

void main() {
    float minZ = MAX_Z + 1.0;
    int minZIndex = -1;
    
    // Un-normalize previous depth. Assume depth is stored normalized.
    float prevDepth = texture(u_previousDepth, v_uv).r * MAX_Z;
    if (prevDepth == 0.0) prevDepth = -1.0; // Handle initial empty depth texture

    // Find the closest fragment not yet peeled
    for (int i = 0; i < SHAPE_LIMIT; i++) {
        if (i >= u_shapeCount) break;
        if (u_shapeVisibilities[i] < 0.5) continue;

        float dist = shapeSDF(gl_FragCoord.xy, i);
        if (dist < 0.0) {
            float z = u_shapeZIndices[i];
            // Check if this fragment is closer than minZ but further than prevDepth
            if (z > prevDepth + 1e-4 && z < minZ) {
                minZ = z;
                minZIndex = i;
            }
        }
    }

    if (minZIndex == -1) {
        discard;
    }

    // We found the next layer. Now calculate its color.
    // Get merged SDF for all shapes at this z-level for correct normals
    float finalSDF = mergedSDFForZ(gl_FragCoord.xy, minZ);
    vec2 finalNormal = getNormalForZ(gl_FragCoord.xy, minZ);
    vec4 tint = u_shapeTints[minZIndex];

    fragColor = calculateGlassColor(finalSDF, finalNormal, tint);
    
    // The alpha should represent the coverage, based on the SDF
    fragColor.a = 1.0 - smoothstep(0.0, 2.0, finalSDF);

    // Write depth for the next peel pass, normalized to [0, 1]
    gl_FragDepth = minZ / MAX_Z;
}
