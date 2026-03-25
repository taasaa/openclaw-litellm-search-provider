# Testing Guide

## Overview

This document describes the testing approach for the LiteLLM Search Provider plugin.

## Test Structure

```
src/
├── litellm-search-provider.js  # Main implementation (with exports for testing)
├── provider.test.js            # Unit tests
└── __mocks__/
    └── openclaw/
        └── plugin-sdk/
            └── provider-web-search.js  # SDK mocks
vitest.config.js                # Test configuration
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

The test suite covers:

- Configuration resolution functions
- URL validation and warnings
- Result normalization
- Error message sanitization
- API key handling

## Mocking Strategy

We mock the OpenClaw SDK (`openclaw/plugin-sdk/provider-web-search`) to:

1. Enable testing without a full OpenClaw installation
2. Control test inputs and verify behavior
3. Run tests in isolation

Mocks are located in `src/__mocks__/openclaw/plugin-sdk/provider-web-search.js`.

## Test Categories

### Unit Tests

Test individual functions in isolation:

- `resolveLiteLLMConfig()` - Configuration parsing
- `resolveLiteLLMApiKey()` - API key resolution
- `resolveLiteLLMBaseUrl()` - URL validation and security warnings
- `normalizeLiteLLMResults()` - Result filtering
- `sanitizeErrorMessage()` - Credential sanitization

### Integration Tests

Integration tests require a running LiteLLM instance:

1. Set `LITELLM_API_KEY` environment variable
2. Set `LITELLM_BASE_URL` if not using default
3. Run: `npm run test:integration` (not yet implemented)

## Writing New Tests

When adding new features:

1. Add unit tests for new functions
2. Update mocks if SDK usage changes
3. Ensure coverage stays above 80%
4. Test both success and error cases

Example test:

```javascript
describe('MyFunction', () => {
  it('should handle valid input', () => {
    const result = myFunction({ valid: 'input' });
    expect(result).toBe('expected output');
  });

  it('should handle invalid input', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

## Continuous Integration

Tests run automatically in GitHub Actions:

- On every push to main/master
- On every pull request
- Across Node.js 22.x and 23.x

## Debugging Failed Tests

1. Run specific test file: `npm test -- src/provider.test.js`
2. Run in watch mode: `npm run test:watch`
3. Add `console.log` to understand values
4. Check mock implementations

## Test Best Practices

- Use descriptive test names
- Test edge cases
- Keep tests focused and independent
- Mock external dependencies
- Clean up after tests if needed