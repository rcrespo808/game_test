// Mock Phaser 3 for testing
// This provides a minimal Phaser implementation for unit testing

const mockPhaser = {
  Scene: class MockScene {
    constructor(config) {
      this.key = config?.key || 'MockScene';
      this.scene = {
        restart: jest.fn(),
        start: jest.fn()
      };
      this.game = {
        config: {
          width: 800,
          height: 600
        }
      };
      this.add = {
        circle: jest.fn(() => ({
          setDepth: jest.fn().mockReturnThis(),
          setOrigin: jest.fn().mockReturnThis(),
          setInteractive: jest.fn().mockReturnThis(),
          setScale: jest.fn().mockReturnThis(),
          setPosition: jest.fn().mockReturnThis(),
          x: 0,
          y: 0,
          scale: 1,
          alpha: 1,
          destroy: jest.fn()
        })),
        rectangle: jest.fn(() => ({
          setDepth: jest.fn().mockReturnThis(),
          setOrigin: jest.fn().mockReturnThis(),
          setInteractive: jest.fn().mockReturnThis(),
          setFillStyle: jest.fn().mockReturnThis(),
          setStrokeStyle: jest.fn().mockReturnThis(),
          setVisible: jest.fn().mockReturnThis(),
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          alpha: 1,
          destroy: jest.fn()
        })),
        image: jest.fn(() => ({
          setDepth: jest.fn().mockReturnThis(),
          setOrigin: jest.fn().mockReturnThis(),
          x: 0,
          y: 0,
          vx: 0,
          rotation: 0,
          destroy: jest.fn()
        })),
        line: jest.fn(() => ({
          setOrigin: jest.fn().mockReturnThis(),
          setDepth: jest.fn().mockReturnThis(),
          destroy: jest.fn()
        })),
        text: jest.fn(() => ({
          setOrigin: jest.fn().mockReturnThis(),
          setDepth: jest.fn().mockReturnThis(),
          setInteractive: jest.fn().mockReturnThis(),
          setVisible: jest.fn().mockReturnThis(),
          setText: jest.fn().mockReturnThis(),
          setColor: jest.fn().mockReturnThis(),
          setAlpha: jest.fn().mockReturnThis(),
          alpha: 1,
          on: jest.fn()
        }))
      };
      this.make = {
        graphics: jest.fn(() => ({
          fillStyle: jest.fn().mockReturnThis(),
          fillRect: jest.fn().mockReturnThis(),
          generateTexture: jest.fn()
        }))
      };
      this.input = {
        keyboard: {
          createCursorKeys: jest.fn(() => ({
            up: { isDown: false },
            down: { isDown: false },
            left: { isDown: false },
            right: { isDown: false }
          })),
          addKey: jest.fn(() => ({
            on: jest.fn(),
            isDown: false
          }))
        }
      };
      this.time = {
        addEvent: jest.fn(() => ({
          remove: jest.fn()
        })),
        delayedCall: jest.fn(() => ({
          remove: jest.fn()
        }))
      };
      this.tweens = {
        add: jest.fn()
      };
    }
  },
  Math: {
    Between: jest.fn((min, max) => Math.floor(Math.random() * (max - min + 1)) + min),
    Distance: {
      Between: jest.fn((x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
      })
    }
  },
  Input: {
    Keyboard: {
      JustDown: jest.fn(() => false)
    }
  },
  AUTO: 'AUTO',
  Game: class MockGame {
    constructor(config) {
      this.config = config;
    }
  }
};

module.exports = mockPhaser;

