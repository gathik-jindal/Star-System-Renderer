import { GameObject } from './GameObject.js';

// Destructure modules from the global glMatrix object
let mat4, vec3;

export class StarSystem {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {object} programInfo
     * @param {object} models - An object with all your loaded models, e.g., { sphere, cone, ... }
     */
    constructor(gl, programInfo, models) {
        this.gl = gl;
        if (!mat4) {
            mat4 = window.glMatrix.mat4;
            vec3 = window.glMatrix.vec3;
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

        // Timekeeping for animation
        this.lastTime = 0;

        this._setupScene();
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
        this.star = new GameObject(gl, info, this.models.sphere, [1, 1, 0, 1]);
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
        mat4.translate(planet2.modelMatrix, planet2.modelMatrix, vec3.fromValues(-8, 0, 0)); // Orbit radius 8

        // Planet 3: Torus (another "regular solid")
        const planet3 = new GameObject(gl, info, this.models.torus, [0.7, 0.3, 0.7, 1]); // Purple
        mat4.translate(planet3.modelMatrix, planet3.modelMatrix, vec3.fromValues(11, 0, 0)); // Orbit radius 11
        mat4.rotateX(planet3.modelMatrix, planet3.modelMatrix, Math.PI / 2); // Rotate torus to be flat

        this.planets.push(planet1, planet2, planet3);

        // TODO: Create axis objects 
        // We will add these later.
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
    }

    /**
     * Draws the entire scene.
     */
    _draw() {
        const gl = this.gl;
        const info = this.programInfo;

        // --- Clear the canvas ---
        // We clear to the color set in initGL()
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // --- Set up the Camera (Projection and View) ---

        // 1. Projection Matrix (Field of View)
        const fieldOfView = 45 * Math.PI / 180; // 45 degrees FOV
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);

        // 2. View Matrix (Camera Position) - "3D View"
        // This is where the camera is. We'll place it at (0, 10, 20)
        // and make it look at the origin (0, 0, 0) .
        const cameraPosition = vec3.fromValues(0, 10, 20);
        const lookAtTarget = vec3.fromValues(0, 0, 0);
        const cameraUp = vec3.fromValues(0, 1, 0); // Y-axis is "up"
        mat4.lookAt(this.viewMatrix, cameraPosition, lookAtTarget, cameraUp);

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

        for (const planet of this.planets) {
            planet.draw();
        }

        // TODO: Draw axes
    }
}