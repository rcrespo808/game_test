/**
 * Hazard Management Module
 * Handles hazard spawning, movement, and collision
 */

export class HazardManager {
    constructor(scene, gridManager, stageConfig) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.config = stageConfig.params;
        this.activeHazards = [];
        this.sideAlternator = false;
        this.hazardSpawnCount = 0;
    }

    /**
     * Spawn a hazard from a MIDI event
     */
    spawnHazardFromEvent(evt) {
        const baseY = this.gridManager.getLaneY(evt.laneRow);
        const offset = window.Phaser.Math.Between(-this.config.laneJitter, this.config.laneJitter);
        const y = baseY + offset;

        // Determine spawn side
        let fromLeft = false;
        if (this.config.sideMode === "left") {
            fromLeft = true;
        } else if (this.config.sideMode === "right") {
            fromLeft = false;
        } else if (this.config.sideMode === "alternate") {
            this.sideAlternator = !this.sideAlternator;
            fromLeft = this.sideAlternator;
        } else { // random
            fromLeft = window.Phaser.Math.Between(0, 1) === 0;
        }

        const spawnX = fromLeft ? -60 : this.scene.width + 60;
        const velocityX = fromLeft ? this.config.hazardSpeed : -this.config.hazardSpeed;

        const hazard = this.scene.add.image(spawnX, y, 'hazard_texture');
        hazard.setDepth(5);
        hazard.vx = velocityX;
        hazard.isHazard = true;

        this.activeHazards.push(hazard);
        this.hazardSpawnCount++;
    }

    /**
     * Update all hazards (movement, cleanup, collision)
     */
    update(delta, playerSprite) {
        const dt = delta / 1000;
        const collisions = [];

        for (let i = this.activeHazards.length - 1; i >= 0; i--) {
            const h = this.activeHazards[i];

            // Motion
            h.x += h.vx * dt;

            // Rotation
            h.rotation += 2 * dt;

            // Cleanup
            if ((h.vx > 0 && h.x > this.scene.width + 100) || 
                (h.vx < 0 && h.x < -100)) {
                h.destroy();
                this.activeHazards.splice(i, 1);
                continue;
            }

            // Collision
            const dist = window.Phaser.Math.Distance.Between(
                playerSprite.x, 
                playerSprite.y, 
                h.x, 
                h.y
            );
            if (dist < 36) {
                collisions.push(h);
            }
        }

        return collisions;
    }

    /**
     * Clear all hazards
     */
    clear() {
        this.activeHazards.forEach(h => h.destroy());
        this.activeHazards = [];
        this.hazardSpawnCount = 0;
        this.sideAlternator = false;
    }

    /**
     * Get active hazard count
     */
    getCount() {
        return this.activeHazards.length;
    }
}
