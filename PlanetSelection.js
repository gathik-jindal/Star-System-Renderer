import { vertexShaderSource, fragmentShaderSource } from './Shaders.js';
import { compileShader, createShaderProgram } from './ShaderUtil.js';
import { GameObject } from './GameObject.js';

const { mat4, quat } = window;

/**
 * Initializes a new WebGL context for a planet card canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {object} { gl, programInfo }
 */
function initCardGL(canvas) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.error("WebGL not supported for planet card!");
        return null;
    }

    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    // --- Manually compile and link ---
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!program) return null;

    gl.useProgram(program); // Use program *before* setting uniforms

    // --- Manually find locations ---
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
            lightPosition: gl.getUniformLocation(program, 'u_LightPosition'),
            isEmissive: gl.getUniformLocation(program, 'u_isEmissive'),
        },
    };

    // --- Set static uniforms for this card's scene ---
    gl.uniform3fv(programInfo.uniformLocations.lightPosition, [0.0, 2.0, 5.0]);

    // --- Set global GL settings for this context ---
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background for cards

    return { gl, programInfo };
}

/**
 * Converts a hex color number to a WebGL-friendly [r, g, b] array.
 * @param {number} hex - e.g., 0xff4400
 * @returns {number[]} - e.g., [1.0, 0.26, 0.0]
 */
export function hexToRgb(hex) { // <-- NOW EXPORTED
    const r = ((hex >> 16) & 255) / 255;
    const g = ((hex >> 8) & 255) / 255;
    const b = (hex & 255) / 255;
    return [r, g, b];
}

/**
 * Creates a new planet preview card and appends it to the selection panel.
 * @param {object} cardData - { name: "Model Name", model: <model_data>, color: 0xHEX... }
 * @param {function} onClickCallback - A function to execute when the card is clicked.
 */
export function createPlanetCard(cardData, onClickCallback) {
    const container = document.getElementById('planet-selections');

    // 1. Create HTML Elements
    const card = document.createElement('div');
    card.className = 'planet-card';

    const title = document.createElement('h3');
    title.textContent = cardData.name; // Use new cardData
    card.appendChild(title);

    const preview = document.createElement('div');
    preview.className = 'planet-preview';

    const canvas = document.createElement('canvas');
    preview.appendChild(canvas);
    card.appendChild(preview);

    container.appendChild(card);
    card.addEventListener('click', onClickCallback);

    // 2. Initialize WebGL for this card
    const glInit = initCardGL(canvas);
    if (!glInit) return;

    const { gl, programInfo } = glInit;

    // 3. Create the Planet GameObject
    const color = hexToRgb(cardData.color); // Use new cardData
    const planetMesh = new GameObject(gl, programInfo, cardData.model, [...color, 1.0], false);

    // --- Store rotation and scale separately ---
    const planetRotation = quat.create();
    const scaleVector = (cardData.name === "Monkey") ? [1.2, 1.2, 1.2] : [1.5, 1.5, 1.5];
    // We no longer apply scale here.

    // 4. Setup Camera
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, 50 * Math.PI / 180, 1, 0.1, 100);

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [0, 0, 5], [0, 0, 0], [0, 1, 0]); // Static camera

    // 5. Start the render loop for this card
    let lastTime = 0;
    function renderCard(time) {
        time *= 0.001; // convert to seconds
        const deltaTime = time - lastTime;
        lastTime = time;

        // --- Resize ---
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        // --- (Spin) using Quaternions ---
        const rotationDelta = quat.create();
        quat.setAxisAngle(rotationDelta, [0, 1, 0], deltaTime * 1);
        quat.multiply(planetRotation, rotationDelta, planetRotation);

        // Rebuild the model matrix from scratch
        mat4.fromQuat(planetMesh.modelMatrix, planetRotation);
        mat4.scale(planetMesh.modelMatrix, planetMesh.modelMatrix, scaleVector);


        // --- Draw ---
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(programInfo.program);

        // Set global uniforms
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);

        // Draw the planet
        planetMesh.draw();

        requestAnimationFrame(renderCard);
    }

    requestAnimationFrame(renderCard);
}