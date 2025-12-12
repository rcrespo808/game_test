// Stage Config Defaults
export const DEFAULT_STAGE_CONFIG = {
    id: "bach_inventions_784_test",
    midiPath: "assets/midi/bach_inventions_784_(c)simonetto.mid",
    version: 1,
    params: {
        trackIndex: -1, // -1 = all tracks
        bpmOverride: 0, // 0 = use MIDI tempo
        lookaheadSec: 0.1,
        quantizeDiv: 0, // 0 = off, 4/8/16/32 = divisions
        velocityMin: 0.1,
        maxEventsPerSec: 20,
        lowCut: 55,
        highCut: 70,
        hazardSpeed: 420,
        sideMode: "random", // random, alternate, left, right
        laneJitter: 18,
        greenEveryBeats: 4,
        redEverySubdiv: 2,
        seedA: 7,
        seedB: 3,
        enableAudio: true,
        audioVolume: 70,
        density: 1.0 // 1.0 = all notes spawn hazards, 0.5 = every other note, 0.25 = every 4th note
    }
};

// Load stage config from localStorage
export function loadStageConfig() {
    const stored = localStorage.getItem('gridRunner.stageConfig.v1');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_STAGE_CONFIG, ...parsed };
        } catch (e) {
            console.warn('Failed to parse stored config:', e);
        }
    }
    return { ...DEFAULT_STAGE_CONFIG };
}

// Save stage config to localStorage
export function saveStageConfig(config) {
    localStorage.setItem('gridRunner.stageConfig.v1', JSON.stringify(config));
}

// Export stage config as JSON file
export function exportStageConfig(config) {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.id || 'stage'}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import stage config from file
export function importStageConfig(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            callback(config);
        } catch (err) {
            alert('Failed to parse stage file: ' + err.message);
        }
    };
    reader.readAsText(file);
}
