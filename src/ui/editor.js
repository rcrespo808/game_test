/**
 * Editor UI Module
 * Handles the track editor UI and interactions
 */

import { 
    DEFAULT_STAGE_CONFIG, 
    saveStageConfig, 
    exportStageConfig, 
    importStageConfig 
} from '../config/stageConfig.js';

export class EditorUI {
    constructor(scene) {
        this.scene = scene;
        this.rebuildTimeout = null;
    }

    /**
     * Setup editor UI and bind event handlers
     */
    setup() {
        const editor = document.getElementById('editor');
        const toggleBtn = document.getElementById('editorToggle');
        const config = this.scene.stageConfig.params;

        // Populate track index selector
        this.populateTrackSelector();

        // Populate fields
        this.populateFields(config);

        // Toggle editor
        const toggleEditor = () => {
            editor.classList.toggle('visible');
        };
        toggleBtn.addEventListener('click', toggleEditor);
        this.scene.editorKey.on('down', toggleEditor);

        // Bind button handlers
        this.bindSaveButton();
        this.bindResetButton();
        this.bindExportButton();
        this.bindImportButton();
        
        // Bind input handlers
        this.bindInputHandlers();
        this.bindAudioControls();
    }

    /**
     * Populate track selector dropdown
     */
    populateTrackSelector() {
        const trackSelect = document.getElementById('trackIndex');
        if (this.scene.midiData && this.scene.midiData.tracks) {
            trackSelect.innerHTML = '<option value="-1">All Tracks</option>';
            for (let i = 0; i < this.scene.midiData.tracks.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = `Track ${i}`;
                trackSelect.appendChild(opt);
            }
        }
    }

    /**
     * Populate editor fields with current config
     */
    populateFields(config) {
        document.getElementById('midiPath').value = this.scene.stageConfig.midiPath;
        document.getElementById('trackIndex').value = config.trackIndex;
        document.getElementById('bpmOverride').value = config.bpmOverride;
        document.getElementById('lookaheadSec').value = config.lookaheadSec;
        document.getElementById('quantizeDiv').value = config.quantizeDiv;
        document.getElementById('velocityMin').value = config.velocityMin;
        document.getElementById('maxEventsPerSec').value = config.maxEventsPerSec;
        document.getElementById('lowCut').value = config.lowCut;
        document.getElementById('highCut').value = config.highCut;
        const densityValue = config.density !== undefined ? config.density : 1.0;
        document.getElementById('density').value = densityValue;
        document.getElementById('densitySlider').value = densityValue;
        document.getElementById('densityDisplay').textContent = densityValue.toFixed(2);
        document.getElementById('hazardSpeed').value = config.hazardSpeed;
        document.getElementById('sideMode').value = config.sideMode;
        document.getElementById('laneJitter').value = config.laneJitter;
        document.getElementById('greenEveryBeats').value = config.greenEveryBeats;
        document.getElementById('redEverySubdiv').value = config.redEverySubdiv;
        document.getElementById('seedA').value = config.seedA;
        document.getElementById('seedB').value = config.seedB;
        const rows = config.gridRows || 3;
        const cols = config.gridCols || rows;
        document.getElementById('gridRows').value = rows;
        document.getElementById('gridCols').value = cols;
        document.getElementById('enableAudio').checked = config.enableAudio !== false;
        document.getElementById('audioVolume').value = config.audioVolume || 70;
        document.getElementById('volumeDisplay').textContent = (config.audioVolume || 70) + '%';
    }

