export const vertexShaderSource = `
    attribute vec4 a_Position;
    attribute vec3 a_Normal;

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;

    varying vec3 v_Normal;
    varying vec3 v_WorldPosition;

    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
        
        // Pass the world-space position to the fragment shader
        v_WorldPosition = (u_ModelMatrix * a_Position).xyz;

        // Transform the normal into world space and pass it on.
        // We use mat3(u_ModelMatrix) to only get rotation, not translation.
        v_Normal = mat3(u_ModelMatrix) * a_Normal;
    }
`;

export const fragmentShaderSource = `
    precision mediump float;

    uniform vec4 u_Color;
    uniform vec3 u_LightPosition;
    uniform bool u_isEmissive;

    varying vec3 v_Normal;
    varying vec3 v_WorldPosition;

    void main() {
        if (u_isEmissive) {
            // --- This is the star ---
            // Just draw its full, bright color and ignore lighting
            gl_FragColor = u_Color;
        } else {
            // --- This is a planet (or other object) ---
            // 1. Calculate direction from this fragment to the light
            vec3 lightDirection = normalize(u_LightPosition - v_WorldPosition);
            
            // 2. Normalize the surface normal
            vec3 normal = normalize(v_Normal);
            
            // 3. Calculate the diffuse factor
            float diffuse = max(dot(normal, lightDirection), 0.0);
            
            // 4. Add a little ambient light
            float ambient = 0.2;
            
            // 5. Combine and apply
            vec3 finalColor = u_Color.rgb * (ambient + diffuse);
            gl_FragColor = vec4(finalColor, u_Color.a);
        }
    }
`;