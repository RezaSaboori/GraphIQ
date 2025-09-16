#version 300 es

precision highp float;

#define MAX_BLUR_RADIUS (200)

in vec2 v_uv;

uniform sampler2D u_prevPassTexture;
uniform sampler2D u_shapeMask;
uniform vec2 u_resolution;
uniform int u_blurRadius;
uniform float u_blurWeights[MAX_BLUR_RADIUS + 1];

out vec4 fragColor;

void main() {
  vec2 texelSize = 1.0 / u_resolution;
  
  // Sample the shape mask to determine if we should blur this pixel
  float mask = texture(u_shapeMask, v_uv).r;
  
  // Get the original background color
  vec4 originalColor = texture(u_prevPassTexture, v_uv);
  
  if (mask > 0.5) {
    // Inside shape area - apply vertical blur
    vec4 blurredColor = originalColor * u_blurWeights[0];
    for (int i = 1; i <= u_blurRadius; ++i) {
      float w = u_blurWeights[i];
      vec2 offset = vec2(float(i)) * texelSize;
      blurredColor += texture(u_prevPassTexture, v_uv + vec2(0.0, offset.y)) * w;
      blurredColor += texture(u_prevPassTexture, v_uv - vec2(0.0, offset.y)) * w;
    }
    fragColor = blurredColor;
  } else {
    // Outside shape area - keep original
    fragColor = originalColor;
  }
}
