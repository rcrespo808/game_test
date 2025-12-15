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
import { setupHazardAnimations } from './spriteAnimations.js';
export class RunnerScene extends window.Phaser.Scene {
    constructor() {
        super({ key: 'RunnerScene' });
    }

    init(data) {
        // Accept stage config from MenuScene, or load from storage
        if (data && data.stageConfig) {
            this.stageConfig = data.stageConfig;
            console.log(">> Using stage config from menu:", this.stageConfig);
        } else {
            this.stageConfig = loadStageConfig();
            console.log(">> Loaded stage config from storage:", this.stageConfig);
        }
    }

    preload() {
        // Load sprite sheets
        this.load.image('hazzards_sheet', 'assets/graphics/hazzards.png');
        this.load.image('sprites_sheet', 'assets/graphics/sprites.png');
        console.log(">> Loading sprite sheets");

        // Initialize track as empty (will be populated when MIDI loads)
        this.track = { events: [], nextIndex: 0 };

        // Load MIDI file (async, non-blocking)
        this.midiLoadPromise = this.loadMIDIFile(this.stageConfig.midiPath);
    }

    loadMIDIFile(path) {
        this.midiLoadPromise = (async () => {
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
        })();
        return this.midiLoadPromise;
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
        this.songDuration = trackData.songDuration || 0;
    }

