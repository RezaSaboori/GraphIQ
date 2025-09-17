#version 310 es
layout(local_size_x = 16, local_size_y = 16) in;

struct Fragment {
    vec4 color;
    float depth;
    uint next;
};

layout(std430, binding = 0) buffer FragmentList {
    Fragment fragments[];
};

layout(binding = 0, r32ui) uniform uimage2D headPointers;
layout(binding = 1, rgba16f) uniform image2D outputImage;

uniform vec2 u_resolution;
uniform sampler2D u_bg;
uniform sampler2D u_bg;

// Liquid glass effect uniforms
uniform float u_refFactor;
uniform float u_refDispersion;
uniform float u_refThickness;

vec4 applyLiquidGlassEffects(vec4 fragmentColor, vec2 uv, float depth) {
    // Simplified liquid glass effects - integrate your full fragment-main.glsl logic here
    vec4 bgColor = texture(u_bg, uv);
    vec4 refractedColor = mix(bgColor, fragmentColor, fragmentColor.a);
    
    // Apply chromatic dispersion based on depth and refractive properties
    vec2 dispersionOffset = vec2(depth * 0.001) * u_refDispersion;
    vec4 dispersedR = texture(u_bg, uv + dispersionOffset * 1.02);
    vec4 dispersedG = texture(u_bg, uv);
    vec4 dispersedB = texture(u_bg, uv - dispersionOffset * 1.02);
    
    vec4 dispersedBg = vec4(dispersedR.r, dispersedG.g, dispersedB.b, 1.0);
    refractedColor = mix(dispersedBg, fragmentColor, fragmentColor.a);
    
    return refractedColor;
}

void main() {
    ivec2 pixelCoord = ivec2(gl_GlobalInvocationID.xy);
    if (pixelCoord.x >= int(u_resolution.x) || pixelCoord.y >= int(u_resolution.y)) {
        return;
    }
    
    vec2 uv = vec2(pixelCoord) / u_resolution;
    
    uint headIndex = imageLoad(headPointers, pixelCoord).r;
    
    vec4 finalColor = texture(u_bg, uv); // Start with background
    
    if (headIndex != 0xFFFFFFFFu) {
        // Composite fragments front to back (already sorted)
        uint currentIndex = headIndex;
        
        while (currentIndex != 0xFFFFFFFFu) {
            Fragment frag = fragments[currentIndex];
            
            // Apply liquid glass effects to fragment
            vec4 effectColor = applyLiquidGlassEffects(frag.color, uv, frag.depth);
            
            // Alpha composite (over operator)
            finalColor = effectColor + finalColor * (1.0 - effectColor.a);
            
            currentIndex = frag.next;
        }
    }
    
    imageStore(outputImage, pixelCoord, finalColor);
}
