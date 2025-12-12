/**
 * RunnerScene - Main game scene
 * Orchestrates all game systems
 */

import { loadStageConfig } from '../config/stageConfig.js';
import { loadMIDIFile as loadMIDI } from '../midi/midiLoader.js';
import { buildMIDIEvents } from '../midi/midiProcessor.js';
import { AudioManager } from '../audio/audioManager.js';
import { GridManager } from './grid.js';
import { PlayerManager } from './player.js';
import { HazardManager } from './hazards.js';
import { HotspotManager } from './hotspots.js';
import { EditorUI } from '../ui/editor.js';

export class RunnerScene extends window.Phaser.Scene {
    constructor() {
        super({ key: 'RunnerScene' });
    }

    preload() {
        // ASSET MANAGEMENT: Generate Texture
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xff4444);
        graphics.fillRect(0, 0, 40, 40);
        graphics.generateTexture('hazard_texture', 40, 40);
        console.log(">> Texture 'hazard_texture' generated");

        // Load stage config
        this.stageConfig = loadStageConfig();
        console.log(">> Loaded stage config:", this.stageConfig);

        // Initialize track as empty (will be populated when MIDI loads)
        this.track = { events: [], nextIndex: 0 };

        // Load MIDI file (async, non-blocking)
        this.loadMIDIFile(this.stageConfig.midiPath).catch(err => {
            console.error(">> MIDI load error:", err);
            // Keep empty track on error
        });
    }

    async loadMIDIFile(path) {
        try {
            const midi = await loadMIDI(path);
            this.midiData = midi;
            this.buildMIDIEvents();
            console.log(">> MIDI loaded:", midi.name, "tracks:", midi.tracks.length);
        } catch (err) {
            console.error(">> MIDI load failed:", err);
            this.midiData = null;
            this.track = { events: [], nextIndex: 0 };
        }
    }

    buildMIDIEvents() {
        if (!this.midiData) {
            this.track = { events: [], nextIndex: 0 };
            this.trackBPM = 120;
            this.secondsPerBeat = 0.5;
            return;
        }

        const trackData = buildMIDIEvents(this.midiData, this.stageConfig.params);
        this.track = {
            midi: trackData.midi,
            events: trackData.events,
            nextIndex: 0
        };
        this.trackBPM = trackData.bpm;
        this.secondsPerBeat = trackData.secondsPerBeat;
    }

    create() {
        console.log(">> SCENE START - Modular Version");
        const width = this.game.config.width;
        const height = this.game.config.height;

        this.width = width;
        this.height = height;

        // Initialize managers
        this.gridManager = new GridManager(width, height, this.stageConfig.params);
        this.playerManager = new PlayerManager(
            this, 
            this.gridManager, 
            this.gridManager.getCenterRow(), 
            this.gridManager.getCenterColumn()
        );
        this.hazardManager = new HazardManager(this, this.gridManager, this.stageConfig);
        this.hotspotManager = new HotspotManager(this, this.gridManager, this.stageConfig);
        this.audioManager = new AudioManager();
        
        // Set audio manager initial state
        this.audioManager.setEnabled(this.stageConfig.params.enableAudio !== false);
        this.audioManager.setVolume(this.stageConfig.params.audioVolume || 70);

        // Lane visuals
        this.drawGridLines();

        // MIDI Track State
        this.trackStartMs = null;
        if (!this.track) {
            this.track = { events: [], nextIndex: 0 };
        }
        if (!this.midiData) {
            this.midiData = null;
        }
        if (!this.trackBPM) {
            this.trackBPM = 120;
            this.secondsPerBeat = 0.5;
        }

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.editorKey = this.input.keyboard.addKey('E');

        // Game State
        this.isDead = false;
        this.isRunning = false;
        this.greenScore = 0;

        // UI
        this.startText = this.add.text(width / 2, height / 2, "Click to Start", { fontSize: "24px", color: "#ffffff" })
            .setOrigin(0.5)
            .setDepth(100)
            .setInteractive({ useHandCursor: true });

        this.startText.on("pointerdown", () => {
            if (this.isRunning || this.isDead) return;
            this.startGame();
        });

        this.scoreText = this.add.text(16, 16, "Score: 0", {
            fontSize: "20px",
            color: "#ffffff"
        }).setDepth(20);

        // Editor UI Setup
        this.editorUI = new EditorUI(this);
        this.editorUI.setup();

        // Debug Text
        this.debugText = this.add.text(10, 10, "Debug Modular", { fontSize: '12px', fill: '#0f0' });
    }

    drawGridLines() {
        if (this.gridLines && Array.isArray(this.gridLines)) {
            this.gridLines.forEach(line => line.destroy());
        }
        this.gridLines = [];

        for (let y of this.gridManager.lanes) {
            this.gridLines.push(
                this.add.line(0, 0, 0, y, this.width, y, 0xffffff, 0.1).setOrigin(0, 0).setDepth(0)
            );
        }

        for (let x of this.gridManager.columns) {
            this.gridLines.push(
                this.add.line(0, 0, x, 0, x, this.height, 0xffffff, 0.08).setOrigin(0, 0).setDepth(0)
            );
        }
    }

    rebuildGridLayout() {
        this.gridManager = new GridManager(this.width, this.height, this.stageConfig.params);

        this.hazardManager.gridManager = this.gridManager;
        this.hazardManager.config = this.stageConfig.params;
        this.hazardManager.clear();

        this.hotspotManager.gridManager = this.gridManager;
        this.hotspotManager.config = this.stageConfig.params;
        this.hotspotManager.reset();

        this.playerManager.gridManager = this.gridManager;
        this.playerManager.reset(
            this.gridManager.getCenterRow(), 
            this.gridManager.getCenterColumn()
        );

        this.drawGridLines();
    }

    onStageConfigUpdated() {
        this.hazardManager.config = this.stageConfig.params;
        this.hotspotManager.config = this.stageConfig.params;

        const rows = this.stageConfig.params.gridRows || 3;
        const cols = this.stageConfig.params.gridCols || 3;
        if (rows !== this.gridManager.getRowCount() || cols !== this.gridManager.getColumnCount()) {
            this.rebuildGridLayout();
        }
    }

    startGame() {
        // Stop any existing audio first to allow restart
        this.audioManager.stopAudio();
        
        this.isRunning = true;
        this.isDead = false;
        this.startText.setVisible(false);
        this.greenScore = 0;
        this.scoreText.setText("Score: 0");

        this.playerManager.reset(
            this.gridManager.getCenterRow(), 
            this.gridManager.getCenterColumn()
        );

        // Reset managers
        this.hazardManager.clear();
        this.hotspotManager.reset();

        // Reset MIDI track
        if (this.track) {
            this.track.nextIndex = 0;
            console.log(`>> Reset track, ${this.track.events.length} events ready`);
        } else {
            console.warn(">> No track available when starting game!");
            this.track = { events: [], nextIndex: 0 };
        }

        // Capture track start time
        this.trackStartMs = performance.now();

        // Start audio playback (non-blocking)
        if (this.audioManager.audioEnabled && this.midiData) {
            this.audioManager.startAudio(
                this.midiData, 
                this.stageConfig.params, 
                this.trackBPM
            ).catch(err => {
                console.error(">> Audio start error (non-fatal):", err);
            });
        }

        // Remove old timers (if any)
        if (this.spawnTimer) this.spawnTimer.remove(false);
        if (this.greenTimer) this.greenTimer.remove(false);
        if (this.redTimer) this.redTimer.remove(false);
    }

    getTrackTimeSec() {
        if (!this.trackStartMs) return 0;
        return (performance.now() - this.trackStartMs) / 1000;
    }

    update(time, delta) {
        // Debug update
        const trackTime = this.getTrackTimeSec();
        this.debugText.setText(
            `Hazards: ${this.hazardManager.getCount()} | ` +
            `Track: ${trackTime.toFixed(1)}s | ` +
            `FPS: ${(1000 / delta).toFixed(0)}`
        );

        if (this.isDead || !this.isRunning) return;

        // 1. Player Input
        const { lane, column } = this.playerManager.handleInput(this.cursors);

        // 2. MIDI Event-Driven Hazard Spawning
        if (this.track && this.track.events && this.track.events.length > 0) {
            const config = this.stageConfig.params;
            const t = this.getTrackTimeSec();
            const lookahead = config.lookaheadSec;

            while (this.track.nextIndex < this.track.events.length) {
                const evt = this.track.events[this.track.nextIndex];
                if (evt && evt.timeSec <= t + lookahead) {
                    this.hazardManager.spawnHazardFromEvent(evt);
                    this.track.nextIndex++;
                } else {
                    break;
                }
            }
        } else {
            // Fallback: if no MIDI events, log for debugging
            if (this.isRunning && !this.track) {
                console.warn(">> No track data available for hazard spawning");
            }
        }

        // 3. MIDI Beat-Driven Hotspot Spawning
        this.hotspotManager.updateHotspotsFromBeats(
            this.getTrackTimeSec(), 
            this.trackBPM, 
            this.secondsPerBeat
        );

        // 4. Grid hotspot checks
        if (this.hotspotManager.checkGreenHotspot(lane, column)) {
            this.greenScore += 1;
            this.scoreText.setText("Score: " + this.greenScore);
        }

        if (this.hotspotManager.checkRedHotspots(lane, column)) {
            this.triggerGridDeath();
        }

        // 5. Hazard Update (Motion + Cleanup + Collision)
        const collisions = this.hazardManager.update(
            delta, 
            this.playerManager.getSprite()
        );
        
        if (collisions.length > 0) {
            this.handlePlayerHit();
        }
    }

    triggerGridDeath() {
        if (this.isDead) return;
        this.handlePlayerHit();
    }

    handlePlayerHit() {
        if (this.isDead) return;
        this.isDead = true;
        this.isRunning = false;

        // Stop audio
        this.audioManager.stopAudio();

        if (this.spawnTimer) this.spawnTimer.remove(false);
        if (this.greenTimer) this.greenTimer.remove(false);
        if (this.redTimer) this.redTimer.remove(false);

        // Pop Animation
        const playerSprite = this.playerManager.getSprite();
        this.tweens.add({
            targets: playerSprite,
            scale: 1.6,
            alpha: 0,
            duration: 250,
            ease: "Back.easeOut",
            onComplete: () => {
                this.showRestartButton();
            }
        });
    }

    showRestartButton() {
        this.restartText = this.add.text(
            this.width / 2,
            this.height / 2,
            "Restart",
            { fontSize: "24px", color: "#ffffff" }
        ).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });

        this.restartText.on("pointerdown", () => {
            this.audioManager.stopAudio();
            this.scene.restart();
        });
    }

    shutdown() {
        // Cleanup when scene is destroyed
        this.audioManager.stopAudio();
    }
}
