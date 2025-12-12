/**
 * Track Configuration System
 * Defines difficulty presets and track configurations
 */

import { DEFAULT_STAGE_CONFIG } from './stageConfig.js';

/**
 * Difficulty presets
 * These can be applied to any track
 */
export const DIFFICULTY_PRESETS = {
    easy: {
        name: 'Easy',
        description: 'Slower hazards, more forgiving',
        params: {
            hazardSpeed: 300,
            density: 0.5,
            lookaheadSec: 0.15,
            maxEventsPerSec: 15,
            laneJitter: 10
        }
    },
    normal: {
        name: 'Normal',
        description: 'Balanced gameplay',
        params: {
            hazardSpeed: 420,
            density: 1.0,
            lookaheadSec: 0.1,
            maxEventsPerSec: 20,
            laneJitter: 18
        }
    },
    hard: {
        name: 'Hard',
        description: 'Fast hazards, challenging',
        params: {
            hazardSpeed: 550,
            density: 1.0,
            lookaheadSec: 0.08,
            maxEventsPerSec: 25,
            laneJitter: 25
        }
    },
    extreme: {
        name: 'Extreme',
        description: 'Maximum difficulty',
        params: {
            hazardSpeed: 700,
            density: 1.0,
            lookaheadSec: 0.05,
            maxEventsPerSec: 30,
            laneJitter: 30
        }
    }
};

/**
 * Create a full stage config from track path and difficulty
 * @param {string} midiPath - Path to MIDI file
 * @param {string} difficulty - Difficulty key (easy, normal, hard, extreme)
 * @param {number} trackIndex - MIDI track index (-1 for all tracks)
 * @returns {Object} Complete stage configuration
 */
export function createTrackConfig(midiPath, difficulty = 'normal', trackIndex = -1) {
    const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.normal;
    const baseName = midiPath.split('/').pop().replace('.mid', '');
    
    return {
        id: `${baseName}_${difficulty}`,
        midiPath: midiPath,
        version: 1,
        params: {
            ...DEFAULT_STAGE_CONFIG.params,
            ...preset.params,
            trackIndex: trackIndex
        }
    };
}

/**
 * Get all available difficulty presets
 * @returns {Array} Array of difficulty objects with key, name, and description
 */
export function getAvailableDifficulties() {
    return Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => ({
        key,
        name: preset.name,
        description: preset.description
    }));
}
