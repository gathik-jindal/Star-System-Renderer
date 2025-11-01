import { GameObject } from './GameObject.js';

const { mat4, vec3 } = window;

export class StarSystem {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {object} programInfo
     * @param {object} models - An object with all your loaded models, e.g., { sphere, cone, ... }
     */
    constructor(gl, programInfo, models) {
        this.gl = gl;
        if (!mat4) {

        }
        this.programInfo = programInfo;
        this.models = models;

        // Arrays to hold our scene objects
        this.planets = [];
        this.axes = [];
        this.star = null;

        // Camera matrices
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();

        // Camera mode
        this.cameraMode = '3D';
        this.cameraYaw = -0.5; // Initial side-to-side angle
        this.cameraPitch = 1.0;  // Initial up-and-down angle
        this.cameraRadius = 25;  // Distance from the origin
        this.minCameraRadius = 5.0;  // Don't let user zoom inside the star
        this.maxCameraRadius = 100.0; // Don't let user zoom out too far
        this.zoomSensitivity = 0.1;  // Adjusts zoom speed

        // Timekeeping for animation
        this.lastTime = 0;

        this._setupScene();
    }

    /**
     * Sets the camera mode.
     * @param {'3D' | 'TOP'} mode - The camera mode to switch to.
     */
    setCameraMode(mode) {
        if (mode === '3D' || mode === 'TOP') this.cameraMode = mode;
        else console.log("Invalid camera mode:", mode);
    }

    /**
     * Creates all the initial GameObjects for the scene.
     */
    _setupScene() {
        const gl = this.gl;
        const info = this.programInfo;

        // --- Create the Star ---
        // The star is at the origin and stationary 
        // Color: Yellow
        this.star = new GameObject(gl, info, this.models.sphere, [1, 1, 0, 1], true); // Emissive = true
        // We can scale the star to be larger
        mat4.scale(this.star.modelMatrix, this.star.modelMatrix, vec3.fromValues(2.0, 2.0, 2.0));

        // --- Create Planets (at least 3) ---
        // We'll use two regular solids as required 

        // Planet 1: Icosphere
        const planet1 = new GameObject(gl, info, this.models.icosphere, [0.2, 0.8, 0.2, 1]); // Green
        // Set its initial position (orbit radius of 5 on the x-axis)
        mat4.translate(planet1.modelMatrix, planet1.modelMatrix, vec3.fromValues(5, 0, 0));

        // Planet 2: Monkey (a "regular solid" for this assignment)
        const planet2 = new GameObject(gl, info, this.models.monkey, [0.4, 0.4, 1, 1]); // Blue
        mat4.translate(planet2.modelMatrix, planet2.modelMatrix, vec3.fromValues(8, 0, 0)); // Orbit radius 8

        // Planet 3: Torus (another "regular solid")
        const planet3 = new GameObject(gl, info, this.models.torus, [0.7, 0.3, 0.7, 1]); // Purple
        mat4.translate(planet3.modelMatrix, planet3.modelMatrix, vec3.fromValues(11, 0, 0)); // Orbit radius 11
        // mat4.rotateX(planet3.modelMatrix, planet3.modelMatrix, Math.PI / 2); // Rotate torus to be flat

        this.planets.push(
            {
                planet: planet1,
                orbit: 5,
                orbitSpeed: 1,
                rotationSpeed: 3,
                totalOrbitAngle: 0,
                totalRotationAngle: 0
            },
            {
                planet: planet2,
                orbit: 8,
                orbitSpeed: 1.5,
                rotationSpeed: 4,
                totalOrbitAngle: 0,
                totalRotationAngle: 0
            },
            {
                planet: planet3,
                orbit: 11,
                orbitSpeed: 2,
                rotationSpeed: 5,
                totalOrbitAngle: 0,
                totalRotationAngle: 0
            }
        );

        const axisLength = 5.0;  // How long the axis lines are
        const axisRadius = 0.05; // How thick the lines are
        const coneRadius = 0.2;  // Size of the arrowhead
        const coneHeight = 0.4;  // Size of the arrowhead

        // We'll assume the cone/cylinder models are 1 unit high along the +Y axis
        // and have their base at (0,0,0).

        // --- Y-Axis (Green) ---
        const yAxisCyl = new GameObject(gl, info, this.models.cylinder, [0, 1, 0, 1]);
        mat4.scale(yAxisCyl.modelMatrix, yAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);

        const yAxisCone = new GameObject(gl, info, this.models.cone, [0, 1, 0, 1]);
        mat4.scale(yAxisCone.modelMatrix, yAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);
        mat4.translate(yAxisCone.modelMatrix, yAxisCone.modelMatrix, [0, axisLength, 0]); // Move to end of cylinder

        // --- X-Axis (Red) ---
        const xAxisCyl = new GameObject(gl, info, this.models.cylinder, [1, 0, 0, 1]);
        mat4.scale(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);
        mat4.rotateZ(xAxisCyl.modelMatrix, xAxisCyl.modelMatrix, -Math.PI / 2); // Rotate Y-axis to +X axis

        const xAxisCone = new GameObject(gl, info, this.models.cone, [1, 0, 0, 1]);
        mat4.scale(xAxisCone.modelMatrix, xAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);
        mat4.rotateZ(xAxisCone.modelMatrix, xAxisCone.modelMatrix, -Math.PI / 2);
        mat4.translate(xAxisCone.modelMatrix, xAxisCone.modelMatrix, [axisLength, 0, 0]);

        // --- Z-Axis (Blue) ---
        const zAxisCyl = new GameObject(gl, info, this.models.cylinder, [0, 0, 1, 1]);
        mat4.scale(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, [axisRadius, axisLength, axisRadius]);
        mat4.rotateX(zAxisCyl.modelMatrix, zAxisCyl.modelMatrix, Math.PI / 2); // Rotate Y-axis to +Z axis

        const zAxisCone = new GameObject(gl, info, this.models.cone, [0, 0, 1, 1]);
        mat4.scale(zAxisCone.modelMatrix, zAxisCone.modelMatrix, [coneRadius, coneHeight, coneRadius]);
        mat4.rotateX(zAxisCone.modelMatrix, zAxisCone.modelMatrix, Math.PI / 2);
        mat4.translate(zAxisCone.modelMatrix, zAxisCone.modelMatrix, [0, 0, axisLength]);

        this.axes.push(
            yAxisCyl, yAxisCone,
            xAxisCyl, xAxisCone,
            zAxisCyl, zAxisCone
        );
    }

