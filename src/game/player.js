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
        
        this.player = scene.add.circle(startX, startY, 16, 0x00ffff);
        this.player.setDepth(10);
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
    }

    /**
     * Get player sprite for collision detection
     */
    getSprite() {
        return this.player;
    }
}
