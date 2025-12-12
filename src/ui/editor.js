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
        if (!editor || !toggleBtn) {
            console.warn('Editor UI elements not found, skipping setup');
            return;
        }
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
        if (!trackSelect) return;
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
        const getEl = (id) => document.getElementById(id);
        const safeSetValue = (id, value) => {
            const el = getEl(id);
            if (el) el.value = value;
        };
        const safeSetText = (id, text) => {
            const el = getEl(id);
            if (el) el.textContent = text;
        };
        const safeSetChecked = (id, checked) => {
            const el = getEl(id);
            if (el) el.checked = checked;
        };

        safeSetValue('midiPath', this.scene.stageConfig.midiPath);
        safeSetValue('trackIndex', config.trackIndex);
        safeSetValue('bpmOverride', config.bpmOverride);
        safeSetValue('lookaheadSec', config.lookaheadSec);
        safeSetValue('quantizeDiv', config.quantizeDiv);
        safeSetValue('velocityMin', config.velocityMin);
        safeSetValue('maxEventsPerSec', config.maxEventsPerSec);
        safeSetValue('lowCut', config.lowCut);
        safeSetValue('highCut', config.highCut);
        const densityValue = config.density !== undefined ? config.density : 1.0;
        safeSetValue('density', densityValue);
        safeSetValue('densitySlider', densityValue);
        safeSetText('densityDisplay', densityValue.toFixed(2));
        safeSetValue('hazardSpeed', config.hazardSpeed);
        safeSetValue('sideMode', config.sideMode);
        safeSetValue('laneJitter', config.laneJitter);
        safeSetValue('greenEveryBeats', config.greenEveryBeats);
        safeSetValue('redEverySubdiv', config.redEverySubdiv);
        safeSetValue('seedA', config.seedA);
        safeSetValue('seedB', config.seedB);
        const rows = config.gridRows || 3;
        const cols = config.gridCols || rows;
        safeSetValue('gridRows', rows);
        safeSetValue('gridCols', cols);
        safeSetChecked('enableAudio', config.enableAudio !== false);
        safeSetValue('audioVolume', config.audioVolume || 70);
        safeSetText('volumeDisplay', (config.audioVolume || 70) + '%');
    }

    /**
     * Bind save button handler
     */
    bindSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        if (!saveBtn) return;
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
            const editorEl = document.getElementById('editor');
            if (editorEl) editorEl.classList.toggle('visible');
        });
    }

    /**
     * Bind reset button handler
     */
    bindResetButton() {
        const resetBtn = document.getElementById('resetBtn');
        if (!resetBtn) return;
        resetBtn.addEventListener('click', () => {
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
        const exportBtn = document.getElementById('exportBtn');
        if (!exportBtn) return;
        exportBtn.addEventListener('click', () => {
            exportStageConfig(this.scene.stageConfig);
        });
    }

    /**
     * Bind import button handler
     */
    bindImportButton() {
        const importBtn = document.getElementById('importBtn');
        if (!importBtn) return;
        importBtn.addEventListener('click', () => {
            const importFile = document.getElementById('importFile');
            if (importFile) importFile.click();
        });

        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => {
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
        const enableAudioEl = document.getElementById('enableAudio');
        if (enableAudioEl) {
            enableAudioEl.addEventListener('change', (e) => {
                this.scene.audioManager.setEnabled(e.target.checked);
                this.scene.stageConfig.params.enableAudio = e.target.checked;
                saveStageConfig(this.scene.stageConfig);
            });
        }

        const audioVolumeEl = document.getElementById('audioVolume');
        if (audioVolumeEl) {
            audioVolumeEl.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value);
                this.scene.audioManager.setVolume(vol);
                this.scene.stageConfig.params.audioVolume = vol;
                const volumeDisplayEl = document.getElementById('volumeDisplay');
                if (volumeDisplayEl) {
                    volumeDisplayEl.textContent = vol + '%';
                }
                saveStageConfig(this.scene.stageConfig);
            });
        }
    }

    /**
     * Save editor configuration to stage config
     */
    saveEditorConfig() {
        const getEl = (id) => document.getElementById(id);
        const getValue = (id, defaultValue) => {
            const el = getEl(id);
            return el ? el.value : defaultValue;
        };
        const getChecked = (id, defaultValue) => {
            const el = getEl(id);
            return el ? el.checked : defaultValue;
        };

        const config = this.scene.stageConfig.params;
        config.trackIndex = parseInt(getValue('trackIndex', '-1')) || -1;
        config.bpmOverride = parseFloat(getValue('bpmOverride', '0')) || 0;
        config.lookaheadSec = parseFloat(getValue('lookaheadSec', '0.1')) || 0.1;
        config.quantizeDiv = parseInt(getValue('quantizeDiv', '0')) || 0;
        config.velocityMin = parseFloat(getValue('velocityMin', '0.1')) || 0;
        config.maxEventsPerSec = parseInt(getValue('maxEventsPerSec', '20')) || 20;
        config.lowCut = parseInt(getValue('lowCut', '55')) || 55;
        config.highCut = parseInt(getValue('highCut', '70')) || 70;
        const densityEl = getEl('density');
        const densitySliderEl = getEl('densitySlider');
        config.density = parseFloat(densityEl ? densityEl.value : (densitySliderEl ? densitySliderEl.value : 1.0));
        if (isNaN(config.density) || config.density < 0.1) config.density = 1.0;
        config.hazardSpeed = parseFloat(getValue('hazardSpeed', '420')) || 420;
        const sideModeEl = getEl('sideMode');
        config.sideMode = sideModeEl ? sideModeEl.value : 'random';
        config.laneJitter = parseInt(getValue('laneJitter', '18')) || 0;
        config.greenEveryBeats = parseInt(getValue('greenEveryBeats', '4')) || 4;
        config.redEverySubdiv = parseInt(getValue('redEverySubdiv', '2')) || 2;
        config.seedA = parseInt(getValue('seedA', '7')) || 7;
        config.seedB = parseInt(getValue('seedB', '3')) || 3;
        const clampSize = (val) => Math.max(3, Math.min(5, val || 3));
        config.gridRows = clampSize(parseInt(getValue('gridRows', '3')));
        config.gridCols = clampSize(parseInt(getValue('gridCols', '3')));
        config.enableAudio = getChecked('enableAudio', true);
        config.audioVolume = parseInt(getValue('audioVolume', '70')) || 70;

        this.scene.audioManager.setEnabled(config.enableAudio);
        this.scene.audioManager.setVolume(config.audioVolume);

        saveStageConfig(this.scene.stageConfig);
    }
}
