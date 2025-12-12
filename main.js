// Stage Config Defaults
const DEFAULT_STAGE_CONFIG = {
    id: "bach_inventions_784_test",
    midiPath: "assets/midi/bach_inventions_784_(c)simonetto.mid",
    version: 1,
    params: {
        trackIndex: -1, // -1 = all tracks
        bpmOverride: 0, // 0 = use MIDI tempo
        lookaheadSec: 0.1,
        quantizeDiv: 0, // 0 = off, 4/8/16/32 = divisions
        velocityMin: 0.1,
        maxEventsPerSec: 20,
        lowCut: 55,
        highCut: 70,
        hazardSpeed: 420,
        sideMode: "random", // random, alternate, left, right
        laneJitter: 18,
        greenEveryBeats: 4,
        redEverySubdiv: 2,
        seedA: 7,
        seedB: 3,
        enableAudio: true,
        audioVolume: 70,
        density: 1.0 // 1.0 = all notes spawn hazards, 0.5 = every other note, 0.25 = every 4th note
    }
};

// Load stage config from localStorage
function loadStageConfig() {
    const stored = localStorage.getItem('gridRunner.stageConfig.v1');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_STAGE_CONFIG, ...parsed };
        } catch (e) {
            console.warn('Failed to parse stored config:', e);
        }
    }
    return { ...DEFAULT_STAGE_CONFIG };
}

// Save stage config to localStorage
function saveStageConfig(config) {
    localStorage.setItem('gridRunner.stageConfig.v1', JSON.stringify(config));
}

