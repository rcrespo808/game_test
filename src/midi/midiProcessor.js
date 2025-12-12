/**
 * MIDI Processing Module
 * Converts MIDI data into game events
 */

function mapPitchToLane(midiValue, config) {
    const rows = Math.max(3, Math.min(5, config.gridRows || 3));
    const minPitch = Math.min(config.lowCut, config.highCut);
    const maxPitch = Math.max(config.lowCut, config.highCut);
    const clamped = Math.max(minPitch, Math.min(maxPitch, midiValue));
    const range = Math.max(1, maxPitch - minPitch);
    const normalized = (clamped - minPitch) / range;
    const laneFromTop = Math.min(rows - 1, Math.floor(normalized * rows));
    return (rows - 1) - laneFromTop;
}

/**
 * Build MIDI events from MIDI data and configuration
 * @param {Object} midiData - Parsed MIDI data
 * @param {Object} config - Stage configuration params
 * @returns {Object} Track object with events and metadata
 */
export function buildMIDIEvents(midiData, config) {
    if (!midiData) {
        return { events: [], nextIndex: 0, bpm: 120, secondsPerBeat: 0.5, songDuration: 0 };
    }

    const events = [];
    let tracks;
    if (config.trackIndex === -1) {
        // Use all tracks
        tracks = midiData.tracks;
    } else {
        // Use specific track, with bounds checking
        const trackIndex = Math.max(0, Math.min(config.trackIndex, midiData.tracks.length - 1));
        tracks = [midiData.tracks[trackIndex]];
    }

    // Get tempo (BPM) from MIDI or override
    let bpm = config.bpmOverride > 0 ? config.bpmOverride : 120;
    const tempoEvents = midiData.header.tempos || [];
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
            const laneRow = mapPitchToLane(note.midi, config);

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

    console.log(`>> Built ${events.length} MIDI events, BPM: ${bpm.toFixed(1)}`);
    if (events.length === 0) {
        console.warn(">> WARNING: No MIDI events generated! Check velocityMin and other filters.");
    }

    // Calculate song duration from last event or MIDI duration
    let songDuration = 0;
    if (events.length > 0) {
        // Use the last event's time as the song duration
        songDuration = events[events.length - 1].timeSec;
        // Add a small buffer (e.g., 2 seconds) after last event
        songDuration += 2;
    } else if (midiData.duration !== undefined) {
        // Use MIDI duration if available
        songDuration = midiData.duration;
    }

    return {
        midi: midiData,
        events,
        nextIndex: 0,
        bpm,
        secondsPerBeat,
        songDuration
    };
}
