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
        const laneRow = this.gridManager.clampRow(evt.laneRow ?? this.gridManager.getCenterRow());
        const baseY = this.gridManager.getLaneY(laneRow);
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

        // Create animated sprite with initial frame
        const initialFrameName = 'hazzards_sheet_frame_0';
        const hazard = this.scene.add.sprite(spawnX, y, 'hazzards_sheet', initialFrameName);
        hazard.setDepth(5);
        
        // Scale sprite (original is 12x9, scale to visible size)
        // Scale to approximately 40x40 for visibility (maintaining aspect ratio)
        const targetScale = 40 / 12; // Scale based on width
        
        // Start with scale 0 and alpha 0 for spawn animation
        hazard.setScale(0);
        hazard.setAlpha(0);
        
        // Mirror sprite horizontally for right-to-left movement
        if (!fromLeft) {
            hazard.setFlipX(true);
        }
        
        // Play animation (same for both directions, sprite is mirrored for right-to-left)
        hazard.play('hazard_anim');
        
        // Spawn animation: scale up, fade in, slight rotation
        this.scene.tweens.add({
            targets: hazard,
            scale: targetScale,
            alpha: 1,
            angle: fromLeft ? 15 : -15, // Slight rotation based on direction
            duration: 200,
            ease: 'Back.easeOut', // Bouncy effect
            onComplete: () => {
                // Return rotation to 0 after spawn
                this.scene.tweens.add({
                    targets: hazard,
                    angle: 0,
                    duration: 150,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        // Start subtle pulsing animation after spawn completes
                        this.scene.tweens.add({
                            targets: hazard,
                            scale: targetScale * 1.1,
                            duration: 800,
                            ease: 'Sine.easeInOut',
                            yoyo: true,
                            repeat: -1
                        });
                    }
                });
            }
        });
        
        hazard.vx = velocityX;
        hazard.isHazard = true;
        hazard.targetScale = targetScale; // Store for cleanup

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

            // Cleanup
            if ((h.vx > 0 && h.x > this.scene.width + 100) || 
                (h.vx < 0 && h.x < -100)) {
                // Destroy animation: scale down and fade out
                this.scene.tweens.add({
                    targets: h,
                    scale: 0,
                    alpha: 0,
                    angle: h.vx > 0 ? 45 : -45, // Rotate while fading
                    duration: 150,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        h.destroy();
                    }
                });
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
        // Animate out all hazards before destroying
        this.activeHazards.forEach(h => {
            // Stop any existing tweens
            this.scene.tweens.killTweensOf(h);
            
            // Quick fade out animation
            this.scene.tweens.add({
                targets: h,
                scale: 0,
                alpha: 0,
                duration: 100,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    h.destroy();
                }
            });
        });
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
