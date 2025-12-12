/**
 * Audio Management Module
 * Handles MIDI audio playback using Tone.js
 * Refactored for reliable restart behavior
 */

export class AudioManager {
    constructor() {
        this.audioEnabled = false;
        this.audioVolume = 70;
        this.midiPlayers = [];
        this.parts = [];
        this.audioStarted = false;
        this.stopPromise = null;
    }

    /**
     * Stop audio playback and ensure complete cleanup
     * @returns {Promise<void>}
     */
    async stopAudio() {
        // Reset audio state flag first
        this.audioStarted = false;

        if (!window.Tone) {
            // Clean up players even if Tone isn't available
            this.midiPlayers = [];
            this.parts = [];
            return;
        }

        // If already stopping, wait for it to complete
        if (this.stopPromise) {
            return this.stopPromise;
        }

        this.stopPromise = (async () => {
            try {
                const Tone = window.Tone;

                // Stop Transport first
                if (Tone.Transport.state === "started") {
                    Tone.Transport.stop();
                }

                // Stop all parts before disposing
                if (this.parts && this.parts.length) {
                    for (const part of this.parts) {
                        if (part && typeof part.stop === 'function') {
                            part.stop();
                        }
                        // Small delay to let parts stop
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }

                // Cancel Transport events
                Tone.Transport.cancel(0);
                Tone.Transport.position = 0;

                // Dispose parts
                if (this.parts && this.parts.length) {
                    for (const part of this.parts) {
                        if (part && typeof part.dispose === 'function') {
                            part.dispose();
                        }
                    }
                }
                this.parts = [];

                // Clean up synthesizers
                for (const player of this.midiPlayers) {
                    if (player && player.synth) {
                        if (typeof player.synth.dispose === 'function') {
                            player.synth.dispose();
                        }
                    }
                }
                this.midiPlayers = [];

                // Small delay to ensure cleanup completes
                await new Promise(resolve => setTimeout(resolve, 50));

                console.log(">> MIDI audio playback stopped");
            } catch (err) {
                console.error(">> Error stopping audio:", err);
            } finally {
                // Ensure flag is reset
                this.audioStarted = false;
                this.stopPromise = null;
            }
        })();

        return this.stopPromise;
    }

    /**
     * Start audio playback for MIDI data
     * @param {Object} midiData - Parsed MIDI data
     * @param {Object} config - Stage configuration
     * @param {number} trackBPM - BPM of the track
     * @returns {Promise<number|null>} Start time in Tone.now() seconds, or null if failed
     */
    async startAudio(midiData, config, trackBPM) {
        // Ensure any previous playback is fully stopped before starting
        await this.stopAudio();

        if (!midiData) {
            console.warn(">> No MIDI data available for audio");
            return null;
        }

        // Wait for Tone.js to be available
        let attempts = 0;
        while (!window.Tone && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.Tone) {
            console.warn(">> Tone.js not loaded, audio disabled");
            return null;
        }

        try {
            const Tone = window.Tone;

            // Initialize Tone.js context (requires user interaction)
            await Tone.start();
            const context = Tone.getContext();
            if (context.state !== "running") {
                await context.resume();
            }
            console.log(">> Audio context started, state:", context.state);

            // Small delay to ensure context is ready
            await new Promise(resolve => setTimeout(resolve, 20));

            // Create synthesizers for each track
            const tracks = config.trackIndex === -1
                ? midiData.tracks
                : [midiData.tracks[config.trackIndex] || midiData.tracks[0]];

            this.midiPlayers = [];
            this.parts = [];

            // Prepare Transport state
            Tone.Transport.stop();
            Tone.Transport.cancel(0);
            Tone.Transport.position = 0;
            Tone.Transport.bpm.value = trackBPM;

            // Calculate start time with delay for sync
            const audioStartDelay = 0.15; // 150ms delay for sync
            const startTime = Tone.now() + audioStartDelay;

            // Create synthesizers and parts for each track
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];

                // Create synthesizer
                const synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'sine' },
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
                }).toDestination();

                // Set volume
                const volume = (this.audioVolume - 100) * 0.5;
                synth.volume.value = volume;

                // Store player reference
                const player = {
                    synth,
                    notes: track.notes,
                    scheduled: false
                };
                this.midiPlayers.push(player);

                // Build a Tone.Part for this track
                // Map notes to format expected by Tone.Part
                const noteEvents = track.notes.map(note => ({
                    time: note.time,
                    midi: note.midi,
                    duration: note.duration,
                    velocity: note.velocity
                }));

                const part = new Tone.Part((time, note) => {
                    try {
                        player.synth.triggerAttackRelease(
                            Tone.Frequency(note.midi, "midi").toFrequency(),
                            note.duration,
                            time,
                            note.velocity
                        );
                    } catch (err) {
                        console.warn(">> Note trigger error:", err);
                    }
                }, noteEvents);

                part.loop = false;
                // Schedule part to start at the calculated start time
                part.start(startTime);
                this.parts.push(part);
            }

            // Start Transport at the same time
            Tone.Transport.start(startTime);

            this.audioStarted = true;
            console.log(">> MIDI audio playback started at", startTime.toFixed(3), "BPM:", trackBPM);

            return startTime;
        } catch (err) {
            console.error(">> Failed to start audio:", err);
            this.audioStarted = false;
            return null;
        }
    }

    /**
     * Update audio volume for all active synthesizers
     */
    updateAudioVolume() {
        if (!window.Tone || !this.midiPlayers) return;

        const volume = (this.audioVolume - 100) * 0.5; // Convert 0-100 to dB (0 = -50dB, 100 = 0dB)
        for (const player of this.midiPlayers) {
            if (player && player.synth && player.synth.volume) {
                try {
                    player.synth.volume.value = volume;
                } catch (err) {
                    console.warn(">> Volume update error:", err);
                }
            }
        }
    }

    /**
     * Set audio enabled state
     */
    setEnabled(enabled) {
        this.audioEnabled = enabled;
        if (!enabled && this.audioStarted) {
            this.stopAudio().catch(err => {
                console.error(">> Error stopping audio on disable:", err);
            });
        }
    }

    /**
     * Set audio volume (0-100)
     */
    setVolume(volume) {
        this.audioVolume = volume;
        this.updateAudioVolume();
    }

    /**
     * Check if audio is currently playing
     */
    isPlaying() {
        return this.audioStarted && window.Tone && window.Tone.Transport.state === "started";
    }
}
