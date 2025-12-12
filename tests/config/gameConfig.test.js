/**
 * Tests for gameConfig.js
 * Tests difficulty presets and configuration functions
 */

describe('gameConfig', () => {
  let gameConfig;

  beforeEach(() => {
    jest.resetModules();
    gameConfig = require('../../src/config/gameConfig.js');
  });

  describe('DIFFICULTY_CONFIGS', () => {
    test('should have all four difficulty levels', () => {
      const { DIFFICULTY_CONFIGS } = gameConfig;
      expect(DIFFICULTY_CONFIGS).toHaveProperty('easy');
      expect(DIFFICULTY_CONFIGS).toHaveProperty('normal');
      expect(DIFFICULTY_CONFIGS).toHaveProperty('hard');
      expect(DIFFICULTY_CONFIGS).toHaveProperty('extreme');
    });

    test('each difficulty should have name, description, and params', () => {
      const { DIFFICULTY_CONFIGS } = gameConfig;
      Object.values(DIFFICULTY_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('params');
        expect(typeof config.name).toBe('string');
        expect(typeof config.description).toBe('string');
        expect(typeof config.params).toBe('object');
      });
    });

    test('difficulties should have increasing difficulty values', () => {
      const { DIFFICULTY_CONFIGS } = gameConfig;
      const easy = DIFFICULTY_CONFIGS.easy.params;
      const normal = DIFFICULTY_CONFIGS.normal.params;
      const hard = DIFFICULTY_CONFIGS.hard.params;
      const extreme = DIFFICULTY_CONFIGS.extreme.params;

      // Hazard speed should increase with difficulty
      expect(normal.hazardSpeed).toBeGreaterThan(easy.hazardSpeed);
      expect(hard.hazardSpeed).toBeGreaterThan(normal.hazardSpeed);
      expect(extreme.hazardSpeed).toBeGreaterThan(hard.hazardSpeed);

      // Density should generally increase
      expect(normal.density).toBeGreaterThan(easy.density);
      expect(hard.density).toBeGreaterThan(normal.density);
      expect(extreme.density).toBeGreaterThanOrEqual(hard.density);

      // Max events per second should increase
      expect(normal.maxEventsPerSec).toBeGreaterThan(easy.maxEventsPerSec);
      expect(hard.maxEventsPerSec).toBeGreaterThan(normal.maxEventsPerSec);
      expect(extreme.maxEventsPerSec).toBeGreaterThan(hard.maxEventsPerSec);
    });

    test('each difficulty should have required params', () => {
      const { DIFFICULTY_CONFIGS } = gameConfig;
      const requiredParams = [
        'hazardSpeed',
        'density',
        'lookaheadSec',
        'maxEventsPerSec',
        'laneJitter',
        'gridRows',
        'gridCols'
      ];

      Object.values(DIFFICULTY_CONFIGS).forEach(config => {
        requiredParams.forEach(param => {
          expect(config.params).toHaveProperty(param);
          expect(typeof config.params[param]).toBe('number');
        });
      });
    });
  });

  describe('getAvailableDifficulties', () => {
    test('should return array of difficulty objects', () => {
      const difficulties = gameConfig.getAvailableDifficulties();
      expect(Array.isArray(difficulties)).toBe(true);
      expect(difficulties.length).toBe(4);
    });

    test('should return difficulties with key, name, and description', () => {
      const difficulties = gameConfig.getAvailableDifficulties();
      difficulties.forEach(diff => {
        expect(diff).toHaveProperty('key');
        expect(diff).toHaveProperty('name');
        expect(diff).toHaveProperty('description');
        expect(typeof diff.key).toBe('string');
        expect(typeof diff.name).toBe('string');
        expect(typeof diff.description).toBe('string');
      });
    });

    test('should include all difficulty keys', () => {
      const difficulties = gameConfig.getAvailableDifficulties();
      const keys = difficulties.map(d => d.key);
      expect(keys).toContain('easy');
      expect(keys).toContain('normal');
      expect(keys).toContain('hard');
      expect(keys).toContain('extreme');
    });
  });

  describe('getDifficultyConfig', () => {
    test('should return config for valid difficulty key', () => {
      const config = gameConfig.getDifficultyConfig('easy');
      expect(config).not.toBeNull();
      expect(config.name).toBe('Easy');
      expect(config).toHaveProperty('params');
    });

    test('should return config for all difficulty levels', () => {
      const levels = ['easy', 'normal', 'hard', 'extreme'];
      levels.forEach(level => {
        const config = gameConfig.getDifficultyConfig(level);
        expect(config).not.toBeNull();
        expect(config.name).toBeDefined();
      });
    });

    test('should return null for invalid difficulty key', () => {
      const config = gameConfig.getDifficultyConfig('invalid');
      expect(config).toBeNull();
    });

    test('should return null for undefined difficulty', () => {
      const config = gameConfig.getDifficultyConfig(undefined);
      expect(config).toBeNull();
    });
  });

  describe('createGameConfig', () => {
    test('should create config with MIDI path and difficulty', () => {
      const config = gameConfig.createGameConfig('assets/midi/test.mid', 'normal');
      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('midiPath', 'assets/midi/test.mid');
      expect(config).toHaveProperty('difficulty', 'normal');
      expect(config).toHaveProperty('version', 1);
      expect(config).toHaveProperty('params');
    });

    test('should generate ID from MIDI filename and difficulty', () => {
      const config = gameConfig.createGameConfig('assets/midi/bach.mid', 'hard');
      expect(config.id).toBe('bach_hard');
    });

    test('should merge difficulty params with default config', () => {
      const config = gameConfig.createGameConfig('assets/midi/test.mid', 'easy');
      expect(config.params).toHaveProperty('hazardSpeed');
      expect(config.params).toHaveProperty('density');
      expect(config.params).toHaveProperty('gridRows');
      expect(config.params).toHaveProperty('gridCols');
    });

    test('should use normal difficulty as fallback for invalid difficulty', () => {
      const config = gameConfig.createGameConfig('assets/midi/test.mid', 'invalid');
      expect(config.difficulty).toBe('invalid');
      // Should still have params (from normal fallback)
      expect(config.params).toHaveProperty('hazardSpeed');
    });

    test('should use default trackIndex of -1', () => {
      const config = gameConfig.createGameConfig('assets/midi/test.mid', 'normal');
      expect(config.params.trackIndex).toBe(-1);
    });

    test('should accept custom trackIndex', () => {
      const config = gameConfig.createGameConfig('assets/midi/test.mid', 'normal', 2);
      expect(config.params.trackIndex).toBe(2);
    });

    test('should handle MIDI paths with different formats', () => {
      const paths = [
        'test.mid',
        'assets/midi/test.mid',
        '/full/path/to/test.mid'
      ];
      paths.forEach(path => {
        const config = gameConfig.createGameConfig(path, 'normal');
        expect(config.midiPath).toBe(path);
        expect(config.id).toContain('test_normal');
      });
    });
  });
});

