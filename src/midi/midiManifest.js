/**
 * MIDI Manifest Module
 * Manages available MIDI files for the game
 */

let manifestCache = null;

/**
 * Load the MIDI manifest file
 * @returns {Promise<Array>} Array of MIDI file objects
 */
export async function loadMIDIManifest() {
    if (manifestCache) {
        return manifestCache;
    }

    try {
        const response = await fetch('assets/midi/manifest.json');
        if (!response.ok) {
            throw new Error(`Failed to load manifest: ${response.status}`);
        }
        const data = await response.json();
        manifestCache = data.midiFiles || [];
        console.log(`>> Loaded ${manifestCache.length} MIDI files from manifest`);
        return manifestCache;
    } catch (err) {
        console.warn('>> Failed to load MIDI manifest, using fallback:', err);
        // Fallback to default if manifest fails
        manifestCache = [{
            name: "Bach Inventions 784",
            filename: "bach_inventions_784_(c)simonetto.mid",
            path: "assets/midi/bach_inventions_784_(c)simonetto.mid"
        }];
        return manifestCache;
    }
}

/**
 * Get a MIDI file by path
 * @param {string} path - Path to the MIDI file
 * @returns {Object|null} MIDI file object or null if not found
 */
export async function getMIDIFileByPath(path) {
    const manifest = await loadMIDIManifest();
    return manifest.find(file => file.path === path) || null;
}

/**
 * Get all available MIDI files
 * @returns {Promise<Array>} Array of MIDI file objects
 */
export async function getAllMIDIFiles() {
    return await loadMIDIManifest();
}

/**
 * Clear the manifest cache (useful for reloading)
 */
export function clearManifestCache() {
    manifestCache = null;
}
