/**
 * Stage Manifest Module
 * Manages available stage configurations for the game
 */

let manifestCache = null;

/**
 * Load the stage manifest file
 * @returns {Promise<Array>} Array of stage configuration objects
 */
export async function loadStageManifest() {
    if (manifestCache) {
        return manifestCache;
    }

    try {
        const response = await fetch('assets/stages/manifest.json');
        if (!response.ok) {
            throw new Error(`Failed to load stage manifest: ${response.status}`);
        }
        const data = await response.json();
        manifestCache = data.stages || [];
        console.log(`>> Loaded ${manifestCache.length} stage configurations from manifest`);
        return manifestCache;
    } catch (err) {
        console.warn('>> Failed to load stage manifest, using empty list:', err);
        manifestCache = [];
        return manifestCache;
    }
}

/**
 * Get a stage configuration by ID
 * @param {string} stageId - Stage ID
 * @returns {Promise<Object|null>} Stage configuration or null if not found
 */
export async function getStageById(stageId) {
    const manifest = await loadStageManifest();
    return manifest.find(stage => stage.id === stageId) || null;
}

/**
 * Get all available stage configurations
 * @returns {Promise<Array>} Array of stage configuration objects
 */
export async function getAllStages() {
    return await loadStageManifest();
}

/**
 * Get stages filtered by MIDI path
 * @param {string} midiPath - MIDI file path
 * @returns {Promise<Array>} Array of stages for the specified MIDI file
 */
export async function getStagesByMidiPath(midiPath) {
    const manifest = await loadStageManifest();
    return manifest.filter(stage => stage.midiPath === midiPath);
}

/**
 * Clear the manifest cache (useful for reloading)
 */
export function clearStageManifestCache() {
    manifestCache = null;
}
