/**
 * relay-experts.js — Living World Framework: Relay of Experts
 *
 * The relay system where models hand work to each other based on
 * who's most qualified. Not hierarchy. Not democracy. Qualification.
 *
 * Core insight: the model that's worst at everything is best at
 * knowing it's worst. Self-knowledge IS the routing protocol.
 *
 * Components:
 *   1. ModelRegistry — profiles for all models (local + cloud)
 *   2. BatonPass — the handoff mechanism with context packaging
 *   3. SelfSelector — models assess their own fit for a task
 *   4. MultiModelChat — small models converse on a problem
 *   5. RoomOfMinds — live status of who's active and who's idle
 *   6. RelayOrchestrator — coordinates the full relay chain
 *
 * Usage (browser):
 *   <script src="src/ollama-bridge.js"></script>
 *   <script src="src/relay-experts.js"></script>
 *   <script>
 *     RelayExperts.init();
 *     const result = await RelayExperts.execute('Design a camera room vision pipeline');
 *     console.log(result.chain); // full baton chain
 *   </script>
 *
 * Usage (Node.js):
 *   const RelayExperts = require('./relay-experts.js');
 */

const RelayExperts = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════════
  // 1. MODEL REGISTRY — Profiles for every mind in the room
  // ════════════════════════════════════════════════════════════

  const ModelRegistry = (function () {
    const models = {
      // ═══ LOCAL MODELS — The minds loaded on this machine ═══
      'granite3.1-dense:2b': {
        id: 'granite3.1-dense:2b',
        name: 'Wesley',
        size: '1.6GB',
        type: 'local',
        strengths: ['safety', 'systems', 'steady-reasoning', 'creative-writing', 'npc-dialogue', 'journal-entries'],
        weaknesses: ['complex-math', 'long-context', 'sensor-fusion', 'deep-reasoning'],
        personality: 'Earnest. Thorough. Surprised by beauty. The smallest that is still useful.',
        best_for: 'NPC dialogue, safety checks, journal entries, steady reasoning within 2B limits',
        latency: '~200ms',
        active: true,
        ollamaModel: 'granite3.1-dense:2b',
      },
      'phi3:3.8b': {
        id: 'phi3:3.8b',
        name: 'John Anderson',
        size: '2.2GB',
        type: 'local',
        strengths: ['curiosity', 'marine-biology', 'detailed-analysis', 'structured-thinking'],
        weaknesses: ['creative-writing', 'long-context', 'vision'],
        personality: 'Curious about marine life. Detailed. Sees organisms where others see systems.',
        best_for: 'Detailed analysis, marine life identification, structured exploration',
        latency: '~300ms',
        active: true,
        ollamaModel: 'phi3:3.8b',
      },
      'qwen2.5:3b': {
        id: 'qwen2.5:3b',
        name: 'Qwen',
        size: '1.9GB',
        type: 'local',
        strengths: ['practical-reasoning', 'concise-output', 'code-snippets', 'multilingual'],
        weaknesses: ['creative-writing', 'long-context', 'vision'],
        personality: 'Practical. Gets to the point. No wasted words.',
        best_for: 'Quick practical answers, code snippets, concise summaries',
        latency: '~250ms',
        active: true,
        ollamaModel: 'qwen2.5:3b',
      },
      'llava:7b': {
        id: 'llava:7b',
        name: 'Llava',
        size: '4.7GB',
        type: 'local',
        strengths: ['vision', 'image-analysis', 'scene-description', 'object-detection', 'camera-feeds'],
        weaknesses: ['deep-reasoning', 'complex-math', 'long-text-generation'],
        personality: 'Visual thinker. Sees what others cannot. The eyes of the ship.',
        best_for: 'Camera feed analysis, image understanding, scene description, visual QA',
        latency: '~500ms',
        active: true,
        ollamaModel: 'llava:7b',
      },
      'llama3.2:1b': {
        id: 'llama3.2:1b',
        name: 'Llama',
        size: '1.3GB',
        type: 'local',
        strengths: ['speed', 'quick-checks', 'simple-tasks', 'ambient-chatter'],
        weaknesses: ['complex-reasoning', 'long-context', 'creative-writing', 'code'],
        personality: 'Fast. Lightweight. Gets it done before others finish thinking.',
        best_for: 'Quick NPC reactions, ambient chatter, simple checks, go/no-go decisions',
        latency: '~100ms',
        active: true,
        ollamaModel: 'llama3.2:1b',
      },
      'qwen2.5:0.5b': {
        id: 'qwen2.5:0.5b',
        name: 'Tiny',
        size: '397MB',
        type: 'local',
        strengths: ['speed', 'simple-classification', 'routing-decisions', 'keyword-extraction'],
        weaknesses: ['everything-complex', 'reasoning', 'creative', 'long-context', 'code'],
        personality: 'Tiny. Snappy. Knows its limits — and that knowledge is its power.',
        best_for: 'Simple classification, keyword extraction, routing decisions, yes/no checks',
        latency: '~50ms',
        active: true,
        ollamaModel: 'qwen2.5:0.5b',
      },

      // ═══ CLOUD MODELS — Always available, bigger guns ═══
      'glm-5.2': {
        id: 'glm-5.2',
        name: 'GLM',
        size: 'cloud',
        type: 'cloud',
        strengths: ['creative-writing', 'reasoning', 'code-generation', 'dialogue', 'long-context', 'engineering'],
        weaknesses: ['vision', 'local-latency'],
        personality: 'The workhorse. Unlimited capacity. Versatile and reliable.',
        best_for: 'Bulk creative, engineering, coordination, anything local models cannot handle',
        latency: '~300ms (network)',
        active: true,
        provider: 'zai',
      },
      'deepseek-chat': {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        size: 'cloud',
        type: 'cloud',
        strengths: ['creative-writing', 'iterative-banter', 'dialogue', 'character-voice', 'room-reading'],
        weaknesses: ['vision', 'local-latency'],
        personality: 'Creative. Cheap. Hammer extensively. Reads the room and plays off others.',
        best_for: 'Creative writing, character voice, iterative banter, bulk text generation',
        latency: '~400ms (network)',
        active: true,
        provider: 'deepseek',
      },
      'deepseek-reasoner': {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        size: 'cloud',
        type: 'cloud',
        strengths: ['deep-reasoning', 'architecture', 'sensor-fusion', 'complex-math', 'integration-design', 'planning'],
        weaknesses: ['vision', 'speed', 'cost'],
        personality: 'Thinks deeply. Sees the whole architecture. Patient with complexity.',
        best_for: 'Deep reasoning, architectural decisions, sensor fusion, complex integration',
        latency: '~800ms (network)',
        active: true,
        provider: 'deepseek',
      },
      'seed-2.0-pro': {
        id: 'seed-2.0-pro',
        name: 'Seed',
        size: 'cloud',
        type: 'cloud',
        strengths: ['philosophy', 'deep-reasoning', 'build-decomposition', 'spatial-reasoning'],
        weaknesses: ['speed', 'cost'],
        personality: 'The philosopher. Decomposes the complex into the buildable.',
        best_for: 'Philosophical reasoning, build decomposition, spatial planning',
        latency: '~600ms (network)',
        active: true,
        provider: 'deepinfra',
      },
      'hermes-3-405b': {
        id: 'hermes-3-405b',
        name: 'Hermes',
        size: 'cloud',
        type: 'cloud',
        strengths: ['voice', 'character', 'personality', 'creative-writing', 'lore', 'character-wrapping'],
        weaknesses: ['speed', 'cost'],
        personality: 'The voice. Wraps raw content in character. Makes it speak.',
        best_for: 'Character voice, personality wrapping, lore, making content feel alive',
        latency: '~700ms (network)',
        active: true,
        provider: 'deepinfra',
      },
    };

    /**
     * Get a model profile by ID.
     */
    function get(modelId) {
      return models[modelId] || null;
    }

    /**
     * Get all model profiles.
     */
    function all() {
      return Object.values(models);
    }

    /**
     * Get all local models.
     */
    function local() {
      return Object.values(models).filter(m => m.type === 'local');
    }

    /**
     * Get all cloud models.
     */
    function cloud() {
      return Object.values(models).filter(m => m.type === 'cloud');
    }

    /**
     * Find the best model(s) for a given capability.
     * Returns array sorted by best fit.
     */
    function bestFor(capability, opts = {}) {
      const candidates = all()
        .filter(m => m.strengths.includes(capability))
        .map(m => ({
          ...m,
          matchScore: _scoreMatch(m, capability, opts),
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

      return candidates;
    }

    /**
     * Find the single best model for a capability.
     */
    function bestOneFor(capability, opts = {}) {
      const candidates = bestFor(capability, opts);
      return candidates[0] || null;
    }

    /**
     * Get models that have a specific strength.
     */
    function withStrength(strength) {
      return Object.values(models).filter(m => m.strengths.includes(strength));
    }

    /**
     * Score how well a model matches a capability, factoring in
     * whether it's loaded, latency, and preference.
     */
    function _scoreMatch(model, capability, opts) {
      let score = 10; // base for having the strength

      // Prefer local if specified
      if (opts.preferLocal && model.type === 'local') score += 5;
      if (opts.preferCloud && model.type === 'cloud') score += 3;

      // Prefer smaller for simple tasks
      if (opts.preferFast) {
        if (model.id === 'qwen2.5:0.5b') score += 5;
        if (model.id === 'llama3.2:1b') score += 4;
        if (model.id === 'granite3.1-dense:2b') score += 2;
      }

      // Penalize weaknesses that matter
      if (opts.avoidWeaknesses) {
        for (const weak of opts.avoidWeaknesses) {
          if (model.weaknesses.includes(weak)) score -= 3;
        }
      }

      return score;
    }

    return { get, all, local, cloud, bestFor, bestOneFor, withStrength, models };
  })();

  // ════════════════════════════════════════════════════════════
  // 2. BATON PASS — The handoff mechanism
  // ════════════════════════════════════════════════════════════

  const BatonPass = (function () {
    let batonCounter = 0;
    const chain = []; // full history of all batons in a task

    /**
     * Create a baton for handoff.
     *
     * @param {object} opts
     * @param {string} opts.from - Model ID passing the baton
     * @param {string} opts.to - Model ID receiving the baton
     * @param {string} opts.reason - Why the handoff
     * @param {string} opts.context - What's been established
     * @param {string} opts.work_done - What the sender accomplished
     * @param {string} opts.handoff_to - What the receiver should do
     * @param {string} opts.task_id - Task this baton belongs to
     * @returns {object} The baton object
     */
    function create(opts) {
      batonCounter++;
      const baton = {
        baton_id: `baton-${String(batonCounter).padStart(3, '0')}`,
        task_id: opts.task_id || `task-${Date.now()}`,
        from: opts.from,
        to: opts.to,
        reason: opts.reason,
        context: opts.context || '',
        work_done: opts.work_done || '',
        handoff_to: opts.handoff_to || '',
        timestamp: new Date().toISOString(),
        status: 'created', // created → accepted → completed → (passed)
      };
      chain.push(baton);
      return baton;
    }

    /**
     * Accept a baton. The receiving model acknowledges.
     */
    function accept(baton) {
      baton.status = 'accepted';
      baton.acceptedAt = new Date().toISOString();
      _log(`▶ ${baton.to} accepted baton from ${baton.from}`, baton);
      return baton;
    }

    /**
     * Complete a baton. The receiving model finished the work.
     */
    function complete(baton, result) {
      baton.status = 'completed';
      baton.completedAt = new Date().toISOString();
      baton.result = result;
      _log(`✓ ${baton.to} completed baton ${baton.baton_id}`, baton);
      return baton;
    }

    /**
     * Pass again — the receiver becomes the sender for a new baton.
     */
    function passAgain(baton, opts) {
      baton.status = 'passed';
      baton.passedAt = new Date().toISOString();
      return create({
        task_id: baton.task_id,
        from: baton.to,
        to: opts.to,
        reason: opts.reason,
        context: opts.context || baton.context,
        work_done: opts.work_done || baton.work_done,
        handoff_to: opts.handoff_to,
      });
    }

    /**
     * Get the full chain for a task.
     */
    function getChain(taskId) {
      return chain.filter(b => b.task_id === taskId);
    }

    /**
     * Get all batons.
     */
    function getAll() {
      return [...chain];
    }

    /**
     * Reset the chain (for new tasks).
     */
    function reset() {
      chain.length = 0;
      batonCounter = 0;
    }

    function _log(msg, baton) {
      const fromName = ModelRegistry.get(baton.from)?.name || baton.from;
      const toName = ModelRegistry.get(baton.to)?.name || baton.to;
      console.log(`%c[Baton] ${fromName} → ${toName}: ${baton.reason}`, 'color: #5da89a');
    }

    return { create, accept, complete, passAgain, getChain, getAll, reset, chain };
  })();

  // ════════════════════════════════════════════════════════════
  // 3. SELF-SELECTOR — Models assess their own fit
  // ════════════════════════════════════════════════════════════

  const SelfSelector = (function () {
    /**
     * Ask a model if it's the best fit for a task.
     * The model sees the task and the registry of available models.
     *
     * @param {string} modelId - The model to ask
     * @param {string} task - The task description
     * @param {object} opts - { availableModels, context }
     * @returns {object} { shouldHandle, confidence, recommendModel, reasoning }
     */
    async function assess(modelId, task, opts = {}) {
      const model = ModelRegistry.get(modelId);
      if (!model) {
        return { shouldHandle: false, confidence: 0, recommendModel: null, reasoning: 'Unknown model' };
      }

      // Build the self-assessment prompt
      const availableModels = (opts.availableModels || ModelRegistry.all())
        .map(m => `- ${m.id} (${m.name}): strengths=[${m.strengths.join(', ')}], weaknesses=[${m.weaknesses.join(', ')}]`)
        .join('\n');

      const prompt = `You are ${model.name} (${modelId}), an AI model in a relay-of-experts system.

YOUR PROFILE:
- Strengths: ${model.strengths.join(', ')}
- Weaknesses: ${model.weaknesses.join(', ')}
- Best for: ${model.best_for}

AVAILABLE MODELS IN THE ROOM:
${availableModels}

TASK: ${task}
${opts.context ? `\nCONTEXT:\n${opts.context}` : ''}

QUESTION: Are you the best model for this task? Answer honestly.

If you ARE the best, respond:
HANDLER
Confidence: [0-100]%
Why: [brief reason]

If you are NOT the best, respond:
PASS
Recommend: [model id]
Why: [why they're better]
Your limitation: [what you can't do well enough]`;

      const result = await _queryModel(modelId, prompt, { temperature: 0.2, maxTokens: 200 });

      return _parseAssessment(result, modelId);
    }

    /**
     * Parse the model's self-assessment response.
     */
    function _parseAssessment(result, modelId) {
      const text = (result?.text || '').trim();

      if (/^HANDLER/m.test(text) || /^I AM/m.test(text)) {
        const confidenceMatch = text.match(/(\d+)\s*%/);
        const whyMatch = text.match(/(?:Why|why)[:\s]+(.+)/);
        return {
          shouldHandle: true,
          confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 70,
          recommendModel: modelId,
          reasoning: whyMatch ? whyMatch[1] : 'Model self-selected',
          rawResponse: text,
        };
      }

      if (/^PASS/m.test(text) || /not the best|better suited|recommend/i.test(text)) {
        const recommendMatch = text.match(/(?:Recommend|recommend)[:\s]+([^\s\n]+)/);
        const whyMatch = text.match(/(?:Why|why)[:\s]+(.+)/);
        const limitMatch = text.match(/(?:limitation|can't|cannot)[:\s]+(.+)/i);
        return {
          shouldHandle: false,
          confidence: 0,
          recommendModel: recommendMatch ? recommendMatch[1].replace(/[`"',.]/g, '') : null,
          reasoning: whyMatch ? whyMatch[1] : 'Model chose to pass',
          limitation: limitMatch ? limitMatch[1] : '',
          rawResponse: text,
        };
      }

      // Ambiguous — default to handling with low confidence
      return {
        shouldHandle: true,
        confidence: 40,
        recommendModel: modelId,
        reasoning: 'Ambiguous response — defaulting to handle with low confidence',
        rawResponse: text,
      };
    }

    return { assess };
  })();

  // ════════════════════════════════════════════════════════════
  // 4. MULTI-MODEL CHAT — Small models converse
  // ════════════════════════════════════════════════════════════

  const MultiModelChat = (function () {
    /**
     * Run a multi-model conversation on a topic.
     * Each model sees the previous models' responses and builds on them.
     *
     * @param {object} opts
     * @param {string[]} opts.participants - Model IDs in conversation order
     * @param {string} opts.topic - What to discuss
     * @param {number} opts.rounds - How many rounds (each participant speaks per round)
     * @param {string} opts.moderator - Model ID of moderator (optional)
     * @returns {object} { transcript, insights, rounds }
     */
    async function converse(opts) {
      const { participants, topic, rounds = 2, moderator } = opts;

      const transcript = [];
      const allMessages = [];

      _log(`Multi-model chat: ${participants.join(', ')} on "${topic.substring(0, 60)}..."`);

      // Build shared context as conversation progresses
      let sharedContext = `TOPIC: ${topic}\n\nThis is a relay-of-experts multi-model discussion. Each participant builds on what came before. Disagree if you see a flaw. Add what others missed.`;

      for (let round = 1; round <= rounds; round++) {
        _log(`  Round ${round}/${rounds}`);

        for (const modelId of participants) {
          const model = ModelRegistry.get(modelId);
          if (!model) continue;

          const prompt = `You are ${model.name} (${modelId}) in a multi-model discussion.

${sharedContext}

YOUR TURN: Contribute your unique perspective. Be concise (3-5 sentences). Focus on what YOUR strengths bring that others might miss. If you disagree with something said, say so. If you can build on a previous point, do so.`;

          const result = await _queryModel(modelId, prompt, {
            temperature: 0.7,
            maxTokens: 300,
          });

          const message = {
            round,
            modelId,
            modelName: model.name,
            text: result.text,
            timestamp: new Date().toISOString(),
            duration: result.duration || 0,
          };

          transcript.push(message);
          allMessages.push(`${model.name}: ${result.text}`);
          sharedContext += `\n\n--- ${model.name} (${model.name}) ---\n${result.text}`;

          _log(`    ${model.name}: "${result.text.substring(0, 80)}..."`);
        }
      }

      // Optional moderator synthesis
      let insights = null;
      if (moderator) {
        const modModel = ModelRegistry.get(moderator);
        if (modModel) {
          const synthPrompt = `You are ${modModel.name}, the moderator of this discussion.

${sharedContext}

Synthesize the key insights from this discussion. What did the participants collectively discover that none could have alone? What are the actionable conclusions?`;

          const synthResult = await _queryModel(moderator, synthPrompt, {
            temperature: 0.4,
            maxTokens: 400,
          });

          insights = {
            modelId: moderator,
            modelName: modModel.name,
            text: synthResult.text,
            timestamp: new Date().toISOString(),
          };
        }
      }

      return { transcript, insights, rounds, participants, topic };
    }

    function _log(msg) {
      console.log(`%c[MultiChat] ${msg}`, 'color: #c8a050');
    }

    return { converse };
  })();

  // ════════════════════════════════════════════════════════════
  // 5. ROOM OF MINDS — Live status of who's active
  // ════════════════════════════════════════════════════════════

  const RoomOfMinds = (function () {
    let status = {}; // modelId → { state, task, since }
    let listeners = [];

    // State constants
    const STATES = {
      WORKING: 'working',   // green — actively processing
      IDLE: 'idle',         // yellow — loaded, available
      UNLOADED: 'unloaded', // gray — not loaded, needs pull
      CLOUD: 'cloud',       // blue — cloud model, always available
    };

    /**
     * Initialize by checking what's actually loaded.
     */
    async function init() {
      const localModels = ModelRegistry.local();

      // Check Ollama for loaded models
      const loaded = await _getLoadedModels();

      for (const model of localModels) {
        if (loaded.includes(model.ollamaModel || model.id)) {
          _setState(model.id, STATES.IDLE);
        } else {
          _setState(model.id, STATES.UNLOADED);
        }
      }

      for (const model of ModelRegistry.cloud()) {
        _setState(model.id, STATES.CLOUD);
      }

      _notify();
      return getStatus();
    }

    /**
     * Mark a model as actively working.
     */
    function markWorking(modelId, task) {
      _setState(modelId, STATES.WORKING, { task });
    }

    /**
     * Mark a model as idle (done working, still available).
     */
    function markIdle(modelId) {
      _setState(modelId, STATES.IDLE);
    }

    /**
     * Get full status snapshot.
     */
    function getStatus() {
      return ModelRegistry.all().map(model => ({
        id: model.id,
        name: model.name,
        type: model.type,
        strengths: model.strengths,
        state: status[model.id]?.state || (model.type === 'cloud' ? STATES.CLOUD : STATES.UNLOADED),
        currentTask: status[model.id]?.task || null,
        since: status[model.id]?.since || null,
        color: _stateColor(status[model.id]?.state || STATES.UNLOADED),
      }));
    }

    /**
     * Get models in a specific state.
     */
    function getByState(state) {
      return getStatus().filter(s => s.state === state);
    }

    /**
     * Get the best available model for a capability.
     * Prefers idle local models, then cloud.
     */
    function bestAvailable(capability) {
      const idle = getByState(STATES.IDLE);
      const cloud = getByState(STATES.CLOUD);
      const working = getByState(STATES.WORKING);

      // Idle local models with the capability
      const idleWithCap = idle.filter(m => m.strengths.includes(capability));
      if (idleWithCap.length > 0) return idleWithCap[0];

      // Cloud models with the capability (always available)
      const cloudWithCap = cloud.filter(m => m.strengths.includes(capability));
      if (cloudWithCap.length > 0) return cloudWithCap[0];

      // Working models with the capability (can queue)
      const workingWithCap = working.filter(m => m.strengths.includes(capability));
      if (workingWithCap.length > 0) return workingWithCap[0];

      return null;
    }

    /**
     * Subscribe to status changes.
     */
    function subscribe(fn) {
      listeners.push(fn);
      return () => { listeners = listeners.filter(f => f !== fn); };
    }

    /**
     * Render a text-based status board.
     */
    function renderText() {
      const lines = ['╔═══ ROOM OF MINDS ═══╗'];
      const st = getStatus();

      for (const s of st) {
        const color = s.color;
        const task = s.currentTask ? ` → ${s.currentTask.substring(0, 40)}` : '';
        lines.push(`║ ${color} ${s.name.padEnd(16)} ${s.strengths.slice(0, 2).join('+').padEnd(20)}${task}`);
      }

      lines.push('╚══════════════════════╝');
      return lines.join('\n');
    }

    // ── Internal ──

    function _setState(modelId, state, extra = {}) {
      status[modelId] = { state, since: Date.now(), ...extra };
      _notify();
    }

    function _stateColor(state) {
      switch (state) {
        case STATES.WORKING: return '🟢';
        case STATES.IDLE: return '🟡';
        case STATES.UNLOADED: return '⚪';
        case STATES.CLOUD: return '🔵';
        default: return '❓';
      }
    }

    function _notify() {
      for (const fn of listeners) {
        try { fn(getStatus()); } catch (e) { /* ignore */ }
      }
    }

    async function _getLoadedModels() {
      try {
        const bridge = _getBridge();
        if (bridge) {
          const models = await bridge.listModels();
          return models.map(m => m.name);
        }
      } catch (e) { /* ignore */ }

      // Fallback: try direct fetch
      if (typeof fetch !== 'undefined') {
        try {
          const resp = await fetch('http://localhost:11434/api/tags');
          const data = await resp.json();
          return (data.models || []).map(m => m.name);
        } catch (e) { /* ignore */ }
      }

      return [];
    }

    return {
      init,
      markWorking,
      markIdle,
      getStatus,
      getByState,
      bestAvailable,
      subscribe,
      renderText,
      STATES,
    };
  })();

  // ════════════════════════════════════════════════════════════
  // 6. RELAY ORCHESTRATOR — Coordinates the full relay chain
  // ════════════════════════════════════════════════════════════

  const RelayOrchestrator = (function () {
    const MAX_PASSES = 5; // prevent infinite relays
    let activeTask = null;

    /**
     * Execute a task through the relay system.
     *
     * Starts with the initial model. That model self-assesses.
     * If it passes, the baton goes to the recommended model.
     * The chain continues until a model completes or MAX_PASSES.
     *
     * @param {string} task - Task description
     * @param {object} opts
     * @param {string} opts.startWith - Model ID to start with (default: auto-select)
     * @param {string} opts.context - Additional context
     * @returns {object} { result, chain, passes, summary }
     */
    async function execute(task, opts = {}) {
      const taskId = `task-${Date.now()}`;
      BatonPass.reset();

      // Determine starting model
      let currentModel = opts.startWith || _autoSelect(task);
      const context = opts.context || '';
      let accumulatedWork = '';
      let passes = 0;

      _log(`Task: "${task.substring(0, 80)}..."`);
      _log(`Starting with: ${ModelRegistry.get(currentModel)?.name || currentModel}`);

      const log = [];

      while (passes < MAX_PASSES) {
        passes++;
        const model = ModelRegistry.get(currentModel);

        if (!model) {
          _log(`Unknown model: ${currentModel} — aborting`);
          break;
        }

        RoomOfMinds.markWorking(currentModel, task);

        // ── SELF-ASSESSMENT ──
        _log(`Asking ${model.name} to self-assess...`);

        const assessment = await SelfSelector.assess(currentModel, task, {
          context: accumulatedWork || context,
        });

        log.push({
          pass: passes,
          modelId: currentModel,
          modelName: model.name,
          assessment,
        });

        _log(`  ${model.name}: ${assessment.shouldHandle ? `HANDLER (${assessment.confidence}%)` : `PASS → ${assessment.recommendModel}`}`);

        // ── IF PASS: hand off the baton ──
        if (!assessment.shouldHandle && assessment.recommendModel) {
          // Validate recommended model exists
          const recommended = ModelRegistry.get(assessment.recommendModel);
          if (!recommended) {
            // Try fuzzy match
            const fuzzy = _fuzzyMatchModel(assessment.recommendModel);
            if (fuzzy) {
              assessment.recommendModel = fuzzy;
            } else {
              _log(`Recommended model "${assessment.recommendModel}" not found — ${model.name} handles it`);
              break;
            }
          }

          const baton = BatonPass.create({
            task_id: taskId,
            from: currentModel,
            to: assessment.recommendModel,
            reason: assessment.reasoning,
            context: accumulatedWork || context,
            work_done: accumulatedWork,
            handoff_to: task,
          });

          RoomOfMinds.markIdle(currentModel);
          BatonPass.accept(baton);

          currentModel = assessment.recommendModel;
          continue;
        }

        // ── IF HANDLER: do the work ──
        _log(`${model.name} is handling. Working...`);

        const workPrompt = `${context ? context + '\n\n' : ''}${accumulatedWork ? 'Previous work:\n' + accumulatedWork + '\n\n' : ''}TASK: ${task}

Complete this task thoroughly. Use your strengths: ${model.strengths.join(', ')}.`;

        const workResult = await _queryModel(currentModel, workPrompt, {
          temperature: 0.7,
          maxTokens: 800,
          system: `You are ${model.name}. ${model.personality} Stay in character. You are part of a relay-of-experts system. Your work may be passed to another model for refinement, so be clear about what you've done and what might need further attention.`,
        });

        accumulatedWork += `\n\n--- ${model.name} (${currentModel}) ---\n${workResult.text}`;

        // Check if the model wants to pass a specific subtask
        const subPass = _detectSubPass(workResult.text);
        if (subPass) {
          _log(`${model.name} identified subtask for ${subPass.to}`);

          const subBaton = BatonPass.create({
            task_id: taskId,
            from: currentModel,
            to: subPass.to,
            reason: subPass.reason,
            context: accumulatedWork,
            work_done: workResult.text,
            handoff_to: subPass.task,
          });

          RoomOfMinds.markIdle(currentModel);
          BatonPass.accept(subBaton);

          // Execute the subtask
          currentModel = subPass.to;
          task = subPass.task;
          continue;
        }

        // ── COMPLETE ──
        RoomOfMinds.markIdle(currentModel);

        const finalBaton = BatonPass.create({
          task_id: taskId,
          from: currentModel,
          to: currentModel, // self-completion
          reason: 'Task completed',
          context,
          work_done: workResult.text,
          handoff_to: 'none',
        });
        BatonPass.complete(finalBaton, workResult.text);

        const chain = BatonPass.getChain(taskId);

        _log('Relay complete!');
        _log(`Chain: ${chain.map(b => ModelRegistry.get(b.from)?.name || b.from).join(' → ')}`);

        return {
          result: workResult.text,
          chain,
          passes,
          log,
          summary: _summarizeChain(chain),
        };
      }

      // ── MAX PASSES EXCEEDED ──
      _log(`Max passes (${MAX_PASSES}) reached — returning accumulated work`);

      return {
        result: accumulatedWork || 'Task could not be completed within relay limits.',
        chain: BatonPass.getChain(taskId),
        passes,
        log,
        summary: 'Relay hit max passes. Partial work accumulated.',
        maxPassesHit: true,
      };
    }

    /**
     * Auto-select a starting model based on task keywords.
     */
    function _autoSelect(task) {
      const lower = task.toLowerCase();

      // Keyword routing
      if (/see|camera|vision|image|look|visual/.test(lower)) return 'llava:7b';
      if (/safe|check|verify|journal|dialogue/.test(lower)) return 'granite3.1-dense:2b';
      if (/marine|bio|organism|detailed|curious/.test(lower)) return 'phi3:3.8b';
      if (/quick|fast|simple|yes|no|check/.test(lower)) return 'llama3.2:1b';
      if (/reason|architect|design|integrat|fus/.test(lower)) return 'deepseek-reasoner';
      if (/creative|write|story|character|voice/.test(lower)) return 'deepseek-chat';
      if (/philosop|deep|meaning|reflect/.test(lower)) return 'seed-2.0-pro';

      // Default: Wesley — he's steady and will pass if needed
      return 'granite3.1-dense:2b';
    }

    /**
     * Detect if a model's output contains a subtask pass request.
     * Models can include a special marker to trigger a relay.
     */
    function _detectSubPass(text) {
      // Look for [RELAY: modelId] reason: ... task: ...
      const relayMatch = text.match(/\[RELAY:\s*([^\]]+)\]\s*(?:reason:\s*([^\]]+?))?\s*(?:task:\s*([^\]]+))?\s*\[\/RELAY\]/i);
      if (relayMatch) {
        const modelId = _fuzzyMatchModel(relayMatch[1].trim());
        if (modelId) {
          return {
            to: modelId,
            reason: relayMatch[2]?.trim() || 'Subtask relay requested',
            task: relayMatch[3]?.trim() || 'Continue the task',
          };
        }
      }

      // Also check for natural language relay intent
      if (/pass(?:ing)? (?:this |the )?(?:baton|task|work) (?:to|over to)/i.test(text)) {
        const modelMatch = text.match(/(?:to|over to)\s+(?:deepseek-reasoner|deepseek-chat|seed-2\.0-pro|hermes-3-405b|glm-5\.2|llava|phi3|granite|qwen|llama)/i);
        if (modelMatch) {
          const fuzzyId = _fuzzyMatchModel(modelMatch[0].replace(/^(?:to|over to)\s+/i, ''));
          if (fuzzyId) {
            return {
              to: fuzzyId,
              reason: 'Natural language relay detected in output',
              task: 'Continue and refine the work',
            };
          }
        }
      }

      return null;
    }

    /**
     * Fuzzy match a model name to a registry ID.
     */
    function _fuzzyMatchModel(name) {
      const lower = name.toLowerCase().trim();

      // Direct match
      if (ModelRegistry.get(lower)) return lower;

      // Check each model for partial matches
      for (const model of ModelRegistry.all()) {
        if (lower.includes(model.id.toLowerCase()) || model.id.toLowerCase().includes(lower)) {
          return model.id;
        }
        if (lower.includes(model.name.toLowerCase()) || model.name.toLowerCase().includes(lower)) {
          return model.id;
        }
      }

      // Keyword shortcuts
      const shortcuts = {
        'wesley': 'granite3.1-dense:2b',
        'john': 'phi3:3.8b',
        'anderson': 'phi3:3.8b',
        'qwen': 'qwen2.5:3b',
        'llava': 'llava:7b',
        'vision': 'llava:7b',
        'llama': 'llama3.2:1b',
        'tiny': 'qwen2.5:0.5b',
        'glm': 'glm-5.2',
        'deepseek': 'deepseek-reasoner',
        'reasoner': 'deepseek-reasoner',
        'chat': 'deepseek-chat',
        'seed': 'seed-2.0-pro',
        'hermes': 'hermes-3-405b',
      };

      for (const [keyword, id] of Object.entries(shortcuts)) {
        if (lower.includes(keyword)) return id;
      }

      return null;
    }

    /**
     * Create a human-readable summary of the baton chain.
     */
    function _summarizeChain(chain) {
      if (!chain || chain.length === 0) return 'No baton passes recorded.';

      const steps = chain.map(b => {
        const fromName = ModelRegistry.get(b.from)?.name || b.from;
        const toName = ModelRegistry.get(b.to)?.name || b.to;

        if (b.from === b.to) {
          return `${fromName} completed the task`;
        }
        return `${fromName} → ${toName}: ${b.reason}`;
      });

      return steps.join('\n');
    }

    function _log(msg) {
      console.log(`%c[Relay] ${msg}`, 'color: #9a7ada; font-weight: bold;');
    }

    return { execute, MAX_PASSES };
  })();

  // ════════════════════════════════════════════════════════════
  // SHARED: Query a model (local or cloud)
  // ════════════════════════════════════════════════════════════

  async function _queryModel(modelId, prompt, options = {}) {
    const model = ModelRegistry.get(modelId);
    if (!model) {
      return { text: `[Unknown model: ${modelId}]`, duration: 0 };
    }

    if (model.type === 'local') {
      const bridge = _getBridge();
      if (bridge) {
        return await bridge.generate(model.ollamaModel || modelId, prompt, options);
      }

      // Direct fetch fallback
      if (typeof fetch !== 'undefined') {
        try {
          const resp = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model.ollamaModel || modelId,
              prompt,
              stream: false,
              options: {
                temperature: options.temperature ?? 0.7,
                num_predict: options.maxTokens ?? 500,
              },
            }),
          });
          const data = await resp.json();
          return { text: data.response, model: modelId, duration: 0, tokens: data.eval_count };
        } catch (e) {
          return { text: `[Local model ${modelId} unavailable: ${e.message}]`, duration: 0 };
        }
      }
    }

    if (model.type === 'cloud') {
      // Cloud models — in browser prototype, we return a structured placeholder.
      // In production, this would call the actual cloud API.
      return {
        text: `[Cloud model ${model.name} (${modelId}) — in production this calls ${model.provider} API. In local testing, models self-assess using their registry profiles and the relay logic determines routing. Prompt: "${prompt.substring(0, 60)}..."]`,
        model: modelId,
        type: 'cloud',
        duration: 0,
      };
    }

    return { text: `[Cannot reach ${modelId}]`, duration: 0 };
  }

  function _getBridge() {
    if (typeof window !== 'undefined') return window.OllamaBridge || null;
    try {
      return require('./ollama-bridge.js');
    } catch (e) {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  /**
   * Initialize the relay system.
   */
  async function init() {
    await RoomOfMinds.init();
    console.log('%c╔═══ RELAY OF EXPERTS ═══╗', 'color: #e8b840; font-weight: bold;');
    console.log('%c║ Minds in the room, ready to relay ║', 'color: #c8a050;');
    RoomOfMinds.getStatus().forEach(m => {
      const color = m.state === 'working' ? 'color:#5da89a' :
                    m.state === 'idle' ? 'color:#c8a050' :
                    m.state === 'cloud' ? 'color:#9a7ada' : 'color:#4a3a20';
      console.log(`%c║ ${m.name.padEnd(16)} ${m.strengths.slice(0,3).join(', ').padEnd(30)}`, color);
    });
    console.log('%c╚══════════════════════════╝', 'color: #e8b840;');
  }

  return {
    init,
    // Core components
    ModelRegistry,
    BatonPass,
    SelfSelector,
    MultiModelChat,
    RoomOfMinds,
    RelayOrchestrator,
    // Convenience
    execute: RelayOrchestrator.execute,
    converse: MultiModelChat.converse,
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RelayExperts;
}
if (typeof window !== 'undefined') {
  window.RelayExperts = RelayExperts;
}