// Export stage config as JSON file
function exportStageConfig(config) {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.id || 'stage'}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import stage config from file
function importStageConfig(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            callback(config);
        } catch (err) {
            alert('Failed to parse stage file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

class RunnerScene extends Phaser.Scene {
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
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            
            // Wait for MIDI parser to be available
            let attempts = 0;
            while (!window.MidiParser && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.MidiParser) {
                throw new Error('MIDI parser not loaded');
            }

            const midi = new window.MidiParser(arrayBuffer);
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
            return;
        }

        const config = this.stageConfig.params;
        const events = [];
        const tracks = config.trackIndex === -1 
            ? this.midiData.tracks 
            : [this.midiData.tracks[config.trackIndex] || this.midiData.tracks[0]];

        // Get tempo (BPM) from MIDI or override
        let bpm = config.bpmOverride > 0 ? config.bpmOverride : 120;
        const tempoEvents = this.midiData.header.tempos || [];
        if (tempoEvents.length > 0 && config.bpmOverride === 0) {
            bpm = tempoEvents[0].bpm;
        }
        const secondsPerBeat = 60 / bpm;

        // Collect all note-on events
        for (const track of tracks) {
            for (const note of track.notes) {
                if (note.velocity < config.velocityMin) continue;

                let timeSec = note.time;
                
                // Quantize if enabled
                if (config.quantizeDiv > 0) {
                    const quantizeUnit = secondsPerBeat / config.quantizeDiv;
                    timeSec = Math.round(timeSec / quantizeUnit) * quantizeUnit;
                }

                // Map pitch to lane row
                let laneRow = 0; // top
                if (note.midi < config.lowCut) {
                    laneRow = 2; // bottom
                } else if (note.midi < config.highCut) {
                    laneRow = 1; // middle
                }

                // Map velocity to hazard type (0=diamond, 1=square, 2=triangle)
                let hazardType = 0;
                if (note.velocity > 0.66) {
                    hazardType = 2; // triangle (high velocity)
                } else if (note.velocity > 0.33) {
                    hazardType = 1; // square (mid velocity)
                }

                events.push({
                    timeSec,
                    laneRow,
                    hazardType,
                    pitch: note.midi,
                    velocity: note.velocity,
                    source: 'midi'
                });
            }
        }

        // Sort by time
        events.sort((a, b) => a.timeSec - b.timeSec);

        // Apply density filter (skip events based on density ratio)
        if (config.density !== undefined && config.density < 1.0 && config.density > 0) {
            const densityFiltered = [];
            const originalCount = events.length;
            const step = 1 / config.density; // e.g., density=0.5 -> step=2 (keep every 2nd)
            
            for (let i = 0; i < events.length; i++) {
                // Keep event if it's at a step boundary
                const keepEvent = (i % Math.round(step)) === 0;
                if (keepEvent) {
                    densityFiltered.push(events[i]);
                }
            }
            events.length = 0;
            events.push(...densityFiltered);
            console.log(`>> Density filter (${config.density}) reduced events from ${originalCount} to ${events.length}`);
        }

        // Apply max events per second cap
        if (config.maxEventsPerSec > 0) {
            const filtered = [];
            let lastTime = -1;
            const minInterval = 1 / config.maxEventsPerSec;
            for (const evt of events) {
                if (evt.timeSec - lastTime >= minInterval || lastTime < 0) {
                    filtered.push(evt);
                    lastTime = evt.timeSec;
                }
            }
            events.length = 0;
            events.push(...filtered);
        }

        // Store BPM for hotspot timing
        this.trackBPM = bpm;
        this.secondsPerBeat = secondsPerBeat;

        this.track = {
            midi: this.midiData,
            events,
            nextIndex: 0
        };

        console.log(`>> Built ${events.length} MIDI events, BPM: ${bpm.toFixed(1)}`);
        if (events.length === 0) {
            console.warn(">> WARNING: No MIDI events generated! Check velocityMin and other filters.");
        }
    }

    create() {
        console.log(">> SCENE START - v9 (MIDI-Synced Track Mode)");
        const width = this.game.config.width;
        const height = this.game.config.height;

        this.width = width;
        this.height = height;

        // 1. Grid Definitions
        this.lanes = [height * 0.3, height * 0.5, height * 0.7];
        this.columns = [width / 2 - 120, width / 2, width / 2 + 120];

        this.currentLaneIndex = 1;
        this.currentColumnIndex = 1;

        // Lane visuals
        for (let y of this.lanes) {
            this.add.line(0, 0, 0, y, width, y, 0xffffff, 0.1).setOrigin(0, 0).setDepth(0);
        }

        // 2. Player Setup
        const startX = this.columns[this.currentColumnIndex];
        const startY = this.lanes[this.currentLaneIndex];

        this.player = this.add.circle(startX, startY, 16, 0x00ffff);
        this.player.setDepth(10);

        // 3. Hazard Container
        this.activeHazards = [];

        // Hotspot State
        this.greenHotspot = null;
        this.redHotspots = [];
        this.greenScore = 0;
        this.greenActive = false;
        this.greenCircle = null;
        this.greenActivationTween = null;
        this.greenPulseTween = null;

        // MIDI Track State
        this.trackStartMs = null;
        // Preserve track if it was already built in preload
        if (!this.track) {
            this.track = { events: [], nextIndex: 0 };
        }
        // Preserve midiData if it was already loaded
        if (!this.midiData) {
            this.midiData = null;
        }
        this.trackBPM = 120;
        this.secondsPerBeat = 0.5;
        this.hazardSpawnCount = 0;
        this.sideAlternator = false;

        // Audio State
        this.audioEnabled = this.stageConfig.params.enableAudio !== false;
        this.audioVolume = this.stageConfig.params.audioVolume || 70;
        this.midiPlayers = [];
        this.audioStarted = false;

        // Hotspot beat tracking
        this.beatIndex = 0;
        this.lastBeatTime = -1;
        this.lastSubdivTime = -1;

        // 4. Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.editorKey = this.input.keyboard.addKey('E');

        // 5. Game State
        this.isDead = false;
        this.isRunning = false;

        // 6. UI
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
        this.setupEditorUI();

        // Debug Text
        this.debugText = this.add.text(10, 10, "Debug v9", { fontSize: '12px', fill: '#0f0' });
    }

    setupEditorUI() {
        const editor = document.getElementById('editor');
        const toggleBtn = document.getElementById('editorToggle');
        const config = this.stageConfig.params;

        // Populate track index selector
        const trackSelect = document.getElementById('trackIndex');
        if (this.midiData && this.midiData.tracks) {
            trackSelect.innerHTML = '<option value="-1">All Tracks</option>';
            for (let i = 0; i < this.midiData.tracks.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = `Track ${i}`;
                trackSelect.appendChild(opt);
            }
        }

        // Populate fields
        document.getElementById('midiPath').value = this.stageConfig.midiPath;
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
        document.getElementById('enableAudio').checked = config.enableAudio !== false;
        document.getElementById('audioVolume').value = config.audioVolume || 70;
        document.getElementById('volumeDisplay').textContent = (config.audioVolume || 70) + '%';

        // Toggle editor
        const toggleEditor = () => {
            editor.classList.toggle('visible');
        };
        toggleBtn.addEventListener('click', toggleEditor);
        this.editorKey.on('down', toggleEditor);

        // Save button
        const saveBtn = document.getElementById('saveBtn');
        // Remove any existing listeners by cloning
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => {
            this.saveEditorConfig();
            // Rebuild MIDI events with new config
            if (this.midiData) {
                this.buildMIDIEvents();
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
            toggleEditor();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            if (confirm('Reset to defaults?')) {
                this.stageConfig = { ...DEFAULT_STAGE_CONFIG };
                saveStageConfig(this.stageConfig);
                this.setupEditorUI();
                this.buildMIDIEvents();
            }
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            exportStageConfig(this.stageConfig);
        });

        // Import button
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importStageConfig(file, (config) => {
                    this.stageConfig = { ...DEFAULT_STAGE_CONFIG, ...config };
                    saveStageConfig(this.stageConfig);
                    this.setupEditorUI();
                    this.loadMIDIFile(this.stageConfig.midiPath).then(() => {
                        this.buildMIDIEvents();
                    });
                });
            }
        });

        // Live update on input change (debounced rebuild)
        let rebuildTimeout = null;
        const scheduleRebuild = () => {
            clearTimeout(rebuildTimeout);
            rebuildTimeout = setTimeout(() => {
                this.saveEditorConfig();
                this.buildMIDIEvents();
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

        // Audio controls
        document.getElementById('enableAudio').addEventListener('change', (e) => {
            this.audioEnabled = e.target.checked;
            this.stageConfig.params.enableAudio = e.target.checked;
            saveStageConfig(this.stageConfig);
            if (!e.target.checked && this.audioStarted) {
                this.stopAudio();
            }
        });

        document.getElementById('audioVolume').addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            this.audioVolume = vol;
            this.stageConfig.params.audioVolume = vol;
            document.getElementById('volumeDisplay').textContent = vol + '%';
            this.updateAudioVolume();
            saveStageConfig(this.stageConfig);
        });
    }

    saveEditorConfig() {
        const config = this.stageConfig.params;
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
        config.enableAudio = document.getElementById('enableAudio').checked;
        config.audioVolume = parseInt(document.getElementById('audioVolume').value) || 70;

        this.audioEnabled = config.enableAudio;
        this.audioVolume = config.audioVolume;
        this.updateAudioVolume();

        saveStageConfig(this.stageConfig);
    }

    startGame() {
        // Stop any existing audio first to allow restart
        this.stopAudio();
        
        this.isRunning = true;
        this.isDead = false;
        this.startText.setVisible(false);
        this.hazardSpawnCount = 0;
        this.sideAlternator = false;
        this.beatIndex = 0;
        this.lastBeatTime = -1;
        this.lastSubdivTime = -1;

        // Clear existing
        this.activeHazards.forEach(h => h.destroy());
        this.activeHazards = [];

        // Reset hotspots
        this.clearGreenHotspot();
        this.clearRedHotspots();
        this.greenScore = 0;
        this.scoreText.setText("Score: 0");

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
        if (this.audioEnabled && this.midiData) {
            this.startAudio().catch(err => {
                console.error(">> Audio start error (non-fatal):", err);
            });
        }

        // Remove old timers (if any)
        if (this.spawnTimer) this.spawnTimer.remove(false);
        if (this.greenTimer) this.greenTimer.remove(false);
        if (this.redTimer) this.redTimer.remove(false);
    }

    async startAudio() {
        if (this.audioStarted) {
            return; // Already started
        }

        if (!this.midiData) {
            console.warn(">> No MIDI data available for audio");
            return;
        }

        // Wait for Tone.js to be available
        let attempts = 0;
        while (!window.Tone && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.Tone) {
            console.warn(">> Tone.js not loaded, audio disabled");
            return;
        }

        try {
            const Tone = window.Tone;
            
            // Initialize Tone.js context (requires user interaction)
            await Tone.start();
            console.log(">> Audio context started");

            // Stop any existing playback
            this.stopAudio();

            // Create synthesizers for each track
            const config = this.stageConfig.params;
            const tracks = config.trackIndex === -1 
                ? this.midiData.tracks 
                : [this.midiData.tracks[config.trackIndex] || this.midiData.tracks[0]];

            this.midiPlayers = [];

            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                const synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'sine' },
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
                }).toDestination();

                // Create a player for this track's notes
                const player = {
                    synth,
                    notes: track.notes,
                    scheduled: false
                };

                this.midiPlayers.push(player);
            }

            // Schedule all notes - sync with game start time
            // Use a small delay to ensure audio starts with game
            const audioStartDelay = 0.1; // 100ms delay for sync
            const startTime = Tone.now() + audioStartDelay;
            
            for (const player of this.midiPlayers) {
                for (const note of player.notes) {
                    const noteStart = startTime + note.time;
                    
                    player.synth.triggerAttackRelease(
                        Tone.Frequency(note.midi, "midi").toFrequency(),
                        note.duration,
                        noteStart,
                        note.velocity
                    );
                }
            }

            // Start Tone.js transport
            Tone.Transport.bpm.value = this.trackBPM;
            Tone.Transport.start(startTime);

            this.audioStarted = true;
            this.updateAudioVolume();
            console.log(">> MIDI audio playback started");
        } catch (err) {
            console.error(">> Failed to start audio:", err);
        }
    }

    stopAudio() {
        // Reset audio state flag first
        this.audioStarted = false;
        
        if (!window.Tone) {
            // Clean up players even if Tone isn't available
            this.midiPlayers = [];
            return;
        }

        try {
            const Tone = window.Tone;
            Tone.Transport.stop();
            Tone.Transport.cancel();

            // Clean up synthesizers
            for (const player of this.midiPlayers) {
                if (player.synth) {
                    player.synth.dispose();
                }
            }
            this.midiPlayers = [];
            console.log(">> MIDI audio playback stopped");
        } catch (err) {
            console.error(">> Error stopping audio:", err);
        } finally {
            // Ensure flag is reset
            this.audioStarted = false;
        }
    }

    updateAudioVolume() {
        if (!window.Tone || !this.midiPlayers) return;

        const volume = (this.audioVolume - 100) * 0.5; // Convert 0-100 to dB (0 = -50dB, 100 = 0dB)
        for (const player of this.midiPlayers) {
            if (player.synth && player.synth.volume) {
                player.synth.volume.value = volume;
            }
        }
    }

    getTrackTimeSec() {
        if (!this.trackStartMs) return 0;
        return (performance.now() - this.trackStartMs) / 1000;
    }

    spawnHazardFromEvent(evt) {
        if (this.isDead || !this.isRunning) return;

        const config = this.stageConfig.params;
        const baseY = this.lanes[evt.laneRow];
        const offset = Phaser.Math.Between(-config.laneJitter, config.laneJitter);
        const y = baseY + offset;

        // Determine spawn side
        let fromLeft = false;
        if (config.sideMode === "left") {
            fromLeft = true;
        } else if (config.sideMode === "right") {
            fromLeft = false;
        } else if (config.sideMode === "alternate") {
            this.sideAlternator = !this.sideAlternator;
            fromLeft = this.sideAlternator;
        } else { // random
            fromLeft = Phaser.Math.Between(0, 1) === 0;
        }

        const spawnX = fromLeft ? -60 : this.width + 60;
        const velocityX = fromLeft ? config.hazardSpeed : -config.hazardSpeed;

        const hazard = this.add.image(spawnX, y, 'hazard_texture');
        hazard.setDepth(5);
        hazard.vx = velocityX;
        hazard.isHazard = true;

        this.activeHazards.push(hazard);
        this.hazardSpawnCount++;
    }

    update(time, delta) {
        // Debug update
        const trackTime = this.getTrackTimeSec();
        this.debugText.setText(
            `Hazards: ${this.activeHazards.length} | ` +
            `Track: ${trackTime.toFixed(1)}s | ` +
            `FPS: ${(1000 / delta).toFixed(0)}`
        );

        if (this.isDead || !this.isRunning) return;

        // 1. Player Input
        this.handleInput();

        // 2. MIDI Event-Driven Hazard Spawning
        if (this.track && this.track.events && this.track.events.length > 0) {
            const config = this.stageConfig.params;
            const t = this.getTrackTimeSec();
            const lookahead = config.lookaheadSec;

            while (this.track.nextIndex < this.track.events.length) {
                const evt = this.track.events[this.track.nextIndex];
                if (evt && evt.timeSec <= t + lookahead) {
                    this.spawnHazardFromEvent(evt);
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
        this.updateHotspotsFromBeats();

        // 4. Grid hotspot checks
        this.checkGridHotspots();

        // 5. Manual Hazard Update (Motion + Cleanup + Collision)
        const dt = delta / 1000;

        for (let i = this.activeHazards.length - 1; i >= 0; i--) {
            const h = this.activeHazards[i];

            // Motion
            h.x += h.vx * dt;

            // Rotation
            h.rotation += 2 * dt;

            // Cleanup
            if ((h.vx > 0 && h.x > this.width + 100) || (h.vx < 0 && h.x < -100)) {
                h.destroy();
                this.activeHazards.splice(i, 1);
                continue;
            }

            // Collision
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, h.x, h.y);
            if (dist < 36) {
                this.handlePlayerHit();
            }
        }
    }

    updateHotspotsFromBeats() {
        if (!this.trackBPM || !this.secondsPerBeat) return;

        const config = this.stageConfig.params;
        const t = this.getTrackTimeSec();
        const beatTime = t / this.secondsPerBeat;
        const currentBeat = Math.floor(beatTime);

        // Green hotspot on downbeats
        if (currentBeat % config.greenEveryBeats === 0 && currentBeat !== this.lastBeatTime) {
            if (!this.greenHotspot || !this.greenActive) {
                this.spawnGreenHotspotFromBeat(currentBeat);
            }
        }

        // Red hotspot on offbeats/subdivisions
        const subdiv = Math.floor(beatTime * config.redEverySubdiv);
        if (subdiv % config.redEverySubdiv === 1 && subdiv !== this.lastSubdivTime) {
            // Spawn red on offbeats
            if (this.redHotspots.length < 3) {
                this.spawnRedHotspotFromBeat(subdiv);
                this.lastSubdivTime = subdiv;
            }
        }

        this.lastBeatTime = currentBeat;
    }

    getCellFromBeatIndex(beatIndex) {
        const config = this.stageConfig.params;
        const cellIndex = (beatIndex * config.seedA + config.seedB) % 9;
        const row = Math.floor(cellIndex / 3);
        const col = cellIndex % 3;
        return { row, col };
    }

    spawnGreenHotspotFromBeat(beatIndex) {
        if (this.isDead || !this.isRunning) return;

        this.clearGreenHotspot();
        this.greenActive = false;

        const { row, col } = this.getCellFromBeatIndex(beatIndex);

        // Ensure not on red
        const isRed = this.redHotspots.some(h => h.row === row && h.col === col);
        if (isRed) {
            // Try next cell
            const nextCell = this.getCellFromBeatIndex(beatIndex + 1);
            this.greenHotspot = { row: nextCell.row, col: nextCell.col };
        } else {
            this.greenHotspot = { row, col };
        }

        const pos = this.getGridPosition(this.greenHotspot.row, this.greenHotspot.col);
        this.greenCircle = this.add.circle(pos.x, pos.y, 18, 0x00ff00, 0.9).setOrigin(0.5);
        this.greenCircle.setScale(1.4);

        if (this.greenActivationTween) {
            this.greenActivationTween.stop();
        }
        this.greenActivationTween = this.tweens.add({
            targets: this.greenCircle,
            scale: 1,
            alpha: 0.7,
            duration: 500,
            ease: "Sine.easeOut",
            onComplete: () => {
                this.greenActive = true;
                this.greenPulseTween = this.tweens.add({
                    targets: this.greenCircle,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        });
    }

    spawnRedHotspotFromBeat(beatIndex) {
        if (this.isDead || !this.isRunning) return;
        if (this.redHotspots.length >= 3) return;

        const { row, col } = this.getCellFromBeatIndex(beatIndex);

        // Ensure not on green
        const isGreen = this.greenHotspot && this.greenHotspot.row === row && this.greenHotspot.col === col;
        if (isGreen) return;

        // Ensure not already red
        const isRed = this.redHotspots.some(h => h.row === row && h.col === col);
        if (isRed) return;

        const pos = this.getGridPosition(row, col);
        const redCircle = this.add.circle(pos.x, pos.y, 18, 0xff0000, 1).setOrigin(0.5);
        redCircle.setScale(1.4);

        const hotspot = {
            row,
            col,
            circle: redCircle,
            active: false,
            expireEvent: null,
            activationEvent: null,
            pulseTween: null
        };

        hotspot.activationEvent = this.tweens.add({
            targets: redCircle,
            scale: 1,
            alpha: 0.6,
            duration: 500,
            ease: "Sine.easeOut",
            onComplete: () => {
                hotspot.active = true;
                hotspot.pulseTween = this.tweens.add({
                    targets: redCircle,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        });

        hotspot.expireEvent = this.time.delayedCall(10000, () => {
            this.removeRedHotspot(hotspot);
        });

        this.redHotspots.push(hotspot);
    }

    handleInput() {
        let moved = false;
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.currentLaneIndex = Math.max(0, this.currentLaneIndex - 1);
            moved = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.currentLaneIndex = Math.min(2, this.currentLaneIndex + 1);
            moved = true;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            this.currentColumnIndex = Math.max(0, this.currentColumnIndex - 1);
            moved = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            this.currentColumnIndex = Math.min(2, this.currentColumnIndex + 1);
            moved = true;
        }

        if (moved) {
            this.movePlayerToGrid();
        }
    }

    getGridPosition(row, col) {
        const x = this.columns[col];
        const y = this.lanes[row];
        return { x, y };
    }

    isPlayerAt(row, col) {
        return row === this.currentLaneIndex && col === this.currentColumnIndex;
    }

    movePlayerToGrid() {
        const targetX = this.columns[this.currentColumnIndex];
        const targetY = this.lanes[this.currentLaneIndex];

        this.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: 100,
            ease: "Sine.easeOut"
        });
    }

    spawnGreenHotspot() {
        // Legacy method - kept for compatibility but not used in MIDI mode
        // MIDI mode uses spawnGreenHotspotFromBeat
    }

    clearGreenHotspot() {
        if (this.greenPulseTween) {
            this.greenPulseTween.stop();
            this.greenPulseTween = null;
        }
        if (this.greenActivationTween) {
            this.greenActivationTween.stop();
            this.greenActivationTween = null;
        }
        if (this.greenCircle) {
            this.greenCircle.destroy();
            this.greenCircle = null;
        }
        this.greenHotspot = null;
        this.greenActive = false;
    }

    spawnRedHotspot() {
        // Legacy method - kept for compatibility but not used in MIDI mode
        // MIDI mode uses spawnRedHotspotFromBeat
    }

    clearRedHotspots() {
        this.redHotspots.forEach(h => {
            if (h.pulseTween) {
                h.pulseTween.stop();
            }
            if (h.circle) {
                h.circle.destroy();
            }
            if (h.expireEvent) {
                h.expireEvent.remove(false);
            }
            if (h.activationEvent) {
                h.activationEvent.stop();
            }
        });
        this.redHotspots = [];
    }

    removeRedHotspot(hotspot) {
        const index = this.redHotspots.indexOf(hotspot);
        if (index !== -1) {
            if (hotspot.pulseTween) {
                hotspot.pulseTween.stop();
            }
            if (hotspot.circle) {
                hotspot.circle.destroy();
            }
            if (hotspot.expireEvent) {
                hotspot.expireEvent.remove(false);
            }
            if (hotspot.activationEvent) {
                hotspot.activationEvent.stop();
            }
            this.redHotspots.splice(index, 1);
        }
    }

    checkGridHotspots() {
        if (this.isDead || !this.isRunning) return;

        const row = this.currentLaneIndex;
        const col = this.currentColumnIndex;

        if (this.greenHotspot && this.greenActive && this.greenHotspot.row === row && this.greenHotspot.col === col) {
            this.greenScore += 1;
            this.scoreText.setText("Score: " + this.greenScore);
            this.clearGreenHotspot();
        }

        const isOnRed = this.redHotspots.some(h => h.active && h.row === row && h.col === col);
        if (isOnRed) {
            this.triggerGridDeath();
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
        this.stopAudio();

        if (this.spawnTimer) this.spawnTimer.remove(false);
        if (this.greenTimer) this.greenTimer.remove(false);
        if (this.redTimer) this.redTimer.remove(false);

        // Pop Animation
        this.tweens.add({
            targets: this.player,
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
            this.stopAudio();
            this.scene.restart();
        });
    }

    shutdown() {
        // Cleanup when scene is destroyed
        this.stopAudio();
    }
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RunnerScene };
}

// Initialize game in browser environment
if (typeof window !== 'undefined' && typeof Phaser !== 'undefined') {
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: "#111111",
        scene: [RunnerScene]
    };

    const game = new Phaser.Game(config);
}
