export const vertexShaderSource = `
    attribute vec4 a_Position;
    attribute vec3 a_Normal; // <-- ADDED: The normal vector from the model

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;

    varying vec3 v_Normal; // <-- ADDED: Pass normal to fragment shader
    varying vec3 v_WorldPosition; // <-- ADDED: Pass world pos to fragment shader

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
    uniform bool u_isEmissive; // <-- ADD THIS

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

/**
 * Compiles a shader from source.
 * @param {WebGLRenderingContext} gl - The WebGL context.
 * @param {number} type - The shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
 * @param {string} source - The GLSL source code.
 * @returns {WebGLShader} The compiled shader.
 */
function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * Creates and links a shader program.
 * @param {WebGLRenderingContext} gl - The WebGL context.
 * @param {WebGLShader} vertexShader - The compiled vertex shader.
 * @param {WebGLShader} fragmentShader - The compiled fragment shader.
 * @returns {WebGLProgram} The linked shader program.
 */
function createShaderProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

export { compileShader, createShaderProgram };