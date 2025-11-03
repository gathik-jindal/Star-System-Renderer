/**
 * Sets up all event listeners for the application.
 * @param {document} document - The global document object.
 * @param {HTMLCanvasElement} canvas - The main canvas element.
 * @param {StarSystem} starSystem - The main StarSystem instance.
 * @param {ObjectPicker} objectPicker - The picker instance.
 * @param {object} programInfo - The main program info (for picking).
 */
export function setupInputHandlers(document, canvas, starSystem, objectPicker, programInfo) {

    // --- 1. UI Button Listeners ---
    const btn3D = document.getElementById('3d-view');
    const btnTop = document.getElementById('top-view');

    btn3D.addEventListener('click', () => {
        starSystem.setCameraMode('3D');
        btn3D.classList.add('active');
        btnTop.classList.remove('active');
    });
    btnTop.addEventListener('click', () => {
        starSystem.setCameraMode('TOP');
        btnTop.classList.add('active');
        btn3D.classList.remove('active');
    });

    // --- 2. Canvas Click & Mouse Listeners ---
    let trackMouseMovement = false;

    canvas.addEventListener('click', (event) => {
        // --- Picking Logic ---
        if (starSystem.cameraMode === 'TOP') {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top; // Y from top-left

            objectPicker.render(
                programInfo,
                starSystem.viewMatrix,
                starSystem.projectionMatrix,
                starSystem.getPickableObjects()
            );

            const id = objectPicker.pick(x, y);

            if (id === 0) {
                starSystem.setSelected(null);
            } else {
                const selected = starSystem.getPickableObjects()[id - 1];
                starSystem.setSelected(selected);
            }
        }

        // --- Pointer Lock Logic ---
        if (starSystem.cameraMode === '3D' && !trackMouseMovement) {
            trackMouseMovement = true;
            canvas.requestPointerLock();
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

    // --- 3. Keyboard Listeners ---
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName !== 'BODY') return;

        const rotationAngle = 0.05; // ~3 degrees

        if (starSystem.selectedObject) {
            switch (event.key) {
                case '=':
                    starSystem.modifySelected('orbit', 0.5);
                    event.preventDefault();
                    break;
                case '-':
                    starSystem.modifySelected('orbit', -0.5);
                    event.preventDefault();
                    break;
                case ']': starSystem.modifySelected('orbitSpeed', 0.3); break;
                case '[': starSystem.modifySelected('orbitSpeed', -0.3); break;
                case 'Delete':
                case 'Backspace':
                    starSystem.deleteSelected(); break;
                case 'x': starSystem.rotateSelected([1, 0, 0], rotationAngle); break;
                case 'X': starSystem.rotateSelected([1, 0, 0], -rotationAngle); break;
                case 'y': starSystem.rotateSelected([0, 1, 0], rotationAngle); break;
                case 'Y': starSystem.rotateSelected([0, 1, 0], -rotationAngle); break;
                case 'z': starSystem.rotateSelected([0, 0, 1], rotationAngle); break;
                case 'Z': starSystem.rotateSelected([0, 0, 1], -rotationAngle); break;
                case 'PageUp':
                    starSystem.modifySelectedScale(0.1);
                    event.preventDefault();
                    break;
                case 'PageDown':
                    starSystem.modifySelectedScale(-0.1);
                    event.preventDefault();
                    break;
            }
        }

        switch (event.key) {
            case ' ':
                starSystem.isRevolving = !starSystem.isRevolving;
                console.log(`Revolution ${starSystem.isRevolving ? 'ON' : 'OFF'}.`);
                event.preventDefault();
                break;
            case 't':
                starSystem.isRotating = !starSystem.isRotating;
                console.log(`Manual Rotation Mode ${starSystem.isRotating ? 'ON' : 'OFF'}.`);
                if (starSystem.isRotating) {
                    console.log("Use x/X, y/Y, z/Z to rotate selected planet.");
                }
                break;
        }
    });
}