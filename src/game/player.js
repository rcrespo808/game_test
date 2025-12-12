/**
 * Player Management Module
 * Handles player movement and positioning
 */

export class PlayerManager {
    constructor(scene, gridManager, startLane = 1, startColumn = 1) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.currentLaneIndex = startLane;
        this.currentColumnIndex = startColumn;
        
        const startX = gridManager.getColumnX(startColumn);
        const startY = gridManager.getLaneY(startLane);
        
        this.player = scene.add.circle(startX, startY, 16, 0x00ffff);
        this.player.setDepth(10);
    }

    /**
     * Handle input and update player position
     */
    handleInput(cursors) {
        let moved = false;
        if (window.Phaser.Input.Keyboard.JustDown(cursors.up)) {
            this.currentLaneIndex = Math.max(0, this.currentLaneIndex - 1);
            moved = true;
        } else if (window.Phaser.Input.Keyboard.JustDown(cursors.down)) {
            this.currentLaneIndex = Math.min(2, this.currentLaneIndex + 1);
            moved = true;
        }

        if (window.Phaser.Input.Keyboard.JustDown(cursors.left)) {
            this.currentColumnIndex = Math.max(0, this.currentColumnIndex - 1);
            moved = true;
        } else if (window.Phaser.Input.Keyboard.JustDown(cursors.right)) {
            this.currentColumnIndex = Math.min(2, this.currentColumnIndex - 1);
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
    reset(laneIndex = 1, columnIndex = 1) {
        this.currentLaneIndex = laneIndex;
        this.currentColumnIndex = columnIndex;
        const pos = this.gridManager.getGridPosition(laneIndex, columnIndex);
        this.player.setPosition(pos.x, pos.y);
    }

    /**
     * Get player sprite for collision detection
     */
    getSprite() {
        return this.player;
    }
}