    /**
     * Bind save button handler
     */
    bindSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        // Remove any existing listeners by cloning
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => {
            this.saveEditorConfig();
            // Rebuild MIDI events with new config
            if (this.scene.midiData) {
                this.scene.buildMIDIEvents();
                console.log(">> Config saved and MIDI events rebuilt");
            } else {
                console.log(">> Config saved (MIDI not loaded yet, will rebuild on next load)");
            }
            // Show visual feedback
            const originalText = newSaveBtn.textContent;
            newSaveBtn.textContent = "Saved!";
            newSaveBtn.style.background = "#0a5";
            setTimeout(() => {
                newSaveBtn.textContent = originalText;
                newSaveBtn.style.background = "";
            }, 1000);
            if (this.scene.onStageConfigUpdated) {
                this.scene.onStageConfigUpdated();
            }
            document.getElementById('editor').classList.toggle('visible');
        });
    }

    /**
     * Bind reset button handler
     */
    bindResetButton() {
        document.getElementById('resetBtn').addEventListener('click', () => {
            if (confirm('Reset to defaults?')) {
                this.scene.stageConfig = { 
                    ...DEFAULT_STAGE_CONFIG, 
                    params: { ...DEFAULT_STAGE_CONFIG.params } 
                };
                saveStageConfig(this.scene.stageConfig);
                this.setup();
                if (this.scene.onStageConfigUpdated) {
                    this.scene.onStageConfigUpdated();
                }
                this.scene.buildMIDIEvents();
            }
        });
    }

    /**
     * Bind export button handler
     */
    bindExportButton() {
        document.getElementById('exportBtn').addEventListener('click', () => {
            exportStageConfig(this.scene.stageConfig);
        });
    }

    /**
     * Bind import button handler
     */
    bindImportButton() {
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

            document.getElementById('importFile').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    importStageConfig(file, (config) => {
                        this.scene.stageConfig = { 
                            ...DEFAULT_STAGE_CONFIG, 
                            ...config, 
                            params: { 
                                ...DEFAULT_STAGE_CONFIG.params, 
                                ...(config.params || {}) 
                            } 
                        };
                        saveStageConfig(this.scene.stageConfig);
                        this.setup();
                        if (this.scene.onStageConfigUpdated) {
                            this.scene.onStageConfigUpdated();
                        }
                    this.scene.loadMIDIFile(this.scene.stageConfig.midiPath).then(() => {
                        if (this.scene.midiData) {
                            this.scene.buildMIDIEvents();
                        }
                    });
                });
            }
        });
    }

    /**
     * Bind input change handlers with debouncing
     */
    bindInputHandlers() {
        const editor = document.getElementById('editor');
        
        // Schedule rebuild with debouncing
        const scheduleRebuild = () => {
            clearTimeout(this.rebuildTimeout);
            this.rebuildTimeout = setTimeout(() => {
                this.saveEditorConfig();
                this.scene.buildMIDIEvents();
                if (this.scene.onStageConfigUpdated) {
                    this.scene.onStageConfigUpdated();
                }
            }, 500);
        };

        // Sync density slider and number input
        const densitySlider = document.getElementById('densitySlider');
        const densityInput = document.getElementById('density');
        const densityDisplay = document.getElementById('densityDisplay');
        
        if (densitySlider && densityInput && densityDisplay) {
            const updateDensity = (value) => {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    densitySlider.value = numValue;
                    densityInput.value = numValue;
                    densityDisplay.textContent = numValue.toFixed(2);
                }
            };
            
            densitySlider.addEventListener('input', (e) => {
                updateDensity(e.target.value);
                scheduleRebuild();
            });
            
            densityInput.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) val = 1.0;
                if (val < 0.1) val = 0.1;
                if (val > 1.0) val = 1.0;
                updateDensity(val);
                scheduleRebuild();
            });
        }

        const inputs = editor.querySelectorAll('input:not(#density):not(#densitySlider), select');
        inputs.forEach(input => {
            input.addEventListener('change', scheduleRebuild);
        });
    }

    /**
     * Bind audio control handlers
     */
    bindAudioControls() {
        document.getElementById('enableAudio').addEventListener('change', (e) => {
            this.scene.audioManager.setEnabled(e.target.checked);
            this.scene.stageConfig.params.enableAudio = e.target.checked;
            saveStageConfig(this.scene.stageConfig);
        });

        document.getElementById('audioVolume').addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            this.scene.audioManager.setVolume(vol);
            this.scene.stageConfig.params.audioVolume = vol;
            document.getElementById('volumeDisplay').textContent = vol + '%';
            saveStageConfig(this.scene.stageConfig);
        });
    }

    /**
     * Save editor configuration to stage config
     */
    saveEditorConfig() {
        const config = this.scene.stageConfig.params;
        config.trackIndex = parseInt(document.getElementById('trackIndex').value) || -1;
        config.bpmOverride = parseFloat(document.getElementById('bpmOverride').value) || 0;
        config.lookaheadSec = parseFloat(document.getElementById('lookaheadSec').value) || 0.1;
        config.quantizeDiv = parseInt(document.getElementById('quantizeDiv').value) || 0;
        config.velocityMin = parseFloat(document.getElementById('velocityMin').value) || 0;
        config.maxEventsPerSec = parseInt(document.getElementById('maxEventsPerSec').value) || 20;
        config.lowCut = parseInt(document.getElementById('lowCut').value) || 55;
        config.highCut = parseInt(document.getElementById('highCut').value) || 70;
        const densityEl = document.getElementById('density');
        const densitySliderEl = document.getElementById('densitySlider');
        config.density = parseFloat(densityEl ? densityEl.value : (densitySliderEl ? densitySliderEl.value : 1.0));
        if (isNaN(config.density) || config.density < 0.1) config.density = 1.0;
        config.hazardSpeed = parseFloat(document.getElementById('hazardSpeed').value) || 420;
        config.sideMode = document.getElementById('sideMode').value;
        config.laneJitter = parseInt(document.getElementById('laneJitter').value) || 0;
        config.greenEveryBeats = parseInt(document.getElementById('greenEveryBeats').value) || 4;
        config.redEverySubdiv = parseInt(document.getElementById('redEverySubdiv').value) || 2;
        config.seedA = parseInt(document.getElementById('seedA').value) || 7;
        config.seedB = parseInt(document.getElementById('seedB').value) || 3;
        const clampSize = (val) => Math.max(3, Math.min(5, val || 3));
        config.gridRows = clampSize(parseInt(document.getElementById('gridRows').value));
        config.gridCols = clampSize(parseInt(document.getElementById('gridCols').value));
        config.enableAudio = document.getElementById('enableAudio').checked;
        config.audioVolume = parseInt(document.getElementById('audioVolume').value) || 70;

        this.scene.audioManager.setEnabled(config.enableAudio);
        this.scene.audioManager.setVolume(config.audioVolume);

        saveStageConfig(this.scene.stageConfig);
    }
}
