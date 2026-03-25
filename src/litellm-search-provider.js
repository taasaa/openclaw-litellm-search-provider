// Export functions for testing
export {
  resolveLiteLLMConfig,
  resolveLiteLLMApiKey,
  resolveLiteLLMBaseUrl,
  normalizeLiteLLMResults,
  sanitizeErrorMessage,
};

import { Type } from "@sinclair/typebox";
import {
  buildSearchCacheKey,
  DEFAULT_SEARCH_COUNT,
  enablePluginInConfig,
  mergeScopedSearchConfig,
  readCachedSearchPayload,
  readConfiguredSecretString,
  readNumberParam,
  readProviderEnvValue,
  readResponseText,
  readStringParam,
  resolveProviderWebSearchPluginConfig,
  resolveSearchCacheTtlMs,
  resolveSearchCount,
  resolveSearchTimeoutSeconds,
  resolveSiteName,
  setProviderWebSearchPluginConfigValue,
  withTrustedWebSearchEndpoint,
  wrapWebContent,
  writeCachedSearchPayload,
} from "openclaw/plugin-sdk/provider-web-search";

const PROVIDER_ID = "litellm-search-provider";
const LITELLM_MAX_SEARCH_COUNT = 20;
const DOCS_URL = "https://docs.openclaw.ai/tools/web";
const ENV_VAR_API_KEY = "LITELLM_API_KEY";

const LITELLM_SCHEMA = Type.Object(
  {
    query: Type.String({ description: "Search query string." }),
    count: Type.Optional(
      Type.Number({
        description: "Number of results to return (1-20, limited by LiteLLM).",
        minimum: 1,
        maximum: LITELLM_MAX_SEARCH_COUNT,
      })
    ),
    country: Type.Optional(
      Type.String({
        description: "2-letter country code for region-specific results (e.g., 'US', 'DE').",
      })
    ),
    domain_filter: Type.Optional(
      Type.Array(Type.String(), {
        description: "Restrict search to these domains (requires passDomainFilter=true in config).",
      })
    ),
  },
  { additionalProperties: false }
);

function resolveLiteLLMConfig(searchConfig) {
  const litellm = searchConfig?.[PROVIDER_ID];
  return litellm && typeof litellm === "object" && !Array.isArray(litellm)
    ? litellm
    : {};
}

function resolveLiteLLMApiKey(config) {
  return (
    readConfiguredSecretString(config?.apiKey, `tools.web.search.${PROVIDER_ID}.apiKey`) ??
    readProviderEnvValue([ENV_VAR_API_KEY])
  );
}

function resolveLiteLLMBaseUrl(config) {
  const baseUrl = config?.baseUrl?.trim();
  if (!baseUrl) {
    return undefined;
  }

  try {
    const url = new URL(baseUrl);
    if (url.protocol === "http:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      console.warn(
        `[litellm-search] WARNING: Using HTTP (not HTTPS) for non-localhost baseUrl: ${baseUrl}. ` +
        "This may expose credentials to network inspection."
      );
    }
    return baseUrl;
  } catch {
    return undefined;
  }
}

function normalizeLiteLLMResults(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const results = payload.results;
  if (!Array.isArray(results)) {
    return [];
  }
  return results.filter((entry) =>
    Boolean(entry && typeof entry === "object" && !Array.isArray(entry))
  );
}

function sanitizeErrorMessage(message) {
  return message
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-***")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer ***")
    .replace(/api[_-]?key[=:]\s*[^\s]+/gi, "api_key=***");
}

async function runLiteLLMSearch(params) {
  const url = `${params.baseUrl}/v1/search/${params.searchToolName}`;

  const body = {
    query: params.query,
    max_results: Math.min(params.count, LITELLM_MAX_SEARCH_COUNT),
  };

  if (params.country) {
    body.country = params.country;
  }

  if (params.domainFilter && params.domainFilter.length > 0) {
    body.search_domain_filter = params.domainFilter;
  }

  return withTrustedWebSearchEndpoint(
    {
      url,
      timeoutSeconds: params.timeoutSeconds,
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify(body),
      },
    },
    async (res) => {
      if (!res.ok) {
        const { text: detail } = await readResponseText(res, { maxBytes: 64000 });
        const sanitizedDetail = sanitizeErrorMessage(detail);

        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `LiteLLM authentication error (${res.status}): Invalid or missing API key. ` +
            `Check ${ENV_VAR_API_KEY} or tools.web.search.${PROVIDER_ID}.apiKey. ` +
            `Details: ${sanitizedDetail}`
          );
        }

        if (res.status === 404) {
          throw new Error(
            `LiteLLM search tool not found (404): Tool '${params.searchToolName}' does not exist. ` +
            `Check tools.web.search.${PROVIDER_ID}.searchToolName matches a tool in LiteLLM config. ` +
            `Details: ${sanitizedDetail}`
          );
        }

        if (res.status === 408 || res.status >= 500) {
          throw new Error(
            `LiteLLM upstream error (${res.status}): Retryable error from LiteLLM. ` +
            `Details: ${sanitizedDetail}`
          );
        }

        throw new Error(`LiteLLM API error (${res.status}): ${sanitizedDetail || res.statusText}`);
      }

      try {
        const json = await res.json();
        if (json && typeof json === "object" && "error" in json) {
          throw new Error(
            `LiteLLM returned error in response: ${sanitizeErrorMessage(JSON.stringify(json.error))}`
          );
        }
        return normalizeLiteLLMResults(json);
      } catch (error) {
        if (error instanceof Error && error.message.includes("LiteLLM returned error")) {
          throw error;
        }
        throw new Error(`LiteLLM API returned invalid JSON: ${String(error)}`, { cause: error });
      }
    }
  );
}

