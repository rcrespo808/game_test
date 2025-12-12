/**
 * MenuScene - Pre-game menu for track and difficulty selection
 */

import { getAllMIDIFiles } from '../midi/midiManifest.js';
import { getAllStages, getStagesByMidiPath } from '../config/stageManifest.js';
import { createTrackConfig, getAvailableDifficulties } from '../config/trackConfigs.js';
import { saveStageConfig } from '../config/stageConfig.js';

export class MenuScene extends window.Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.midiFiles = [];
        this.stages = [];
        this.selectedMidiPath = null;
        this.selectedDifficulty = 'normal';
        this.selectedTrackIndex = -1;
        this.selectedStageId = null;
        this.midiData = null;
        this.mode = 'stages'; // 'stages' or 'custom'
    }

    async create() {
        const width = this.game.config.width;
        const height = this.game.config.height;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x111111);

        // Title
        const titleText = this.add.text(width / 2, 40, 'Grid Runner', {
            fontSize: '48px',
            color: '#0ff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Load MIDI files and stages
        try {
            this.midiFiles = await getAllMIDIFiles();
            console.log(`>> Loaded ${this.midiFiles.length} MIDI files`);
        } catch (err) {
            console.error('>> Failed to load MIDI manifest:', err);
            this.midiFiles = [];
        }

        try {
            this.stages = await getAllStages();
            console.log(`>> Loaded ${this.stages.length} stage configurations`);
        } catch (err) {
            console.error('>> Failed to load stage manifest:', err);
            this.stages = [];
        }

        // Create mode toggle (Stages vs Custom)
        this.createModeToggle(width, height);

        // Create stage selection area (default view)
        this.createStageSelection(width, height);
        
        // Create custom track selection area (hidden by default)
        this.createCustomSelection(width, height);
        
        // Create track index selection (for multi-track MIDI files)
        this.trackIndexSelection = null;

        // Start button
        this.startButton = this.add.rectangle(width / 2, height - 80, 200, 50, 0x0a5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.startGame())
            .on('pointerover', () => this.startButton.setFillStyle(0x0c7))
            .on('pointerout', () => this.startButton.setFillStyle(0x0a5));

        this.add.text(width / 2, height - 80, 'START', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Instructions (will be updated based on mode)
        this.instructionsText = this.add.text(width / 2, height - 30, 'Select a preset stage or use custom configuration', {
            fontSize: '14px',
            color: '#888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    createTrackSelection(width, height) {
        const startX = 50;
        const startY = 120;
        const itemHeight = 50;
        
        // Track selection title
        this.add.text(startX, startY - 30, 'Select Track:', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });

        // Track items (directly added to scene, not in container for simplicity)
        this.trackItems = [];
        this.midiFiles.forEach((file, index) => {
            const y = startY + index * itemHeight;
            const item = this.createTrackItem(file, startX, y, itemHeight - 5);
            this.trackItems.push({ file, item });
        });

        // Select first track by default
        if (this.midiFiles.length > 0) {
            this.selectTrack(this.midiFiles[0]);
        }
    }

    createTrackItem(file, x, y, height) {
        const width = 300;
        
        // Background rectangle
        const bg = this.add.rectangle(x + width / 2, y, width, height, 0x222222)
            .setStrokeStyle(2, 0x555555)
            .setInteractive({ useHandCursor: true });
        
        // Track name
        const nameText = this.add.text(x + 10, y - height / 4, file.name, {
            fontSize: '16px',
            color: '#0ff',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Filename (smaller)
        const fileText = this.add.text(x + 10, y + height / 4, file.filename, {
            fontSize: '12px',
            color: '#888',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Store references on bg for easy access
        bg.file = file;
        bg.nameText = nameText;
        bg.fileText = fileText;

        // Click handler
        bg.on('pointerdown', () => {
            if (this.mode === 'custom') {
                this.selectCustomTrack(file);
            } else {
                this.selectTrack(file);
                this.loadTrackData(file);
            }
        });

        return { bg, nameText, fileText };
    }

    selectTrack(file) {
        // This is for the old track selection - keeping for compatibility
        // Update selection
        this.selectedMidiPath = file.path;
        
        // Update visuals if trackItems exists (legacy)
        if (this.trackItems) {
            this.trackItems.forEach(({ file: f, item }) => {
                const bg = item.bg;
                if (f.path === file.path) {
                    bg.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
                    item.nameText.setColor('#fff');
                } else {
                    bg.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
                    item.nameText.setColor('#0ff');
                }
            });
        }
    }

    async loadTrackData(file) {
        try {
            // Load MIDI to get track count
            const { loadMIDIFile } = await import('../midi/midiLoader.js');
            this.midiData = await loadMIDIFile(file.path);
            
            // Create track index selection if multiple tracks
            if (this.midiData && this.midiData.tracks && this.midiData.tracks.length > 1) {
                this.createTrackIndexSelection();
            } else {
                this.selectedTrackIndex = -1;
                if (this.trackIndexSelection) {
                    this.trackIndexSelection.destroy(true);
                    this.trackIndexSelection = null;
                }
            }
        } catch (err) {
            console.error('>> Failed to load MIDI data:', err);
            this.midiData = null;
        }
    }

    createTrackIndexSelection() {
        const startX = 400;
        const startY = 120;
        
        // Destroy existing selection if any
        if (this.trackIndexSelection) {
            this.trackIndexSelection.forEach(item => {
                if (item.bg) item.bg.destroy();
                if (item.text) item.text.destroy();
            });
        }

        this.trackIndexSelection = [];

        // Title
        const title = this.add.text(startX, startY - 30, 'Select MIDI Track:', {
            fontSize: '20px',
            color: '#fff',
            fontFamily: 'Arial'
        });
        this.trackIndexSelectionTitle = title;

        // Track options
        const allTracksOption = this.createTrackIndexOption('All Tracks', -1, startX, startY);
        this.trackIndexSelection.push(allTracksOption);
        
        this.midiData.tracks.forEach((track, index) => {
            const y = startY + (index + 1) * 35;
            const noteCount = track.notes ? track.notes.length : 0;
            const label = `Track ${index}${track.name ? `: ${track.name}` : ''} (${noteCount} notes)`;
            const option = this.createTrackIndexOption(label, index, startX, y);
            this.trackIndexSelection.push(option);
        });

        // Select "All Tracks" by default
        this.selectTrackIndex(-1);
    }

    createTrackIndexOption(label, index, x, y) {
        const width = 350;
        const height = 30;
        
        const bg = this.add.rectangle(x + width / 2, y, width, height, 0x222222)
            .setStrokeStyle(2, 0x555555)
            .setInteractive({ useHandCursor: true });
        
        const text = this.add.text(x + 10, y, label, {
            fontSize: '14px',
            color: '#ccc',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        bg.trackIndex = index;
        bg.text = text;

        bg.on('pointerdown', () => {
            this.selectTrackIndex(index);
        });

        return { bg, text, trackIndex: index };
    }

    selectTrackIndex(index) {
        this.selectedTrackIndex = index;
        
        if (!this.trackIndexSelection) return;

        this.trackIndexSelection.forEach(item => {
            if (item.trackIndex !== undefined) {
                const bg = item.bg;
                const text = item.text;
                if (item.trackIndex === index) {
                    bg.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
                    text.setColor('#fff');
                } else {
                    bg.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
                    text.setColor('#ccc');
                }
            }
        });
    }

    createDifficultySelection(width, height) {
        const startX = 50;
        const startY = 450;
        const spacing = 160;

        this.add.text(startX, startY - 30, 'Select Difficulty:', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });

        const difficulties = getAvailableDifficulties();
        this.difficultyItems = [];

        difficulties.forEach((diff, index) => {
            const x = startX + index * spacing;
            const item = this.createDifficultyItem(diff, x, startY);
            this.difficultyItems.push({ key: diff.key, item });
        });

        // Select normal by default
        this.selectDifficulty('normal');
    }

    createDifficultyItem(difficulty, x, y) {
        const width = 140;
        const height = 80;

        const bg = this.add.rectangle(x, y, width, height, 0x222222)
            .setStrokeStyle(2, 0x555555)
            .setInteractive({ useHandCursor: true });

        const nameText = this.add.text(x, y - 15, difficulty.name, {
            fontSize: '20px',
            color: '#ff0',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const descText = this.add.text(x, y + 15, difficulty.description, {
            fontSize: '12px',
            color: '#888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            if (this.mode === 'custom') {
                this.selectCustomDifficulty(difficulty.key);
            } else {
                this.selectDifficulty(difficulty.key);
            }
        });

        return { bg, nameText, descText, key: difficulty.key };
    }

    selectDifficulty(key) {
        this.selectedDifficulty = key;

        this.difficultyItems.forEach(({ key: k, item }) => {
            const bg = item.bg;
            if (k === key) {
                bg.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
                item.nameText.setColor('#fff');
                item.descText.setColor('#ddd');
            } else {
                bg.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
                item.nameText.setColor('#ff0');
                item.descText.setColor('#888');
            }
        });
    }

    createModeToggle(width, height) {
        const startX = width / 2 - 150;
        const y = 90;
        const buttonWidth = 150;
        const buttonHeight = 35;

        // Stages button
        this.stagesButton = this.add.rectangle(startX, y, buttonWidth, buttonHeight, 0x0a5)
            .setStrokeStyle(2, 0x0ff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.setMode('stages'));

        this.add.text(startX, y, 'PRESETS', {
            fontSize: '18px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Custom button
        this.customButton = this.add.rectangle(startX + buttonWidth, y, buttonWidth, buttonHeight, 0x222222)
            .setStrokeStyle(2, 0x555555)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.setMode('custom'));

        this.add.text(startX + buttonWidth, y, 'CUSTOM', {
            fontSize: '18px',
            color: '#888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    setMode(mode) {
        this.mode = mode;

        if (mode === 'stages') {
            // Show stages, hide custom
            if (this.stageSelectionContainer) {
                this.stageSelectionContainer.setVisible(true);
            }
            if (this.customSelectionContainer) {
                this.customSelectionContainer.setVisible(false);
            }
            
            // Update buttons
            this.stagesButton.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
            this.customButton.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
            
            // Update instructions
            if (this.instructionsText) {
                this.instructionsText.setText('Select a preset stage, then click START');
            }
        } else {
            // Show custom, hide stages
            if (this.stageSelectionContainer) {
                this.stageSelectionContainer.setVisible(false);
            }
            if (this.customSelectionContainer) {
                this.customSelectionContainer.setVisible(true);
            }
            
            // Update buttons
            this.stagesButton.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
            this.customButton.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
            
            // Update instructions
            if (this.instructionsText) {
                this.instructionsText.setText('Select a track and difficulty, then click START');
            }
        }
    }

    createStageSelection(width, height) {
        const startY = 140;
        const itemHeight = 60;

        // Title
        this.add.text(50, startY - 30, 'Select Stage:', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });

        // Container for stage items
        this.stageSelectionContainer = this.add.container(0, 0);

        // Group stages by MIDI file
        const stagesByMidi = {};
        this.stages.forEach(stage => {
            if (!stagesByMidi[stage.midiPath]) {
                stagesByMidi[stage.midiPath] = [];
            }
            stagesByMidi[stage.midiPath].push(stage);
        });

        let yPos = startY;
        this.stageItems = [];

        Object.entries(stagesByMidi).forEach(([midiPath, stages]) => {
            // Find MIDI file info
            const midiFile = this.midiFiles.find(f => f.path === midiPath);
            const midiName = midiFile ? midiFile.name : midiPath.split('/').pop();

            // Group header
            const headerText = this.add.text(50, yPos - 10, midiName, {
                fontSize: '18px',
                color: '#0ff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });
            this.stageSelectionContainer.add(headerText);

            // Stage items for this MIDI file
            stages.forEach((stage, index) => {
                const item = this.createStageItem(stage, 50, yPos + index * itemHeight, itemHeight - 5);
                this.stageSelectionContainer.add([item.bg, item.nameText, item.descText]);
                this.stageItems.push({ stage, item });
            });

            yPos += stages.length * itemHeight + 30;
        });

        // Select first stage by default
        if (this.stages.length > 0) {
            this.selectStage(this.stages[0]);
        }
    }

    createStageItem(stage, x, y, height) {
        const width = 500;
        
        const bg = this.add.rectangle(x + width / 2, y, width, height, 0x222222)
            .setStrokeStyle(2, 0x555555)
            .setInteractive({ useHandCursor: true });

        const nameText = this.add.text(x + 10, y - height / 4, stage.name, {
            fontSize: '18px',
            color: '#0ff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const descText = this.add.text(x + 10, y + height / 4, stage.description || '', {
            fontSize: '14px',
            color: '#888',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        bg.stageId = stage.id;
        bg.on('pointerdown', () => {
            this.selectStage(stage);
        });

        return { bg, nameText, descText, stage };
    }

    selectStage(stage) {
        this.selectedStageId = stage.id;
        this.selectedMidiPath = stage.midiPath;
        this.selectedDifficulty = stage.difficulty || 'normal';
        this.selectedTrackIndex = stage.trackIndex !== undefined ? stage.trackIndex : -1;

        // Update visuals
        this.stageItems.forEach(({ stage: s, item }) => {
            if (s.id === stage.id) {
                item.bg.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
                item.nameText.setColor('#fff');
                item.descText.setColor('#ddd');
            } else {
                item.bg.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
                item.nameText.setColor('#0ff');
                item.descText.setColor('#888');
            }
        });
    }

    createCustomSelection(width, height) {
        const startY = 140;

        // Container for custom selection (hidden by default)
        this.customSelectionContainer = this.add.container(0, 0);
        this.customSelectionContainer.setVisible(false);

        // Title
        const title = this.add.text(50, startY - 30, 'Custom Configuration:', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.customSelectionContainer.add(title);

        // Track selection (reuse existing method)
        // We'll create a simplified version here
        const trackTitle = this.add.text(50, startY + 10, 'Select Track:', {
            fontSize: '20px',
            color: '#fff',
            fontFamily: 'Arial'
        });
        this.customSelectionContainer.add(trackTitle);

        // Custom track items
        this.customTrackItems = [];
        this.midiFiles.forEach((file, index) => {
            const y = startY + 50 + index * 50;
            const item = this.createTrackItem(file, 50, y, 45);
            this.customSelectionContainer.add([item.bg, item.nameText, item.fileText]);
            this.customTrackItems.push({ file, item });
        });

        // Difficulty selection (reuse existing, but position it)
        const diffTitle = this.add.text(50, startY + 300, 'Select Difficulty:', {
            fontSize: '20px',
            color: '#fff',
            fontFamily: 'Arial'
        });
        this.customSelectionContainer.add(diffTitle);

        // Create difficulty items for custom
        const difficulties = getAvailableDifficulties();
        this.customDifficultyItems = [];
        difficulties.forEach((diff, index) => {
            const x = 50 + index * 160;
            const y = startY + 340;
            const item = this.createDifficultyItem(diff, x, y);
            this.customSelectionContainer.add([item.bg, item.nameText, item.descText]);
            this.customDifficultyItems.push({ key: diff.key, item });
        });

        // Select normal by default
        this.selectCustomDifficulty('normal');
        if (this.midiFiles.length > 0) {
            this.selectCustomTrack(this.midiFiles[0]);
        }
    }

    selectCustomTrack(file) {
        this.selectedMidiPath = file.path;
        
        this.customTrackItems.forEach(({ file: f, item }) => {
            const bg = item.bg;
            if (f.path === file.path) {
                bg.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
                item.nameText.setColor('#fff');
            } else {
                bg.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
                item.nameText.setColor('#0ff');
            }
        });

        this.loadTrackData(file);
    }

    selectCustomDifficulty(key) {
        this.selectedDifficulty = key;

        this.customDifficultyItems.forEach(({ key: k, item }) => {
            const bg = item.bg;
            if (k === key) {
                bg.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
                item.nameText.setColor('#fff');
                item.descText.setColor('#ddd');
            } else {
                bg.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
                item.nameText.setColor('#ff0');
                item.descText.setColor('#888');
            }
        });
    }

    startGame() {
        let config;

        if (this.mode === 'stages' && this.selectedStageId) {
            // Use preset stage
            const stage = this.stages.find(s => s.id === this.selectedStageId);
            if (stage) {
                config = createTrackConfig(
                    stage.midiPath,
                    stage.difficulty || 'normal',
                    stage.trackIndex !== undefined ? stage.trackIndex : -1
                );
                config.id = stage.id; // Use stage ID
            } else {
                console.warn('Selected stage not found');
                return;
            }
        } else {
            // Use custom configuration
            if (!this.selectedMidiPath) {
                console.warn('No track selected');
                return;
            }

            config = createTrackConfig(
                this.selectedMidiPath,
                this.selectedDifficulty,
                this.selectedTrackIndex
            );
        }

        // Save config
        saveStageConfig(config);

        // Start game with config
        this.scene.start('RunnerScene', { stageConfig: config });
    }
}
