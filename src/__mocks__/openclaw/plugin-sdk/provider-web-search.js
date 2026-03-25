// Mock SDK exports for testing
export const buildSearchCacheKey = (parts) => parts.filter(Boolean).join(':');
export const DEFAULT_SEARCH_COUNT = 10;
export const DEFAULT_TIMEOUT_SECONDS = 30;
export const DEFAULT_CACHE_TTL_MINUTES = 15;
export const MAX_SEARCH_COUNT = 100;

export function enablePluginInConfig(config, pluginId) {
  return {
    ...config,
    plugins: {
      ...config.plugins,
      entries: {
        ...config.plugins?.entries,
        [pluginId]: { enabled: true }
      }
    }
  };
}

export function mergeScopedSearchConfig(searchConfig, providerId, pluginConfig) {
  return { ...searchConfig, ...pluginConfig };
}

export function readCachedSearchPayload(cacheKey) {
  return null;
}

export function readConfiguredSecretString(secretRef, path) {
  if (typeof secretRef === 'string') return secretRef;
  return undefined;
}

export function readNumberParam(params, key, options = {}) {
  const value = params[key];
  if (typeof value !== 'number') return undefined;
  if (options.integer && !Number.isInteger(value)) return undefined;
  return value;
}

export function readProviderEnvValue(envVars) {
  return process.env[envVars[0]];
}

export function readStringParam(params, key, options = {}) {
  const value = params[key];
  if (typeof value !== 'string') return undefined;
  return value;
}

export function resolveProviderWebSearchPluginConfig(config, providerId) {
  return config?.plugins?.entries?.[providerId]?.config?.webSearch;
}

export function resolveSearchCacheTtlMs(searchConfig) {
  return (searchConfig?.cacheTtlMinutes || DEFAULT_CACHE_TTL_MINUTES) * 60 * 1000;
}

export function resolveSearchCount(count, defaultCount = DEFAULT_SEARCH_COUNT) {
  if (count === undefined || count === null) return defaultCount;
  const min = 1;
  const max = MAX_SEARCH_COUNT;
  return Math.max(min, Math.min(max, count));
}

export function resolveSearchTimeoutSeconds(searchConfig) {
  return searchConfig?.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS;
}

export function resolveSiteName(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export function setProviderWebSearchPluginConfigValue(config, providerId, key, value) {
  // Mock implementation
}

export async function withTrustedWebSearchEndpoint(options, handler) {
  const response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ results: [] }),
    text: async () => '',
  };
  return handler(response);
}

export function wrapWebContent(content, source) {
  return content;
}

export function writeCachedSearchPayload(cacheKey, payload, ttlMs) {
  // Mock implementation - does nothing in tests
}

export async function readResponseText(response, options = {}) {
  const text = await response.text();
  return { text, bytes: text.length };
}