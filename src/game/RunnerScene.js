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
        // ASSET MANAGEMENT: Generate Texture
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xff4444);
        graphics.fillRect(0, 0, 40, 40);
        graphics.generateTexture('hazard_texture', 40, 40);
        console.log(">> Texture 'hazard_texture' generated");

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
