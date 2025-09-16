#version 300 es

precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_dpr;

// Dynamic shape system - support up to 20 shapes
uniform float u_shapeCount;
uniform vec2 u_shapePositions[20];
uniform vec2 u_shapeSizes[20];
uniform float u_shapeRadii[20];
uniform float u_shapeRoundnesses[20];
uniform float u_shapeVisibilities[20];
uniform float u_isHoverShape[20]; // 1.0 for hover shapes, 0.0 for regular shapes
uniform float u_mergeRatio; // Controls how much shapes blend together

float sdCircle(vec2 p, float r) {
  return length(p) - r;
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
  
  for (int i = 0; i < 20; i++) {
    if (i >= shapeCount) break;
    if (u_shapeVisibilities[i] < 0.5) continue;
    
    // Convert shape position from screen to normalized coordinates
    vec2 shapePos = (u_shapePositions[i] - u_resolution.xy * 0.5) / u_resolution.y;
    vec2 shapeSize = u_shapeSizes[i] / u_resolution.y;
    float shapeRadius = (u_shapeRadii[i] / 100.0) * min(shapeSize.x, shapeSize.y) * 0.5;
    float shapeRoundness = u_shapeRoundnesses[i];
    
    vec2 pn = shapePos + p / u_resolution.y;
    
    float dist;
    
    // Check if this is a hover shape - use perfect circle for hover shapes
    if (u_isHoverShape[i] > 0.5) {
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

void main() {
  // Calculate distance to all shapes
  float merged = mainSDF(gl_FragCoord.xy);
  
  // Create mask: white (1.0) inside shapes, black (0.0) outside
  float mask = merged < 0.0 ? 1.0 : 0.0;
  
  // Output mask as grayscale (alpha = 1.0 for proper blending)
  fragColor = vec4(mask, mask, mask, 1.0);
}
