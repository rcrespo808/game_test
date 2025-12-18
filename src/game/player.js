/**
 * Player Management Module
 * Handles player movement and positioning
 */

export class PlayerManager {
    constructor(scene, gridManager, startLane, startColumn) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.currentLaneIndex = startLane !== undefined ? startLane : gridManager.getCenterRow();
        this.currentColumnIndex = startColumn !== undefined ? startColumn : gridManager.getCenterColumn();
        
        const startX = gridManager.getColumnX(this.currentColumnIndex);
        const startY = gridManager.getLaneY(this.currentLaneIndex);
        
        // Try to create animated sprite, fallback to circle if not available
        const initialFrame = 'sprites_sheet_player_frame_0';
        
        if (scene.textures.exists('sprites_sheet')) {
            const texture = scene.textures.get('sprites_sheet');
            
            if (texture.has(initialFrame)) {
                // Create animated sprite
                this.player = scene.add.sprite(startX, startY, 'sprites_sheet', initialFrame);
                this.player.setDepth(10);
                
                // Set origin to center to ensure consistent positioning
                this.player.setOrigin(0.5, 0.5);
                
                // Scale player sprite (original is 16x16, scale to desired size)
                const scale = 2; // Scale to 32x32 pixels (2x the 16x16 sprite)
                this.player.setScale(scale);
                
                // Play animation if available
                if (scene.anims.exists('player_anim')) {
                    this.player.play('player_anim');
                    console.log('>> Player animated sprite created and animation started');
                } else {
                    console.warn('>> Player sprite created but animation not found');
                }
                return;
            } else {
                console.warn(`>> Frame ${initialFrame} not found, falling back to circle`);
            }
        } else {
            console.warn('>> sprites_sheet texture not found, falling back to circle');
        }
        
        // Fallback: create circle
        this.player = scene.add.circle(startX, startY, 16, 0x00ffff);
        this.player.setDepth(10);
        console.log('>> Player created as circle (fallback)');
    }

    /**
     * Handle input and update player position
     */
    handleInput(cursors) {
        let moved = false;
        const maxRow = this.gridManager.getRowCount() - 1;
        const maxCol = this.gridManager.getColumnCount() - 1;

        if (window.Phaser.Input.Keyboard.JustDown(cursors.up)) {
            this.currentLaneIndex = Math.max(0, this.currentLaneIndex - 1);
            moved = true;
        } else if (window.Phaser.Input.Keyboard.JustDown(cursors.down)) {
            this.currentLaneIndex = Math.min(maxRow, this.currentLaneIndex + 1);
            moved = true;
        }

        if (window.Phaser.Input.Keyboard.JustDown(cursors.left)) {
            this.currentColumnIndex = Math.max(0, this.currentColumnIndex - 1);
            moved = true;
        } else if (window.Phaser.Input.Keyboard.JustDown(cursors.right)) {
            this.currentColumnIndex = Math.min(maxCol, this.currentColumnIndex + 1);
            moved = true;
        }

        if (moved) {
            this.moveToGrid();
        }

        return { lane: this.currentLaneIndex, column: this.currentColumnIndex };
    }

    /**
     * Move player to current grid position
     */
    moveToGrid() {
        const targetX = this.gridManager.getColumnX(this.currentColumnIndex);
        const targetY = this.gridManager.getLaneY(this.currentLaneIndex);

        this.scene.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: 100,
            ease: "Sine.easeOut"
        });
    }

    /**
     * Check if player is at a specific grid cell
     */
    isAt(row, col) {
        return this.gridManager.isAt(row, col, this.currentLaneIndex, this.currentColumnIndex);
    }

    /**
     * Get player position
     */
    getPosition() {
        return { x: this.player.x, y: this.player.y };
    }

    /**
     * Reset player position
     */
    reset(laneIndex = this.gridManager.getCenterRow(), columnIndex = this.gridManager.getCenterColumn()) {
        this.currentLaneIndex = this.gridManager.clampRow(laneIndex);
        this.currentColumnIndex = this.gridManager.clampColumn(columnIndex);
        const pos = this.gridManager.getGridPosition(this.currentLaneIndex, this.currentColumnIndex);
        this.player.setPosition(pos.x, pos.y);
        
        // Ensure animation continues playing after reset
        if (this.player.anims && (!this.player.anims.isPlaying || (this.player.anims.currentAnim && this.player.anims.currentAnim.key !== 'player_anim'))) {
            this.player.play('player_anim');
        }
    }

    /**
     * Get player sprite for collision detection
     */
    getSprite() {
        return this.player;
    }
}
