# Testing Guide

This document provides comprehensive information about the testing setup and practices for the 3x3 Grid Runner game.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [CI/CD](#cicd)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18.x or 20.x (see `.nvmrc` for recommended version)
- npm (comes with Node.js)

### Initial Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.js                 # Jest configuration and global setup
├── mocks/
│   └── phaser.mock.js      # Phaser 3 mock implementation
├── RunnerScene.test.js     # Main game scene tests
├── utils/
│   └── gameHelpers.test.js # Utility function tests
└── integration/
    └── gameFlow.test.js    # Integration tests
```

### Test File Naming

- Unit tests: `*.test.js`
- Integration tests: `integration/*.test.js`
- Mock files: `mocks/*.mock.js`

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose

# Run tests in CI mode (for CI/CD pipelines)
npm run test:ci
```

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- RunnerScene

# Run tests in a specific file
npm test -- tests/RunnerScene.test.js

# Run tests matching a pattern (watch mode)
npm run test:watch -- --testNamePattern="should initialize"
```

## Writing Tests

### Test Structure

```javascript
describe('ComponentName', () => {
  let component;

  beforeEach(() => {
    // Setup before each test
    component = new Component();
  });

  afterEach(() => {
    // Cleanup after each test
    component = null;
  });

  test('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = component.method(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Testing Game Logic

When testing game logic:

1. **Use Phaser Mocks**: Always use the Phaser mocks in `tests/mocks/phaser.mock.js` to avoid requiring the full Phaser library
2. **Test State Management**: Focus on game state (start, death, restart)
3. **Test Collision Detection**: Verify collision logic works correctly
4. **Test Input Handling**: Ensure input is processed correctly
5. **Test Hazard Management**: Verify spawning, movement, and cleanup

### Example Test

```javascript
const { RunnerScene } = require('../main');

describe('RunnerScene', () => {
  let scene;

  beforeEach(() => {
    scene = new RunnerScene();
    // Mock Phaser scene methods
    scene.add = {
      circle: jest.fn(),
      text: jest.fn(),
      line: jest.fn()
    };
  });

  test('should initialize grid correctly', () => {
    scene.create();
    expect(scene.lanes).toHaveLength(3);
    expect(scene.columns).toHaveLength(3);
  });
});
```

## Coverage

### Coverage Thresholds

The project has minimum coverage thresholds set in `jest.config.js`:

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Viewing Coverage

```bash
# Generate HTML coverage report
npm run test:coverage

# Open coverage report
# Open coverage/lcov-report/index.html in your browser
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov.info` - LCOV format (for CI/CD tools)
- `coverage/lcov-report/` - HTML report (open `index.html` in browser)
- `coverage/coverage-final.json` - JSON format

## CI/CD

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/test.yml`) that:

- Runs tests on push and pull requests
- Tests against Node.js 18.x and 20.x
- Generates coverage reports
- Optionally uploads coverage to Codecov

### Local CI Simulation

To simulate CI environment locally:

```bash
npm run test:ci
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Don't rely on test execution order

### 2. Descriptive Test Names

```javascript
// Good
test('should move player to correct grid position when arrow key is pressed', () => {
  // ...
});

// Bad
test('player moves', () => {
  // ...
});
```

### 3. Arrange-Act-Assert Pattern

```javascript
test('should calculate distance correctly', () => {
  // Arrange
  const x1 = 0, y1 = 0;
  const x2 = 3, y2 = 4;

  // Act
  const distance = calculateDistance(x1, y1, x2, y2);

  // Assert
  expect(distance).toBe(5);
});
```

### 4. Mock External Dependencies

- Always mock Phaser components
- Mock timers for time-based tests
- Mock DOM APIs when needed

### 5. Test Edge Cases

- Test boundary conditions
- Test error cases
- Test empty/null inputs

## Troubleshooting

### Tests Fail After Code Changes

1. Clear Jest cache: `npm test -- --clearCache`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check for syntax errors in test files

### Coverage Not Generating

1. Ensure `collectCoverageFrom` in `jest.config.js` includes your source files
2. Check that files aren't excluded in `.gitignore`
3. Verify coverage directory permissions

### Phaser Mock Issues

1. Ensure `moduleNameMapper` in `jest.config.js` correctly maps Phaser
2. Check that `tests/mocks/phaser.mock.js` exports all needed Phaser APIs
3. Update the mock if new Phaser features are used

### Slow Test Execution

1. Use `--maxWorkers=2` for CI environments
2. Avoid unnecessary async operations
3. Mock heavy dependencies

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Phaser 3 Documentation](https://phaser.io/docs)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

