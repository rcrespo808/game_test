# Grid Runner

A rhythm-based grid runner game built with Phaser 3, where players navigate a grid while avoiding hazards that spawn in sync with MIDI music. Features dynamic difficulty settings and MIDI-driven gameplay.

## 🎮 Play Now

**[▶️ Play Grid Runner](https://rcrespo808.github.io/game_test/)** - Play the game directly in your browser!

> **⚠️ Setup Required**: To enable the live game demo, you need to:
> 1. Go to repository **Settings → Pages** → https://github.com/rcrespo808/game_test/settings/pages
> 2. Under **Source**, select **"GitHub Actions"** (not "Deploy from a branch")
> 3. Save and wait for deployment to complete
> 
> See [GitHub Pages Setup Guide](docs/GITHUB_PAGES_SETUP.md) for detailed instructions.

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

## Screenshots

### Menu Screen
![Menu Screen](docs/images/menu-screenshot.png)

### Gameplay
![Gameplay](docs/images/gameplay-screenshot.png)

> **Adding Screenshots**: 
> 1. Take screenshots of your game (menu and gameplay)
> 2. Save them in `docs/images/` folder
> 3. Update the image paths above to match your filenames
> 4. Recommended formats: PNG (best quality) or JPG (smaller size)

## Game Features

### Menu System
- **MIDI File Selection**: Choose from available MIDI tracks
- **Difficulty Selection**: Four difficulty levels (Easy, Normal, Hard, Extreme)
  - Each difficulty has independent game settings (hazard speed, density, grid size, etc.)
  - Settings are stored in `src/config/gameConfig.js` (not generated)
- **Visual Feedback**: Difficulty buttons show color-coded indicators with hover states

### Core Gameplay
- **MIDI-Driven**: Hazards and events spawn based on MIDI note events
- **Grid Navigation**: Player moves on a configurable grid (3x3 to 5x5)
- **Hazard System**: Moving hazards that spawn from the sides
- **Hotspot System**: Green (safe) and red (danger) hotspots that appear on grid cells
- **Audio Playback**: Real-time MIDI audio playback using Tone.js

### Configuration System
- **Difficulty Presets**: Predefined settings stored in code (`src/config/gameConfig.js`)
- **Game Settings**: Hazard speed, density, lookahead, grid size, and more
- **Config Persistence**: Game configurations saved to localStorage
- **Editor UI**: In-game editor for fine-tuning settings (press 'E' key)

## Adding MIDI Files

To add new MIDI files to the game:

1. Place `.mid` files in the `assets/midi/` directory
2. Run `npm run generate-midi-manifest` to automatically update the MIDI manifest
3. The new MIDI files will appear in the menu with all difficulty options

### MIDI Manifest Format

The MIDI manifest (`assets/midi/manifest.json`) is automatically generated but can be manually edited:

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

### Difficulty Configuration

Difficulty settings are defined in `src/config/gameConfig.js`. Each difficulty includes:
- Hazard speed
- Note density (0.0-1.0)
- Lookahead time
- Maximum events per second
- Lane jitter
- Grid size (rows × columns)

## Project Structure

```
src/
├── config/          # Configuration management
│   ├── gameConfig.js    # Difficulty presets and game settings
│   └── stageConfig.js   # Default config and persistence
├── audio/           # Audio playback management
├── midi/            # MIDI file handling and processing
├── game/            # Core game systems
│   ├── MenuScene.js     # Pre-game menu (MIDI + difficulty selection)
│   ├── RunnerScene.js   # Main game scene
│   ├── grid.js          # Grid positioning
│   ├── player.js        # Player movement
│   ├── hazards.js       # Hazard spawning and collision
│   └── hotspots.js      # Hotspot management
└── ui/              # User interface
    └── editor.js        # In-game editor overlay
```

See `src/README.md` for detailed module documentation.
