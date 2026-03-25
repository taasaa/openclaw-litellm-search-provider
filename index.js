import { createLiteLLMWebSearchProvider } from "./src/litellm-search-provider.js";

export { createLiteLLMWebSearchProvider };

export function register(api) {
  api.registerWebSearchProvider(createLiteLLMWebSearchProvider());
}