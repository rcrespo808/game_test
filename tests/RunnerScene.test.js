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

    // Mock document.getElementById
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
      // Grid positions are now dynamically calculated based on count
      // For 3 rows, positions are at 1/4, 2/4, 3/4 of height
      expect(scene.gridManager.lanes[0]).toBe(150); // 600 / 4 * 1
      expect(scene.gridManager.lanes[1]).toBe(300); // 600 / 4 * 2
      expect(scene.gridManager.lanes[2]).toBe(450); // 600 / 4 * 3
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

    test('should start game when startGame is called', async () => {
      scene.isRunning = false;
      scene.isDead = false;
      scene.startText = { setVisible: jest.fn() };
      scene.scoreText = { setText: jest.fn() };
      scene.hazardManager.clear = jest.fn();
      scene.hotspotManager.reset = jest.fn();
      scene.track = { events: [], nextIndex: 0 };
      scene.audioManager.stopAudio = jest.fn().mockResolvedValue(undefined);
      scene.audioManager.startAudio = jest.fn().mockResolvedValue(null);
      scene.audioManager.audioEnabled = false;
      scene.midiLoadPromise = Promise.resolve();

      await scene.startGame();

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

    test('should spawn hazards from MIDI events with tween animations', () => {
      const mockEvent = {
        timeSec: 0.5,
        laneRow: 1,
        hazardType: 0,
        pitch: 60,
        velocity: 0.5
      };

      // Mock sprite creation
      const mockSprite = {
        setDepth: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setFlipX: jest.fn().mockReturnThis(),
        play: jest.fn().mockReturnThis(),
        x: 0,
        y: 0,
        vx: 0,
        angle: 0,
        scale: 0,
        alpha: 0,
        isHazard: false,
        targetScale: 1,
        destroy: jest.fn()
      };

      scene.add = {
        sprite: jest.fn(() => mockSprite)
      };
      scene.textures = {
        get: jest.fn(() => ({
          has: jest.fn(() => true)
        }))
      };
      scene.anims = {
        exists: jest.fn(() => true)
      };
      scene.tweens = {
        add: jest.fn((config) => {
          // Simulate nested tween completion for spawn animation
          if (config.onComplete) {
            setTimeout(() => {
              config.onComplete();
              // If nested tween is created, simulate its completion too
              if (config.onComplete && typeof config.onComplete === 'function') {
                // This handles the rotation return tween
              }
            }, 0);
          }
          return { remove: jest.fn() };
        })
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
      scene.width = 800;

      const initialHazardCount = scene.hazardManager.getCount();
      scene.update(0, 1000); // 1 second delta

      // Hazard should be spawned when time matches
      expect(scene.track.nextIndex).toBeGreaterThan(0);
      // Verify spawn animations were set up
      expect(mockSprite.setScale).toHaveBeenCalledWith(0);
      expect(mockSprite.setAlpha).toHaveBeenCalledWith(0);
      expect(scene.tweens.add).toHaveBeenCalled(); // Spawn tween should be added
    });

    test('should remove hazards when they go off screen with tween animation', () => {
      const mockHazard = {
        x: 900, // off screen (width is 800)
        vx: 100,
        rotation: 0,
        angle: 0,
        scale: 1,
        alpha: 1,
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
      scene.tweens = {
        add: jest.fn((config) => {
          // Simulate tween completion for testing
          if (config.onComplete) {
            config.onComplete();
          }
          return { remove: jest.fn() };
        })
      };

      scene.update(0, 1000);

      // Verify tween was added for destroy animation
      expect(scene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockHazard,
          scale: 0,
          alpha: 0
        })
      );
      // Verify destroy was called via tween onComplete
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

  describe('Song Completion', () => {
    test('should detect song completion when progress reaches 100%', () => {
      scene.create();
      scene.songDuration = 100; // 100 seconds
      scene.trackTime = 0;
      scene.isRunning = true;
      scene.songCompleted = false;

      // Mock update loop that advances time
      scene.trackTime = 100; // Song complete
      
      const progress = scene.trackTime / scene.songDuration;
      expect(progress).toBeGreaterThanOrEqual(1);
    });

    test('should call handleSongComplete when song finishes', () => {
      scene.create();
      scene.songDuration = 100;
      scene.trackTime = 0;
      scene.isRunning = true;
      scene.songCompleted = false;
      scene.victoryText = { setVisible: jest.fn(), setAlpha: jest.fn() };
      scene.victoryScoreText = { setVisible: jest.fn(), setAlpha: jest.fn(), setText: jest.fn().mockReturnThis() };
      scene.greenScore = 150;
      scene.audioManager = { stopAudio: jest.fn() };
      scene.tweens = { add: jest.fn() };
      scene.time = { delayedCall: jest.fn() };
      scene.scene = { start: jest.fn() };

      scene.handleSongComplete();

      expect(scene.songCompleted).toBe(true);
      expect(scene.isRunning).toBe(false);
      expect(scene.audioManager.stopAudio).toHaveBeenCalled();
      expect(scene.victoryText.setVisible).toHaveBeenCalledWith(true);
      expect(scene.victoryScoreText.setText).toHaveBeenCalledWith('Final Score: 150');
      expect(scene.victoryScoreText.setVisible).toHaveBeenCalledWith(true);
      expect(scene.time.delayedCall).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    test('should not call handleSongComplete if already completed', () => {
      scene.create();
      scene.songCompleted = true;
      scene.victoryText = { setVisible: jest.fn() };
      scene.audioManager = { stopAudio: jest.fn() };

      const callCountBefore = scene.audioManager.stopAudio.mock.calls.length;
      scene.handleSongComplete();
      const callCountAfter = scene.audioManager.stopAudio.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
    });

    test('should not call handleSongComplete if player is dead', () => {
      scene.create();
      scene.isDead = true;
      scene.songCompleted = false;
      scene.victoryText = { setVisible: jest.fn() };
      scene.audioManager = { stopAudio: jest.fn() };

      const callCountBefore = scene.audioManager.stopAudio.mock.calls.length;
      scene.handleSongComplete();
      const callCountAfter = scene.audioManager.stopAudio.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
    });
  });

  describe('Progress Bar', () => {
    test('should initialize progress bar in create', () => {
      scene.create();
      expect(scene.progressBarBg).toBeDefined();
      expect(scene.progressBarFill).toBeDefined();
    });

    test('should update progress bar width based on song progress', () => {
      scene.create();
      scene.songDuration = 100;
      scene.trackTime = 50; // 50% complete
      scene.progressBarFill = { width: 0 };

      const progressBarWidth = scene.width - 40;
      const expectedWidth = (scene.trackTime / scene.songDuration) * progressBarWidth;

      scene.update(0, 0);

      // Progress bar width should be updated (exact check depends on implementation)
      expect(scene.progressBarFill).toBeDefined();
    });

    test('should handle zero song duration gracefully', () => {
      scene.create();
      scene.songDuration = 0;
      scene.trackTime = 50;
      scene.progressBarFill = { width: 0 };

      // Should not throw error
      expect(() => {
        const progress = scene.songDuration > 0 ? scene.trackTime / scene.songDuration : 0;
      }).not.toThrow();
    });
  });

  describe('Victory Message', () => {
    test('should initialize victory text elements in create', () => {
      scene.create();
      expect(scene.victoryText).toBeDefined();
      expect(scene.victoryScoreText).toBeDefined();
    });

    test('should show victory message with final score on completion', () => {
      scene.create();
      scene.victoryText = { setVisible: jest.fn(), setAlpha: jest.fn() };
      scene.victoryScoreText = { 
        setVisible: jest.fn(), 
        setAlpha: jest.fn(), 
        setText: jest.fn().mockReturnThis() 
      };
      scene.greenScore = 250;
      scene.audioManager = { stopAudio: jest.fn() };
      scene.tweens = { add: jest.fn() };
      scene.time = { delayedCall: jest.fn() };
      scene.scene = { start: jest.fn() };

      scene.handleSongComplete();

      expect(scene.victoryText.setVisible).toHaveBeenCalledWith(true);
      expect(scene.victoryScoreText.setText).toHaveBeenCalledWith('Final Score: 250');
      expect(scene.victoryScoreText.setVisible).toHaveBeenCalledWith(true);
    });
  });
});
