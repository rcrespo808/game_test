/**
 * MIDI File Loading Module
 * Handles loading MIDI files from the filesystem
 */

export async function loadMIDIFile(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        
        // Wait for MIDI parser to be available
        let attempts = 0;
        while (!window.MidiParser && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.MidiParser) {
            throw new Error('MIDI parser not loaded');
        }

        const midi = new window.MidiParser(arrayBuffer);
        return midi;
    } catch (err) {
        console.error(">> MIDI load failed:", err);
        throw err;
    }
}
