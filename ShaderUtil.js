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

/**
 * Creates a complete shader program with attribute and uniform locations.
 * @param {WebGLRenderingContext} gl - The WebGL context.
 * @param {string} vsSource - Vertex shader source.
 * @param {string} fsSource - Fragment shader source.
 * @returns {object} { program, attribLocations, uniformLocations }
 */
export function createProgramInfo(gl, vsSource, fsSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return null;

    const program = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!program) return null;

    // --- Auto-find all attributes and uniforms ---
    const attribLocations = {};
    const attribCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attribCount; i++) {
        const attribInfo = gl.getActiveAttrib(program, i);
        attribLocations[attribInfo.name] = gl.getAttribLocation(program, attribInfo.name);
    }

    const uniformLocations = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        const uniformInfo = gl.getActiveUniform(program, i);
        // Handle array uniforms (e.g., "u_Lights[0]")
        const name = uniformInfo.name.replace(/\[0\]$/, '');
        uniformLocations[name] = gl.getUniformLocation(program, name);
    }

    return {
        program: program,
        attribLocations: attribLocations,
        uniformLocations: uniformLocations
    };
}