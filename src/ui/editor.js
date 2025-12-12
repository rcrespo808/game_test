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
import { loadMIDIManifest, getAllMIDIFiles } from '../midi/midiManifest.js';

export class EditorUI {
    constructor(scene) {
        this.scene = scene;
        this.rebuildTimeout = null;
        this.midiFiles = [];
    }

    /**
     * Setup editor UI and bind event handlers
     */
    async setup() {
        // Load MIDI manifest first
        await this.loadMIDIFileList();
        const editor = document.getElementById('editor');
        const toggleBtn = document.getElementById('editorToggle');
        if (!editor || !toggleBtn) {
            console.warn('Editor UI elements not found, skipping setup');
            return;
        }
        const config = this.scene.stageConfig.params;

        // Populate MIDI file selector (after loading manifest)
        this.populateMIDISelector();

        // Populate track index selector (will update when MIDI loads)
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
        
        // Return promise for async setup
        return Promise.resolve();
    }

    /**
     * Load MIDI file list from manifest
     */
    async loadMIDIFileList() {
        try {
            this.midiFiles = await getAllMIDIFiles();
            this.populateMIDISelector();
        } catch (err) {
            console.error('>> Failed to load MIDI file list:', err);
            this.midiFiles = [];
        }
    }

    /**
     * Populate MIDI file selector dropdown
     */
    populateMIDISelector() {
        const midiSelect = document.getElementById('midiFile');
        if (!midiSelect) return;

        midiSelect.innerHTML = '';
        
        for (const file of this.midiFiles) {
            const opt = document.createElement('option');
            opt.value = file.path;
            opt.textContent = file.name || file.filename;
            midiSelect.appendChild(opt);
        }

        // Set current selection
        if (this.scene.stageConfig && this.scene.stageConfig.midiPath) {
            midiSelect.value = this.scene.stageConfig.midiPath;
        }
    }

    /**
     * Populate track selector dropdown with MIDI track information
     */
    populateTrackSelector() {
        const trackSelect = document.getElementById('trackIndex');
        if (!trackSelect) return;
        
        // Clear existing options
        trackSelect.innerHTML = '<option value="-1">All Tracks (combine all tracks)</option>';
        
        if (this.scene.midiData && this.scene.midiData.tracks) {
            for (let i = 0; i < this.scene.midiData.tracks.length; i++) {
                const track = this.scene.midiData.tracks[i];
                const opt = document.createElement('option');
                opt.value = i;
                
                // Build descriptive track name
                let trackName = `Track ${i}`;
                if (track.name) {
                    trackName += `: ${track.name}`;
                }
                if (track.instrument && track.instrument.name) {
                    trackName += ` (${track.instrument.name})`;
                }
                
                // Add note count for additional info
                const noteCount = track.notes ? track.notes.length : 0;
                if (noteCount > 0) {
                    trackName += ` - ${noteCount} notes`;
                }
                
                opt.textContent = trackName;
                trackSelect.appendChild(opt);
            }
            
            // Restore saved selection if it's valid
            const savedIndex = this.scene.stageConfig.params.trackIndex;
            if (savedIndex !== undefined && savedIndex >= -1 && savedIndex < this.scene.midiData.tracks.length) {
                trackSelect.value = savedIndex;
                this.updateTrackInfo(savedIndex);
            } else {
                this.updateTrackInfo(-1);
            }
        } else {
            // MIDI data not loaded yet, show placeholder
            const opt = document.createElement('option');
            opt.value = "";
            opt.textContent = "Load MIDI file first";
            opt.disabled = true;
            trackSelect.appendChild(opt);
            this.hideTrackInfo();
        }
    }

    /**
     * Update track information display
     */
    updateTrackInfo(trackIndex) {
        const trackInfo = document.getElementById('trackInfo');
        const trackInfoText = document.getElementById('trackInfoText');
        
        if (!trackInfo || !trackInfoText) return;
        
        if (trackIndex === -1) {
            if (this.scene.midiData && this.scene.midiData.tracks) {
                const totalNotes = this.scene.midiData.tracks.reduce((sum, track) => {
                    return sum + (track.notes ? track.notes.length : 0);
                }, 0);
                trackInfoText.textContent = `All ${this.scene.midiData.tracks.length} tracks (${totalNotes} total notes)`;
                trackInfo.style.display = 'block';
            } else {
                this.hideTrackInfo();
            }
        } else if (this.scene.midiData && this.scene.midiData.tracks[trackIndex]) {
            const track = this.scene.midiData.tracks[trackIndex];
            let info = `Track ${trackIndex}`;
            
            if (track.name) {
                info += `: "${track.name}"`;
            }
            if (track.instrument && track.instrument.name) {
                info += ` | Instrument: ${track.instrument.name}`;
            }
            const noteCount = track.notes ? track.notes.length : 0;
            info += ` | Notes: ${noteCount}`;
            
            trackInfoText.textContent = info;
            trackInfo.style.display = 'block';
        } else {
            this.hideTrackInfo();
        }
    }

