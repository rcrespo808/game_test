/**
 * Script to generate MIDI manifest from files in assets/midi directory
 * Run with: node scripts/generate-midi-manifest.js
 */

const fs = require('fs');
const path = require('path');

const MIDI_DIR = path.join(__dirname, '..', 'assets', 'midi');
const MANIFEST_PATH = path.join(MIDI_DIR, 'manifest.json');

function generateManifest() {
    try {
        const files = fs.readdirSync(MIDI_DIR);
        const midiFiles = files
            .filter(file => file.toLowerCase().endsWith('.mid'))
            .map(file => {
                // Generate a readable name from filename
                const name = file
                    .replace(/\.mid$/i, '')
                    .replace(/[_-]/g, ' ')
                    .replace(/\(c\)/gi, '')
                    .trim()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                return {
                    name: name || file,
                    filename: file,
                    path: `assets/midi/${file}`
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        const manifest = {
            midiFiles: midiFiles
        };

        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
        console.log(`✓ Generated manifest with ${midiFiles.length} MIDI files:`);
        midiFiles.forEach(file => {
            console.log(`  - ${file.name} (${file.filename})`);
        });
    } catch (err) {
        console.error('Error generating manifest:', err);
        process.exit(1);
    }
}

generateManifest();
