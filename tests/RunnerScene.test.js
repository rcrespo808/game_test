/**
 * Tests for RunnerScene class
 * Tests game logic, collision detection, and state management
 */

let RunnerScene;
let mockPhaser;

describe('RunnerScene', () => {
  let scene;
  let mockGame;
  let mockStageConfig;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    jest.resetModules();
    
    // Mock Phaser components
    mockPhaser = require('./mocks/phaser.mock.js');
    global.Phaser = mockPhaser;
    if (typeof window !== 'undefined') {
      window.Phaser = mockPhaser;
    }

    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn()
    };

    // Mock document.getElementById for editor
    const createMockElement = () => ({
      value: '',
      checked: false,
      classList: { toggle: jest.fn(), add: jest.fn(), remove: jest.fn() },
      addEventListener: jest.fn(),
      cloneNode: jest.fn(() => createMockElement()),
      parentNode: { replaceChild: jest.fn() },
      innerHTML: '',
      appendChild: jest.fn(),
      textContent: '',
      style: {},
      querySelectorAll: jest.fn(() => [])
    });
    document.getElementById = jest.fn(() => createMockElement());

    // Mock performance.now
    global.performance = { now: jest.fn(() => 1000) };

    // Mock fetch for MIDI loading
    global.fetch = jest.fn(() => Promise.reject(new Error('Mock fetch')));

    // Mock stage config
    mockStageConfig = {
      id: "test_stage",
      midiPath: "assets/midi/test.mid",
      params: {
        trackIndex: -1,
        bpmOverride: 0,
        lookaheadSec: 0.1,
        quantizeDiv: 0,
        velocityMin: 0.1,
        maxEventsPerSec: 20,
        lowCut: 55,
        highCut: 70,
        hazardSpeed: 420,
        sideMode: "random",
        laneJitter: 18,
        greenEveryBeats: 4,
        redEverySubdiv: 2,
        seedA: 7,
        seedB: 3,
        enableAudio: true,
        audioVolume: 70,
        density: 1.0
      }
    };

    mockGame = {
      config: {
        width: 800,
        height: 600
      }
    };
    
    ({ RunnerScene } = await import('../src/game/RunnerScene.js'));
  });

  describe('Initialization', () => {
    test('should initialize with correct scene key', () => {
      scene = new RunnerScene();
      expect(scene.key).toBe('RunnerScene');
    });

    test('should set up grid lanes and columns in create', () => {
      scene = new RunnerScene();
      scene.game = mockGame;
      scene.stageConfig = mockStageConfig;
      scene.track = { events: [], nextIndex: 0 };
      scene.create();

      expect(scene.gridManager).toBeDefined();
      expect(scene.gridManager.lanes).toHaveLength(3);
      expect(scene.gridManager.columns).toHaveLength(3);
      expect(scene.gridManager.lanes[0]).toBe(180); // 600 * 0.3
      expect(scene.gridManager.lanes[1]).toBe(300); // 600 * 0.5
      expect(scene.gridManager.lanes[2]).toBe(420); // 600 * 0.7
    });

    test('should initialize managers in create', () => {
      scene = new RunnerScene();
      scene.game = mockGame;
      scene.stageConfig = mockStageConfig;
      scene.track = { events: [], nextIndex: 0 };
      scene.create();

      expect(scene.gridManager).toBeDefined();
      expect(scene.playerManager).toBeDefined();
      expect(scene.hazardManager).toBeDefined();
      expect(scene.hotspotManager).toBeDefined();
      expect(scene.audioManager).toBeDefined();
    });
  });

  describe('Game State Management', () => {
    beforeEach(() => {
      scene = new RunnerScene();
      scene.game = mockGame;
      scene.stageConfig = mockStageConfig;
      scene.track = { events: [], nextIndex: 0 };
      scene.create();
    });

    test('should start game when startGame is called', () => {
      scene.isRunning = false;
      scene.isDead = false;
      scene.startText = { setVisible: jest.fn() };
      scene.scoreText = { setText: jest.fn() };
      scene.hazardManager.clear = jest.fn();
      scene.hotspotManager.reset = jest.fn();
      scene.track = { events: [], nextIndex: 0 };
      scene.audioManager.stopAudio = jest.fn();
      scene.audioManager.audioEnabled = false;

      scene.startGame();

      expect(scene.isRunning).toBe(true);
      expect(scene.isDead).toBe(false);
      expect(scene.startText.setVisible).toHaveBeenCalledWith(false);
      expect(scene.hazardManager.clear).toHaveBeenCalled();
      expect(scene.hotspotManager.reset).toHaveBeenCalled();
      expect(scene.track.nextIndex).toBe(0);
    });

    test('should handle player death correctly', () => {
      scene.isDead = false;
      scene.isRunning = true;
      scene.audioManager = { stopAudio: jest.fn() };
      scene.playerManager = {
        getSprite: jest.fn(() => ({
          x: 400,
          y: 300,
          scale: 1,
          alpha: 1
        }))
      };
      scene.tweens = { add: jest.fn() };
      scene.spawnTimer = null;
      scene.greenTimer = null;
      scene.redTimer = null;

      scene.handlePlayerHit();

      expect(scene.isDead).toBe(true);
      expect(scene.isRunning).toBe(false);
      expect(scene.audioManager.stopAudio).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('Hazard Management', () => {
    beforeEach(() => {
      scene = new RunnerScene();
      scene.game = mockGame;
      scene.stageConfig = mockStageConfig;
      scene.track = { events: [], nextIndex: 0 };
      scene.create();
    });

    test('should spawn hazards from MIDI events', () => {
      const mockEvent = {
        timeSec: 0.5,
        laneRow: 1,
        hazardType: 0,
        pitch: 60,
        velocity: 0.5
      };

      scene.track = {
        events: [mockEvent],
        nextIndex: 0
      };
      scene.trackStartMs = performance.now() - 600; // 600ms ago
      scene.trackBPM = 120;
      scene.secondsPerBeat = 0.5;
      scene.isRunning = true;
      scene.isDead = false;
      scene.cursors = { up: {}, down: {}, left: {}, right: {} };
      scene.debugText = { setText: jest.fn() };

      const initialHazardCount = scene.hazardManager.getCount();
      scene.update(0, 1000); // 1 second delta

      // Hazard should be spawned when time matches
      expect(scene.track.nextIndex).toBeGreaterThan(0);
    });

    test('should remove hazards when they go off screen', () => {
      const mockHazard = {
        x: 900, // off screen (width is 800)
        vx: 100,
        rotation: 0,
        destroy: jest.fn()
      };

      scene.hazardManager.activeHazards = [mockHazard];
      scene.isRunning = true;
      scene.isDead = false;
      scene.cursors = { up: {}, down: {}, left: {}, right: {} };
      scene.track = { events: [], nextIndex: 0 };
      scene.trackBPM = 120;
      scene.secondsPerBeat = 0.5;
      scene.debugText = { setText: jest.fn() };

      scene.update(0, 1000);

      expect(mockHazard.destroy).toHaveBeenCalled();
    });
  });

  describe('Collision Detection', () => {
    beforeEach(() => {
      scene = new RunnerScene();
      scene.game = mockGame;
      scene.stageConfig = mockStageConfig;
      scene.track = { events: [], nextIndex: 0 };
      scene.create();
    });

    test('should detect collision between player and hazard', () => {
      const mockHazard = {
        x: 400,
        y: 300,
        vx: 100,
        rotation: 0,
        destroy: jest.fn()
      };

      scene.playerManager.getSprite = jest.fn(() => ({
        x: 400,
        y: 300
      }));

      scene.hazardManager.activeHazards = [mockHazard];
      scene.isRunning = true;
      scene.isDead = false;
      scene.handlePlayerHit = jest.fn();
      scene.cursors = { up: {}, down: {}, left: {}, right: {} };
      scene.track = { events: [], nextIndex: 0 };
      scene.trackBPM = 120;
      scene.secondsPerBeat = 0.5;
      scene.debugText = { setText: jest.fn() };

      // Mock Phaser.Math.Distance.Between to return small distance
      window.Phaser.Math.Distance.Between = jest.fn(() => 20);

      scene.update(0, 1000);

      expect(scene.handlePlayerHit).toHaveBeenCalled();
    });

    test('should not trigger collision when player is far from hazard', () => {
      const mockHazard = {
        x: 100,
        y: 100,
        vx: 100,
        rotation: 0,
        destroy: jest.fn()
      };

      scene.playerManager.getSprite = jest.fn(() => ({
        x: 700,
        y: 500
      }));

      scene.hazardManager.activeHazards = [mockHazard];
      scene.isRunning = true;
      scene.isDead = false;
      scene.handlePlayerHit = jest.fn();
      scene.cursors = { up: {}, down: {}, left: {}, right: {} };
      scene.track = { events: [], nextIndex: 0 };
      scene.trackBPM = 120;
      scene.secondsPerBeat = 0.5;
      scene.debugText = { setText: jest.fn() };

      // Mock Phaser.Math.Distance.Between to return large distance
      window.Phaser.Math.Distance.Between = jest.fn(() => 100);

      scene.update(0, 1000);

      expect(scene.handlePlayerHit).not.toHaveBeenCalled();
    });
  });

  describe('Input Handling', () => {
    beforeEach(() => {
      scene = new RunnerScene();
      scene.game = mockGame;
      scene.stageConfig = mockStageConfig;
      scene.track = { events: [], nextIndex: 0 };
      scene.create();
    });

    test('should move player up when up arrow is pressed', () => {
      const mockCursors = {
        up: {},
        down: {},
        left: {},
        right: {}
      };

      scene.cursors = mockCursors;
      scene.playerManager.currentLaneIndex = 1;
      scene.playerManager.moveToGrid = jest.fn();

      window.Phaser.Input.Keyboard.JustDown = jest.fn((key) => key === mockCursors.up);

      scene.playerManager.handleInput(mockCursors);

      expect(scene.playerManager.currentLaneIndex).toBe(0);
      expect(scene.playerManager.moveToGrid).toHaveBeenCalled();
    });

    test('should constrain player movement to grid bounds', () => {
      const mockCursors = {
        up: {},
        down: {},
        left: {},
        right: {}
      };

      scene.cursors = mockCursors;
      scene.playerManager.currentLaneIndex = 0;
      scene.playerManager.currentColumnIndex = 0;
      scene.playerManager.moveToGrid = jest.fn();

      // Try to move up when already at top
      window.Phaser.Input.Keyboard.JustDown = jest.fn((key) => key === mockCursors.up);
      scene.playerManager.handleInput(mockCursors);

      expect(scene.playerManager.currentLaneIndex).toBe(0); // Should stay at 0

      // Try to move left when already at leftmost
      window.Phaser.Input.Keyboard.JustDown = jest.fn((key) => key === mockCursors.left);
      scene.playerManager.handleInput(mockCursors);

      expect(scene.playerManager.currentColumnIndex).toBe(0); // Should stay at 0
    });
  });
});
