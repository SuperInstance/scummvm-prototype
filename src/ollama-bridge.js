/**
 * ollama-bridge.js — Living World Framework: Ollama Bridge
 *
 * Direct interface to Ollama REST API at localhost:11434.
 * Supports:
 *   - Text generation (all models)
 *   - Vision queries (llava with image input)
 *   - Streamed responses for real-time NPC dialogue
 *   - Model listing and health checks
 *   - Automatic fallback to cloud when Ollama is down
 *
 * Usage (browser):  <script src="src/ollama-bridge.js"></script>
 * Usage (Node.js):  const OllamaBridge = require('./ollama-bridge.js');
 */

const OllamaBridge = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ════════════════════════════════════════════════════════════

  const OLLAMA_BASE = 'http://localhost:11434';
  const HEALTH_TIMEOUT_MS = 3000;
  const QUERY_TIMEOUT_MS = 30000;

  // Cloud fallback endpoints (used when Ollama is unavailable)
  const CLOUD_FALLBACK = {
    'granite3.1-dense:2b': { provider: 'zai', model: 'glm-5.2', endpoint: null },
    'llava:7b':            { provider: 'deepinfra', model: 'Qwen/Qwen3-VL-235B', endpoint: null },
    'llama3.2:1b':         { provider: 'zai', model: 'glm-5.2', endpoint: null },
    'qwen2.5:0.5b':        { provider: 'zai', model: 'glm-5.2', endpoint: null },
  };

  let available = false;
  let lastHealthCheck = null;
  let modelsCache = null;

  // ════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════

  /**
   * Ping Ollama to see if it's alive.
   * Caches result for 30 seconds.
   */
  async function checkHealth() {
    const now = Date.now();
    if (lastHealthCheck && (now - lastHealthCheck.timestamp) < 30000) {
      return lastHealthCheck.available;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

      const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      available = true;
      modelsCache = data.models || [];

      lastHealthCheck = { available: true, timestamp: now, modelCount: modelsCache.length };

      console.log(`[OllamaBridge] Ollama is UP — ${modelsCache.length} models loaded`);
      return true;
    } catch (err) {
      available = false;
      lastHealthCheck = { available: false, timestamp: now, error: err.message };
      console.warn(`[OllamaBridge] Ollama is DOWN: ${err.message}`);
      return false;
    }
  }

  /**
   * Check if a specific model is loaded
   */
  async function isModelLoaded(modelName) {
    const isUp = await checkHealth();
    if (!isUp || !modelsCache) return false;
    return modelsCache.some(m => m.name === modelName || m.model === modelName);
  }

  // ════════════════════════════════════════════════════════════
  // TEXT GENERATION (non-streaming)
  // ════════════════════════════════════════════════════════════

  /**
   * Generate text from a local model.
   *
   * @param {string} modelName - e.g. "granite3.1-dense:2b"
   * @param {string} prompt - The prompt text
   * @param {object} options - { context, system, temperature, maxTokens }
   * @returns {object} { text, model, duration, tokens, fallback }
   */
  async function generate(modelName, prompt, options = {}) {
    const isUp = await checkHealth();
    if (!isUp) {
      console.warn(`[OllamaBridge] Ollama down — falling back for ${modelName}`);
      return _cloudFallback(modelName, prompt, options);
    }

    const loaded = await isModelLoaded(modelName);
    if (!loaded) {
      console.warn(`[OllamaBridge] Model ${modelName} not loaded — falling back`);
      return _cloudFallback(modelName, prompt, options);
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

      // Build the full prompt with optional system context
      let fullPrompt = '';
      if (options.system) {
        fullPrompt += options.system + '\n\n';
      }
      if (options.context) {
        fullPrompt += options.context + '\n\n';
      }
      fullPrompt += prompt;

      const body = {
        model: modelName,
        prompt: fullPrompt,
        stream: false,
        options: {},
      };

      if (options.temperature !== undefined) body.options.temperature = options.temperature;
      if (options.maxTokens) body.options.num_predict = options.maxTokens;
      if (options.top_p !== undefined) body.options.top_p = options.top_p;

      const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const duration = Date.now() - startTime;

      return {
        text: data.response,
        model: modelName,
        type: 'local',
        duration,
        tokens: data.eval_count || 0,
        tokensPerSecond: data.eval_count ? (data.eval_count / (duration / 1000)).toFixed(1) : 0,
        fallback: false,
      };
    } catch (err) {
      console.error(`[OllamaBridge] Generate failed for ${modelName}: ${err.message}`);
      return _cloudFallback(modelName, prompt, options);
    }
  }

  // ════════════════════════════════════════════════════════════
  // VISION QUERY (llava with image)
  // ════════════════════════════════════════════════════════════

  /**
   * Query a vision model with an image + text prompt.
   *
   * @param {string} modelName - Vision model (e.g. "llava:7b")
   * @param {string} prompt - Text prompt
   * @param {string} imageBase64 - Base64-encoded image (no data URI prefix)
   * @param {object} options - { temperature }
   * @returns {object} { text, model, duration, fallback }
   */
  async function queryVision(modelName, prompt, imageBase64, options = {}) {
    const isUp = await checkHealth();
    if (!isUp) {
      console.warn(`[OllamaBridge] Ollama down — vision fallback for ${modelName}`);
      return {
        text: '[Vision unavailable — Ollama is offline. Camera feed cannot be analyzed.]',
        model: modelName,
        type: 'error',
        duration: 0,
        fallback: false,
        error: 'ollama-offline',
      };
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS * 2); // vision takes longer

      const body = {
        model: modelName,
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        options: {},
      };

      if (options.temperature !== undefined) body.options.temperature = options.temperature;

      const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const duration = Date.now() - startTime;

      return {
        text: data.response,
        model: modelName,
        type: 'local-vision',
        duration,
        tokens: data.eval_count || 0,
        fallback: false,
      };
    } catch (err) {
      console.error(`[OllamaBridge] Vision query failed: ${err.message}`);
      return {
        text: `[Vision query failed: ${err.message}]`,
        model: modelName,
        type: 'error',
        duration: Date.now() - startTime,
        fallback: false,
        error: err.message,
      };
    }
  }

  // ════════════════════════════════════════════════════════════
  // STREAMING GENERATION (for real-time NPC dialogue)
  // ════════════════════════════════════════════════════════════

  /**
   * Stream tokens from a local model as they arrive.
   * Calls onToken(chunk) for each piece, returns full text when done.
   *
   * @param {string} modelName
   * @param {string} prompt
   * @param {function} onToken - callback(chunk) per token
   * @param {object} options
   * @returns {object} { text, model, duration }
   */
  async function generateStream(modelName, prompt, onToken, options = {}) {
    const isUp = await checkHealth();
    if (!isUp) {
      const fallback = await _cloudFallback(modelName, prompt, options);
      if (onToken) onToken(fallback.text);
      return fallback;
    }

    const startTime = Date.now();

    try {
      let fullPrompt = '';
      if (options.system) fullPrompt += options.system + '\n\n';
      if (options.context) fullPrompt += options.context + '\n\n';
      fullPrompt += prompt;

      const body = {
        model: modelName,
        prompt: fullPrompt,
        stream: true,
        options: {},
      };

      if (options.temperature !== undefined) body.options.temperature = options.temperature;
      if (options.maxTokens) body.options.num_predict = options.maxTokens;

      const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.response) {
              fullText += chunk.response;
              if (onToken) onToken(chunk.response);
            }
            if (chunk.done) break;
          } catch (e) {
            // incomplete JSON, skip
          }
        }
      }

      const duration = Date.now() - startTime;

      return {
        text: fullText,
        model: modelName,
        type: 'local',
        duration,
        streamed: true,
        fallback: false,
      };
    } catch (err) {
      console.error(`[OllamaBridge] Stream failed for ${modelName}: ${err.message}`);
      return _cloudFallback(modelName, prompt, options);
    }
  }

  // ════════════════════════════════════════════════════════════
  // MODEL LISTING
  // ════════════════════════════════════════════════════════════

  /**
   * List all loaded models with metadata.
   * Returns empty array if Ollama is down.
   */
  async function listModels() {
    const isUp = await checkHealth();
    if (!isUp) return [];

    return (modelsCache || []).map(m => ({
      name: m.name,
      size: m.size,
      sizeFormatted: _formatBytes(m.size),
      family: m.details?.family || 'unknown',
      parameterSize: m.details?.parameter_size || 'unknown',
      quantization: m.details?.quantization_level || 'unknown',
      modifiedAt: m.modified_at,
    }));
  }

  /**
   * Get a specific model's info
   */
  async function getModelInfo(modelName) {
    const models = await listModels();
    return models.find(m => m.name === modelName) || null;
  }

  // ════════════════════════════════════════════════════════════
  // EMBEDDINGS (for semantic search in skill/library rooms)
  // ════════════════════════════════════════════════════════════

  /**
   * Generate embeddings using nomic-embed-text
   */
  async function embed(text, modelName = 'nomic-embed-text:latest') {
    const isUp = await checkHealth();
    if (!isUp) return null;

    try {
      const resp = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, prompt: text }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      return data.embedding;
    } catch (err) {
      console.error(`[OllamaBridge] Embed failed: ${err.message}`);
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════
  // CLOUD FALLBACK
  // ════════════════════════════════════════════════════════════

  async function _cloudFallback(localModelName, prompt, options) {
    const fallback = CLOUD_FALLBACK[localModelName];

    if (!fallback) {
      return {
        text: `[${localModelName} is unavailable and no cloud fallback is configured]`,
        model: localModelName,
        type: 'error',
        duration: 0,
        fallback: false,
        error: 'no-fallback-configured',
      };
    }

    console.log(`[OllamaBridge] Falling back to ${fallback.provider}/${fallback.model}`);

    // In production, this would call the cloud API.
    // For now, return a marker that the ModelRouter can intercept.
    return {
      text: `[Cloud fallback — ${fallback.provider}/${fallback.model} would handle this in production. Prompt: "${prompt.substring(0, 80)}..."]`,
      model: fallback.model,
      provider: fallback.provider,
      type: 'cloud',
      duration: 0,
      fallback: true,
      originalModel: localModelName,
    };
  }

  // ════════════════════════════════════════════════════════════
  // UTILITIES
  // ════════════════════════════════════════════════════════════

  function _formatBytes(bytes) {
    if (!bytes) return 'unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unit = 0;
    let size = bytes;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(1)}${units[unit]}`;
  }

  /**
   * Set a custom Ollama base URL (for remote instances)
   */
  function setBaseUrl(url) {
    // Can't reassign const, so we store override
    _baseUrlOverride = url;
  }

  let _baseUrlOverride = null;

  function getBaseUrl() {
    return _baseUrlOverride || OLLAMA_BASE;
  }

  /**
   * Configure a custom cloud fallback mapping
   */
  function setCloudFallback(localModel, cloudConfig) {
    CLOUD_FALLBACK[localModel] = cloudConfig;
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    // Health
    checkHealth,
    isModelLoaded,
    isAvailable: () => available,

    // Generation
    generate,
    generateStream,
    queryVision,

    // Models
    listModels,
    getModelInfo,

    // Embeddings
    embed,

    // Configuration
    setBaseUrl,
    getBaseUrl,
    setCloudFallback,

    // Constants
    CLOUD_FALLBACK,
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OllamaBridge;
}
if (typeof window !== 'undefined') {
  window.OllamaBridge = OllamaBridge;
}
