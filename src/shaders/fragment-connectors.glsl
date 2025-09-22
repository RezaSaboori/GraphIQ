#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform sampler2D u_previousLayer;
uniform int u_connectorCount;
uniform vec2 u_connectorPositions[100]; // Array of start and end points (2 points per connector)
uniform float u_connectorWeights[50];   // Weight for each connector
uniform vec3 u_connectorTints[50];      // Tint for each connector

// Function to calculate distance from a point to a line segment
float distanceToLineSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Function to draw an arrow
float arrow(vec2 p, vec2 a, vec2 b, float thickness) {
    float d = distanceToLineSegment(p, a, b);
    float line = smoothstep(thickness, thickness - 1.0, d);

    // Arrowhead
    vec2 dir = normalize(b - a);
    vec2 perp = vec2(-dir.y, dir.x);
    float arrowSize = thickness * 5.0;
    
    vec2 arrowP1 = b - dir * arrowSize;
    vec2 arrowP2 = b - dir * arrowSize + perp * arrowSize;
    vec2 arrowP3 = b - dir * arrowSize - perp * arrowSize;

    // Simplified barycentric check
    vec2 v0 = arrowP3 - arrowP1;
    vec2 v1 = arrowP2 - arrowP1;
    vec2 v2 = p - arrowP1;

    float dot00 = dot(v0, v0);
    float dot01 = dot(v0, v1);
    float dot02 = dot(v0, v2);
    float dot11 = dot(v1, v1);
    float dot12 = dot(v1, v2);

    float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
    float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    float v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    
    float in_triangle = (u >= 0.0 && v >= 0.0 && (u + v) < 1.0) ? 1.0 : 0.0;

    return max(line, in_triangle);
}

void main() {
    vec2 st = gl_FragCoord.xy;
    // Invert Y for correct screen coordinates
    st.y = u_resolution.y - st.y;
    vec3 color = vec3(0.0);
    float alpha = 0.0;
    
    vec4 baseColor = texture(u_previousLayer, v_uv);

    for (int i = 0; i < u_connectorCount; i++) {
        vec2 p1 = u_connectorPositions[i * 2];
        vec2 p2 = u_connectorPositions[i * 2 + 1];
        float weight = u_connectorWeights[i];
        vec3 tint = u_connectorTints[i];

        float arrowShape = arrow(st, p1, p2, weight);
        if (arrowShape > 0.0) {
            color = tint;
            alpha = max(alpha, arrowShape);
        }
    }

    fragColor = mix(baseColor, vec4(color, 1.0), alpha);
}
