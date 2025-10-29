const { mat4 } = window;

export class GameObject {
    /**
     * Creates a new renderable object.
     * @param {WebGLRenderingContext} gl - The WebGL context.
     * @param {object} programInfo - Locations for shaders (attributes, uniforms).
     * @param {object} model - Parsed model data { positions, indices }.
     * @param {number[]} color - The RGBA color for this object (e.g., [1, 0, 0, 1] for red).
     */
    constructor(gl, programInfo, model, color) {
        this.gl = gl;
        this.programInfo = programInfo;
        this.color = color;
        this.indicesCount = model.indices.length;

        // Create and store the model matrix for this object.
        // It starts as an "identity" matrix (no transformation).
        this.modelMatrix = mat4.create();

        // Create and store the WebGL buffers.
        this.buffers = this._createBuffers(model);
    }

    /**
     * Private helper to create and load data into WebGL buffers.
     */
    _createBuffers(model) {
        const gl = this.gl;

        // --- Create Vertex Buffer Object (VBO) ---
        const positionBuffer = gl.createBuffer();
        // Bind the buffer as the "current" one
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        // Pass the vertex data to the buffer
        gl.bufferData(gl.ARRAY_BUFFER, model.positions, gl.STATIC_DRAW);

        // --- Create Index Buffer Object (IBO) ---
        const indexBuffer = gl.createBuffer();
        // Bind the buffer as the "current" one
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        // Pass the index data to the buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            indices: indexBuffer,
        };
    }

    /**
     * Draws the object to the screen.
     */
    draw() {
        const gl = this.gl;
        const info = this.programInfo;

        // --- 1. Set up attributes ---
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.vertexAttribPointer(
            info.attribLocations.position, // Attribute location
            3,         // Number of components per vertex (x, y, z)
            gl.FLOAT,  // Type of data
            false,     // Don't normalize
            0,         // Stride (0 = auto)
            0          // Offset (0 = auto)
        );
        gl.enableVertexAttribArray(info.attribLocations.position);

        // --- 2. Set up index buffer ---
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

        // --- 3. Set unique uniforms for this object ---

        // Set the model matrix
        gl.uniformMatrix4fv(
            info.uniformLocations.modelMatrix,
            false, // Don't transpose
            this.modelMatrix // The object's personal matrix
        );

        // Set the color
        gl.uniform4fv(
            info.uniformLocations.color,
            this.color
        );

        // --- 4. Draw the object ---
        gl.drawElements(
            gl.TRIANGLES,      // Draw triangles
            this.indicesCount, // Number of indices to draw
            gl.UNSIGNED_SHORT, // Type of the indices
            0                  // Offset
        );
    }
}