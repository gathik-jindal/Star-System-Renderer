export const orbitVertexShaderSource = `
    attribute vec4 a_Position;

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;

    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    }
`;

export const orbitFragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_Color;

    void main() {
        gl_FragColor = u_Color;
    }
`;