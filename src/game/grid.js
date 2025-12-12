/**
 * Grid Management Module
 * Handles grid positioning and cell calculations
 */

export class GridManager {
    constructor(width, height, params = {}) {
        this.width = width;
        this.height = height;

        const rows = Math.max(3, Math.min(5, params.gridRows || params.gridSize || 3));
        const cols = Math.max(3, Math.min(5, params.gridCols || params.gridSize || rows));

        this.rows = rows;
        this.cols = cols;
        this.cellCount = rows * cols;

        this.lanes = this.buildPositions(height, rows);
        this.columns = this.buildPositions(width, cols);
    }

    buildPositions(size, count) {
        const spacing = size / (count + 1);
        return Array.from({ length: count }, (_, i) => spacing * (i + 1));
    }

    getRowCount() {
        return this.rows;
    }

    getColumnCount() {
        return this.cols;
    }

    getCellCount() {
        return this.cellCount;
    }

    getCenterRow() {
        return Math.floor((this.rows - 1) / 2);
    }

    getCenterColumn() {
        return Math.floor((this.cols - 1) / 2);
    }

    clampRow(index) {
        return Math.max(0, Math.min(index, this.rows - 1));
    }

    clampColumn(index) {
        return Math.max(0, Math.min(index, this.cols - 1));
    }

    /**
     * Get grid position from row and column
     */
    getGridPosition(row, col) {
        const x = this.columns[this.clampColumn(col)];
        const y = this.lanes[this.clampRow(row)];
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
        const totalCells = this.getCellCount();
        const safeCells = totalCells > 0 ? totalCells : 1;
        const cellIndex = (beatIndex * seedA + seedB) % safeCells;
        const row = Math.floor(cellIndex / this.cols);
        const col = cellIndex % this.cols;
        return { row, col };
    }

    /**
     * Get lane Y position by index
     */
    getLaneY(index) {
        return this.lanes[this.clampRow(index)];
    }

    /**
     * Get column X position by index
     */
    getColumnX(index) {
        return this.columns[this.clampColumn(index)];
    }
}
