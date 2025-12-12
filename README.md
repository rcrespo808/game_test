# 3x3 Grid Runner

A minimalist Phaser 3 game with a 3x3 grid, sliding triangle hazards, and geometric aesthetics.

## How to Run

1.  Open this folder in a terminal.
2.  Serve the directory using a simple HTTP server. For example:
    *   Python: `python -m http.server`
    *   Node (http-server): `npx http-server`
    *   Or use npm: `npm run serve`
3.  Open `http://localhost:8000` (or whatever port is shown) in your browser.

## Testing

This project includes a comprehensive testing setup using Jest.

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test
```

3. Run tests in watch mode (for development):
```bash
npm run test:watch
```

4. Generate coverage report:
```bash
npm run test:coverage
```

### Test Structure

- `tests/` - All test files
  - `setup.js` - Jest configuration and global setup
  - `mocks/` - Mock implementations of Phaser 3
  - `RunnerScene.test.js` - Main game scene tests
  - `utils/` - Utility function tests
  - `integration/` - Integration tests

See `tests/README.md` for more detailed testing documentation.

## Adding MIDI Files

To add new MIDI files to the game:

1. Place `.mid` files in the `assets/midi/` directory
2. Run `npm run generate-midi-manifest` to automatically update the manifest
3. The new MIDI files will appear in the editor's MIDI file dropdown

The manifest file (`assets/midi/manifest.json`) can also be edited manually:

```json
{
  "midiFiles": [
    {
      "name": "Your Track Name",
      "filename": "your-file.mid",
      "path": "assets/midi/your-file.mid"
    }
  ]
}
```
