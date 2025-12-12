/**
 * MenuScene - Pre-game menu for track and difficulty selection
 */

import { getAllMIDIFiles } from '../midi/midiManifest.js';
import { createTrackConfig, getAvailableDifficulties } from '../config/trackConfigs.js';
import { saveStageConfig } from '../config/stageConfig.js';

export class MenuScene extends window.Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.midiFiles = [];
        this.selectedMidiPath = null;
        this.selectedDifficulty = 'normal';
        this.selectedTrackIndex = -1;
        this.midiData = null;
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

        // Load MIDI files
        try {
            this.midiFiles = await getAllMIDIFiles();
            console.log(`>> Loaded ${this.midiFiles.length} MIDI files`);
        } catch (err) {
            console.error('>> Failed to load MIDI manifest:', err);
            this.midiFiles = [];
        }

        // Create track selection area
        this.createTrackSelection(width, height);
        
        // Create difficulty selection
        this.createDifficultySelection(width, height);
        
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

        // Instructions
        this.add.text(width / 2, height - 30, 'Select a track and difficulty, then click START', {
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
            this.selectTrack(file);
            this.loadTrackData(file);
        });

        return { bg, nameText, fileText };
    }

    selectTrack(file) {
        // Update selection
        this.selectedMidiPath = file.path;
        
        // Update visuals
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
            this.selectDifficulty(difficulty.key);
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

    startGame() {
        if (!this.selectedMidiPath) {
            console.warn('No track selected');
            return;
        }

        // Create config from selection
        const config = createTrackConfig(
            this.selectedMidiPath,
            this.selectedDifficulty,
            this.selectedTrackIndex
        );

        // Save config
        saveStageConfig(config);

        // Start game with config
        this.scene.start('RunnerScene', { stageConfig: config });
    }
}
