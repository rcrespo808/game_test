# Refactoring Summary

## Overview
The game code has been refactored from a single large `main.js` file (1156 lines) into a modular structure organized by functionality.

## New File Structure

```
src/
├── config/
│   ├── gameConfig.js         # Difficulty presets and game settings
│   └── stageConfig.js        # Stage configuration management (load, save, export, import)
├── audio/
│   └── audioManager.js       # Audio playback management using Tone.js
├── midi/
│   ├── midiLoader.js         # MIDI file loading from filesystem
│   ├── midiManifest.js       # MIDI manifest management
│   └── midiProcessor.js      # MIDI data processing and event generation
├── game/
│   ├── MenuScene.js          # Pre-game menu (MIDI + difficulty selection)
│   ├── RunnerScene.js        # Main Phaser scene (orchestrator)
│   ├── grid.js               # Grid positioning and cell calculations
│   ├── player.js             # Player movement and input handling
│   ├── hazards.js            # Hazard spawning, movement, collision
│   └── hotspots.js           # Green/red hotspot management
└── ui/
    └── editor.js             # Track editor UI management

main.js                        # Entry point (now just initializes Phaser)
```

## Changes Made

### Module Extraction
1. **Config Modules** (`src/config/`)
   - **gameConfig.js**: Difficulty presets with game settings (Easy, Normal, Hard, Extreme)
     - Settings stored in code, not generated
     - Each difficulty is independent configuration
   - **stageConfig.js**: Default config and persistence
     - Handles localStorage persistence
     - JSON import/export functionality

2. **Audio Module** (`src/audio/audioManager.js`)
   - Created `AudioManager` class
   - Encapsulates all Tone.js audio operations
   - Manages audio state and volume

3. **MIDI Modules** (`src/midi/`)
   - **midiManifest.js**: MIDI file manifest management
   - Separated loading (`midiLoader.js`) from processing (`midiProcessor.js`)
   - Processing module handles event generation and filtering

4. **Game System Modules** (`src/game/`)
   - **MenuScene**: Pre-game menu for MIDI file and difficulty selection
   - **RunnerScene**: Main game scene orchestrator
   - **GridManager**: Grid calculations and positioning
   - **PlayerManager**: Player movement, input, positioning
   - **HazardManager**: Hazard lifecycle and collision detection
   - **HotspotManager**: Hotspot spawning and management

5. **UI Module** (`src/ui/editor.js`)
   - Extracted all editor UI logic into `EditorUI` class
   - Handles form population and event bindings

6. **RunnerScene** (`src/game/RunnerScene.js`)
   - Now orchestrates all systems
   - Much cleaner and focused on coordination
   - Reduced from 1156 lines to ~250 lines

### Recent Refactoring (Menu System)

7. **Menu System Refactor**
   - Removed legacy stage manifest system
   - Replaced with MIDI file + difficulty selection
   - Difficulty settings stored in `gameConfig.js` (not generated)
   - Menu shows MIDI files with difficulty buttons for each
   - Removed stage manifest generation scripts
   - Simplified configuration flow

### Entry Point
- `main.js` is now a simple entry point that imports `RunnerScene` and initializes Phaser
- Changed to ES module format

### HTML Updates
- Updated `index.html` to use `<script type="module">` for ES modules

## Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Modules can be tested in isolation
3. **Reusability**: Components can be reused or extended easily
4. **Readability**: Smaller, focused files are easier to understand
5. **Collaboration**: Multiple developers can work on different modules

## Migration Notes

### For Tests
Tests may need to be updated to import from the new module paths:
```javascript
import { RunnerScene } from '../src/game/RunnerScene.js';
```

### For Development
All imports use ES6 module syntax:
```javascript
import { SomeClass } from './path/to/module.js';
```

## Next Steps

1. Update test files to use new module structure
2. Add unit tests for individual modules
3. Consider adding TypeScript for better type safety
4. Add JSDoc comments for better IDE support
