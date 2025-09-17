#version 300 es

precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_mouse;
uniform vec2 u_mouseSpring;
uniform float u_time;
uniform float u_shapeWidth;
uniform float u_shapeHeight;
uniform float u_shapeRadius;
uniform float u_shapeRoundness;
uniform float u_shadowExpand;
uniform float u_shadowFactor;
uniform vec2 u_shadowPosition;
uniform int u_bgType;
uniform sampler2D u_bgTexture;
uniform float u_bgTextureRatio;
uniform int u_bgTextureReady;
uniform int u_showShape1;
// Dynamic shape system - support up to 20 shapes
uniform float u_shapeCount;
uniform vec2 u_shapePositions[20];
uniform vec2 u_shapeSizes[20];
uniform float u_shapeRadii[20];
uniform float u_shapeRoundnesses[20];
uniform float u_shapeVisibilities[20];
uniform float u_isHoverShape[20]; // 1.0 for hover shapes, 0.0 for regular shapes
uniform float u_mergeRatio; // Controls how much shapes blend together

float chessboard(vec2 uv, float size, int mode) {
  float yBars = step(size * 2.0, mod(uv.y * 2.0, size * 4.0));
  float xBars = step(size * 2.0, mod(uv.x * 2.0, size * 4.0));

  if (mode == 0) {
    return yBars;
  } else if (mode == 1) {
    return xBars;
  } else {
    return abs(yBars - xBars);
  }
}

float halfColor(vec2 uv) {
  if (uv.y > 0.5) {
    return 1.0;
  } else {
    return 0.0;
  }
}

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


float sdgMin(float a, float b) {
  return a < b
    ? a
    : b;
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
    float shapeRadius = (u_shapeRadii[i] / 100.0) * 0.1; // Fixed radius reference independent of shape size
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

// 输入：原始 uv、canvas 宽高比、纹理宽高比
// 输出：变换后的 uv，可直接用于 texture 采样
vec2 getCoverUV(vec2 uv, float canvasAspect, float textureAspect) {
  if (canvasAspect > textureAspect) {
    // canvas 更宽，纹理竖向拉伸
    float scale = textureAspect / canvasAspect;
    uv.y = uv.y * scale + 0.5 - 0.5 * scale;
  } else {
    // canvas 更高，纹理横向拉伸
    float scale = canvasAspect / textureAspect;
    uv.x = uv.x * scale + 0.5 - 0.5 * scale;
  }
  return uv;
}

void main() {
  vec2 u_resolution1x = u_resolution.xy / u_dpr;
  // float chessboardBg = chessboard(gl_FragCoord.xy, 14.0);
  vec3 bgColor = vec3(1.0);

  if (u_bgType <= 0) {
    // chessboard
    bgColor = vec3(1.0 - chessboard(gl_FragCoord.xy / u_dpr, 20.0, 2) / 4.0);
  } else if (u_bgType <= 1) {
    if (v_uv.x < 0.5 && v_uv.y > 0.5) {
      bgColor = vec3(chessboard(gl_FragCoord.xy / u_dpr, 10.0, 0));
    } else if (v_uv.x > 0.5 && v_uv.y < 0.5) {
      bgColor = vec3(chessboard(gl_FragCoord.xy / u_dpr, 10.0, 1));
    } else if (v_uv.x < 0.5 && v_uv.y < 0.5) {
      bgColor = vec3(0.0);
    }
  } else if (u_bgType <= 2) {
    bgColor = vec3(halfColor(gl_FragCoord.xy / u_resolution) * 0.6 + 0.3);
  } else if (u_bgType <= 11) {
    if (u_bgTextureReady != 1) {
      // chessboard
      bgColor = vec3(1.0 - chessboard(gl_FragCoord.xy / u_dpr, 20.0, 2) / 4.0);
    } else {
      vec2 uv = getCoverUV(v_uv, u_resolution.x / u_resolution.y, u_bgTextureRatio);

      // 不需要判断越界，CLAMP_TO_EDGE 会自动处理
      bgColor = texture(u_bgTexture, uv).rgb;
    }
  }

  // float chessboardBg = 1.0 - chessboard(gl_FragCoord.xy / u_dpr, 10.0) / 4.0;
  // float halfColorBg = halfColor(gl_FragCoord.xy / u_resolution);

  // draw shadow - calculate for all shapes
  float shadow = 0.0;
  int shapeCount = int(u_shapeCount);
  
  for (int i = 0; i < 20; i++) {
    if (i >= shapeCount) break;
    if (u_shapeVisibilities[i] < 0.5) continue;
    
    // Calculate shadow position with offset
    vec2 shapePos = (u_shapePositions[i] - u_resolution.xy * 0.5 + vec2(u_shadowPosition.x * u_dpr, u_shadowPosition.y * u_dpr)) / u_resolution.y;
    vec2 shapeSize = u_shapeSizes[i] / u_resolution.y;
    float shapeRadius = (u_shapeRadii[i] / 100.0) * 0.1; // Fixed radius reference independent of shape size
    float shapeRoundness = u_shapeRoundnesses[i];
    
    vec2 pn = shapePos + gl_FragCoord.xy / u_resolution.y;
    
    float dist;
    // Use perfect circle shadow for hover shapes
    if (u_isHoverShape[i] > 0.5) {
      float circleR = 0.5 * min(shapeSize.x, shapeSize.y);
      dist = sdCircle(pn, circleR);
    } else {
      dist = roundedRectSDF(
        pn,
        vec2(0.0),
        shapeSize.x,
        shapeSize.y,
        shapeRadius,
        shapeRoundness
      );
    }
    
    float shapeShadow = exp(-1.0 / u_shadowExpand * abs(dist) * u_resolution1x.y) * 0.6 * u_shadowFactor;
    shadow = max(shadow, shapeShadow);
  }

  fragColor = vec4(bgColor - vec3(shadow), 1.0);
}
