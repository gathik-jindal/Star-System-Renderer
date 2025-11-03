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

        this.starRotation = quat.create();

        this.selectedObject = null;
        this.highlightColor = [1.0, 1.0, 1.0, 1.0]; // White
        this.originalColor = {}; // Store original color

        // Camera matrices
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();

        // Camera mode
        this.cameraMode = '3D';
        this.cameraOrientation = quat.create();
        quat.rotateX(this.cameraOrientation, this.cameraOrientation, -Math.PI / 4);
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

        // Clear selection when switching modes
        if (this.cameraMode === '3D') {
            this.setSelected(null);
        }
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
            orbitQuat: quat.create(),
            rotationQuat: quat.create(),
        });
    }

    /**
     * Returns a flat array of all pickable GameObject instances.
     */
    getPickableObjects() {
        // We only want to pick planets, not the star.
        return this.planets.map(p => p.planet);
    }

    /**
     * Sets the currently selected object and handles highlight color.
     * @param {GameObject | null} object - The object to select, or null to clear.
     */
    setSelected(object) {
        // 1. If there's an old selection, restore its color
        if (this.selectedObject) {
            // Find the *original* color we stored.
            // We use a Map to store { object: originalColor }
            const oldColor = this.originalColor[this.selectedObject.id]; // We need an ID...

            // Let's just store the color on the object itself before changing it.
            this.selectedObject.color = this.selectedObject.originalColor;
            delete this.selectedObject.originalColor;
        }

        // 2. Set the new selected object
        this.selectedObject = object;

        // 3. If it's a new, valid object, store its color and set highlight
        if (this.selectedObject) {
            // Store the original color *on the object*
            this.selectedObject.originalColor = [...this.selectedObject.color];
            // Set the highlight color
            this.selectedObject.color = this.highlightColor;
        }
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
                orbitQuat: quat.create(),
                rotationQuat: quat.create(),
            },
            {
                planet: planet2,
                orbit: 8,
                orbitSpeed: 1.5,
                rotationSpeed: 4,
                orbitQuat: quat.create(),
                rotationQuat: quat.create(),
            },
            {
                planet: planet3,
                orbit: 11,
                orbitSpeed: 2,
                rotationSpeed: 5,
                orbitQuat: quat.create(),
                rotationQuat: quat.create(),
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

        const sensitivity = 0.005;

        // Create rotations based on mouse movement
        const rotX = quat.create();
        const rotY = quat.create();

        // Rotation around the WORLD Y-axis (for left/right movement)
        quat.setAxisAngle(rotY, [0, 1, 0], -deltaX * sensitivity);

        // Rotation around the CAMERA's local X-axis (for up/down movement)
        quat.setAxisAngle(rotX, [1, 0, 0], -deltaY * sensitivity);

        // Combine the rotations: new_orientation = world_Y * old_orientation * local_X
        // This gives a nice "orbit" feel
        quat.multiply(this.cameraOrientation, rotY, this.cameraOrientation);
        quat.multiply(this.cameraOrientation, this.cameraOrientation, rotX);

        // Keep the quaternion normalized
        quat.normalize(this.cameraOrientation, this.cameraOrientation);
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
     * Changes a property of the currently selected planet.
     * @param {string} property - 'orbit', 'orbitSpeed', or 'rotationSpeed'.
     * @param {number} delta - The amount to change by (e.g., 0.1 or -0.1).
     */
    modifySelected(property, delta) {
        if (!this.selectedObject) {
            console.warn("No object selected.");
            return;
        }

        // Find the planetProp object that "owns" this.selectedObject
        const planetProp = this.planets.find(p => p.planet === this.selectedObject);
        if (!planetProp) {
            return;
        }

        switch (property) {
            case 'orbit':
                planetProp.orbit += delta;
                if (planetProp.orbit < 0) planetProp.orbit = 0;
                console.log(`New orbit: ${planetProp.orbit}`);
                break;
            case 'orbitSpeed':
                planetProp.orbitSpeed += delta;
                console.log(`New orbit speed: ${planetProp.orbitSpeed}`);
                break;
            case 'rotationSpeed':
                planetProp.rotationSpeed += delta;
                console.log(`New rotation speed: ${planetProp.rotationSpeed}`);
                break;
            default:
                console.warn(`Unknown property: ${property}`);
        }
    }

    /**
     * Deletes the currently selected planet.
     */
    deleteSelected() {
        if (!this.selectedObject) {
            console.warn("No object selected.");
            return;
        }

        // Per assignment, don't allow deletion if it brings count < 3 [cite: 63]
        if (this.planets.length <= 3) {
            console.warn("Cannot delete planet. Minimum 3 planets required.");
            return;
        }

        // Find and remove the planet
        this.planets = this.planets.filter(p => p.planet !== this.selectedObject);

        // Clear the selection
        this.selectedObject = null;
        console.log("Planet deleted.");
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
        // --- Update Star ---
        // 1. Create a delta rotation
        const starDelta = quat.create();
        quat.setAxisAngle(starDelta, [0, 1, 0], deltaTime * 0.2);
        // 2. Multiply with main rotation
        quat.multiply(this.starRotation, starDelta, this.starRotation);
        // 3. Rebuild model matrix from scratch (Quat -> Matrix)
        mat4.fromQuat(this.star.modelMatrix, this.starRotation);
        // 4. Apply scaling
        mat4.scale(this.star.modelMatrix, this.star.modelMatrix, [2.0, 2.0, 2.0]);


        // --- Update Planets ---
        for (const planetProp of this.planets) {
            // 1. Create delta rotations
            const orbitDelta = quat.create();
            const rotationDelta = quat.create();
            quat.setAxisAngle(orbitDelta, [0, 1, 0], planetProp.orbitSpeed * deltaTime * 0.5);
            quat.setAxisAngle(rotationDelta, [0, 1, 0], planetProp.rotationSpeed * deltaTime);

            // 2. Update main quaternions
            quat.multiply(planetProp.orbitQuat, orbitDelta, planetProp.orbitQuat);
            quat.multiply(planetProp.rotationQuat, rotationDelta, planetProp.rotationQuat);

            // 3. Rebuild model matrix from scratch
            const M = planetProp.planet.modelMatrix;
            const orbitMatrix = mat4.create();
            const rotationMatrix = mat4.create();
            const translationMatrix = mat4.create();

            // Convert quats to matrices
            mat4.fromQuat(orbitMatrix, planetProp.orbitQuat);
            mat4.fromQuat(rotationMatrix, planetProp.rotationQuat);

            // Create translation matrix
            mat4.fromTranslation(translationMatrix, [planetProp.orbit, 0, 0]);

            // Combine as M = Orbit * Translation * Rotation
            mat4.identity(M);
            mat4.multiply(M, M, orbitMatrix);
            mat4.multiply(M, M, translationMatrix);
            mat4.multiply(M, M, rotationMatrix);
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
            // --- Quaternion-based camera logic ---
            const cameraPosition = vec3.fromValues(0, 0, this.cameraRadius);
            const cameraUp = vec3.fromValues(0, 1, 0);

            // 1. Rotate the position vector by the camera's orientation
            vec3.transformQuat(cameraPosition, cameraPosition, this.cameraOrientation);

            // 2. Rotate the "up" vector by the same orientation
            vec3.transformQuat(cameraUp, cameraUp, this.cameraOrientation);

            // 3. Point the camera back at the origin from its new position
            const lookAtTarget = vec3.fromValues(0, 0, 0);
            mat4.lookAt(this.viewMatrix, cameraPosition, lookAtTarget, cameraUp);

        } else { // Top View
            const cameraPosition = vec3.fromValues(0, this.cameraRadius, 0);
            const lookAtTarget = vec3.fromValues(0, 0, 0);
            const cameraUp = vec3.fromValues(0, 0, -1); // Look "down"
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
