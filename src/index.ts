import { Type } from "@sinclair/typebox";

const PROVIDER_ID = "litellm-search-provider";
const LITELLM_MAX_SEARCH_COUNT = 20;
const ENV_VAR_API_KEY = "LITELLM_API_KEY";

// Schema for the tool parameters
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

// Helper to resolve config values generically
function resolveConfigValue(
  searchConfig: Record<string, unknown> | undefined,
  key: string,
  options: { trim?: boolean; envVar?: string } = {}
): string | undefined {
  const providerConfig = searchConfig?.[PROVIDER_ID] as Record<string, unknown> | undefined;
  const value = providerConfig?.[key];

  if (typeof value === "string") {
    return options.trim ? value.trim() : value;
  }

  // Fallback to env var if specified
  return options.envVar ? process.env[options.envVar] : undefined;
}

// Helper to resolve API key from config or env
function resolveApiKey(searchConfig?: Record<string, unknown>): string | undefined {
  return resolveConfigValue(searchConfig, "apiKey", { envVar: ENV_VAR_API_KEY });
}

// Helper to resolve base URL from config
function resolveBaseUrl(searchConfig?: Record<string, unknown>): string | undefined {
  return resolveConfigValue(searchConfig, "baseUrl", { trim: true });
}

// Helper to resolve search tool name from config
function resolveSearchToolName(searchConfig?: Record<string, unknown>): string | undefined {
  return resolveConfigValue(searchConfig, "searchToolName", { trim: true });
}

// Sanitize error messages to remove sensitive data
function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-***")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer ***")
    .replace(/api[_-]?key[=:]\s*[^\s]+/gi, "api_key=***");
}

// Normalize results from LiteLLM API
function normalizeResults(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const results = (payload as Record<string, unknown>).results;
  if (!Array.isArray(results)) {
    return [];
  }

  return results.filter(
    (entry) => Boolean(entry && typeof entry === "object" && !Array.isArray(entry))
  );
}

