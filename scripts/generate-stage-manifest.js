/**
 * Script to generate stage manifest from available MIDI files
 * Run with: node scripts/generate-stage-manifest.js
 */

const fs = require('fs');
const path = require('path');

const MIDI_DIR = path.join(__dirname, '..', 'assets', 'midi');
const STAGES_DIR = path.join(__dirname, '..', 'assets', 'stages');
const MANIFEST_PATH = path.join(STAGES_DIR, 'manifest.json');

// Ensure stages directory exists
if (!fs.existsSync(STAGES_DIR)) {
    fs.mkdirSync(STAGES_DIR, { recursive: true });
}

function generateManifest() {
    try {
        const midiFiles = fs.readdirSync(MIDI_DIR)
            .filter(file => file.toLowerCase().endsWith('.mid'));

        const difficulties = ['easy', 'normal', 'hard'];
        const stages = [];

        midiFiles.forEach(file => {
            const baseName = file
                .replace(/\.mid$/i, '')
                .replace(/[_-]/g, ' ')
                .replace(/\(c\)/gi, '')
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const fileId = file.replace(/\.mid$/i, '').replace(/[^a-z0-9]/gi, '_').toLowerCase();

            difficulties.forEach(diff => {
                const diffName = diff.charAt(0).toUpperCase() + diff.slice(1);
                stages.push({
                    id: `${fileId}_${diff}`,
                    name: `${baseName} - ${diffName}`,
                    description: getDifficultyDescription(diff),
                    midiPath: `assets/midi/${file}`,
                    trackIndex: -1,
                    difficulty: diff
                });
            });
        });

        const manifest = {
            stages: stages
        };

        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
        console.log(`✓ Generated manifest with ${stages.length} stage configurations:`);
        stages.forEach(stage => {
            console.log(`  - ${stage.name} (${stage.id})`);
        });
    } catch (err) {
        console.error('Error generating stage manifest:', err);
        process.exit(1);
    }
}

function getDifficultyDescription(difficulty) {
    const descriptions = {
        easy: 'Gentle introduction, slower pace',
        normal: 'Balanced challenge level',
        hard: 'Fast-paced, challenging gameplay',
        extreme: 'Maximum difficulty, expert level'
    };
    return descriptions[difficulty] || 'Standard gameplay';
}

generateManifest();
