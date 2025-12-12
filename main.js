// Entry point: boot Phaser with the modular RunnerScene
import { RunnerScene } from './src/game/RunnerScene.js';

const BASE_CONFIG = {
    type: window.Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#111111',
    scene: [RunnerScene]
};

/**
 * Create and start the Phaser game instance.
 * Allows optional overrides for testing or custom embedding.
 */
export function createGame(configOverrides = {}) {
    if (!window.Phaser) {
        throw new Error('Phaser must be available on window before starting the game.');
    }

    const config = { ...BASE_CONFIG, ...configOverrides };
    return new window.Phaser.Game(config);
}

// Auto-start when running in the browser with Phaser loaded globally
if (typeof window !== 'undefined' && window.Phaser) {
    createGame();
}