// Main search execution function
async function executeSearch(params: {
  baseUrl: string;
  searchToolName: string;
  apiKey: string;
  query: string;
  count?: number;
  country?: string;
  domainFilter?: string[];
  timeoutSeconds?: number;
}): Promise<Record<string, unknown>> {
  const url = `${params.baseUrl}/v1/search/${params.searchToolName}`;

  const body: Record<string, unknown> = {
    query: params.query,
    max_results: params.count || 5,
  };

  if (params.country) {
    body.country = params.country;
  }

  if (params.domainFilter && params.domainFilter.length > 0) {
    body.search_domain_filter = params.domainFilter;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), (params.timeoutSeconds || 30) * 1000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      const sanitizedDetail = sanitizeErrorMessage(detail);

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `LiteLLM authentication error (${response.status}): Invalid or missing API key. ` +
          `Check ${ENV_VAR_API_KEY} or configuration. Details: ${sanitizedDetail}`
        );
      }

      if (response.status === 404) {
        throw new Error(
          `LiteLLM search tool not found (404): Tool '${params.searchToolName}' does not exist. ` +
          `Details: ${sanitizedDetail}`
        );
      }

      if (response.status === 408 || response.status >= 500) {
        throw new Error(
          `LiteLLM upstream error (${response.status}): Retryable error from LiteLLM. ` +
          `Details: ${sanitizedDetail}`
        );
      }

      throw new Error(`LiteLLM API error (${response.status}): ${sanitizedDetail}`);
    }

    const json = await response.json();

    if (json && typeof json === "object" && "error" in json) {
      throw new Error(
        `LiteLLM returned error in response: ${sanitizeErrorMessage(JSON.stringify(json.error))}`
      );
    }

    const normalized = normalizeResults(json);
    return { results: normalized as Array<Record<string, unknown>> };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`LiteLLM API request failed: ${String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

// Create the tool definition
function createTool(searchConfig?: Record<string, unknown>) {
  // Resolve config once at tool creation time
  const config = searchConfig?.[PROVIDER_ID] as Record<string, unknown> | undefined;
  const baseUrl = resolveBaseUrl(searchConfig);
  const searchToolName = resolveSearchToolName(searchConfig);
  const timeoutSeconds = (config?.timeoutSeconds as number) || 30;
  const defaultCountry = config?.defaultCountry as string | undefined;
  const passDomainFilter = config?.passDomainFilter === true;

  return {
    description:
      "Search the web via LiteLLM Search API. Supports multiple backends (Brave, Tavily, etc.) configured centrally in LiteLLM.",
    parameters: LITELLM_SCHEMA,
    execute: async (args: Record<string, unknown>) => {
      if (!baseUrl) {
        return {
          error: "missing_litellm_base_url",
          message:
            `web_search (${PROVIDER_ID}) needs a LiteLLM base URL. ` +
            `Configure tools.web.search.${PROVIDER_ID}.baseUrl in openclaw.json.`,
          docs: "https://docs.openclaw.ai/tools/web",
        };
      }

      if (!searchToolName) {
        return {
          error: "missing_litellm_search_tool_name",
          message:
            `web_search (${PROVIDER_ID}) needs a search tool name. ` +
            `Configure tools.web.search.${PROVIDER_ID}.searchToolName in openclaw.json.`,
          docs: "https://docs.openclaw.ai/tools/web",
        };
      }

      const apiKey = resolveApiKey(searchConfig);
      if (!apiKey) {
        return {
          error: "missing_litellm_api_key",
          message:
            `web_search (${PROVIDER_ID}) needs a LiteLLM API key. ` +
            `Set ${ENV_VAR_API_KEY} in the Gateway environment, ` +
            `or configure tools.web.search.${PROVIDER_ID}.apiKey.`,
          docs: "https://docs.openclaw.ai/tools/web",
        };
      }

      const query = args.query as string;
      const rawCount = args.count as number | undefined;

      if (rawCount !== undefined && rawCount > LITELLM_MAX_SEARCH_COUNT) {
        console.warn(
          `[${PROVIDER_ID}] Requested count ${rawCount} exceeds LiteLLM max of ${LITELLM_MAX_SEARCH_COUNT}. ` +
          `Clamped to ${LITELLM_MAX_SEARCH_COUNT}.`
        );
      }

      const count = rawCount !== undefined ? Math.min(rawCount, LITELLM_MAX_SEARCH_COUNT) : 5;
      const country = (args.country as string | undefined) || defaultCountry;
      const domainFilter = args.domain_filter as string[] | undefined;

      const effectiveDomainFilter =
        passDomainFilter && domainFilter && domainFilter.length > 0
          ? domainFilter
          : undefined;

      try {
        const start = Date.now();
        const results = await executeSearch({
          baseUrl,
          searchToolName,
          apiKey,
          query,
          count,
          country,
          domainFilter: effectiveDomainFilter,
          timeoutSeconds,
        });

        // Type assertion once for clarity
        const resultsArray = results.results as Array<Record<string, unknown>>;

        const payload = {
          query,
          provider: PROVIDER_ID,
          count: resultsArray.length,
          tookMs: Date.now() - start,
          externalContent: {
            untrusted: true,
            source: "web_search",
            provider: PROVIDER_ID,
            wrapped: true,
          },
          results: resultsArray.flatMap((entry: Record<string, unknown>) => {
            const url = entry.url as string;
            if (typeof url !== "string" || url.trim() === "") {
              return [];
            }

            const title = (entry.title as string) || "";
            const snippet = (entry.snippet as string) || "";
            const date = entry.date as string | undefined;

            return [{
              title,
              url,
              description: snippet,
              published: date,
            }];
          }),
        };

        return payload;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          error: "litellm_search_error",
          message: sanitizeErrorMessage(message),
        };
      }
    },
  };
}

// Provider definition object (shared between default export and register)
const PROVIDER_DEFINITION = {
  id: PROVIDER_ID,
  label: "LiteLLM Search",
  hint: "Centralized search via LiteLLM (Brave, Tavily, etc.)",
  requiresCredential: true,
  credentialLabel: "LiteLLM API key",
  envVars: [ENV_VAR_API_KEY],
  placeholder: "sk-...",
  signupUrl: "https://docs.litellm.ai/docs/search",
  docsUrl: "https://docs.openclaw.ai/tools/web",
  autoDetectOrder: 50,
  credentialPath: `plugins.entries.${PROVIDER_ID}.config.apiKey`,
  inactiveSecretPaths: [`plugins.entries.${PROVIDER_ID}.config.apiKey`],
  getCredentialValue: (searchConfig?: Record<string, unknown>) => {
    const config = searchConfig?.[PROVIDER_ID] as Record<string, unknown> | undefined;
    return config?.apiKey;
  },
  setCredentialValue: (searchConfigTarget: Record<string, unknown>, value: unknown) => {
    if (!searchConfigTarget[PROVIDER_ID]) {
      searchConfigTarget[PROVIDER_ID] = {};
    }
    (searchConfigTarget[PROVIDER_ID] as Record<string, unknown>).apiKey = value;
  },
  createTool: (ctx: { searchConfig?: Record<string, unknown> }) => {
    if (!ctx.searchConfig) {
      return null;
    }
    return createTool(ctx.searchConfig);
  },
  register(api: { registerWebSearchProvider: (provider: unknown) => void }) {
    api.registerWebSearchProvider(PROVIDER_DEFINITION);
  },
};

// Export the plugin definition
export default PROVIDER_DEFINITION;