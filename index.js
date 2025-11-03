import { loadPLY } from './PLYLoader.js';
import { vertexShaderSource, fragmentShaderSource, compileShader, createShaderProgram } from './Shaders.js';
import { StarSystem } from './StarSystem.js';
import { createPlanetCard, hexToRgb } from './PlanetSelection.js';
import { GizmoRenderer } from './gizmoRenderer.js';
import { ObjectPicker } from './ObjectPicker.js';

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

    // --- Fix pixelation ---
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return null;

    const program = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!program) return null;

    gl.useProgram(program);

    // --- Global WebGL Settings ---
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(...CLEAR_COLOR);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const lightPositionLocation = gl.getUniformLocation(program, 'u_LightPosition');
    gl.uniform3fv(lightPositionLocation, [0.0, 0.0, 0.0]);

    console.log('Main WebGL and shaders initialized successfully!');

    const programInfo = {
        program: program,
        attribLocations: {
            position: gl.getAttribLocation(program, 'a_Position'),
            normal: gl.getAttribLocation(program, 'a_Normal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(program, 'u_ProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(program, 'u_ViewMatrix'),
            modelMatrix: gl.getUniformLocation(program, 'u_ModelMatrix'),
            color: gl.getUniformLocation(program, 'u_Color'),
            lightPosition: lightPositionLocation,
            isEmissive: gl.getUniformLocation(program, 'u_isEmissive'),
        },
    };

    return { gl, programInfo };
}

// --- NEW FUNCTION ---
/**
 * Initializes the GIZMO WebGL context and program.
 * @returns {object} An object containing gl, the program, and shader locations.
 */
