precision highp float;

uniform sampler2D u_shapeTexture;
uniform vec2 u_shapeTextureSize;
uniform int u_shapeCount;
uniform sampler2D u_bg;
uniform vec2 u_resolution;
uniform float u_dpr;

// Glass effect uniforms (some are shared, some specific)
uniform float u_refThickness;
uniform float u_refFactor;
uniform float u_refDispersion;
uniform float u_refFresnelRange;
uniform float u_refFresnelHardness;
uniform float u_refFresnelFactor;
uniform float u_glareRange;
uniform float u_glareHardness;
uniform float u_glareConvergence;
uniform float u_glareOppositeFactor;
uniform float u_glareFactor;
uniform float u_glareAngle;
uniform float u_mergeRatio;
uniform int STEP;

// Function to get shape data from texture
vec4 getShapeData(int index, int pixelIndex) {
    float x = (float(index * 3 + pixelIndex) + 0.5) / u_shapeTextureSize.x;
    return texture2D(u_shapeTexture, vec2(x, 0.5));
}

// SDF for a rounded box
float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Main SDF function to merge all shapes
float mainSDF(vec2 coord) {
    float d = 1e9;
    for (int i = 0; i < 20; i++) {
        if (i >= u_shapeCount) break;
        
        vec4 data1 = getShapeData(i, 0); // pos, size
        vec4 data2 = getShapeData(i, 1); // radius, roundness, zIndex, isHover
        
        vec2 pos = data1.xy;
        vec2 size = data1.zw;
        float radius = data2.x;
        float roundness = data2.y;

        float shapeSDF = sdRoundedBox(coord - pos, size / 2.0 - radius, radius);
        
        float s = u_mergeRatio;
        d = min(d, shapeSDF);
    }
    return d;
}

// Function to get normal for lighting/refraction effects
vec2 getNormal(vec2 p) {
    float d = 0.001;
    return normalize(vec2(
        mainSDF(p + vec2(d, 0)) - mainSDF(p - vec2(d, 0)),
        mainSDF(p + vec2(0, d)) - mainSDF(p - vec2(0, d)))
    );
}

// Function to get texture with chromatic dispersion
vec4 getTextureDispersion(sampler2D tex, vec2 offset, float dispersion) {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec4 r = texture2D(tex, uv + offset * (1.0 - dispersion));
    vec4 g = texture2D(tex, uv + offset);
    vec4 b = texture2D(tex, uv + offset * (1.0 + dispersion));
    return vec4(r.r, g.g, b.b, (r.a + g.a + b.a) / 3.0);
}

void main() {
    float merged = mainSDF(gl_FragCoord.xy);

    if (merged > 0.0) {
        discard;
    }

    // Find the front-most shape at this fragment
    float minSDF = 1e9;
    int frontShapeIndex = -1;
    for (int i = 0; i < 20; i++) {
        if (i >= u_shapeCount) break;
        
        vec4 data1 = getShapeData(i, 0); // pos, size
        vec4 data2 = getShapeData(i, 1); // radius, roundness, zIndex, isHover
        
        float shapeSDF = sdRoundedBox(gl_FragCoord.xy - data1.xy, data1.zw / 2.0 - data2.x, data2.x);
        
        if (shapeSDF < 0.0 && shapeSDF < minSDF) {
            minSDF = shapeSDF;
            frontShapeIndex = i;
        }
    }
    
    vec4 tint = vec4(1.0); // Default to white
    if (frontShapeIndex != -1) {
        vec4 data3 = getShapeData(frontShapeIndex, 2); // tint
        tint = data3;
    }

    // Calculate glass effects
    float nmerged = -1.0 * merged;
    float x_R_ratio = 1.0 - nmerged / u_refThickness;
    float thetaI = asin(pow(x_R_ratio, 2.0));
    float thetaT = asin(1.0 / u_refFactor * sin(thetaI));
    float edgeFactor = -1.0 * tan(thetaT - thetaI);
    if (nmerged >= u_refThickness) {
        edgeFactor = 0.0;
    }
    
    vec2 refractionOffset = vec2(0.0);
    if (edgeFactor > 0.0) {
        vec2 normal = getNormal(gl_FragCoord.xy);
        refractionOffset = -normal * edgeFactor * 0.05 * u_dpr;
    }
    
    vec4 blurredPixel = getTextureDispersion(u_bg, refractionOffset, u_refDispersion);
    
    float fresnelFactor = clamp(
        pow(
            1.0 + merged / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) + u_refFresnelHardness,
            5.0
        ),
        0.0, 1.0
    );
    
    vec3 finalColor = mix(blurredPixel.rgb, tint.rgb, tint.a);
    finalColor = mix(finalColor, vec3(1.0), fresnelFactor * u_refFresnelFactor);
    
    // Weighted Blended OIT
    float alpha = tint.a;
    gl_FragData[0] = vec4(finalColor * alpha, alpha); // Accumulation
    gl_FragData[1] = vec4(alpha); // Revealage
}
