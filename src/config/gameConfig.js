/**
 * Game Configuration
 * Defines difficulty presets with game settings
 * These settings are independent of MIDI tracks
 */

import { DEFAULT_STAGE_CONFIG } from './stageConfig.js';

/**
 * Difficulty presets with game settings
 * Each difficulty is a complete game configuration
 */
export const DIFFICULTY_CONFIGS = {
    easy: {
        name: 'Easy',
        description: 'Gentle introduction, slower pace',
        params: {
            hazardSpeed: 300,
            density: 0.1,
            lookaheadSec: 0.15,
            maxEventsPerSec: 15,
            laneJitter: 10,
            gridRows: 3,
            gridCols: 3
        }
    },
    normal: {
        name: 'Normal',
        description: 'Balanced challenge level',
        params: {
            hazardSpeed: 420,
            density: 0.4,
            lookaheadSec: 0.1,
            maxEventsPerSec: 20,
            laneJitter: 18,
            gridRows: 3,
            gridCols: 3
        }
    },
    hard: {
        name: 'Hard',
        description: 'Fast-paced, challenging gameplay',
        params: {
            hazardSpeed: 550,
            density: 0.7,
            lookaheadSec: 0.08,
            maxEventsPerSec: 25,
            laneJitter: 25,
            gridRows: 4,
            gridCols: 4
        }
    },
    extreme: {
        name: 'Extreme',
        description: 'Maximum difficulty, expert level',
        params: {
            hazardSpeed: 700,
            density: 1.0,
            lookaheadSec: 0.05,
            maxEventsPerSec: 30,
            laneJitter: 30,
            gridRows: 5,
            gridCols: 5
        }
    }
};

/**
 * Get all available difficulties
 * @returns {Array} Array of difficulty objects with key, name, and description
 */
export function getAvailableDifficulties() {
    return Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => ({
        key,
        name: config.name,
        description: config.description
    }));
}

/**
 * Get difficulty configuration by key
 * @param {string} difficultyKey - Difficulty key (easy, normal, hard, extreme)
 * @returns {Object|null} Difficulty configuration or null if not found
 */
export function getDifficultyConfig(difficultyKey) {
    return DIFFICULTY_CONFIGS[difficultyKey] || null;
}

/**
 * Create a complete game configuration from MIDI path and difficulty
 * @param {string} midiPath - Path to MIDI file
 * @param {string} difficulty - Difficulty key
 * @param {number} trackIndex - MIDI track index (-1 for all tracks)
 * @returns {Object} Complete game configuration
 */
export function createGameConfig(midiPath, difficulty = 'normal', trackIndex = -1) {
    const difficultyConfig = getDifficultyConfig(difficulty) || getDifficultyConfig('normal');
    const baseName = midiPath.split('/').pop().replace('.mid', '');
    
    return {
        id: `${baseName}_${difficulty}`,
        midiPath: midiPath,
        difficulty: difficulty,
        version: 1,
        params: {
            ...DEFAULT_STAGE_CONFIG.params,
            ...difficultyConfig.params,
            trackIndex: trackIndex
        }
    };
}

