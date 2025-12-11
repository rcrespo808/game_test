# Testing Guide

This directory contains tests for the 3x3 Grid Runner game.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test
```

3. Run tests in watch mode:
```bash
npm run test:watch
```

4. Generate coverage report:
```bash
npm run test:coverage
```

## Test Structure

- `setup.js` - Jest configuration and global test setup
- `mocks/` - Mock implementations of Phaser 3 components
- `RunnerScene.test.js` - Tests for the main game scene
- `utils/` - Utility functions and helper tests

## Writing Tests

When writing tests for game logic:

1. Use the Phaser mocks in `mocks/phaser.mock.js` to avoid requiring the full Phaser library
2. Test game logic independently of Phaser rendering
3. Focus on:
   - State management (game start, death, restart)
   - Collision detection
   - Input handling
   - Hazard spawning and cleanup
   - Grid calculations

## Example Test

```javascript
describe('RunnerScene', () => {
  let scene;

  beforeEach(() => {
    // Setup scene instance
  });

  test('should initialize grid correctly', () => {
    // Test implementation
  });
});
```

