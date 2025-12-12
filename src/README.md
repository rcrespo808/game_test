# Game Module Structure

This directory contains the modularized game code, organized by functionality.

## Directory Structure

```
src/
├── config/          # Configuration management
│   └── stageConfig.js
├── audio/           # Audio playback management
│   └── audioManager.js
├── midi/            # MIDI file handling
│   ├── midiLoader.js
│   └── midiProcessor.js
├── game/            # Core game systems
│   ├── RunnerScene.js
│   ├── grid.js
│   ├── player.js
│   ├── hazards.js
│   └── hotspots.js
└── ui/              # User interface
    └── editor.js
```

## Module Descriptions

### config/stageConfig.js
Manages stage configuration including:
- Default stage config
- Loading/saving from localStorage
- Import/export as JSON files

### audio/audioManager.js
Handles MIDI audio playback using Tone.js:
- Audio playback start/stop
- Volume control
- Audio state management

### midi/
- **midiLoader.js**: Loads MIDI files from the filesystem
- **midiProcessor.js**: Converts MIDI data into game events with filtering

### game/
- **RunnerScene.js**: Main Phaser scene that orchestrates all systems
- **grid.js**: Grid positioning and cell calculations
- **player.js**: Player movement and input handling
- **hazards.js**: Hazard spawning, movement, and collision detection
- **hotspots.js**: Green/red hotspot spawning and management

### ui/editor.js
Manages the track editor UI:
- Form population
- Event handlers
- Config saving/loading

## Usage

The main entry point is `main.js` which imports `RunnerScene` and initializes the Phaser game.

```javascript
import { RunnerScene } from './src/game/RunnerScene.js';
```

## Module Dependencies

- `RunnerScene` depends on all other modules
- `EditorUI` depends on `stageConfig` and `RunnerScene`
- Game systems (player, hazards, hotspots) depend on `grid`
- All modules use ES6 imports/exports
