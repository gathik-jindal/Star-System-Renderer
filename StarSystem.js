import { GameObject } from './GameObject.js';

export class StarSystem {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {object} programInfo
     * @param {object} models - An object with all your loaded models, e.g., { sphere, cone, ... }
     */
    constructor(gl, programInfo, models) {
        this.gl = gl;
        if (!mat4) {
            console.error("gl-matrix not loaded!");
        }
        this.programInfo = programInfo;
        this.models = models;

        // Arrays to hold our scene objects
        this.planets = [];
        this.axes = [];
        this.star = null;
        this.gizmo = null;

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
     * Adds a new model to the scene.
     * @param {object} model Object model to add
     * @param {object} color Color that should be applied
     * @param {Number} orbit Radius of orbit
     * @param {Number} orbitSpeed Speed of revolution
     * @param {Number} rotationSpeed Speed of rotation
     * @param {Boolean} isEmissive Is luminous?
     */
    addModel(model, color, orbit = 10, orbitSpeed = 1, rotationSpeed = 1, isEmissive = false) {
        let gameObject = new GameObject(this.gl, this.programInfo, model, color, isEmissive);
        this.planets.push({
            planet: gameObject,
            orbit: orbit,
            orbitSpeed: orbitSpeed,
            rotationSpeed: rotationSpeed,
            totalOrbitAngle: 0,
            totalRotationAngle: 0
        });
    }

    /**
     * Creates all the initial GameObjects for the scene.
     */
    _setupScene() {
        const gl = this.gl;
        const info = this.programInfo;

        // --- Create the Star ---
        this.star = new GameObject(gl, info, this.models.sphere, [1, 1, 0, 1], true); // Emissive = true
        mat4.scale(this.star.modelMatrix, this.star.modelMatrix, vec3.fromValues(2.0, 2.0, 2.0));

        // --- Create Planets (at least 3) ---
        const planet1 = new GameObject(gl, info, this.models.icosphere, [0.2, 0.8, 0.2, 1]); // Green
        mat4.translate(planet1.modelMatrix, planet1.modelMatrix, vec3.fromValues(5, 0, 0));
        const planet2 = new GameObject(gl, info, this.models.monkey, [0.4, 0.4, 1, 1]); // Blue
        mat4.translate(planet2.modelMatrix, planet2.modelMatrix, vec3.fromValues(8, 0, 0)); // Orbit radius 8
        const planet3 = new GameObject(gl, info, this.models.torus, [0.7, 0.3, 0.7, 1]); // Purple
        mat4.translate(planet3.modelMatrix, planet3.modelMatrix, vec3.fromValues(11, 0, 0)); // Orbit radius 11

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
    }

    /**
     * Handles mouse movement for camera control.
     * @param {number} deltaX - Change in mouse X position.
     * @param {number} deltaY - Change in mouse Y position.
     */
    handleMouseMovement(deltaX, deltaY) {
        if (this.cameraMode !== '3D') {
            return;
        }
        const sensitivity = 0.01;
        this.cameraYaw -= deltaX * sensitivity;
        this.cameraPitch -= deltaY * sensitivity;
        const minPitch = 0.0002;
        const maxPitch = Math.PI / 2;
        this.cameraPitch = Math.max(minPitch, Math.min(maxPitch, this.cameraPitch));
    }

    /**
     * Handles mouse scroll for camera zoom.
     * @param {WheelEvent} event - The mouse wheel event.
     */
    handleMouseScroll(event) {
        const delta = event.deltaY * this.zoomSensitivity;
        this.cameraRadius += delta;
        this.cameraRadius = Math.max(
            this.minCameraRadius,
            Math.min(this.maxCameraRadius, this.cameraRadius)
        );
    }

    /**
     * Starts the continuous render loop.
     * @param {GizmoRenderer | null} gizmoRenderer - The gizmo renderer to update.
     */
    start(gizmoRenderer = null) { // --- PARAMETER ADDED ---
        this.gizmo = gizmoRenderer; // --- STORED ---

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

        // 2. Draw main scene
        this._draw();

        // 3. Draw the gizmo
        if (this.gizmo) {
            this.gizmo.render(this.viewMatrix); // Pass the main camera's matrix
        }
    }

    /**
     * Updates animations and object states.
     * @param {number} deltaTime - Time since the last frame.
     */
    _update(deltaTime) {
        mat4.rotateY(this.star.modelMatrix, this.star.modelMatrix, deltaTime * 0.2);

        for (const planetProp of this.planets) {
            planetProp.totalOrbitAngle += planetProp.orbitSpeed * deltaTime * 0.5;
            planetProp.totalRotationAngle += planetProp.rotationSpeed * deltaTime;
            const M = planetProp.planet.modelMatrix;
            mat4.identity(M);
            mat4.rotateY(M, M, planetProp.totalOrbitAngle);
            mat4.translate(M, M, [planetProp.orbit, 0, 0]);
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
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0;
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);

        if (this.cameraMode === '3D') {
            const x = this.cameraRadius * Math.sin(this.cameraPitch) * Math.sin(this.cameraYaw);
            const y = this.cameraRadius * Math.cos(this.cameraPitch);
            const z = this.cameraRadius * Math.sin(this.cameraPitch) * Math.cos(this.cameraYaw);
            const cameraPosition = vec3.fromValues(x, y, z);
            const lookAtTarget = vec3.fromValues(0, 0, 0);
            const cameraUp = vec3.fromValues(0, 1, 0);
            mat4.lookAt(this.viewMatrix, cameraPosition, lookAtTarget, cameraUp);
        } else {
            const cameraPosition = vec3.fromValues(0, this.cameraRadius, 0);
            const lookAtTarget = vec3.fromValues(0, 0, 0);
            const cameraUp = vec3.fromValues(0, 0, -1);
            mat4.lookAt(this.viewMatrix, cameraPosition, lookAtTarget, cameraUp);
        }

        // --- Tell WebGL to use our shader program ---
        gl.useProgram(info.program);

        // --- Set Global Uniforms (same for all objects) ---
        gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        gl.uniformMatrix4fv(info.uniformLocations.viewMatrix, false, this.viewMatrix);

        // --- Draw all objects ---
        this.star.draw();

        for (const planetProp of this.planets) {
            planetProp.planet.draw();
        }
    }
}