function initGizmoGL() {
    const canvas = document.getElementById('gizmo-canvas');
    // --- Use { alpha: true } to allow transparent background ---
    const gl = canvas.getContext('webgl', { alpha: true });
    if (!gl) {
        console.error("WebGL not supported for gizmo!");
        return null;
    }

    // --- Match canvas size ---
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    // --- Re-use the same shaders ---
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return null;

    const program = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!program) return null;

    gl.useProgram(program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // --- Use the same light position (though gizmo is unlit, this is good practice) ---
    const lightPositionLocation = gl.getUniformLocation(program, 'u_LightPosition');
    gl.uniform3fv(lightPositionLocation, [0.0, 0.0, 0.0]);

    console.log('Gizmo WebGL initialized successfully!');

    // --- Use the same layout for programInfo ---
    const programInfo = {
        program: program,
        attribLocations: {
            position: gl.getAttribLocation(program, 'a_Position'),
            normal: gl.getAttribLocation(program, 'a_Normal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(program, 'u_ProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(program, 'u_ViewMatrix'),
            modelMatrix: gl.getUniformLocation(program, 'u_ModelMatrix'),
            color: gl.getUniformLocation(program, 'u_Color'),
            lightPosition: lightPositionLocation,
            isEmissive: gl.getUniformLocation(program, 'u_isEmissive'),
        },
    };

    return { gl, programInfo };
}


async function main() {
    console.log('Initializing star system...');

    // --- 1. Initialize BOTH WebGL contexts ---
    const { gl, programInfo } = initGL();
    if (!gl) return; // Main init failed

    const gizmoGL = initGizmoGL(); // { gl, programInfo }
    if (!gizmoGL.gl) return; // Gizmo init failed


    // --- 2. Load All Models ---
    try {
        const [
            coneModel,
            icosphereModel,
            monkeyModel,
            sphereModel,
            torusModel,
            cylinderModel,
            cubeModel,
        ] = await Promise.all([
            loadPLY('./Objects/cone.ply'),
            loadPLY('./Objects/icosphere.ply'),
            loadPLY('./Objects/monkey.ply'),
            loadPLY('./Objects/sphere.ply'),
            loadPLY('./Objects/torus.ply'),
            loadPLY('./Objects/cylinder.ply'),
            loadPLY('./Objects/cube.ply'),
        ]);

        console.log('All models loaded successfully!');

        const models = {
            cone: coneModel,
            icosphere: icosphereModel,
            monkey: monkeyModel,
            sphere: sphereModel,
            torus: torusModel,
            cylinder: cylinderModel,
            cube: cubeModel,
        };

        // --- 3. Build Scene & Renderers ---
        const starSystem = new StarSystem(gl, programInfo, models);
        const gizmoRenderer = new GizmoRenderer(gizmoGL.gl, gizmoGL.programInfo, models);
        const objectPicker = new ObjectPicker(gl);


        // --- 4. HOOK UP UI BUTTONS ---
        const btn3D = document.getElementById('3d-view');
        const btnTop = document.getElementById('top-view');
        const canvas = document.getElementById('star-system-canvas');
        btn3D.classList.add('active');
        let mode = '3D';

        btn3D.addEventListener('click', () => {
            starSystem.setCameraMode('3D');
            mode = '3D';
            btn3D.classList.add('active');
            btnTop.classList.remove('active');
        });
        btnTop.addEventListener('click', () => {
            starSystem.setCameraMode('TOP');
            mode = 'TOP';
            btnTop.classList.add('active');
            btn3D.classList.remove('active');
        });

        // --- 4.5 HOOK UP EVENT LISTENERS ---
        canvas.addEventListener('click', (event) => {
            if (starSystem.cameraMode !== 'TOP') {
                return; // Do nothing if not in top view
            }

            // 2. Get canvas-relative mouse coords
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top; // Y from top-left

            // 3. Render the picking scene
            objectPicker.render(
                programInfo,
                starSystem.viewMatrix,
                starSystem.projectionMatrix,
                starSystem.getPickableObjects()
            );

            // 4. Pick the ID
            const id = objectPicker.pick(x, y);

            // 5. Set the selected object in StarSystem
            if (id === 0) { // 0 is the clear color (black)
                starSystem.setSelected(null);
            } else {
                const selected = starSystem.getPickableObjects()[id - 1];
                starSystem.setSelected(selected);
            }
        });

        let trackMouseMovement = false;
        canvas.addEventListener('click', async () => {
            if (mode === '3D') {
                trackMouseMovement = true;
                await canvas.requestPointerLock();
            }
        });
        canvas.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === canvas && trackMouseMovement) {
                const movementX = event.movementX || 0;
                const movementY = event.movementY || 0;
                starSystem.handleMouseMovement(movementX, movementY);
            }
        });
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            starSystem.handleMouseScroll(event);
        });
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== canvas) {
                trackMouseMovement = false;
            }
        });

        document.addEventListener('keydown', (event) => {
            // Don't do anything if a text box is focused, etc.
            if (event.target.tagName !== 'BODY') {
                return;
            }

            // First, check if an object is selected.
            // These keys do nothing if no object is selected.
            if (starSystem.selectedObject) {
                // Use event.key to check which key was pressed
                switch (event.key) {
                    // --- Orbit Size ---
                    case '=': // '+' key
                        starSystem.modifySelected('orbit', 0.5);
                        event.preventDefault(); // Stop browser zoom
                        break;
                    case '-':
                        starSystem.modifySelected('orbit', -0.5);
                        event.preventDefault(); // Stop browser zoom
                        break;

                    // --- Revolution Speed (Orbit Speed) ---
                    case ']':
                        starSystem.modifySelected('orbitSpeed', 0.1);
                        break;
                    case '[':
                        starSystem.modifySelected('orbitSpeed', -0.1);
                        break;

                    // --- Rotation Speed (Spin) ---
                    case '.':
                        starSystem.modifySelected('rotationSpeed', 0.2);
                        break;
                    case ',':
                        starSystem.modifySelected('rotationSpeed', -0.2);
                        break;

                    // --- Deletion ---
                    case 'Delete':
                    case 'Backspace':
                        starSystem.deleteSelected();
                        break;
                }
            }

            // --- Global keys (that work even without selection) ---
            // (You can add keys here for add/delete, or pausing all)
            switch (event.key) {
                case 'p':
                    // Example: You could add a "pauseAll" function
                    console.log("Pause Toggled (Not Implemented)");
                    break;
            }
        });

        // --- 5. CREATE MODEL CARDS ---
        const modelCards = [
            { name: "Sphere", model: models.sphere, color: 0x00ff00 },
            { name: "Icosphere", model: models.icosphere, color: 0x00aaff },
            { name: "Monkey", model: models.monkey, color: 0xff8800 },
            { name: "Torus", model: models.torus, color: 0xaa00ff },
            { name: "Cone", model: models.cone, color: 0xff0000 },
            { name: "Cylinder", model: models.cylinder, color: 0xffff00 },
            { name: "Cube", model: models.cube, color: 0xffffff },
        ];
        for (const cardData of modelCards) {
            const onCardClick = () => {
                console.log(`Adding ${cardData.name} to the scene!`);
                const color = hexToRgb(cardData.color);
                starSystem.addModel(
                    cardData.model,
                    [...color, 1.0],
                    9 + (Math.random() * 10),
                    0.5 + Math.random(),
                    1.0 + Math.random() * 4,
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