    /**
     * Handles mouse movement for camera control.
     * @param {number} deltaX - Change in mouse X position.
     * @param {number} deltaY - Change in mouse Y position.
     */
    handleMouseMovement(deltaX, deltaY) {
        // This method is only active in 3D mode
        if (this.cameraMode !== '3D') {
            return;
        }

        const sensitivity = 0.01; // Adjust this to change mouse speed

        // Update the yaw and pitch
        this.cameraYaw -= deltaX * sensitivity;
        this.cameraPitch -= deltaY * sensitivity;

        // --- Clamp the pitch ---
        const minPitch = 0.1;
        const maxPitch = Math.PI / 2 - 0.1;
        this.cameraPitch = Math.max(minPitch, Math.min(maxPitch, this.cameraPitch));
    }

    /**
     * Handles mouse scroll for camera zoom.
     * @param {WheelEvent} event - The mouse wheel event.
     */
    handleMouseScroll(event) {
        // This method is only active in 3D mode
        if (this.cameraMode !== '3D') {
            return;
        }

        // event.deltaY is positive when scrolling down (zoom out)
        // and negative when scrolling up (zoom in)
        const delta = event.deltaY * this.zoomSensitivity;

        // Add the delta to the camera radius
        this.cameraRadius += delta;

        // --- Clamp the radius ---
        // Ensure the new radius is within our min/max bounds
        this.cameraRadius = Math.max(
            this.minCameraRadius,
            Math.min(this.maxCameraRadius, this.cameraRadius)
        );
    }

