#version 310 es
layout(local_size_x = 16, local_size_y = 16) in;

// Fragment storage
struct Fragment {
    vec4 color;
    float depth;
    uint next;
};

layout(std430, binding = 0) buffer FragmentList {
    Fragment fragments[];
};

layout(binding = 0, offset = 0) uniform atomic_uint fragmentCounter;
layout(binding = 0, r32ui) uniform uimage2D headPointers;

uniform vec2 u_resolution;
uniform int u_shapeCount;
uniform vec2 u_shapePositions[50];  // Increased from 20
uniform vec2 u_shapeSizes[50];
uniform float u_shapeRadii[50];
uniform float u_shapeRoundnesses[50];
uniform float u_shapeVisibilities[50];
uniform float u_shapeZIndices[50];
uniform vec4 u_shapeTints[50];

// Your existing SDF functions
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {
    // Your existing implementation
    p -= center;
    vec2 d = abs(p) - vec2(width, height) * 0.5;
    float cornerR = cornerRadius;
    
    if (d.x > -cornerR && d.y > -cornerR) {
        vec2 cornerCenter = sign(p) * (vec2(width, height) * 0.5 - vec2(cornerR));
        vec2 cornerP = p - cornerCenter;
        return length(max(abs(cornerP) - vec2(cornerR), 0.0)) + min(max(abs(cornerP).x - cornerR, abs(cornerP).y - cornerR), 0.0);
    } else {
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }
}

float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * (1.0 / 4.0);
}

vec4 calculateLiquidGlassColor(vec2 fragCoord, int shapeIndex) {
    // Extract liquid glass properties for this shape
    vec4 tint = u_shapeTints[shapeIndex];
    float zIndex = u_shapeZIndices[shapeIndex];
    
    // Apply your existing liquid glass effects here
    // This is a simplified version - use your full fragment-main.glsl logic
    return vec4(tint.rgb, tint.a);
}

void main() {
    ivec2 pixelCoord = ivec2(gl_GlobalInvocationID.xy);
    if (pixelCoord.x >= int(u_resolution.x) || pixelCoord.y >= int(u_resolution.y)) {
        return;
    }
    
    vec2 fragCoord = vec2(pixelCoord) + vec2(0.5);
    
    // Test each shape for intersection
    for (int i = 0; i < u_shapeCount && i < 50; i++) {
        if (u_shapeVisibilities[i] < 0.5) continue;
        
        // Convert shape position to normalized coordinates
        vec2 shapePos = (u_shapePositions[i] - u_resolution * 0.5) / u_resolution.y;
        vec2 shapeSize = u_shapeSizes[i] / u_resolution.y;
        float shapeRadius = (u_shapeRadii[i] / 100.0) * min(shapeSize.x, shapeSize.y) * 0.5;
        float shapeRoundness = u_shapeRoundnesses[i];
        
        vec2 pn = shapePos + fragCoord / u_resolution.y;
        
        float dist = roundedRectSDF(
            pn,
            vec2(0.0),
            shapeSize.x,
            shapeSize.y,
            shapeRadius,
            shapeRoundness
        );
        
        // If fragment is inside shape
        if (dist < 0.0) {
            // Calculate depth (z-index + sub-pixel depth for proper sorting)
            float depth = u_shapeZIndices[i] + (-dist * 0.001); // Fine depth within z-index
            
            // Calculate fragment color with liquid glass effects
            vec4 color = calculateLiquidGlassColor(fragCoord, i);
            
            // Allocate fragment
            uint fragmentIndex = atomicCounterIncrement(fragmentCounter);
            
            // Store fragment data
            fragments[fragmentIndex].color = color;
            fragments[fragmentIndex].depth = depth;
            
            // Insert into per-pixel linked list
            uint oldHead = imageAtomicExchange(headPointers, pixelCoord, fragmentIndex);
            fragments[fragmentIndex].next = oldHead;
        }
    }
}
