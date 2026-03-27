# OpenClaw LiteLLM Search Provider Plugin

[![npm version](https://badge.fury.io/js/openclaw-litellm-search-provider.svg)](https://badge.fury.io/js/openclaw-litellm-search-provider)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready web search provider plugin for [OpenClaw](https://github.com/openclaw/openclaw) that bridges to [LiteLLM's Search API](https://docs.litellm.ai/docs/search). Supports multiple search backends (Brave, Tavily, etc.) through LiteLLM's unified interface.

## Features

- 🔍 **Unified Search Interface**: Access multiple search engines through LiteLLM's single API
- 🔐 **Secure Credential Handling**: API keys from environment variables or encrypted config
- ⚡ **Smart Caching**: Configurable response caching with TTL
- 🌍 **Region Support**: Country-specific search results
- 🔒 **Safety First**: HTTP warnings, credential sanitization, and secure defaults
- 🎯 **Configurable**: Flexible configuration for baseUrl, timeout, result count, and domain filtering
- 📦 **Zero Runtime Dependencies**: Bundled for minimal footprint

## Installation

### From npm (Recommended)

```bash
openclaw plugins install openclaw-litellm-search-provider
```

### From Source

```bash
git clone https://github.com/taasaa/openclaw-litellm-search-provider.git
cd openclaw-litellm-search-provider
npm install
npm run build
openclaw plugins install -l $(pwd)
```

## Quick Start

### 1. Configure LiteLLM

Ensure your LiteLLM instance has a search tool configured. Example `litellm-config.yaml`:

```yaml
model_list:
  - model_name: "search"
    litellm_params:
      model: "huggingface/WizardLM/WizardLM-13B-V1.0"

tools:
  - name: "search"
    backend: "brave"
    api_key: "your-brave-api-key"
```

### 2. Set Environment Variables

```bash
export LITELLM_API_KEY="your-litellm-api-key"
```

### 3. Configure OpenClaw

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "tools": {
    "web": {
      "search": {
        "enabled": true,
        "provider": "litellm-search",
        "maxResults": 5,
        "timeoutSeconds": 30,
        "cacheTtlMinutes": 15
      }
    }
  },
  "plugins": {
    "allow": ["litellm-search"],
    "entries": {
      "litellm-search": {
        "enabled": true,
        "config": {
          "apiKey": "${LITELLM_API_KEY}",
          "baseUrl": "http://localhost:4000",
          "searchToolName": "search",
          "defaultCountry": "US",
          "passDomainFilter": true
        }
      }
    }
  }
}
```

### 4. Use in OpenClaw

```bash
openclaw agent --agent main --message "Search for the latest news about AI agents"
```

## Configuration Reference

### OpenClaw Configuration (`openclaw.json`)

#### `tools.web.search` Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable web search |
| `provider` | string | - | Must be `"litellm-search"` |
| `maxResults` | number | 5 | Maximum results per search (1-20) |
| `timeoutSeconds` | number | 30 | Search timeout in seconds |
| `cacheTtlMinutes` | number | 15 | Cache time-to-live in minutes |

#### Provider-Specific Settings (`tools.web.search.litellm-search`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseUrl` | string | Yes | LiteLLM instance URL (e.g., `http://localhost:4000`) |
| `searchToolName` | string | Yes | Name of the search tool in LiteLLM config |
| `apiKey` | SecretRef | No | API key (can use env var instead) |
| `defaultCountry` | string | No | Default country code (e.g., `"US"`, `"DE"`) |
| `passDomainFilter` | boolean | No | Enable domain filtering support |
| `timeoutSeconds` | number | No | Override global timeout |

### API Key Configuration

Three ways to configure the LiteLLM API key:

**1. Environment Variable (Recommended)**
```bash
export LITELLM_API_KEY="sk-..."
```

**2. OpenClaw Config with Environment Reference**
```json
{
  "plugins": {
    "entries": {
      "litellm-search": {
        "config": {
          "webSearch": {
            "apiKey": {
              "provider": "default",
              "source": "env",
              "id": "LITELLM_API_KEY"
            }
          }
        }
      }
    }
  }
}
```

**3. Hardcoded in Config (Not Recommended)**
```json
{
  "plugins": {
    "entries": {
      "litellm-search": {
        "config": {
          "webSearch": {
            "apiKey": "sk-..."
          }
        }
      }
    }
  }
}
```

## Usage Examples

### Basic Search

```javascript
// In OpenClaw agent
"Search for Python async/await best practices"
```

### Region-Specific Results

```javascript
"Search for local news in Germany"
// Uses defaultCountry: "DE" if configured
```

### Domain Filtering

```javascript
"Search for React documentation on react.dev only"
// Requires passDomainFilter: true in config
```

## Search Backends

Works with any LiteLLM-supported backend:

- **Brave Search**: Privacy-focused search engine
- **Tavily**: AI-optimized search API
- **Google Custom Search**: Google's search API
- **Bing Search**: Microsoft's search API
- **DuckDuckGo**: Privacy-focused alternative
- **Custom**: Any OpenAI-compatible search API

Configure backends in your LiteLLM instance, then reference by tool name in OpenClaw.

## Error Handling

The plugin provides clear error messages for common issues:

| Error | Cause | Solution |
|-------|-------|----------|
| `missing_baseUrl` | LiteLLM URL not configured | Add `baseUrl` to config |
| `missing_searchToolName` | Tool name not specified | Add `searchToolName` to config |
| `missing_litellm_api_key` | No API key found | Set `LITELLM_API_KEY` env var or config |
| `authentication error (401/403)` | Invalid API key | Verify API key is correct |
| `tool not found (404)` | Tool doesn't exist in LiteLLM | Check `searchToolName` matches LiteLLM config |
| `upstream error (5xx)` | LiteLLM server error | Check LiteLLM logs |

## Security Features

### HTTP Warning

If you configure a non-localhost `baseUrl` with HTTP (not HTTPS), the plugin warns:

```
WARNING: Using HTTP (not HTTPS) for non-localhost baseUrl: http://example.com:4000.
This may expose credentials to network inspection.
```

### Credential Sanitization

Error messages automatically sanitize sensitive data:
- API keys matching `sk-[alphanumeric]{20+}` → `sk-***`
- Bearer tokens → `Bearer ***`
- API key parameters → `api_key=***`

### Trusted Endpoints

Uses OpenClaw's `withTrustedWebSearchEndpoint` for secure HTTP requests with timeout enforcement.

## Development

### Prerequisites

- Node.js 22+
- npm or pnpm
- OpenClaw installed globally
- LiteLLM instance running

### Setup

```bash
git clone https://github.com/taasaa/openclaw-litellm-search-provider.git
cd openclaw-litellm-search-provider
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## Architecture

```
litellm-search-provider/
├── src/
│   └── litellm-search-provider.js  # Main implementation
├── dist/
│   └── index.js                    # Bundled output
├── index.js                        # Entry point
├── openclaw.plugin.json            # Plugin manifest
├── package.json                    # Package metadata
└── README.md                       # This file
```

### Key Components

**Entry Point** (`index.js`)
- Exports `register()` function
- Registers web search provider with OpenClaw API

**Provider Implementation** (`src/litellm-search-provider.js`)
- Schema definition (TypeBox)
- Configuration resolution
- Search execution
- Result normalization
- Error handling
- Caching logic

**Manifest** (`openclaw.plugin.json`)
- Plugin metadata
- Configuration schema
- Provider capabilities

## Troubleshooting

### Plugin Not Loading

**Symptom**: Error `Cannot find module 'openclaw/plugin-sdk/provider-web-search'`

**Solution**: Ensure OpenClaw is installed globally and accessible:
```bash
which openclaw  # Should show path
openclaw --version
```

If using local installation:
```bash
cd openclaw-litellm-search-provider
mkdir -p node_modules
ln -sf $(which openclaw | xargs dirname | xargs dirname)/lib/node_modules/openclaw node_modules/openclaw
```

### No Search Results

1. Verify LiteLLM is running: `curl http://localhost:4000/health`
2. Check search tool exists: Review LiteLLM config
3. Test search tool directly: `curl -X POST http://localhost:4000/v1/search/search -H "Authorization: Bearer $LITELLM_API_KEY" -H "Content-Type: application/json" -d '{"query":"test","max_results":5}'`
4. Check OpenClaw logs: `openclaw gateway logs`

### Slow Performance

- Enable caching: `cacheTtlMinutes: 15`
- Reduce max results: `maxResults: 3`
- Check network latency to LiteLLM
- Consider using a search backend closer to your region

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Documentation**: [https://docs.openclaw.ai/tools/web](https://docs.openclaw.ai/tools/web)
- **Issues**: [GitHub Issues](https://github.com/taasaa/openclaw-litellm-search-provider/issues)
- **OpenClaw Community**: [Discord](https://discord.gg/openclaw)

## Related Projects

- [OpenClaw](https://github.com/openclaw/openclaw) - Multi-channel AI gateway
- [LiteLLM](https://github.com/BerriAI/litellm) - Unified LLM interface
- [ClawHub](https://clawhub.openclaw.ai) - Plugin marketplace

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

Built with ❤️ for the OpenClaw community