    /**
     * Starts the continuous render loop.
     */
    start() {
        // Use an arrow function to ensure 'this' is correctly bound
        const renderFrame = (time) => {
            this.render(time);
            requestAnimationFrame(renderFrame);
        };
        requestAnimationFrame(renderFrame);
    }

    /**
     * The main render loop function.
     * @param {number} time - The current time in milliseconds.
     */
    render(time) {
        const gl = this.gl;
        time *= 0.001; // Convert time to seconds
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        // 1. Update logic (animation)
        this._update(deltaTime);

        // 2. Draw scene
        // console.log("Drawing frame");
        this._draw();
    }

    /**
     * Updates animations and object states.
     * @param {number} deltaTime - Time since the last frame.
     */
    _update(deltaTime) {
        // We'll add planet revolution logic here later.
        // For now, let's just make the star spin
        mat4.rotateY(this.star.modelMatrix, this.star.modelMatrix, deltaTime * 0.2);

        for (const planetProp of this.planets) {
            // --- 1. Update Total Angles ---.
            planetProp.totalOrbitAngle += planetProp.orbitSpeed * deltaTime * 0.5;
            planetProp.totalRotationAngle += planetProp.rotationSpeed * deltaTime;

            // Get the planet's matrix
            const M = planetProp.planet.modelMatrix;

            // --- 2. Reset the Matrix ---
            mat4.identity(M);

            // --- 3. Apply Absolute Revolution (Orbit) ---
            mat4.rotateY(M, M, planetProp.totalOrbitAngle);
            mat4.translate(M, M, [planetProp.orbit, 0, 0]);

            // --- 4. Apply Local Rotation (Spin) ---
            mat4.rotateY(M, M, planetProp.totalRotationAngle);
        }
    }

    /**
     * Draws the entire scene.
     */
    _draw() {
        const gl = this.gl;
        const info = this.programInfo;

        // --- Clear the canvas ---
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- Set up the Camera (Projection and View) ---

        // 1. Projection Matrix (Field of View)
        const fieldOfView = 45 * Math.PI / 180; // 45 degrees FOV
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0;
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);

        // 2. View Matrix (Camera Position) - "3D View"
        if (this.cameraMode === '3D') {
            // --- "3D View" ---
            // Calculate camera position using spherical coordinates (yaw, pitch, radius)

            // X position = r * sin(pitch) * sin(yaw)
            const x = this.cameraRadius * Math.sin(this.cameraPitch) * Math.sin(this.cameraYaw);
            // Y position = r * cos(pitch)
            const y = this.cameraRadius * Math.cos(this.cameraPitch);
            // Z position = r * sin(pitch) * cos(yaw)
            const z = this.cameraRadius * Math.sin(this.cameraPitch) * Math.cos(this.cameraYaw);

            const cameraPosition = vec3.fromValues(x, y, z);
            const lookAtTarget = vec3.fromValues(0, 0, 0); // Always look at the origin
            const cameraUp = vec3.fromValues(0, 1, 0); // Y-axis is always "up"
            mat4.lookAt(this.viewMatrix, cameraPosition, lookAtTarget, cameraUp);
        } else {
            // --- "Top View" ---
            // Looking straight down the Y-axis from a distance
            const cameraPosition = vec3.fromValues(0, 25, 0);
            const lookAtTarget = vec3.fromValues(0, 0, 0);
            const cameraUp = vec3.fromValues(0, 0, -1);      // Makes the +Z axis point "down" the screen
            mat4.lookAt(this.viewMatrix, cameraPosition, lookAtTarget, cameraUp);
        }

        // --- Tell WebGL to use our shader program ---
        gl.useProgram(info.program);

        // --- Set Global Uniforms (same for all objects) ---
        gl.uniformMatrix4fv(
            info.uniformLocations.projectionMatrix,
            false,
            this.projectionMatrix
        );
        gl.uniformMatrix4fv(
            info.uniformLocations.viewMatrix,
            false,
            this.viewMatrix
        );

        // --- Draw all objects ---
        this.star.draw();

        for (const planetProp of this.planets) {
            planetProp.planet.draw();
        }

        // for (const axisPart of this.axes) {
        //     axisPart.draw();
        // }
    }
}