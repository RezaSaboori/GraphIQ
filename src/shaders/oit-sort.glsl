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

uniform vec2 u_resolution;
uniform int u_maxFragments;

// Insertion sort for small arrays (most efficient for 16 or fewer elements)
void sortFragments(uint indices[16], float depths[16], int count) {
    for (int i = 1; i < count; i++) {
        uint keyIndex = indices[i];
        float keyDepth = depths[i];
        int j = i - 1;
        
        while (j >= 0 && depths[j] > keyDepth) {
            indices[j + 1] = indices[j];
            depths[j + 1] = depths[j];
            j--;
        }
        
        indices[j + 1] = keyIndex;
        depths[j + 1] = keyDepth;
    }
}

void main() {
    ivec2 pixelCoord = ivec2(gl_GlobalInvocationID.xy);
    if (pixelCoord.x >= int(u_resolution.x) || pixelCoord.y >= int(u_resolution.y)) {
        return;
    }
    
    uint headIndex = imageLoad(headPointers, pixelCoord).r;
    if (headIndex == 0xFFFFFFFFu) {
        return; // No fragments at this pixel
    }
    
    // Gather fragments for this pixel
    uint fragmentIndices[16];
    float fragmentDepths[16];
    int fragmentCount = 0;
    
    uint currentIndex = headIndex;
    while (currentIndex != 0xFFFFFFFFu && fragmentCount < u_maxFragments) {
        fragmentIndices[fragmentCount] = currentIndex;
        fragmentDepths[fragmentCount] = fragments[currentIndex].depth;
        fragmentCount++;
        currentIndex = fragments[currentIndex].next;
    }
    
    if (fragmentCount > 1) {
        // Sort fragments by depth (front to back)
        sortFragments(fragmentIndices, fragmentDepths, fragmentCount);
        
        // Rebuild linked list in sorted order
        if (fragmentCount > 0) {
            imageStore(headPointers, pixelCoord, uvec4(fragmentIndices[0]));
            
            for (int i = 0; i < fragmentCount - 1; i++) {
                fragments[fragmentIndices[i]].next = fragmentIndices[i + 1];
            }
            fragments[fragmentIndices[fragmentCount - 1]].next = 0xFFFFFFFFu;
        }
    }
}
