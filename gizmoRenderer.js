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

        // This is the gizmo's static camera position (distance and 'lens')
        this.baseViewMatrix = mat4.create();
        mat4.lookAt(this.baseViewMatrix, [0, 0, 5], [0, 0, 0], [0, 1, 0]);

        // This matrix will be updated every frame
        this.gizmoViewMatrix = mat4.create();

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
        const axisLength = this.scale * 1.0;
        const axisRadius = this.scale * 0.05;
        const coneRadius = this.scale * 0.2;
        const coneHeight = this.scale * 0.3;

        // --- Y-Axis (Green) ---
        const yAxisCyl = new GameObject(gl, info, models.cylinder, [0, 1, 0, 1], true);
        mat4.translate(yAxisCyl.modelMatrix, yAxisCyl.modelMatrix, [0, axisLength / 2, 0]);
        mat4.scale(yAxisCyl.modelMatrix, yAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);

        const yAxisCone = new GameObject(gl, info, models.cone, [0, 1, 0, 1], true);
        mat4.translate(yAxisCone.modelMatrix, yAxisCone.modelMatrix, [0, axisLength, 0]);
        mat4.scale(yAxisCone.modelMatrix, yAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);

        // --- X-Axis (Red) ---
        const xAxisCyl = new GameObject(gl, info, models.cylinder, [1, 0, 0, 1], true);
        mat4.translate(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, [axisLength / 2, 0, 0]);
        mat4.rotateZ(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, -Math.PI / 2);
        mat4.scale(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);

        const xAxisCone = new GameObject(gl, info, models.cone, [1, 0, 0, 1], true);
        mat4.translate(xAxisCone.modelMatrix, xAxisCone.modelMatrix, [axisLength, 0, 0]);
        mat4.rotateZ(xAxisCone.modelMatrix, xAxisCone.modelMatrix, -Math.PI / 2);
        mat4.scale(xAxisCone.modelMatrix, xAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);

        // --- Z-Axis (Blue) ---
        const zAxisCyl = new GameObject(gl, info, models.cylinder, [0, 0, 1, 1], true);
        mat4.translate(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, [0, 0, axisLength / 2]);
        mat4.rotateX(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, Math.PI / 2);
        mat4.scale(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);

        const zAxisCone = new GameObject(gl, info, models.cone, [0, 0, 1, 1], true);
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
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- Use the shader program ---
        gl.useProgram(info.program);

        // --- Get just the rotation from the main camera's view matrix ---
        const mainCameraRotation = mat4.create();
        mat4.copy(mainCameraRotation, mainCameraViewMatrix);

        // Remove the translation part by zeroing the 4th column
        mainCameraRotation[12] = 0;
        mainCameraRotation[13] = 0;
        mainCameraRotation[14] = 0;

        // --- Create the final gizmo view matrix ---
        // M_final_view = M_gizmo_base_cam * M_main_cam_rotation
        // This applies the main camera's rotation to the gizmo's camera
        mat4.multiply(this.gizmoViewMatrix, this.baseViewMatrix, mainCameraRotation);

        // --- Set Camera Uniforms ---
        gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        // Use the DYNAMIC matrix we just calculated
        gl.uniformMatrix4fv(info.uniformLocations.viewMatrix, false, this.gizmoViewMatrix);

        // --- Draw all 6 axis parts ---
        for (const axisPart of this.axes) {
            // Draw the object. It will use its own internal, static modelMatrix.
            // We are no longer passing an override.
            axisPart.draw();
        }
    }
}