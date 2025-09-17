precision highp float;

varying vec2 v_uv;

uniform sampler2D u_accumTexture;
uniform sampler2D u_revealageTexture;
uniform sampler2D u_bgTexture; // Opaque background

void main() {
  vec4 accum = texture2D(u_accumTexture, v_uv);
  float revealage = texture2D(u_revealageTexture, v_uv).r;

  // Composite formula
  // Epsilon to avoid division by zero
  float epsilon = 0.00001;
  vec3 finalColor = accum.rgb / max(accum.a, epsilon);
  
  // Blend with background
  vec3 bgColor = texture2D(u_bgTexture, v_uv).rgb;
  // mix(background, foreground, opacity)
  gl_FragColor = mix(vec4(bgColor, 1.0), vec4(finalColor, 1.0), 1.0 - revealage);
}