function createLiteLLMToolDefinition(searchConfig) {
  const config = resolveLiteLLMConfig(searchConfig);
  const baseUrl = resolveLiteLLMBaseUrl(config);
  const searchToolName = config?.searchToolName?.trim();
  const timeoutSeconds = resolveSearchTimeoutSeconds(searchConfig);

  return {
    description:
      "Search the web via LiteLLM Search API. Supports multiple backends (Brave, Tavily, etc.) configured centrally in LiteLLM.",
    parameters: LITELLM_SCHEMA,
    execute: async (args) => {
      const params = args;

      if (!baseUrl) {
        return missingConfigPayload("baseUrl");
      }

      if (!searchToolName) {
        return missingConfigPayload("searchToolName");
      }

      const apiKey = resolveLiteLLMApiKey(config);
      if (!apiKey) {
        return {
          error: "missing_litellm_api_key",
          message:
            `web_search (${PROVIDER_ID}) needs a LiteLLM API key. ` +
            `Set ${ENV_VAR_API_KEY} in the Gateway environment, ` +
            `or configure tools.web.search.${PROVIDER_ID}.apiKey.`,
          docs: DOCS_URL,
        };
      }

      const query = readStringParam(params, "query", { required: true });
      const rawCount = readNumberParam(params, "count", { integer: true });

      if (rawCount !== undefined && rawCount > LITELLM_MAX_SEARCH_COUNT) {
        console.warn(
          `[${PROVIDER_ID}] Requested count ${rawCount} exceeds LiteLLM max of ${LITELLM_MAX_SEARCH_COUNT}. ` +
          `Clamped to ${LITELLM_MAX_SEARCH_COUNT}.`
        );
      }

      const count = rawCount !== undefined ? Math.min(rawCount, LITELLM_MAX_SEARCH_COUNT) : undefined;
      const effectiveCount = resolveSearchCount(count, DEFAULT_SEARCH_COUNT);

      const country = readStringParam(params, "country") ?? config?.defaultCountry;
      const domainFilter = params.domain_filter;

      const effectiveDomainFilter =
        config?.passDomainFilter === true && domainFilter && domainFilter.length > 0
          ? domainFilter
          : undefined;

      const cacheKey = buildSearchCacheKey([
        PROVIDER_ID,
        searchToolName,
        query,
        effectiveCount,
        country,
        effectiveDomainFilter ? effectiveDomainFilter.join(",") : undefined,
      ]);

      const cached = readCachedSearchPayload(cacheKey);
      if (cached) {
        return cached;
      }

      const start = Date.now();
      const results = await runLiteLLMSearch({
        baseUrl,
        searchToolName,
        apiKey,
        query,
        count: effectiveCount,
        timeoutSeconds,
        country,
        domainFilter: effectiveDomainFilter,
      });

      const payload = {
        query,
        provider: PROVIDER_ID,
        count: results.length,
        tookMs: Date.now() - start,
        externalContent: {
          untrusted: true,
          source: "web_search",
          provider: PROVIDER_ID,
          wrapped: true,
        },
        results: results.flatMap((entry) => {
          if (typeof entry.url !== "string" || entry.url.trim() === "") {
            return [];
          }

          const title = typeof entry.title === "string" ? entry.title : "";
          const url = typeof entry.url === "string" ? entry.url : "";
          const snippet = typeof entry.snippet === "string" ? entry.snippet : "";
          const date = typeof entry.date === "string" ? entry.date : undefined;

          return [{
            title: title ? wrapWebContent(title, "web_search") : "",
            url,
            description: snippet ? wrapWebContent(snippet, "web_search") : "",
            published: date,
            siteName: resolveSiteName(url) || undefined,
          }];
        }),
      };

      writeCachedSearchPayload(cacheKey, payload, resolveSearchCacheTtlMs(searchConfig));
      return payload;
    },
  };
}

export function createLiteLLMWebSearchProvider() {
  return {
    id: PROVIDER_ID,
    label: "LiteLLM Search",
    hint: "Centralized search via LiteLLM (Brave, Tavily, etc.)",
    credentialLabel: "LiteLLM API key",
    envVars: [ENV_VAR_API_KEY],
    placeholder: "sk-...",
    signupUrl: "https://docs.litellm.ai/docs/search",
    docsUrl: DOCS_URL,
    autoDetectOrder: 50,
    credentialPath: `plugins.entries.${PROVIDER_ID}.config.webSearch.apiKey`,
    inactiveSecretPaths: [`plugins.entries.${PROVIDER_ID}.config.webSearch.apiKey`],
    getCredentialValue: (searchConfig) => {
      const config = resolveLiteLLMConfig(searchConfig);
      return config?.apiKey;
    },
    setCredentialValue: (searchConfigTarget, value) => {
      setProviderWebSearchPluginConfigValue(searchConfigTarget, PROVIDER_ID, "apiKey", value);
    },
    getConfiguredCredentialValue: (config) =>
      resolveProviderWebSearchPluginConfig(config, PROVIDER_ID)?.apiKey,
    setConfiguredCredentialValue: (configTarget, value) => {
      setProviderWebSearchPluginConfigValue(configTarget, PROVIDER_ID, "apiKey", value);
    },
    applySelectionConfig: (config) => enablePluginInConfig(config, PROVIDER_ID).config,
    createTool: (ctx) =>
      createLiteLLMToolDefinition(
        mergeScopedSearchConfig(
          ctx.searchConfig,
          PROVIDER_ID,
          resolveProviderWebSearchPluginConfig(ctx.config, PROVIDER_ID)
        )
      ),
  };
}