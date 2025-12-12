// Jest setup file for Phaser 3 game testing
// This file runs before each test file

// Mock Phaser if needed (already handled by moduleNameMapper, but can add additional setup here)
global.Phaser = require('./mocks/phaser.mock.js');
if (typeof window !== 'undefined') {
    window.Phaser = global.Phaser;
}

// Set up DOM environment
document.body.innerHTML = '<div id="game-container"></div>';
