import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveLiteLLMConfig,
  resolveLiteLLMApiKey,
  resolveLiteLLMBaseUrl,
  normalizeLiteLLMResults,
  sanitizeErrorMessage,
} from './litellm-search-provider.js';

describe('LiteLLM Search Provider', () => {
  describe('resolveLiteLLMConfig', () => {
    it('should return config when present', () => {
      const searchConfig = {
        'litellm-search-provider': {
          baseUrl: 'http://localhost:4000',
          searchToolName: 'search',
        },
      };

      const result = resolveLiteLLMConfig(searchConfig);
      expect(result.baseUrl).toBe('http://localhost:4000');
      expect(result.searchToolName).toBe('search');
    });

    it('should return empty object when config missing', () => {
      const result = resolveLiteLLMConfig({});
      expect(result).toEqual({});
    });

    it('should return empty object when config is array', () => {
      const result = resolveLiteLLMConfig({ 'litellm-search-provider': [] });
      expect(result).toEqual({});
    });

    it('should return empty object when config is primitive', () => {
      const result = resolveLiteLLMConfig({ 'litellm-search-provider': 'invalid' });
      expect(result).toEqual({});
    });
  });

  describe('resolveLiteLLMApiKey', () => {
    it('should return API key from config', () => {
      const config = { apiKey: 'test-key' };
      const result = resolveLiteLLMApiKey(config);
      expect(result).toBe('test-key');
    });

    it('should return undefined when no API key', () => {
      const result = resolveLiteLLMApiKey({});
      expect(result).toBeUndefined();
    });
  });

  describe('resolveLiteLLMBaseUrl', () => {
    it('should return valid HTTP localhost URL', () => {
      const config = { baseUrl: 'http://localhost:4000' };
      const result = resolveLiteLLMBaseUrl(config);
      expect(result).toBe('http://localhost:4000');
    });

    it('should return valid HTTPS URL', () => {
      const config = { baseUrl: 'https://api.example.com' };
      const result = resolveLiteLLMBaseUrl(config);
      expect(result).toBe('https://api.example.com');
    });

    it('should return undefined when baseUrl missing', () => {
      const result = resolveLiteLLMBaseUrl({});
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid URL', () => {
      const config = { baseUrl: 'not a url' };
      const result = resolveLiteLLMBaseUrl(config);
      expect(result).toBeUndefined();
    });

    it('should warn for HTTP non-localhost URLs', () => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (msg) => warnings.push(msg);

      const config = { baseUrl: 'http://api.example.com' };
      const result = resolveLiteLLMBaseUrl(config);

      expect(result).toBe('http://api.example.com');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('WARNING: Using HTTP');

      console.warn = originalWarn;
    });

    it('should not warn for HTTP 127.0.0.1', () => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (msg) => warnings.push(msg);

      const config = { baseUrl: 'http://127.0.0.1:4000' };
      const result = resolveLiteLLMBaseUrl(config);

      expect(result).toBe('http://127.0.0.1:4000');
      expect(warnings).toHaveLength(0);

      console.warn = originalWarn;
    });
  });

  describe('normalizeLiteLLMResults', () => {
    it('should return array of valid objects', () => {
      const payload = {
        results: [
          { title: 'Test', url: 'http://example.com', snippet: 'Test snippet' },
          { title: 'Another', url: 'http://test.com' },
        ],
      };

      const result = normalizeLiteLLMResults(payload);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test');
    });

    it('should filter out non-objects', () => {
      const payload = {
        results: [
          { title: 'Valid' },
          null,
          'string',
          123,
          [],
        ],
      };

      const result = normalizeLiteLLMResults(payload);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid');
    });

    it('should return empty array for missing results', () => {
      expect(normalizeLiteLLMResults({})).toEqual([]);
      expect(normalizeLiteLLMResults(null)).toEqual([]);
      expect(normalizeLiteLLMResults({ results: null })).toEqual([]);
      expect(normalizeLiteLLMResults({ results: 'invalid' })).toEqual([]);
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should mask API keys with sk- prefix', () => {
      const message = 'Error with key sk-1234567890abcdefghijklmnopqrst';
      const result = sanitizeErrorMessage(message);
      expect(result).toBe('Error with key sk-***');
    });

    it('should mask Bearer tokens', () => {
      const message = 'Authorization: Bearer abc123def456';
      const result = sanitizeErrorMessage(message);
      expect(result).toBe('Authorization: Bearer ***');
    });

    it('should mask api_key parameters', () => {
      const message = 'api_key=secret123';
      const result = sanitizeErrorMessage(message);
      expect(result).toBe('api_key=***');
    });

    it('should mask api-key parameters', () => {
      const message = 'api-key:secret123';
      const result = sanitizeErrorMessage(message);
      expect(result).toBe('api_key=***');
    });

    it('should handle multiple sensitive values', () => {
      const message = 'Key: sk-1234567890abcdefghij, Bearer token123, api_key=secret';
      const result = sanitizeErrorMessage(message);
      expect(result).toContain('sk-***');
      expect(result).toContain('Bearer ***');
      expect(result).toContain('api_key=***');
    });

    it('should preserve non-sensitive content', () => {
      const message = 'Error: Connection refused at http://localhost:4000';
      const result = sanitizeErrorMessage(message);
      expect(result).toBe(message);
    });
  });
});

describe('Integration Tests', () => {
  // These tests require a running LiteLLM instance
  // Set LITELLM_API_KEY and LITELLM_BASE_URL environment variables

  beforeEach(() => {
    if (!process.env.LITELLM_API_KEY) {
      console.log('Skipping integration tests - LITELLM_API_KEY not set');
    }
  });

  it.skipIf(!process.env.LITELLM_API_KEY)('should perform a search', async () => {
    // Integration test would go here
    // Requires real LiteLLM instance
  });
});