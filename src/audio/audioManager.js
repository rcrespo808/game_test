/**
 * Audio Management Module
 * Handles MIDI audio playback using Tone.js
 */

export class AudioManager {
    constructor() {
        this.audioEnabled = false;
        this.audioVolume = 70;
        this.midiPlayers = [];
        this.audioStarted = false;
    }

    /**
     * Start audio playback for MIDI data
     * @param {Object} midiData - Parsed MIDI data
     * @param {Object} config - Stage configuration
     * @param {number} trackBPM - BPM of the track
     * @returns {Promise<void>}
     */
    async startAudio(midiData, config, trackBPM) {
        if (this.audioStarted) {
            return; // Already started
        }

        if (!midiData) {
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
            const tracks = config.trackIndex === -1 
                ? midiData.tracks 
                : [midiData.tracks[config.trackIndex] || midiData.tracks[0]];

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
            Tone.Transport.bpm.value = trackBPM;
            Tone.Transport.start(startTime);

            this.audioStarted = true;
            this.updateAudioVolume();
            console.log(">> MIDI audio playback started");
        } catch (err) {
            console.error(">> Failed to start audio:", err);
        }
    }

    /**
     * Stop audio playback
     */
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

    /**
     * Update audio volume
     */
    updateAudioVolume() {
        if (!window.Tone || !this.midiPlayers) return;

        const volume = (this.audioVolume - 100) * 0.5; // Convert 0-100 to dB (0 = -50dB, 100 = 0dB)
        for (const player of this.midiPlayers) {
            if (player.synth && player.synth.volume) {
                player.synth.volume.value = volume;
            }
        }
    }

    /**
     * Set audio enabled state
     */
    setEnabled(enabled) {
        this.audioEnabled = enabled;
        if (!enabled && this.audioStarted) {
            this.stopAudio();
        }
    }

    /**
     * Set audio volume (0-100)
     */
    setVolume(volume) {
        this.audioVolume = volume;
        this.updateAudioVolume();
    }
}
