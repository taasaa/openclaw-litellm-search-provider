# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026.3.26] - 2026-03-26

### Fixed
- Plugin ID mismatch warning: Changed manifest ID from `litellm-search-provider` to `litellm-search`
  to align with OpenClaw's idHint derivation logic (package names ending in `-provider` have the
  suffix automatically stripped when deriving the hint)

### Changed
- Updated all plugin ID references in configuration and documentation to use `litellm-search`
- Package name remains `litellm-search-provider` for npm registry consistency

## [2026.3.24] - 2026-03-24

### Added
- Initial release
- Web search provider for OpenClaw
- Integration with LiteLLM Search API
- Support for multiple search backends (Brave, Tavily, Google, Bing, DuckDuckGo)
- Configurable baseUrl and searchToolName
- API key management via environment variables or config
- Response caching with configurable TTL
- Country-specific search results
- Domain filtering support
- HTTP security warnings for non-localhost URLs
- Credential sanitization in error messages
- Comprehensive error handling with clear error messages
- TypeBox schema for parameter validation
- SDK integration with `openclaw/plugin-sdk/provider-web-search`

### Security
- Credential masking in error messages (API keys, Bearer tokens)
- HTTP warning for non-localhost configurations
- Secure endpoint handling via `withTrustedWebSearchEndpoint`
- Safe error response reading with size limits

### Performance
- Response caching with configurable TTL
- Request count clamping (max 20 results)
- Optimized result processing with single-pass `flatMap`
- Schema definition moved to module scope for reduced allocations

### Documentation
- Comprehensive README with usage examples
- Configuration reference
- Troubleshooting guide
- Security features documentation
- Development setup instructions

[2026.3.24]: https://github.com/your-org/litellm-search-provider/releases/tag/v2026.3.24