/**
 * Hotspot Management Module
 * Handles green and red hotspot spawning and management
 */

export class HotspotManager {
    constructor(scene, gridManager, stageConfig) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.config = stageConfig.params;
        this.greenHotspot = null;
        this.redHotspots = [];
        this.greenActive = false;
        this.greenCircle = null;
        this.greenActivationTween = null;
        this.greenPulseTween = null;
        this.beatIndex = 0;
        this.lastBeatTime = -1;
        this.lastSubdivTime = -1;
    }

    /**
     * Update hotspots based on beat timing
     */
    updateHotspotsFromBeats(trackTimeSec, trackBPM, secondsPerBeat) {
        if (!trackBPM || !secondsPerBeat) return;

        const beatTime = trackTimeSec / secondsPerBeat;
        const currentBeat = Math.floor(beatTime);

        // Green hotspot on downbeats
        if (currentBeat % this.config.greenEveryBeats === 0 && currentBeat !== this.lastBeatTime) {
            if (!this.greenHotspot || !this.greenActive) {
                this.spawnGreenHotspotFromBeat(currentBeat);
            }
        }

        // Red hotspot on offbeats/subdivisions
        const subdiv = Math.floor(beatTime * this.config.redEverySubdiv);
        if (subdiv % this.config.redEverySubdiv === 1 && subdiv !== this.lastSubdivTime) {
            // Spawn red on offbeats
            if (this.redHotspots.length < 3) {
                this.spawnRedHotspotFromBeat(subdiv);
                this.lastSubdivTime = subdiv;
            }
        }

        this.lastBeatTime = currentBeat;
    }

    /**
     * Spawn green hotspot from beat index
     */
    spawnGreenHotspotFromBeat(beatIndex) {
        this.clearGreenHotspot();
        this.greenActive = false;

        const { row, col } = this.gridManager.getCellFromBeatIndex(
            beatIndex, 
            this.config.seedA, 
            this.config.seedB
        );

        // Ensure not on red
        const isRed = this.redHotspots.some(h => h.row === row && h.col === col);
        if (isRed) {
            // Try next cell
            const nextCell = this.gridManager.getCellFromBeatIndex(
                beatIndex + 1, 
                this.config.seedA, 
                this.config.seedB
            );
            this.greenHotspot = { row: nextCell.row, col: nextCell.col };
        } else {
            this.greenHotspot = { row, col };
        }

        const pos = this.gridManager.getGridPosition(this.greenHotspot.row, this.greenHotspot.col);
        this.greenCircle = this.scene.add.circle(pos.x, pos.y, 18, 0x00ff00, 0.9).setOrigin(0.5);
        this.greenCircle.setScale(1.4);

        if (this.greenActivationTween) {
            this.greenActivationTween.stop();
        }
        this.greenActivationTween = this.scene.tweens.add({
            targets: this.greenCircle,
            scale: 1,
            alpha: 0.7,
            duration: 500,
            ease: "Sine.easeOut",
            onComplete: () => {
                this.greenActive = true;
                this.greenPulseTween = this.scene.tweens.add({
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

    /**
     * Spawn red hotspot from beat index
     */
    spawnRedHotspotFromBeat(beatIndex) {
        if (this.redHotspots.length >= 3) return;

        const { row, col } = this.gridManager.getCellFromBeatIndex(
            beatIndex, 
            this.config.seedA, 
            this.config.seedB
        );

        // Ensure not on green
        const isGreen = this.greenHotspot && 
            this.greenHotspot.row === row && 
            this.greenHotspot.col === col;
        if (isGreen) return;

        // Ensure not already red
        const isRed = this.redHotspots.some(h => h.row === row && h.col === col);
        if (isRed) return;

        const pos = this.gridManager.getGridPosition(row, col);
        const redCircle = this.scene.add.circle(pos.x, pos.y, 18, 0xff0000, 1).setOrigin(0.5);
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

        hotspot.activationEvent = this.scene.tweens.add({
            targets: redCircle,
            scale: 1,
            alpha: 0.6,
            duration: 500,
            ease: "Sine.easeOut",
            onComplete: () => {
                hotspot.active = true;
                hotspot.pulseTween = this.scene.tweens.add({
                    targets: redCircle,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        });

        hotspot.expireEvent = this.scene.time.delayedCall(10000, () => {
            this.removeRedHotspot(hotspot);
        });

        this.redHotspots.push(hotspot);
    }

    /**
     * Clear green hotspot
     */
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

    /**
     * Clear all red hotspots
     */
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

    /**
     * Remove a specific red hotspot
     */
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

    /**
     * Check if player is on a green hotspot
     */
    checkGreenHotspot(playerLane, playerColumn) {
        if (this.greenHotspot && this.greenActive && 
            this.greenHotspot.row === playerLane && 
            this.greenHotspot.col === playerColumn) {
            this.clearGreenHotspot();
            return true;
        }
        return false;
    }

    /**
     * Check if player is on a red hotspot
     */
    checkRedHotspots(playerLane, playerColumn) {
        return this.redHotspots.some(h => 
            h.active && h.row === playerLane && h.col === playerColumn
        );
    }

    /**
     * Reset hotspot state
     */
    reset() {
        this.clearGreenHotspot();
        this.clearRedHotspots();
        this.beatIndex = 0;
        this.lastBeatTime = -1;
        this.lastSubdivTime = -1;
    }
}
