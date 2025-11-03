/**
 * Manages rendering the elliptical orbit paths.
 */
export class OrbitRenderer {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {object} programInfo - The SHADER program info for the orbits
     */
    constructor(gl, programInfo) {
        this.gl = gl;
        this.programInfo = programInfo;
        this.orbits = []; // Will store { buffer, vertexCount, color, modelMatrix }
    }

    /**
     * Creates and stores a new orbit mesh.
     * @param {number} a - Semi-major axis (x-radius)
     * @param {number} b - Semi-minor axis (z-radius)
     * @param {number[]} color - [r, g, b] color
     * @returns {object} A reference to the created orbit object
     */
    addOrbit(a, b, color) {
        const gl = this.gl;
        const vertices = [];
        const segments = 100; // Number of line segments for the ellipse

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const x = a * Math.cos(angle);
            const z = b * Math.sin(angle);
            vertices.push(x, 0, z);
        }

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        const orbit = {
            buffer: buffer,
            vertexCount: segments + 1,
            color: [...color, 1.0], // Add alpha
            modelMatrix: mat4.create() // Identity matrix
        };

        this.orbits.push(orbit);
        return orbit;
    }

    /**
     * Removes an orbit from the renderer.
     * @param {object} orbit - The orbit object to remove
     */
    removeOrbit(orbit) {
        if (!orbit) return;
        this.gl.deleteBuffer(orbit.buffer);
        this.orbits = this.orbits.filter(o => o !== orbit);
    }

    /**
     * Draws all stored orbits.
     * @param {mat4} viewMatrix - The camera's view matrix
     * @param {mat4} projectionMatrix - The camera's projection matrix
     */
    draw(viewMatrix, projectionMatrix) {
        const gl = this.gl;
        const info = this.programInfo;

        gl.useProgram(info.program);

        // Set camera uniforms
        gl.uniformMatrix4fv(info.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, projectionMatrix);

        for (const orbit of this.orbits) {
            // Set orbit-specific uniforms
            gl.uniform4fv(info.uniformLocations.color, orbit.color);
            gl.uniformMatrix4fv(info.uniformLocations.modelMatrix, false, orbit.modelMatrix);

            // Bind buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, orbit.buffer);
            gl.vertexAttribPointer(info.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(info.attribLocations.position);

            // Draw the lines
            gl.drawArrays(gl.LINE_LOOP, 0, orbit.vertexCount);
        }
    }
}