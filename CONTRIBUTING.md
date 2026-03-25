# Contributing to LiteLLM Search Provider

First off, thank you for considering contributing to the LiteLLM Search Provider plugin! It's people like you that make OpenClaw such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by the [OpenClaw Code of Conduct](https://github.com/openclaw/openclaw/blob/master/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@openclaw.ai](mailto:conduct@openclaw.ai).

## Development Setup

### Prerequisites

- Node.js 22 or later
- npm 9+ or pnpm 8+
- Git
- OpenClaw CLI installed globally
- A running LiteLLM instance (for integration testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/litellm-search-provider.git
   cd litellm-search-provider
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Set Up Development Environment

Create a symlink to your globally installed OpenClaw for SDK module resolution:

```bash
mkdir -p node_modules
ln -sf $(which openclaw | xargs dirname | xargs dirname)/lib/node_modules/openclaw node_modules/openclaw
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the [coding standards](#coding-standards)
- Add/update tests as needed
- Update documentation if changing behavior

### 3. Test Your Changes

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build the plugin
npm run build

# Test locally with OpenClaw
openclaw plugins install -l $(pwd)
openclaw gateway restart
openclaw agent --agent main --message "Test search: your query"
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding/updating tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `chore:` - Maintenance tasks

Example:
```bash
git commit -m "feat: add support for custom timeout per search tool"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Pull Request Process

1. **Ensure all tests pass**: `npm test` must pass
2. **Update documentation**: Update README.md if needed
3. **Add tests**: New features need tests
4. **Follow coding standards**: Run `npm run lint`
5. **Update CHANGELOG.md**: Add entry to "Unreleased" section
6. **PR description**: Use the PR template

### PR Review Process

- Maintainers will review your PR within 2-3 business days
- Address review feedback
- Once approved, a maintainer will merge your PR
- Your changes will be included in the next release

## Coding Standards

### JavaScript/TypeScript Style

- Use ES modules (`import`/`export`)
- Use `const` and `let` (no `var`)
- Async/await over raw promises
- Meaningful variable and function names
- JSDoc comments for public APIs
- Max line length: 100 characters

### Example

```javascript
/**
 * Resolves the LiteLLM configuration from the search config.
 * @param {Object} searchConfig - The search configuration object
 * @returns {Object} The LiteLLM-specific configuration
 */
function resolveLiteLLMConfig(searchConfig) {
  const litellm = searchConfig?.[PROVIDER_ID];
  return litellm && typeof litellm === "object" && !Array.isArray(litellm)
    ? litellm
    : {};
}
```

### Code Organization

- Keep functions small and focused
- Extract reusable utilities
- Avoid deeply nested conditionals
- Use early returns
- Constants at module scope (UPPER_CASE)

### Error Handling

- Throw meaningful error messages
- Include context in errors
- Sanitize sensitive data
- Use try-catch for async operations

```javascript
if (!apiKey) {
  return {
    error: "missing_litellm_api_key",
    message: "web_search needs a LiteLLM API key. Set LITELLM_API_KEY environment variable.",
    docs: DOCS_URL,
  };
}
```

## Testing

### Unit Tests

We use [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
npm test

# Run specific test file
npm test src/provider.test.js

# Run tests in watch mode
npm test -- --watch
```

### Test Structure

```javascript
import { describe, it, expect } from 'vitest';

describe('LiteLLM Search Provider', () => {
  it('should resolve config correctly', () => {
    const config = resolveLiteLLMConfig({ 'litellm-search-provider': { baseUrl: 'http://test' } });
    expect(config.baseUrl).toBe('http://test');
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test edge cases
- Test error conditions
- Mock external dependencies

### Integration Testing

For integration tests that require a real LiteLLM instance:

1. Set `LITELLM_API_KEY` environment variable
2. Set `LITELLM_BASE_URL` if not using default
3. Run: `npm run test:integration`

## Documentation

### README Updates

When adding features or changing behavior:

1. Update feature list if applicable
2. Add/update configuration examples
3. Update troubleshooting section if relevant
4. Add usage examples

### Code Comments

- Use JSDoc for public APIs
- Comment complex logic (explain WHY, not WHAT)
- Keep comments up-to-date with code

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

## Community

- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: Join the [OpenClaw community](https://discord.gg/openclaw)

## Getting Help

- Check existing [issues](https://github.com/your-org/litellm-search-provider/issues)
- Search [discussions](https://github.com/your-org/litellm-search-provider/discussions)
- Ask in [Discord](https://discord.gg/openclaw)

## Recognition

Contributors are recognized in:
- CHANGELOG.md for each release
- GitHub contributors page
- Our gratitude! 🙏

Thank you for contributing! 💚