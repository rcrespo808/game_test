/**
 * Grid Management Module
 * Handles grid positioning and cell calculations
 */

export class GridManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.lanes = [height * 0.3, height * 0.5, height * 0.7];
        this.columns = [width / 2 - 120, width / 2, width / 2 + 120];
    }

    /**
     * Get grid position from row and column
     */
    getGridPosition(row, col) {
        const x = this.columns[col];
        const y = this.lanes[row];
        return { x, y };
    }

    /**
     * Check if position is at a specific grid cell
     */
    isAt(row, col, currentLaneIndex, currentColumnIndex) {
        return row === currentLaneIndex && col === currentColumnIndex;
    }

    /**
     * Get cell index from beat index using seed values
     */
    getCellFromBeatIndex(beatIndex, seedA, seedB) {
        const cellIndex = (beatIndex * seedA + seedB) % 9;
        const row = Math.floor(cellIndex / 3);
        const col = cellIndex % 3;
        return { row, col };
    }

    /**
     * Get lane Y position by index
     */
    getLaneY(index) {
        return this.lanes[index];
    }

    /**
     * Get column X position by index
     */
    getColumnX(index) {
        return this.columns[index];
    }
}
