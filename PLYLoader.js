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
    let inHeader = true;
    let vertexDataStarted = false;

    let headerVertexLines = 0;
    let headerFaceLines = 0;

    for (const line of lines) {
        if (inHeader) {
            if (line.startsWith('element vertex')) {
                vertexCount = parseInt(line.split(' ')[2]);
            } else if (line.startsWith('element face')) {
                faceCount = parseInt(line.split(' ')[2]);
            } else if (line.startsWith('end_header')) {
                inHeader = false;
                vertexDataStarted = true;
            }
            continue; // Skip header lines
        }

        const parts = line.trim().split(' ');

        if (vertexDataStarted && headerVertexLines < vertexCount) {
            // This is a vertex line
            // We only care about x, y, z (the first 3 values)
            positions.push(parseFloat(parts[0]));
            positions.push(parseFloat(parts[1]));
            positions.push(parseFloat(parts[2]));
            headerVertexLines++;
        } else if (headerVertexLines >= vertexCount && headerFaceLines < faceCount) {
            // This is a face line
            // We assume it's a triangle (3 indices)
            // parts[0] is '3' (for 3 vertices), so we take parts[1], parts[2], parts[3]
            indices.push(parseInt(parts[1]));
            indices.push(parseInt(parts[2]));
            indices.push(parseInt(parts[3]));
            headerFaceLines++;
        }
    }

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