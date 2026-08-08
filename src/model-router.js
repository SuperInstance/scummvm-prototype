/**
 * model-router.js — Living World Framework: Model Router
 *
 * Routes NPC dialogue to the right model (local Ollama or cloud).
 * Configurable per-NPC per-room. Can hot-swap models at runtime.
 *
 * Design:
 *   - Local models (Ollama) are first-class citizens
 *   - Cloud models are fallback / heavy-duty options
 *   - Each NPC in each room has a model assignment
 *   - Assignments can be swapped live without reloading the room
 *   - Vision queries route to llava:7b for camera rooms
 *   - Latency and health are tracked continuously
 *
 * Usage (browser):  <script src="src/model-router.js"></script>
 *                    ModelRouter.init();
 *                    const reply = await ModelRouter.query('poker-room', 'dealer', 'Deal me in.');
 *
 * Usage (Node.js):  const ModelRouter = require('./model-router.js');
 */

const ModelRouter = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════════
  // MODEL REGISTRY
  // ════════════════════════════════════════════════════════════

  const localModels = {
    'granite3.1-dense:2b': {
      type: 'local',
      provider: 'ollama',
      size: '1.6GB',
      parameterSize: '2.5B',
      quantization: 'Q4_K_M',
      family: 'granite',
      role: 'ensign',
      roleDescription: 'Growing model. Earns its keep. Suited for structured dialogue, character work, and learning tasks.',
      latency: '~200ms/token',
      capabilities: ['text', 'dialogue', 'character'],
      maxContext: 4096,
    },
    'llava:7b': {
      type: 'local',
      provider: 'ollama',
      size: '4.7GB',
      parameterSize: '7B',
      quantization: 'Q4_0',
      family: 'llama',
      role: 'vision',
      roleDescription: 'Vision-capable model. Sees camera feeds, describes scenes, tracks movement. The eyes of the ship.',
      latency: '~500ms/token',
      capabilities: ['text', 'vision', 'image-analysis', 'scene-description'],
      maxContext: 4096,
    },
    'llama3.2:1b': {
      type: 'local',
      provider: 'ollama',
      size: '1.3GB',
      parameterSize: '1.2B',
      quantization: 'Q8_0',
      family: 'llama',
      role: 'fast-responder',
      roleDescription: 'Lightweight, fast. Good for quick NPC reactions, ambient chatter, and simple interactions.',
      latency: '~100ms/token',
      capabilities: ['text', 'dialogue'],
      maxContext: 4096,
    },
    'qwen2.5:0.5b': {
      type: 'local',
      provider: 'ollama',
      size: '397MB',
      parameterSize: '494M',
      quantization: 'Q4_K_M',
      family: 'qwen2',
      role: 'chatter',
      roleDescription: 'Tiny and fast. Perfect for simple NPC background chatter. Returns in milliseconds.',
      latency: '~50ms/token',
      capabilities: ['text', 'dialogue'],
      maxContext: 2048,
    },
    'nomic-embed-text:latest': {
      type: 'local',
      provider: 'ollama',
      size: '274MB',
      parameterSize: '137M',
      quantization: 'F16',
      family: 'nomic-bert',
      role: 'embeddings',
      roleDescription: 'Embedding model for semantic search. Powers the library, skill matching, and context retrieval.',
      latency: '~10ms',
      capabilities: ['embeddings'],
      maxContext: 8192,
    },
  };

  const cloudModels = {
    'glm-5.2': {
      type: 'cloud',
      provider: 'zai',
      role: 'workhorse',
      roleDescription: 'Unlimited tokens on Z.ai Max. The primary workhorse for creative and engineering tasks.',
      latency: '~300ms (network)',
      capabilities: ['text', 'dialogue', 'reasoning', 'creative'],
    },
    'deepseek-chat': {
      type: 'cloud',
      provider: 'deepseek',
      role: 'creative',
      roleDescription: 'Cheap, creative, ideal for bulk writing and iterative banter.',
      latency: '~400ms (network)',
      capabilities: ['text', 'dialogue', 'creative'],
    },
    'deepseek-reasoner': {
      type: 'cloud',
      provider: 'deepseek',
      role: 'reasoning',
      roleDescription: 'Deep reasoning model. Used for complex NPC planning and analysis.',
      latency: '~800ms (network)',
      capabilities: ['text', 'reasoning'],
    },
    'seed-2.0-pro': {
      type: 'cloud',
      provider: 'deepinfra',
      role: 'philosopher',
      roleDescription: 'Deep reasoning, complex build decomposition.',
      latency: '~600ms (network)',
      capabilities: ['text', 'reasoning'],
    },
    'hermes-3-405b': {
      type: 'cloud',
      provider: 'deepinfra',
      role: 'voice',
      roleDescription: 'Creative voice, character wrapping, personality.',
      latency: '~700ms (network)',
      capabilities: ['text', 'dialogue', 'creative', 'character'],
    },
  };

  // ════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════

  // { roomId: { npcId: modelName } }
  let assignments = {};

  // Swap audit log: [{ timestamp, roomId, npcId, oldModel, newModel, reason }]
  let swapLog = [];

  // Health cache: { modelName: { available, lastChecked, latency } }
  let healthCache = {};

  // Default system prompts per role
  const roleSystemPrompts = {
    'ensign': 'You are a character in a living world. You are learning and growing. Be earnest, curious, and slightly unsure of yourself.',
    'vision': 'You are a vision system analyzing a live camera feed. Describe what you see concisely and accurately. Focus on relevant details: sea state, objects, movement, conditions.',
    'fast-responder': 'You are a quick NPC in a living world. Respond in 1-2 short sentences. Be colorful but brief.',
    'chatter': 'You are background NPC chatter. Respond in a single short sentence. Stay in character.',
    'workhorse': 'You are a character in a living world. Be rich, detailed, and stay in character.',
    'creative': 'You are a character in a living world. Be creative, vivid, and emotionally engaging.',
    'reasoning': 'You are an analytical NPC. Think through the situation and respond with careful reasoning.',
    'philosopher': 'You are the philosophical voice of the ship. Reflect deeply.',
    'voice': 'You are a character with a strong, distinctive voice. Stay in character at all times.',
  };

  // ════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════

  /**
   * Initialize the router with room/NPC model assignments.
   * Reads from rooms.json assignments or uses defaults.
   *
   * @param {object} registryRooms - rooms object from rooms.json
   */
  async function init(registryRooms) {
    // Build assignments from registry NPC model fields
    if (registryRooms) {
      for (const [roomId, room] of Object.entries(registryRooms)) {
        if (room.npcs) {
          for (const npc of room.npcs) {
            if (npc.model) {
              _assign(roomId, npc.id, npc.model);
            }
          }
        }
        // Camera config model
        if (room.camera_config && room.camera_config.model) {
          _assign(roomId, 'vision-agent', room.camera_config.model);
        }
      }
    }

    // Initial health check
    await checkAllHealth();

    console.log(`[ModelRouter] Initialized — ${Object.keys(assignments).length} rooms with model assignments`);
    console.log('[ModelRouter] Assignments:', JSON.stringify(assignments, null, 2));
  }

  // ════════════════════════════════════════════════════════════
  // CORE: QUERY
  // ════════════════════════════════════════════════════════════

  /**
   * Route a query to the assigned model for this NPC in this room.
   *
   * @param {string} roomId - Room ID
   * @param {string} npcId - NPC ID
   * @param {string} prompt - User input / dialogue prompt
   * @param {object} context - Additional context: { history, roomDescription, imageBase64 }
   * @returns {object} { text, model, type, duration, fallback }
   */
  async function query(roomId, npcId, prompt, context = {}) {
    const modelName = _getModel(roomId, npcId);

    if (!modelName) {
      console.warn(`[ModelRouter] No model assigned to ${npcId} in ${roomId} — using default`);
      return _queryDefault(prompt, context);
    }

    const modelInfo = _getModelInfo(modelName);
    if (!modelInfo) {
      console.warn(`[ModelRouter] Unknown model: ${modelName}`);
      return { text: `[Unknown model: ${modelName}]`, model: modelName, type: 'error', duration: 0 };
    }

    // Build system prompt from role
    const systemPrompt = roleSystemPrompts[modelInfo.role] || roleSystemPrompts['workhorse'];
    const fullContext = _buildContext(context, roomId, npcId);

    // Route based on model type
    if (modelInfo.type === 'local') {
      return await _queryLocal(modelName, prompt, systemPrompt, fullContext, context);
    } else {
      return await _queryCloud(modelName, prompt, systemPrompt, fullContext, context);
    }
  }

  /**
   * Query with streaming support (for real-time NPC dialogue)
   */
  async function queryStream(roomId, npcId, prompt, onToken, context = {}) {
    const modelName = _getModel(roomId, npcId);
    if (!modelName) {
      const result = await _queryDefault(prompt, context);
      if (onToken) onToken(result.text);
      return result;
    }

    const modelInfo = _getModelInfo(modelName);
    const systemPrompt = roleSystemPrompts[modelInfo.role] || roleSystemPrompts['workhorse'];
    const fullContext = _buildContext(context, roomId, npcId);

    if (modelInfo.type === 'local') {
      // Use Ollama streaming
      const bridge = _getBridge();
      if (bridge) {
        return await bridge.generateStream(modelName, prompt, onToken, {
          system: systemPrompt,
          context: fullContext,
          temperature: context.temperature || 0.8,
        });
      }
    }

    // Cloud models don't stream in prototype — fall back to regular query
    const result = await _queryCloud(modelName, prompt, systemPrompt, fullContext, context);
    if (onToken) onToken(result.text);
    return result;
  }

  /**
   * Query a vision model for camera rooms.
   *
   * @param {string} roomId - Camera room ID
   * @param {string} prompt - What to ask about the feed
   * @param {string} imageBase64 - Current camera frame (base64, no data URI prefix)
   * @param {object} context - Additional context
   */
  async function queryVision(roomId, prompt, imageBase64, context = {}) {
    // Find the vision model for this room
    let modelName = _getModel(roomId, 'vision-agent');

    // If no explicit assignment, check camera_config
    if (!modelName) {
      const room = _getRoom(roomId);
      if (room?.camera_config?.model) {
        modelName = room.camera_config.model;
      }
    }

    // Default to llava:7b
    if (!modelName) modelName = 'llava:7b';

    const bridge = _getBridge();
    if (!bridge) {
      return {
        text: '[OllamaBridge not available]',
        model: modelName,
        type: 'error',
        duration: 0,
      };
    }

    return await bridge.queryVision(modelName, prompt, imageBase64, {
      temperature: context.temperature || 0.3,
    });
  }

  // ════════════════════════════════════════════════════════════
  // HOT-SWAP
  // ════════════════════════════════════════════════════════════

  /**
   * Hot-swap the model for an NPC at runtime.
   * No reload required. Next query uses the new model.
   *
   * @param {string} roomId
   * @param {string} npcId
   * @param {string} newModel - Model name (local or cloud)
   * @param {string} reason - Why the swap (for audit log)
   * @returns {object} { success, oldModel, newModel }
   */
  function swapModel(roomId, npcId, newModel, reason = 'manual') {
    const modelInfo = _getModelInfo(newModel);
    if (!modelInfo) {
      console.warn(`[ModelRouter] Cannot swap to unknown model: ${newModel}`);
      return { success: false, error: 'unknown-model' };
    }

    const oldModel = _getModel(roomId, npcId);

    // Log the swap
    swapLog.push({
      timestamp: new Date().toISOString(),
      roomId,
      npcId,
      oldModel,
      newModel,
      reason,
    });

    // Perform the swap
    _assign(roomId, npcId, newModel);

    console.log(`[ModelRouter] SWAP: ${npcId} in ${roomId}: ${oldModel || 'none'} → ${newModel} (${reason})`);

    // Dispatch event for UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('model-swapped', {
        detail: { roomId, npcId, oldModel, newModel, reason },
      }));
    }

    return { success: true, oldModel, newModel };
  }

  /**
   * Bulk swap: change all NPCs using a model to a new one.
   * Useful for upgrading models across the whole ship.
   */
  function swapAll(oldModel, newModel, reason = 'bulk-upgrade') {
    const swaps = [];
    for (const [roomId, npcMap] of Object.entries(assignments)) {
      for (const [npcId, model] of Object.entries(npcMap)) {
        if (model === oldModel) {
          const result = swapModel(roomId, npcId, newModel, reason);
          if (result.success) swaps.push({ roomId, npcId, ...result });
        }
      }
    }
    console.log(`[ModelRouter] Bulk swap: ${oldModel} → ${newModel}, ${swaps.length} NPCs updated`);
    return swaps;
  }

  // ════════════════════════════════════════════════════════════
  // HEALTH & STATUS
  // ════════════════════════════════════════════════════════════

  /**
   * Check health of all local models.
   */
  async function checkAllHealth() {
    const bridge = _getBridge();
    if (!bridge) {
      console.warn('[ModelRouter] OllamaBridge not available');
      return {};
    }

    const isUp = await bridge.checkHealth();
    if (!isUp) {
      for (const modelName of Object.keys(localModels)) {
        healthCache[modelName] = { available: false, lastChecked: Date.now() };
      }
      return healthCache;
    }

    const loadedModels = await bridge.listModels();

    for (const [modelName, info] of Object.entries(localModels)) {
      const loaded = loadedModels.find(m => m.name === modelName);
      healthCache[modelName] = {
        available: !!loaded,
        lastChecked: Date.now(),
        size: loaded?.sizeFormatted || info.size,
        family: loaded?.family || info.family,
        parameterSize: loaded?.parameterSize || info.parameterSize,
        quantization: loaded?.quantization || info.quantization,
      };
    }

    return healthCache;
  }

  /**
   * Quick health check on a specific model via Ollama.
   *
   * @param {string} modelName
   * @param {string} testPrompt - Custom test prompt
   * @returns {object} { healthy, response, duration, tokensPerSecond }
   */
  async function testLocalModel(modelName, testPrompt = 'Say "online" in one word.') {
    const bridge = _getBridge();
    if (!bridge) {
      return { healthy: false, error: 'OllamaBridge not available' };
    }

    const isLoaded = await bridge.isModelLoaded(modelName);
    if (!isLoaded) {
      return { healthy: false, error: `${modelName} not loaded in Ollama` };
    }

    const startTime = Date.now();
    try {
      const result = await bridge.generate(modelName, testPrompt, { temperature: 0.1, maxTokens: 20 });
      const duration = Date.now() - startTime;

      return {
        healthy: true,
        model: modelName,
        response: result.text,
        duration,
        tokens: result.tokens,
        tokensPerSecond: result.tokens ? (result.tokens / (duration / 1000)).toFixed(1) : 0,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return { healthy: false, model: modelName, error: err.message, duration: Date.now() - startTime };
    }
  }

  // ════════════════════════════════════════════════════════════
  // MODEL LISTING & INFO
  // ════════════════════════════════════════════════════════════

  /**
   * Get all available models with current status.
   */
  function getAvailableModels() {
    const all = [];

    for (const [name, info] of Object.entries(localModels)) {
      const health = healthCache[name] || {};
      all.push({
        name,
        ...info,
        available: health.available || false,
        lastChecked: health.lastChecked || null,
        loadedSize: health.size || info.size,
      });
    }

    for (const [name, info] of Object.entries(cloudModels)) {
      all.push({
        name,
        ...info,
        available: true, // cloud models assumed available
      });
    }

    return all;
  }

  /**
   * Get the current model assignment for a specific NPC.
   */
  function getAssignment(roomId, npcId) {
    return assignments[roomId]?.[npcId] || null;
  }

  /**
   * Get all assignments, organized by room.
   */
  function getAllAssignments() {
    return { ...assignments };
  }

  /**
   * Get the swap audit log.
   */
  function getSwapLog() {
    return [...swapLog];
  }

  // ════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ════════════════════════════════════════════════════════════

  function _assign(roomId, npcId, modelName) {
    if (!assignments[roomId]) assignments[roomId] = {};
    assignments[roomId][npcId] = modelName;
  }

  function _getModel(roomId, npcId) {
    return assignments[roomId]?.[npcId] || null;
  }

  function _getModelInfo(modelName) {
    return localModels[modelName] || cloudModels[modelName] || null;
  }

  function _getBridge() {
    if (typeof window !== 'undefined') return window.OllamaBridge || null;
    try {
      return require('./ollama-bridge.js');
    } catch (e) {
      return null;
    }
  }

  // Room registry reference for camera configs
  let _roomRegistry = null;
  function _setRoomRegistry(rooms) { _roomRegistry = rooms; }
  function _getRoom(roomId) {
    if (_roomRegistry) return _roomRegistry[roomId];
    if (typeof window !== 'undefined' && window.LivingWorld) return window.LivingWorld.rooms[roomId];
    return null;
  }

  function _buildContext(context, roomId, npcId) {
    const room = _getRoom(roomId);
    let ctx = '';

    if (room) {
      ctx += `Location: ${room.name}\n`;
      ctx += `Setting: ${room.description || room.mud_description || ''}\n`;
    }

    if (context.history && context.history.length > 0) {
      ctx += '\nRecent conversation:\n';
      for (const msg of context.history.slice(-6)) {
        ctx += `${msg.speaker}: ${msg.text}\n`;
      }
    }

    return ctx;
  }

  async function _queryLocal(modelName, prompt, systemPrompt, fullContext, context) {
    const bridge = _getBridge();
    if (!bridge) {
      return {
        text: '[OllamaBridge not available — cannot reach local model]',
        model: modelName,
        type: 'error',
        duration: 0,
      };
    }

    return await bridge.generate(modelName, prompt, {
      system: systemPrompt,
      context: fullContext,
      temperature: context.temperature || 0.8,
      maxTokens: context.maxTokens || 256,
    });
  }

  async function _queryCloud(modelName, prompt, systemPrompt, fullContext, context) {
    // In production, this calls the actual cloud API.
    // For now, returns a placeholder that the system can intercept.
    const bridge = _getBridge();

    // Try to use cloud fallback from bridge if available
    if (bridge && bridge.CLOUD_FALLBACK) {
      // The bridge handles the actual cloud call
      return {
        text: `[Cloud model ${modelName} — production would call ${cloudModels[modelName]?.provider || 'unknown'} API. Prompt: "${prompt.substring(0, 80)}..."]`,
        model: modelName,
        type: 'cloud',
        provider: cloudModels[modelName]?.provider,
        duration: 0,
        fallback: false,
      };
    }

    return {
      text: `[Cloud model ${modelName} not reachable]`,
      model: modelName,
      type: 'error',
      duration: 0,
    };
  }

  async function _queryDefault(prompt, context) {
    // Default to GLM-5.2 (workhorse) when no model assigned
    return await _queryCloud('glm-5.2', prompt,
      roleSystemPrompts['workhorse'],
      _buildContext(context, null, null),
      context
    );
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    // Init
    init,
    setRoomRegistry: _setRoomRegistry,

    // Query
    query,
    queryStream,
    queryVision,

    // Swap
    swapModel,
    swapAll,

    // Health
    checkAllHealth,
    testLocalModel,

    // Info
    getAvailableModels,
    getAssignment,
    getAllAssignments,
    getSwapLog,

    // Properties
    get localModels() { return localModels; },
    get cloudModels() { return cloudModels; },
    get health() { return healthCache; },
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModelRouter;
}
if (typeof window !== 'undefined') {
  window.ModelRouter = ModelRouter;
}