    create() {
        console.log(">> SCENE START - Modular Version");
        const width = this.game.config.width;
        const height = this.game.config.height;

        this.width = width;
        this.height = height;

        // Setup sprite animations
        setupHazardAnimations(this, 'hazzards_sheet');
        this.setupPlayerAnimations();

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
        this.songDuration = 0;
        this.songCompleted = false;
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

        // Game State
        this.isDead = false;
        this.isRunning = false;
        this.isStarting = false;
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

        this.scoreText = this.add.text(16, 40, "Score: 0", {
            fontSize: "20px",
            color: "#ffffff"
        }).setDepth(20);

        // Progress bar
        const progressBarHeight = 8;
        const progressBarY = 10;
        const progressBarWidth = width - 40;
        const progressBarX = 20;
        
        // Background bar
        this.progressBarBg = this.add.rectangle(
            progressBarX + progressBarWidth / 2,
            progressBarY + progressBarHeight / 2,
            progressBarWidth,
            progressBarHeight,
            0x333333
        ).setDepth(20);

        // Progress bar fill
        this.progressBarFill = this.add.rectangle(
            progressBarX,
            progressBarY + progressBarHeight / 2,
            0,
            progressBarHeight,
            0x0ff
        ).setOrigin(0, 0.5).setDepth(21);

        // Victory message (hidden initially)
        this.victoryText = this.add.text(width / 2, height / 2 - 50, "VICTORY!", {
            fontSize: "48px",
            color: "#0ff",
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(200).setVisible(false);

        this.victoryScoreText = this.add.text(width / 2, height / 2 + 10, "", {
            fontSize: "24px",
            color: "#fff",
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(200).setVisible(false);

        // Debug Text
        this.debugText = this.add.text(10, 10, "Debug Modular", { fontSize: '12px', fill: '#0f0' });
    }

    setupPlayerAnimations() {
        console.log(">> Setting up player animations...");
        
        if (!this.textures.exists('sprites_sheet')) {
            console.error(">> ERROR: sprites_sheet texture not found!");
            return;
        }
        
        const texture = this.textures.get('sprites_sheet');
        console.log(`>> Texture found: ${texture.width}x${texture.height}`);
        
        // Player frame coordinates: 16x16 squares, center-to-center spacing
        // Rectangle spanning two adjacent sprite centers = 26*2 = 52px
        // This means: from 8px before center1 to 8px after center2 = 52px
        // So: 8 + (center-to-center) + 8 = 52
        // Center-to-center = 52 - 16 = 36px
        // 
        // Starting from f0: if we know the actual center position, we can calculate all frames
        // To prevent left drift, we need to ensure all frames have the same center offset
        // If f0 center is at (196+8, 52+8) = (204, 60), then:
        // f1 center: (204+36, 60) = (240, 60), top-left: (240-8, 60-8) = (232, 52)
        // f2 center: (240+36, 60) = (276, 60), top-left: (276-8, 60-8) = (268, 52)
        // f3 center: (276+36, 60) = (312, 60), top-left: (312-8, 60-8) = (304, 52)
        // f4 center: (312+36, 60) = (348, 60), top-left: (348-8, 60-8) = (340, 52)
        // f5 center: (348+36, 60) = (384, 60), top-left: (384-8, 60-8) = (376, 52)
        // f6 center: (384+36, 60) = (420, 60), top-left: (420-8, 60-8) = (412, 52)
        // f7 center: (420+36, 60) = (456, 60), top-left: (456-8, 60-8) = (448, 52)
        
        // However, if there's left drift, the actual centers might be offset
        // Let's use the original f0 position and ensure consistent 36px center-to-center spacing
        const frameCoords = [
            { x: 196, y: 52, width: 16, height: 16 },  // f0: center at (204, 60)
            { x: 232, y: 52, width: 16, height: 16 },  // f1: center at (240, 60), 36px center-to-center
            { x: 268, y: 52, width: 16, height: 16 },  // f2: center at (276, 60), 36px center-to-center
            { x: 304, y: 52, width: 16, height: 16 },  // f3: center at (312, 60), 36px center-to-center
            { x: 340, y: 52, width: 16, height: 16 },  // f4: center at (348, 60), 36px center-to-center
            { x: 376, y: 52, width: 16, height: 16 },  // f5: center at (384, 60), 36px center-to-center
            { x: 412, y: 52, width: 16, height: 16 },  // f6: center at (420, 60), 36px center-to-center
            { x: 448, y: 52, width: 16, height: 16 }   // f7: center at (456, 60), 36px center-to-center
        ];
        
        const frameNames = [];
        frameCoords.forEach((coords, i) => {
            const frameName = `sprites_sheet_player_frame_${i}`;
            texture.add(frameName, 0, coords.x, coords.y, coords.width, coords.height);
            frameNames.push(frameName);
            console.log(`>> Player frame ${i} added: ${frameName}`);
        });
        
        // Create animation
        if (!this.anims.exists('player_anim')) {
            this.anims.create({
                key: 'player_anim',
                frames: frameNames.map(name => ({ key: 'sprites_sheet', frame: name })),
                frameRate: 10,
                repeat: -1
            });
            console.log(`>> Player animation 'player_anim' created with ${frameNames.length} frames`);
        }
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

    async startGame() {
        if (this.isStarting) return;
        this.isStarting = true;

        try {
            // Stop any existing audio first to allow restart (wait for cleanup)
            await this.audioManager.stopAudio();
            
            this.isRunning = false;
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

            // Reset song completion state
            this.songCompleted = false;
            this.victoryText.setVisible(false);
            this.victoryScoreText.setVisible(false);

            // Ensure MIDI is loaded before starting audio; if not, wait for it
            if (this.midiLoadPromise) {
                try {
                    await this.midiLoadPromise;
                } catch (err) {
                    console.error(">> MIDI load failed before start:", err);
                }
            }

            // Start audio playback and get the scheduled start time
            let audioStartTime = null;
            if (this.audioManager.audioEnabled && this.midiData) {
                try {
                    audioStartTime = await this.audioManager.startAudio(
                        this.midiData, 
                        this.stageConfig.params, 
                        this.trackBPM
                    );
                } catch (err) {
                    console.error(">> Audio start error (non-fatal):", err);
                }
            }

            // Capture track start time aligned with scheduled audio
            // audioStartTime is in Tone.now() seconds, convert to performance.now() milliseconds
            if (audioStartTime !== null && window.Tone) {
                const toneNow = window.Tone.now();
                const perfNow = performance.now();
                // Calculate the offset between Tone time and performance time
                const toneStartOffset = audioStartTime - toneNow;
                // Convert to milliseconds and add to current performance time
                this.trackStartMs = perfNow + (toneStartOffset * 1000);
                console.log(`>> Track start time synced: Tone=${audioStartTime.toFixed(3)}s, Perf=${this.trackStartMs.toFixed(1)}ms`);
            } else {
                // Fallback to current time if audio failed
                this.trackStartMs = performance.now();
                console.log(`>> Track start time (no audio): ${this.trackStartMs.toFixed(1)}ms`);
            }

            this.isRunning = true;

            // Remove old timers (if any)
            if (this.spawnTimer) this.spawnTimer.remove(false);
            if (this.greenTimer) this.greenTimer.remove(false);
            if (this.redTimer) this.redTimer.remove(false);
        } catch (err) {
            console.error(">> Error in startGame:", err);
            this.isRunning = false;
        } finally {
            this.isStarting = false;
        }
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

        // Update progress bar
        if (this.isRunning && this.songDuration > 0) {
            const progress = Math.min(1, trackTime / this.songDuration);
            const progressBarWidth = (this.width - 40) * progress;
            this.progressBarFill.width = progressBarWidth;

            // Check if song completed
            if (progress >= 1 && !this.songCompleted) {
                this.handleSongComplete();
            }
        } else if (!this.isRunning) {
            // Reset progress bar when not running
            this.progressBarFill.width = 0;
        }

        if (this.isDead || !this.isRunning || this.songCompleted) return;

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

    handleSongComplete() {
        if (this.songCompleted || this.isDead) return;
        
        this.songCompleted = true;
        this.isRunning = false;

        // Stop audio
        this.audioManager.stopAudio();

        // Show victory message
        this.victoryText.setVisible(true);
        this.victoryScoreText.setText(`Final Score: ${this.greenScore}`).setVisible(true);

        // Fade in animation
        this.victoryText.setAlpha(0);
        this.victoryScoreText.setAlpha(0);
        this.tweens.add({
            targets: [this.victoryText, this.victoryScoreText],
            alpha: 1,
            duration: 500,
            ease: "Power2"
        });

        // Return to menu after delay
        this.time.delayedCall(3000, () => {
            this.returnToMenu();
        });
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

    async returnToMenu() {
        await this.audioManager.stopAudio();
        this.scene.start('MenuScene');
    }

    showRestartButton() {
        this.restartText = this.add.text(
            this.width / 2,
            this.height / 2,
            "Back to Menu",
            { fontSize: "24px", color: "#ffffff" }
        ).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });

        this.restartText.on("pointerdown", async () => {
            await this.returnToMenu();
        });
    }

    async shutdown() {
        // Cleanup when scene is destroyed
        await this.audioManager.stopAudio();
    }
}
