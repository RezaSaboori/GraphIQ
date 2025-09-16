#version 300 es
// Composites the peeled layers back-to-front
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_bg;
uniform sampler2D u_blurredBg;

// Uniforms for each peel's color texture
uniform sampler2D u_peelColor0;
uniform sampler2D u_peelColor1;
uniform sampler2D u_peelColor2;
uniform sampler2D u_peelColor3;
uniform sampler2D u_peelColor4;
uniform sampler2D u_peelColor5;
uniform sampler2D u_peelColor6;
uniform sampler2D u_peelColor7;

uniform int u_nPeels;

void main() {
    // Start with the blurred background
    vec4 accum = texture(u_blurredBg, v_uv);

    // Blend peels back-to-front (manual unroll for WebGL)
    vec4 peel;

    if (u_nPeels > 7) {
      peel = texture(u_peelColor7, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    if (u_nPeels > 6) {
      peel = texture(u_peelColor6, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    if (u_nPeels > 5) {
      peel = texture(u_peelColor5, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    if (u_nPeels > 4) {
      peel = texture(u_peelColor4, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    if (u_nPeels > 3) {
      peel = texture(u_peelColor3, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    if (u_nPeels > 2) {
      peel = texture(u_peelColor2, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    if (u_nPeels > 1) {
      peel = texture(u_peelColor1, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    if (u_nPeels > 0) {
      peel = texture(u_peelColor0, v_uv);
      accum = mix(accum, peel, peel.a);
    }
    
    // The final result should be blended over the original, non-blurred background
    // This is because areas with no shapes should show the original background.
    // We can use the alpha from the last peel to decide.
    // A simpler way is to check if any peel had any alpha. Let's calculate total alpha.
    
    float totalAlpha = 0.0;
    totalAlpha += texture(u_peelColor0, v_uv).a;
    totalAlpha += texture(u_peelColor1, v_uv).a;
    totalAlpha += texture(u_peelColor2, v_uv).a;
    totalAlpha += texture(u_peelColor3, v_uv).a;
    totalAlpha += texture(u_peelColor4, v_uv).a;
    totalAlpha += texture(u_peelColor5, v_uv).a;
    totalAlpha += texture(u_peelColor6, v_uv).a;
    totalAlpha += texture(u_peelColor7, v_uv).a;


    fragColor = mix(texture(u_bg, v_uv), accum, clamp(totalAlpha, 0.0, 1.0));
}
