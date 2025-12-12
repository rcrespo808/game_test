/**
 * MenuScene - Pre-game menu for MIDI file and difficulty selection
 */

import { getAllMIDIFiles } from '../midi/midiManifest.js';
import { getAvailableDifficulties, createGameConfig } from '../config/gameConfig.js';
import { saveStageConfig } from '../config/stageConfig.js';

export class MenuScene extends window.Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.midiFiles = [];
        this.selectedMidiPath = null;
        this.selectedDifficulty = 'normal';
        this.selectedTrackIndex = -1;
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
            console.error('>> Failed to load MIDI files:', err);
            this.midiFiles = [];
        }

        // Create MIDI file and difficulty selection area
        this.createMidiSelection(width, height);

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
        this.instructionsText = this.add.text(width / 2, height - 30, 'Select a MIDI file and difficulty, then click START', {
            fontSize: '14px',
            color: '#888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    createMidiSelection(width, height) {
        const startY = 140;
        const itemHeight = 80;
        const difficultySpacing = 140;

        // Title
        this.add.text(50, startY - 30, 'Select MIDI File & Difficulty:', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });

        // Container for MIDI file items
        this.selectionContainer = this.add.container(0, 0);
        this.midiItems = [];
        const difficulties = getAvailableDifficulties();

        let yPos = startY;

        this.midiFiles.forEach((midiFile, fileIndex) => {
            // MIDI file header
            const headerText = this.add.text(50, yPos - 10, midiFile.name, {
                fontSize: '18px',
                color: '#0ff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });
            this.selectionContainer.add(headerText);

            // Difficulty buttons for this MIDI file
            const difficultyItems = [];
            difficulties.forEach((diff, diffIndex) => {
                const x = 50 + diffIndex * difficultySpacing;
                const item = this.createDifficultyItem(midiFile, diff, x, yPos);
                this.selectionContainer.add([item.bg, item.nameText, item.descText]);
                difficultyItems.push({ diff, item });
            });

            this.midiItems.push({
                midiFile,
                difficultyItems
            });

            yPos += itemHeight + 30;
        });

        // Select first MIDI file and normal difficulty by default
        if (this.midiFiles.length > 0) {
            this.selectedMidiPath = this.midiFiles[0].path;
            this.selectDifficultyForMidi(this.midiFiles[0].path, 'normal');
        }
    }

    createDifficultyItem(midiFile, difficulty, x, y) {
        const width = 130;
        const height = 70;

        const bg = this.add.rectangle(x, y, width, height, 0x222222)
            .setStrokeStyle(2, 0x555555)
            .setInteractive({ useHandCursor: true });

        const difficultyColors = {
            easy: '#0f0',
            normal: '#ff0',
            hard: '#f00',
            extreme: '#f0f'
        };
        const difficultyColor = difficultyColors[difficulty.key] || '#0ff';

        const nameText = this.add.text(x, y - 12, difficulty.name, {
            fontSize: '18px',
            color: difficultyColor,
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const descText = this.add.text(x, y + 12, difficulty.description, {
            fontSize: '11px',
            color: '#888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Store references
        bg.midiPath = midiFile.path;
        bg.difficultyKey = difficulty.key;

        bg.on('pointerdown', () => {
            this.selectDifficultyForMidi(midiFile.path, difficulty.key);
        });

        return { bg, nameText, descText, midiPath: midiFile.path, difficultyKey: difficulty.key };
    }

    selectDifficultyForMidi(midiPath, difficultyKey) {
        this.selectedMidiPath = midiPath;
        this.selectedDifficulty = difficultyKey;

        // Update visuals for all MIDI items
        this.midiItems.forEach(({ midiFile, difficultyItems }) => {
            difficultyItems.forEach(({ diff, item }) => {
                const isSelected = midiFile.path === midiPath && diff.key === difficultyKey;
                const difficultyColors = {
                    easy: '#0f0',
                    normal: '#ff0',
                    hard: '#f00',
                    extreme: '#f0f'
                };
                const difficultyColor = difficultyColors[diff.key] || '#0ff';

                if (isSelected) {
                    item.bg.setFillStyle(0x0a5).setStrokeStyle(2, 0x0ff);
                    item.nameText.setColor('#fff');
                    item.descText.setColor('#ddd');
                } else {
                    item.bg.setFillStyle(0x222222).setStrokeStyle(2, 0x555555);
                    item.nameText.setColor(difficultyColor);
                    item.descText.setColor('#888');
                }
            });
        });
    }

    startGame() {
        if (!this.selectedMidiPath) {
            console.warn('No MIDI file selected');
            return;
        }

        if (!this.selectedDifficulty) {
            console.warn('No difficulty selected');
            return;
        }

        const config = createGameConfig(
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