    /**
     * Hide track information display
     */
    hideTrackInfo() {
        const trackInfo = document.getElementById('trackInfo');
        if (trackInfo) {
            trackInfo.style.display = 'none';
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

        // MIDI file selector is populated separately
        const midiSelect = getEl('midiFile');
        if (midiSelect) {
            midiSelect.value = this.scene.stageConfig.midiPath || '';
        }
        safeSetValue('trackIndex', config.trackIndex);
        // Update track info display
        this.updateTrackInfo(config.trackIndex !== undefined ? config.trackIndex : -1);
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
        resetBtn.addEventListener('click', async () => {
            if (confirm('Reset to defaults?')) {
                this.scene.stageConfig = { 
                    ...DEFAULT_STAGE_CONFIG, 
                    params: { ...DEFAULT_STAGE_CONFIG.params } 
                };
                saveStageConfig(this.scene.stageConfig);
                await this.setup();
                if (this.scene.onStageConfigUpdated) {
                    this.scene.onStageConfigUpdated();
                }
                        // Reload MIDI file with default path
                        if (this.scene.stageConfig.midiPath) {
                            try {
                                await this.scene.loadMIDIFile(this.scene.stageConfig.midiPath);
                                if (this.scene.midiData) {
                                    // Track selector will be updated by loadMIDIFile
                                    this.scene.buildMIDIEvents();
                                }
                            } catch (err) {
                                console.error(">> Failed to load default MIDI file:", err);
                            }
                        }
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
            importFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    importStageConfig(file, async (config) => {
                        this.scene.stageConfig = { 
                            ...DEFAULT_STAGE_CONFIG, 
                            ...config, 
                            params: { 
                                ...DEFAULT_STAGE_CONFIG.params, 
                                ...(config.params || {}) 
                            } 
                        };
                        saveStageConfig(this.scene.stageConfig);
                        await this.setup();
                        if (this.scene.onStageConfigUpdated) {
                            this.scene.onStageConfigUpdated();
                        }
                        // Reload MIDI file with imported path
                        if (this.scene.stageConfig.midiPath) {
                            try {
                                await this.scene.loadMIDIFile(this.scene.stageConfig.midiPath);
                                if (this.scene.midiData) {
                                    // Track selector will be updated by loadMIDIFile
                                    this.scene.buildMIDIEvents();
                                }
                            } catch (err) {
                                console.error(">> Failed to load imported MIDI file:", err);
                            }
                        }
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
        
        // Handle MIDI file selection change (needs to reload MIDI)
        const midiFileSelect = document.getElementById('midiFile');
        if (midiFileSelect) {
            midiFileSelect.addEventListener('change', async (e) => {
                const selectedPath = e.target.value;
                if (selectedPath && selectedPath !== this.scene.stageConfig.midiPath) {
                    // Update config
                    this.scene.stageConfig.midiPath = selectedPath;
                    saveStageConfig(this.scene.stageConfig);
                    
                    // Reload MIDI file
                    try {
                        await this.scene.loadMIDIFile(selectedPath);
                        if (this.scene.midiData) {
                            // Update track selector first
                            this.populateTrackSelector();
                            // Rebuild events with current track selection
                            this.scene.buildMIDIEvents();
                            console.log(">> MIDI file changed to:", selectedPath);
                        }
                    } catch (err) {
                        console.error(">> Failed to load selected MIDI file:", err);
                        alert(`Failed to load MIDI file: ${err.message}`);
                    }
                }
            });
        }

        // Handle track selection change (needs to rebuild events)
        const trackSelect = document.getElementById('trackIndex');
        if (trackSelect) {
            trackSelect.addEventListener('change', (e) => {
                const selectedTrack = parseInt(e.target.value) || -1;
                
                // Update track info display
                this.updateTrackInfo(selectedTrack);
                
                if (selectedTrack !== this.scene.stageConfig.params.trackIndex) {
                    // Update config immediately
                    this.scene.stageConfig.params.trackIndex = selectedTrack;
                    saveStageConfig(this.scene.stageConfig);
                    
                    // Rebuild MIDI events with new track selection
                    if (this.scene.midiData) {
                        this.scene.buildMIDIEvents();
                        const trackName = selectedTrack === -1 ? "All Tracks" : 
                            (this.scene.midiData.tracks[selectedTrack]?.name || `Track ${selectedTrack}`);
                        console.log(">> Track selection changed to:", trackName);
                    }
                }
            });
        }

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

        // Bind other inputs (excluding midiFile which has its own handler)
        const inputs = editor.querySelectorAll('input:not(#density):not(#densitySlider), select:not(#midiFile)');
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

        // Save MIDI file path
        const midiFileEl = getEl('midiFile');
        if (midiFileEl && midiFileEl.value) {
            this.scene.stageConfig.midiPath = midiFileEl.value;
        }

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
