/**
 * A simple .ply file parser.
 * This parser assumes the file is in ASCII format and triangular.
 * It extracts vertex positions and face indices.
 *
 * @param {string} plyText - The raw text content of the .ply file.
 * @returns {object} An object with { positions: Float32Array, indices: Uint16Array }
 */
function parsePLY(plyText) {
    const lines = plyText.split('\n');
    const positions = [];
    const indices = [];

    let vertexCount = 0;
    let faceCount = 0;

    let verticesRead = 0;
    let facesRead = 0;

    // --- State Machine ---
    // We start in the header.
    // After 'end_header', we switch to READING_VERTICES.
    // After reading 'vertexCount' vertices, we switch to READING_FACES.
    const STATE = {
        HEADER: 0,
        READING_VERTICES: 1,
        READING_FACES: 2
    };
    let currentState = STATE.HEADER;
    // ---

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (trimmedLine === "") {
            continue;
        }

        const parts = trimmedLine.split(' ');

        switch (currentState) {
            case STATE.HEADER:
                if (parts[0] === 'element' && parts[1] === 'vertex') {
                    vertexCount = parseInt(parts[2]);
                } else if (parts[0] === 'element' && parts[1] === 'face') {
                    faceCount = parseInt(parts[2]);
                } else if (parts[0] === 'end_header') {
                    // Switch state
                    currentState = STATE.READING_VERTICES;
                }
                break; // Continue to next line

            case STATE.READING_VERTICES:
                // We are in the vertex data section
                positions.push(parseFloat(parts[0])); // x
                positions.push(parseFloat(parts[1])); // y
                positions.push(parseFloat(parts[2])); // z
                verticesRead++;

                // Check if we are done reading vertices
                if (verticesRead === vertexCount) {
                    currentState = STATE.READING_FACES;
                }
                break; // Continue to next line

            case STATE.READING_FACES:
                // We are in the face data section
                // We assume faces are triangles (parts[0] === '3')
                indices.push(parseInt(parts[1]));
                indices.push(parseInt(parts[2]));
                indices.push(parseInt(parts[3]));
                facesRead++;

                // We could optionally stop here if facesRead === faceCount
                break;
        }
    }

    // --- LOGGING (Kept from last time) ---
    console.log(`PLY Parser Results (${vertexCount}v, ${faceCount}f):
  - Vertices read: ${verticesRead} (Positions: ${positions.length})
  - Faces read:   ${facesRead} (Indices: ${indices.length})`);
    // --- END ---

    return {
        positions: new Float32Array(positions),
        indices: new Uint16Array(indices),
    };
}


/**
 * Fetches a .ply file from the given URL and parses it.
 *
 * @param {string} url - The path to the .ply file.
 * @returns {Promise<object>} A promise that resolves with the parsed geometry
 * { positions: Float32Array, indices: Uint16Array }.
 */
export async function loadPLY(url) {
    try {
        console.log(`Loading PLY: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const plyText = await response.text();
        return parsePLY(plyText);
    } catch (error) {
        console.error(`Error loading PLY file ${url}:`, error);
        throw error;
    }
}