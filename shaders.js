export const vertexShaderSource = `
    // An attribute will receive data from a buffer
    attribute vec4 a_Position;

    // Uniforms are set in JavaScript and remain the same for all vertices
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;

    void main() {
        // to transform it from model space -> world space -> view space -> clip space.
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    }
`;

export const fragmentShaderSource = `
    // Set the precision for floating point numbers
    precision mediump float;

    // We'll set this color from our JavaScript code
    uniform vec4 u_Color;

    void main() {
        // Set the fragment (pixel) color
        gl_FragColor = u_Color;
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