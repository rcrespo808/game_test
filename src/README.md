# Game Module Structure

This directory contains the modularized game code, organized by functionality.

## Directory Structure

```
src/
├── config/          # Configuration management
│   ├── gameConfig.js      # Difficulty presets and game settings
│   └── stageConfig.js     # Default config, persistence, import/export
├── audio/           # Audio playback management
│   └── audioManager.js    # Tone.js audio playback
├── midi/            # MIDI file handling
│   ├── midiLoader.js      # MIDI file loading
│   ├── midiManifest.js    # MIDI manifest management
│   └── midiProcessor.js   # MIDI to game events conversion
├── game/            # Core game systems
│   ├── MenuScene.js       # Pre-game menu (MIDI + difficulty selection)
│   ├── RunnerScene.js     # Main game scene orchestrator
│   ├── grid.js            # Grid positioning and cell calculations
│   ├── player.js          # Player movement and input handling
│   ├── hazards.js         # Hazard spawning, movement, collision
│   └── hotspots.js        # Green/red hotspot management
```

## Module Descriptions

### config/
- **gameConfig.js**: Defines difficulty presets (Easy, Normal, Hard, Extreme) with game settings
  - Settings include: hazard speed, density, grid size, lookahead, lane jitter, etc.
  - Each difficulty is a complete game configuration independent of MIDI tracks
  - Functions: `getAvailableDifficulties()`, `getDifficultyConfig()`, `createGameConfig()`
- **stageConfig.js**: Manages stage configuration including:
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
- **midiManifest.js**: Manages MIDI file manifest (listing available MIDI files)
- **midiProcessor.js**: Converts MIDI data into game events with filtering

### game/
- **MenuScene.js**: Pre-game menu scene for MIDI file and difficulty selection
  - Displays available MIDI files from manifest
  - Shows difficulty buttons (Easy, Normal, Hard, Extreme) for each MIDI file
  - Creates game configuration from selections
- **RunnerScene.js**: Main Phaser scene that orchestrates all systems
  - Coordinates MIDI playback, hazard spawning, player movement, collision detection
- **grid.js**: Grid positioning and cell calculations
- **player.js**: Player movement and input handling
- **hazards.js**: Hazard spawning, movement, and collision detection
- **hotspots.js**: Green/red hotspot spawning and management

## Usage

The main entry point is `main.js` which imports `MenuScene` and `RunnerScene` and initializes the Phaser game.

```javascript
import { MenuScene } from './src/game/MenuScene.js';
import { RunnerScene } from './src/game/RunnerScene.js';
```

The game flow:
1. **MenuScene**: Player selects MIDI file and difficulty
2. **RunnerScene**: Main gameplay with MIDI-driven hazards and events

## Module Dependencies

- `MenuScene` depends on `midiManifest` and `gameConfig`
- `RunnerScene` depends on all other modules (audio, midi, game systems)
- Game systems (player, hazards, hotspots) depend on `grid`
- All modules use ES6 imports/exports

## Configuration Flow

1. **MIDI Files**: Listed in `assets/midi/manifest.json` (generated via script)
2. **Difficulty Settings**: Defined in `src/config/gameConfig.js` (stored in code)
3. **Game Config**: Created by combining MIDI file + difficulty selection
4. **Persistence**: Config saved to localStorage via `stageConfig.js`
