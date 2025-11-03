import { GameObject } from './GameObject.js';

const { mat4, vec3, quat } = window;

export class StarSystem {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {object} programInfo
     * @param {object} models
     * @param {OrbitRenderer} orbitRenderer - the orbit renderer
     */
    constructor(gl, programInfo, models, orbitRenderer) {
        this.gl = gl;
        if (!mat4) {
            console.error("gl-matrix not loaded!");
        }
        this.programInfo = programInfo;
        this.models = models;
        this.orbitRenderer = orbitRenderer;

        // Arrays to hold our scene objects
        this.planets = [];
        this.star = null;
        this.gizmo = null;
        this.starRotation = quat.create();

        // --- State for animation ---
        this.isRevolving = true; // Automatic revolution is ON
        this.isRotating = true; // Manual rotation mode is ON

        this.selectedObject = null;
        this.highlightColor = [1.0, 1.0, 1.0, 1.0]; // White

        // Camera matrices
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();

        // Camera state
        this.cameraMode = '3D';
        this.cameraOrientation = quat.create();
        quat.rotateX(this.cameraOrientation, this.cameraOrientation, -Math.PI / 4);
        this.cameraRadius = 25;
        this.minCameraRadius = 5.0;
        this.maxCameraRadius = 100.0;
        this.zoomSensitivity = 0.1;

        // Timekeeping
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
     * @param {number[]} color Color that should be applied [r, g, b]
     * @param {Boolean} isEmissive Is luminous?
     */
    addModel(model, color, isEmissive = false) {
        // Find the largest current radii to avoid collision
        let maxA = 0;
        let maxB = 0;
        this.planets.forEach(p => {
            if (p.orbitA > maxA) maxA = p.orbitA;
            if (p.orbitB > maxB) maxB = p.orbitB;
        });

        // Create new, larger, non-overlapping radii
        const newA = maxA + (Math.random() * 1.5 + 1.5); // Add 1.5 to 3.0
        const newB = maxB + (Math.random() * 1.5 + 1.5); // Add 1.5 to 3.0

        // Create the orbit mesh
        const orbitMesh = this.orbitRenderer.addOrbit(newA, newB, color);

        let gameObject = new GameObject(this.gl, this.programInfo, model, [...color, 1.0], isEmissive);

        this.planets.push({
            planet: gameObject,
            orbitA: newA, // Store new ellipse radius
            orbitB: newB, // Store new ellipse radius
            orbitSpeed: 0.5 + Math.random(),
            rotationSpeed: 1.0 + Math.random() * 4,
            orbitAngle: Math.random() * Math.PI * 2, // Start at random angle
            rotationQuat: quat.create(),
            orbitMesh: orbitMesh, // Store reference to the orbit line
            baseScale: 1.0,
            tempScale: 1.0
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
        this.star = new GameObject(gl, info, this.models.sphere, [1, 1, 0, 1], true);

        // --- Create Planets (at least 3) ---
        const planetData = [
            { model: this.models.icosphere, color: [0.2, 0.8, 0.2], orbitA: 5, orbitB: 4.5, orbitSpeed: 1, rotationSpeed: 3 },
            { model: this.models.monkey, color: [0.4, 0.4, 1], orbitA: 8, orbitB: 9, orbitSpeed: 1.5, rotationSpeed: 4 },
            { model: this.models.torus, color: [0.7, 0.3, 0.7], orbitA: 11, orbitB: 10, orbitSpeed: 2, rotationSpeed: 5 }
        ];

        for (const data of planetData) {
            const planet = new GameObject(gl, info, data.model, [...data.color, 1.0]);
            const orbitMesh = this.orbitRenderer.addOrbit(data.orbitA, data.orbitB, data.color);

            this.planets.push({
                planet: planet,
                orbitA: data.orbitA,
                orbitB: data.orbitB,
                orbitSpeed: data.orbitSpeed,
                rotationSpeed: data.rotationSpeed,
                orbitAngle: 0,
                rotationQuat: quat.create(),
                orbitMesh: orbitMesh,
                baseScale: 1.0,
                tempScale: 1.0
            });
        }
    }

    /**
     * Modifies the temporary scale of the selected planet.
     * @param {number} delta - The amount to add to the scale.
     */
    modifySelectedScale(delta) {
        // Only allow scaling when stationary 
        if (!this.selectedObject || this.isRevolving) {
            console.warn("Can only scale stationary planets.");
            return;
        }

        const planetProp = this.planets.find(p => p.planet === this.selectedObject);
        if (planetProp) {
            planetProp.tempScale += delta;
            // Add a clamp to prevent 0 or negative scale
            planetProp.tempScale = Math.max(0.1, planetProp.tempScale);
        }
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
     * Manually rotates the selected planet.
     * @param {number[]} axis - The axis to rotate around (e.g., [1, 0, 0])
     * @param {number} angle - The angle in radians
     */
    rotateSelected(axis, angle) {
        if (!this.selectedObject || !this.isRotating) {
            // Only works in manual rotation mode on a selected object
            return;
        }

        const planetProp = this.planets.find(p => p.planet === this.selectedObject);
        if (planetProp) {
            const deltaQuat = quat.create();
            quat.setAxisAngle(deltaQuat, axis, angle);
            quat.multiply(planetProp.rotationQuat, deltaQuat, planetProp.rotationQuat);
            quat.normalize(planetProp.rotationQuat, planetProp.rotationQuat);
        }
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
                break;
            case 'orbitSpeed':
                planetProp.orbitSpeed += delta;
                break;
            case 'rotationSpeed':
                planetProp.rotationSpeed += delta;
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

        if (this.planets.length <= 3) {
            alert("Cannot delete planet. Minimum 3 planets required.");
            return;
        }

        // Find the planetProp
        const planetProp = this.planets.find(p => p.planet === this.selectedObject);

        if (planetProp) {
            // --- Remove the orbit mesh ---
            this.orbitRenderer.removeOrbit(planetProp.orbitMesh);

            // Filter out the planet
            this.planets = this.planets.filter(p => p.planet !== this.selectedObject);

            // Clear selection
            this.selectedObject = null;
            console.log("Planet deleted.");
        }
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
        const starDelta = quat.create();
        quat.setAxisAngle(starDelta, [0, 1, 0], deltaTime * 0.2);
        quat.multiply(this.starRotation, starDelta, this.starRotation);
        mat4.fromQuat(this.star.modelMatrix, this.starRotation);
        mat4.scale(this.star.modelMatrix, this.star.modelMatrix, [2.0, 2.0, 2.0]);


        // --- Update Planets ---
        for (const planetProp of this.planets) {

            // --- 1. Revolution (Orbit) ---
            if (this.isRevolving) { // 
                planetProp.orbitAngle += planetProp.orbitSpeed * deltaTime * 0.5;
            }

            // Calculate position on ellipse
            const x = planetProp.orbitA * Math.cos(planetProp.orbitAngle);
            const z = planetProp.orbitB * Math.sin(planetProp.orbitAngle);
            const translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, [x, 0, z]);

            // --- 2. Rotation (Spin) ---
            // Only do automatic spin if NOT in manual rotation mode
            // OR if this planet is not the selected one
            if (!this.isRotating || planetProp.planet !== this.selectedObject) {
                const rotationDelta = quat.create();
                quat.setAxisAngle(rotationDelta, [0, 1, 0], planetProp.rotationSpeed * deltaTime);
                quat.multiply(planetProp.rotationQuat, rotationDelta, planetProp.rotationQuat);
            }
            // Manual rotation is applied by rotateSelected()

            const rotationMatrix = mat4.create();
            mat4.fromQuat(rotationMatrix, planetProp.rotationQuat);

            // --- 3. Scaling (MODIFIED) ---
            const scaleMatrix = mat4.create();
            let finalScale = planetProp.baseScale;

            // Only apply tempScale if the planet is stationary 
            if (!this.isRevolving) {
                finalScale *= planetProp.tempScale;
            }

            mat4.fromScaling(scaleMatrix, [finalScale, finalScale, finalScale]);

            // --- 4. Combine ---
            const M = planetProp.planet.modelMatrix;
            // M = Translation * Rotation * Scale
            mat4.multiply(M, translationMatrix, rotationMatrix);
            mat4.multiply(M, M, scaleMatrix);
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
            const cameraPosition = vec3.fromValues(0, 0, this.cameraRadius);
            const cameraUp = vec3.fromValues(0, 1, 0);
            vec3.transformQuat(cameraPosition, cameraPosition, this.cameraOrientation);
            vec3.transformQuat(cameraUp, cameraUp, this.cameraOrientation);
            mat4.lookAt(this.viewMatrix, cameraPosition, vec3.fromValues(0, 0, 0), cameraUp);
        } else {
            const cameraPosition = vec3.fromValues(0, this.cameraRadius, 0);
            mat4.lookAt(this.viewMatrix, cameraPosition, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, -1));
        }

        // --- Draw the orbits first (so they are "under" the planets) ---
        if (this.orbitRenderer) {
            this.orbitRenderer.draw(this.viewMatrix, this.projectionMatrix);
        }

        // --- Tell WebGL to use our main shader program ---
        gl.useProgram(info.program);

        // --- Set Global Uniforms ---
        gl.uniformMatrix4fv(info.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        gl.uniformMatrix4fv(info.uniformLocations.viewMatrix, false, this.viewMatrix);

        // --- Draw all objects ---
        this.star.draw();
        for (const planetProp of this.planets) {
            planetProp.planet.draw();
        }
    }
}
