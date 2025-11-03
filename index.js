import { loadPLY } from './PLYLoader.js';
import { vertexShaderSource, fragmentShaderSource } from './Shaders.js';
import { orbitVertexShaderSource, orbitFragmentShaderSource } from './OrbitShaders.js';
import { createProgramInfo } from './ShaderUtil.js'; // New
import { setupInputHandlers } from './InputHandler.js'; // New
import { StarSystem } from './StarSystem.js';
import { createPlanetCard, hexToRgb } from './PlanetSelection.js';
import { GizmoRenderer } from './gizmoRenderer.js';
import { ObjectPicker } from './ObjectPicker.js';
import { OrbitRenderer } from './OrbitRenderer.js';

export const CLEAR_COLOR = [0.1, 0.1, 0.1, 1];

/**
 * Initializes the MAIN WebGL context, shaders, and program.
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

    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    const programInfo = createProgramInfo(gl, vertexShaderSource, fragmentShaderSource);
    if (!programInfo) return null;

    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(...CLEAR_COLOR);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform3fv(programInfo.uniformLocations.u_LightPosition, [0.0, 0.0, 0.0]);
    console.log('Main WebGL and shaders initialized successfully!');
    return { gl, programInfo };
}

/**
 * Initializes the GIZMO WebGL context and program.
 * @returns {object} An object containing gl, the program, and shader locations.
 */
function initGizmoGL() {
    const canvas = document.getElementById('gizmo-canvas');
    const gl = canvas.getContext('webgl', { alpha: true });
    if (!gl) {
        console.error("WebGL not supported for gizmo!");
        return null;
    }

    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    const programInfo = createProgramInfo(gl, vertexShaderSource, fragmentShaderSource);
    if (!programInfo) return null;

    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniform3fv(programInfo.uniformLocations.u_LightPosition, [0.0, 0.0, 0.0]);
    console.log('Gizmo WebGL initialized successfully!');
    return { gl, programInfo };
}

/**
 * Creates the shader program for the orbit lines.
 * @param {WebGLRenderingContext} gl
 * @returns {object} { program, attribLocations, uniformLocations }
 */
function initOrbitProgram(gl) {
    const programInfo = createProgramInfo(gl, orbitVertexShaderSource, orbitFragmentShaderSource);
    if (!programInfo) return null;
    return programInfo; // Return the info object directly
}


async function main() {
    console.log('Initializing star system...');

    // --- 1. Initialize ALL WebGL contexts/programs ---
    const { gl, programInfo } = initGL();
    if (!gl) return;

    const gizmoGL = initGizmoGL();
    if (!gizmoGL.gl) return;

    const orbitProgramInfo = initOrbitProgram(gl);
    if (!orbitProgramInfo) {
        console.error("Failed to create orbit shader program.");
        return;
    }

    // --- 2. Load All Models ---
    try {
        const [
            coneModel, icosphereModel, monkeyModel, sphereModel,
            torusModel, cylinderModel, cubeModel,
        ] = await Promise.all([
            loadPLY('./Objects/cone.ply'), loadPLY('./Objects/icosphere.ply'),
            loadPLY('./Objects/monkey.ply'), loadPLY('./Objects/sphere.ply'),
            loadPLY('./Objects/torus.ply'), loadPLY('./Objects/cylinder.ply'),
            loadPLY('./Objects/cube.ply'),
        ]);
        const models = {
            cone: coneModel, icosphere: icosphereModel, monkey: monkeyModel,
            sphere: sphereModel, torus: torusModel, cylinder: cylinderModel, cube: cubeModel,
        };

        // --- 3. Build Scene & Renderers ---
        const orbitRenderer = new OrbitRenderer(gl, orbitProgramInfo);
        const starSystem = new StarSystem(gl, programInfo, models, orbitRenderer);
        const gizmoRenderer = new GizmoRenderer(gizmoGL.gl, gizmoGL.programInfo, models);
        const objectPicker = new ObjectPicker(gl);

        // --- 4. HOOK UP UI & EVENT LISTENERS ---
        // --- All listeners are in one function call ---
        const canvas = document.getElementById('star-system-canvas');
        setupInputHandlers(document, canvas, starSystem, objectPicker, programInfo);

        // Set initial button state
        document.getElementById('3d-view').classList.add('active');


        // --- 5. CREATE MODEL CARDS ---
        const modelCards = [
            { name: "Sphere", model: models.sphere, color: 0x00ff00 },
            { name: "Icosphere", model: models.icosphere, color: 0x00aaff },
            { name: "Monkey", model: models.monkey, color: 0xff8800 },
            { name: "Torus", model: models.torus, color: 0xaa00ff },
            { name: "Cone", model: models.cone, color: 0xff0000 },
            { name: "Cylinder", model: models.cylinder, color: 0xffff00 },
            { name: "Cube", model: models.cube, color: 0x0fffff },
        ];

        for (const cardData of modelCards) {
            const onCardClick = () => {
                console.log(`Adding ${cardData.name} to the scene!`);
                const color = hexToRgb(cardData.color);
                starSystem.addModel(
                    cardData.model,
                    color,
                    false
                );
            };
            createPlanetCard(cardData, onCardClick);
        }

        // --- Start the render loop! ---
        console.log("Starting render loop...");
        starSystem.start(gizmoRenderer);

    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Start the application once the DOM is loaded
document.addEventListener('DOMContentLoaded', main);