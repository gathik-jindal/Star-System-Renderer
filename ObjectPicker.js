/**
 * Manages an off-screen framebuffer for object picking via color IDs.
 */
export class ObjectPicker {
    constructor(gl) {
        this.gl = gl;
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        // 1. Create the Framebuffer
        this.fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        // 2. Create the texture to render to
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

        // 3. Create a renderbuffer for depth testing
        this.depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);

        // 4. Check that it's all good
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("Framebuffer setup failed:", gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        }

        // 5. Unbind everything
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    /**
     * Renders the picking scene to the hidden framebuffer.
     * @param {object} programInfo - The shader program info.
     * @param {mat4} viewMatrix - The camera's view matrix.
     * @param {mat4} projectionMatrix - The camera's projection matrix.
     * @param {Array<GameObject>} sceneObjects - The list of pickable objects.
     */
    render(programInfo, viewMatrix, projectionMatrix, sceneObjects) {
        const gl = this.gl;

        // --- 1. Bind our FBO to draw to it ---
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.viewport(0, 0, this.width, this.height);

        // --- 2. Clear the FBO ---
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- 3. Use the main program ---
        gl.useProgram(programInfo.program);

        // --- 4. Set camera uniforms ---
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);

        // --- 5. Force all objects to be emissive (flat color) ---
        gl.uniform1i(programInfo.uniformLocations.isEmissive, 1);

        // --- 6. Draw each object with its ID as its color ---
        for (let i = 0; i < sceneObjects.length; i++) {
            const obj = sceneObjects[i];
            const id = i + 1; // ID 0 is reserved for "nothing"

            // Convert ID to an [R, G, B, A] color. 
            // We only use the Red channel for simplicity (max 255 objects).
            const idColor = [id / 255.0, 0.0, 0.0, 1.0];

            // Set the object's unique uniforms
            gl.uniform4fv(programInfo.uniformLocations.color, idColor);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, obj.modelMatrix);

            // --- 7. Manually draw the object ---
            // We have to do this ourselves, bypassing GameObject.draw() to set the uniforms.
            gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffers.position);
            gl.vertexAttribPointer(programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.position);

            gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffers.normal);
            gl.vertexAttribPointer(programInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.normal);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.buffers.indices);
            gl.drawElements(gl.TRIANGLES, obj.indicesCount, gl.UNSIGNED_SHORT, 0);
        }

        // --- 8. Unbind the FBO, return to drawing to the canvas ---
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    /**
     * Reads the pixel at the given canvas coordinates and returns the ID.
     * @param {number} x - Canvas X coordinate.
     * @param {number} y - Canvas Y coordinate (from top-left).
     * @returns {number} The ID of the object (0 for none).
     */
    pick(x, y) {
        const gl = this.gl;

        // --- 1. Bind the FBO to read from it ---
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        // --- 2. Read the 1x1 pixel ---
        const pixelData = new Uint8Array(4); // [R, G, B, A]
        gl.readPixels(
            x,                 // X
            this.height - y,   // Y (must be from bottom-left)
            1,                 // Width
            1,                 // Height
            gl.RGBA,           // Format
            gl.UNSIGNED_BYTE,  // Type
            pixelData          // Array to store data
        );

        // --- 3. Unbind the FBO ---
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // --- 4. The ID is the Red channel value ---
        const id = pixelData[0];
        return id;
    }

    // Call this if the canvas resizes
    resize() {
        const gl = this.gl;
        this.width = gl.canvas.width;
        this.height = gl.canvas.height;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
}