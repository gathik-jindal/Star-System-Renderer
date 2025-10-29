import { loadPLY } from './PLYLoader.js';
import { vertexShaderSource, fragmentShaderSource, compileShader, createShaderProgram } from './shaders.js';
import { StarSystem } from './StarSystem.js';

const { mat4 } = window;

/**
 * Initializes the WebGL context, shaders, and program.
 * @returns {object} An object containing gl, the program, and shader locations.
 */
function initGL() {
    mat4.create(); // Ensure mat4 is loaded
    const canvas = document.getElementById('star-system-canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.error("WebGL not supported!");
        return null;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        return null;
    }

    gl.useProgram(program);

    // --- Global WebGL Settings ---
    // Set the viewport to match the canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // Enable the depth test (renders objects in front correctly)
    gl.enable(gl.DEPTH_TEST);
    // Clear the canvas to a dark color (a very dark grey)
    gl.clearColor(0.1, 0.1, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    console.log('WebGL and shaders initialized successfully!');

    // We'll store program info (attribute and uniform locations)
    // to avoid looking them up repeatedly.
    const programInfo = {
        program: program,
        attribLocations: {
            position: gl.getAttribLocation(program, 'a_Position'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(program, 'u_ProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(program, 'u_ViewMatrix'),
            modelMatrix: gl.getUniformLocation(program, 'u_ModelMatrix'),
            color: gl.getUniformLocation(program, 'u_Color'),
        },
    };

    return { gl, programInfo };
}

async function main() {
    console.log('Initializing star system...');

    // --- 1. Initialize WebGL and Shaders ---
    const { gl, programInfo } = initGL();
    if (!gl) {
        return; // Initialization failed
    }

    // --- 2. Load All Models ---
    try {
        const [
            coneModel,
            icosphereModel,
            monkeyModel,
            sphereModel,
            torusModel
        ] = await Promise.all([
            loadPLY('./Objects/cone.ply'),
            loadPLY('./Objects/icosphere.ply'),
            loadPLY('./Objects/monkey.ply'),
            loadPLY('./Objects/sphere.ply'),
            loadPLY('./Objects/torus.ply')
        ]);

        console.log('All models loaded successfully!');

        // Store models in a clean object
        const models = {
            cone: coneModel,
            icosphere: icosphereModel,
            monkey: monkeyModel,
            sphere: sphereModel,
            torus: torusModel
        };

        // --- 3. Build Scene & Start ---
        // Create the main app instance
        const starSystem = new StarSystem(gl, programInfo, models);

        // Start the render loop!
        console.log("Starting render loop...");
        starSystem.start();

    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Start the application once the DOM is loaded
document.addEventListener('DOMContentLoaded', main);