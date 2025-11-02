import { GameObject } from './GameObject.js';

/**
 * Manages the rendering of the 3D axis gizmo in a separate canvas.
 */
export class GizmoRenderer {
    /**
     * @param {WebGLRenderingContext} gl - The WebGL context for the GIZMO canvas.
     * @param {object} programInfo - The shader program info.
     * @param {object} models - An object containing { cone, cylinder } models.
     */
    constructor(gl, programInfo, models) {
        this.gl = gl;
        this.programInfo = programInfo;
        this.models = models;

        this.axes = [];
        this.scale = 2.0;

        // --- Setup Static Gizmo "Camera" ---
        this.projectionMatrix = mat4.create();
        // Orthographic camera, 5 units wide/high
        mat4.ortho(this.projectionMatrix, -2.5, 2.5, -2.5, 2.5, 0.1, 100);

        this.viewMatrix = mat4.create();
        // A static camera looking at the origin from 5 units away
        mat4.lookAt(this.viewMatrix, [0, 0, 5], [0, 0, 0], [0, 1, 0]);

        // --- Setup Gizmo GL Context ---
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent background

        // --- Setup the 6 axis objects ---
        this._setupScene(gl, programInfo, models);
    }

    /**
     * Creates the 6 GameObjects for the X, Y, Z axes.
     */
    _setupScene(gl, info, models) {
        // --- (NEW) AXES CODE ---
        const axisLength = this.scale * 1.0;  // How long the axis lines are
        const axisRadius = this.scale * 0.05; // How thick the lines are
        const coneRadius = this.scale * 0.2;  // Size of the arrowhead
        const coneHeight = this.scale * 0.3;  // Size of the arrowhead

        // --- Y-Axis (Green) ---
        const yAxisCyl = new GameObject(gl, info, models.cylinder, [0, 1, 0, 1]);
        mat4.translate(yAxisCyl.modelMatrix, yAxisCyl.modelMatrix, [0, axisLength / 2, 0]);
        mat4.scale(yAxisCyl.modelMatrix, yAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);

        const yAxisCone = new GameObject(gl, info, models.cone, [0, 1, 0, 1]);
        mat4.translate(yAxisCone.modelMatrix, yAxisCone.modelMatrix, [0, axisLength, 0]);
        mat4.scale(yAxisCone.modelMatrix, yAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);

        // --- X-Axis (Red) ---
        const xAxisCyl = new GameObject(gl, info, models.cylinder, [1, 0, 0, 1]);
        mat4.translate(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, [axisLength / 2, 0, 0]);
        mat4.rotateZ(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, -Math.PI / 2);
        mat4.scale(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);

        const xAxisCone = new GameObject(gl, info, models.cone, [1, 0, 0, 1]);
        mat4.translate(xAxisCone.modelMatrix, xAxisCone.modelMatrix, [axisLength, 0, 0]);
        mat4.rotateZ(xAxisCone.modelMatrix, xAxisCone.modelMatrix, -Math.PI / 2);
        mat4.scale(xAxisCone.modelMatrix, xAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);

        // --- Z-Axis (Blue) ---
        const zAxisCyl = new GameObject(gl, info, models.cylinder, [0, 0, 1, 1]);
        mat4.translate(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, [0, 0, axisLength / 2]);
        mat4.rotateX(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, Math.PI / 2);
        mat4.scale(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);

        const zAxisCone = new GameObject(gl, info, models.cone, [0, 0, 1, 1]);
        mat4.translate(zAxisCone.modelMatrix, zAxisCone.modelMatrix, [0, 0, axisLength]);
        mat4.rotateX(zAxisCone.modelMatrix, zAxisCone.modelMatrix, Math.PI / 2);
        mat4.scale(zAxisCone.modelMatrix, zAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);

        this.axes.push(
            yAxisCyl, yAxisCone,
            xAxisCyl, xAxisCone,
            zAxisCyl, zAxisCone
        );
    }

    /**
     * Renders the gizmo.
     * @param {mat4} mainCameraViewMatrix - The view matrix from the main scene's camera.
     */
    render(mainCameraViewMatrix) {
        const gl = this.gl;
        const info = this.programInfo;

        // --- Clear the gizmo canvas ---
        // We also clear the DEPTH buffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- Use the shader program ---
        gl.useProgram(info.program);

        // --- Set Static Camera Uniforms ---
        gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        gl.uniformMatrix4fv(info.uniformLocations.viewMatrix, false, this.viewMatrix);

        // --- Create the Rotation Matrix ---
        // 1. Copy the main camera's view matrix
        const rotationMatrix = mat4.create();
        mat4.copy(rotationMatrix, mainCameraViewMatrix);

        // 2. Remove the translation part (bottom row)
        rotationMatrix[12] = 0;
        rotationMatrix[13] = 0;
        rotationMatrix[14] = 0;

        // 3. Get the inverse of this rotation (for a rotation matrix, inverse = transpose)
        // This makes the gizmo rotate *with* the camera
        mat4.transpose(rotationMatrix, rotationMatrix);

        // --- Draw all 6 axis parts ---
        for (const axisPart of this.axes) {
            // Create a final matrix for this part: M_final = M_rotation * M_baseTransform
            const finalMatrix = mat4.create();
            mat4.multiply(finalMatrix, rotationMatrix, axisPart.modelMatrix);

            // Draw the object, passing in our calculated matrix
            axisPart.draw(finalMatrix);
        }
    }
}
