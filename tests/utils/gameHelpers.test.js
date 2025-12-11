/**
 * Utility functions for game testing
 * These can be used across multiple test files
 */

describe('Game Utilities', () => {
  describe('Grid Calculations', () => {
    test('should calculate correct lane positions', () => {
      const height = 600;
      const lanes = [height * 0.3, height * 0.5, height * 0.7];
      
      expect(lanes[0]).toBe(180);
      expect(lanes[1]).toBe(300);
      expect(lanes[2]).toBe(420);
    });

    test('should calculate correct column positions', () => {
      const width = 800;
      const columns = [width / 2 - 120, width / 2, width / 2 + 120];
      
      expect(columns[0]).toBe(280);
      expect(columns[1]).toBe(400);
      expect(columns[2]).toBe(520);
    });
  });

  describe('Collision Detection Helpers', () => {
    test('should calculate distance between two points', () => {
      const distance = Math.sqrt(
        Math.pow(100 - 50, 2) + Math.pow(100 - 50, 2)
      );
      
      expect(distance).toBeCloseTo(70.71, 2);
    });

    test('should detect collision when distance is less than threshold', () => {
      const playerX = 100;
      const playerY = 100;
      const hazardX = 120;
      const hazardY = 100;
      const threshold = 36;
      
      const distance = Math.sqrt(
        Math.pow(hazardX - playerX, 2) + Math.pow(hazardY - playerY, 2)
      );
      
      expect(distance < threshold).toBe(true);
    });
  });
});

