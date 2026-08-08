// ════════════════════════════════════════════════════════════
// ASSET RENDERER — Queue-based image generation backend
// ════════════════════════════════════════════════════════════
// Uses DeepInfra FLUX for image generation
// Queue system prevents blocking
// Cache system avoids regeneration
// ════════════════════════════════════════════════════════════

const AssetRenderer = (function() {

  // ── Config ──
  const DEEPINFRA_API = 'https://api.deepinfra.com/v1/openai/images/generations';
  // Read key from env or use empty (will fail gracefully)
  const API_KEY = (typeof DEEPINFRA_KEY !== 'undefined' && DEEPINFRA_KEY) ||
                  (typeof process !== 'undefined' && process.env?.DEEPINFRA_KEY) ||
                  '';

  const MODEL = 'black-forest-labs/FLUX-2-max';

  // ── Queue ──
  const queue = [];
  let processing = false;
  const MAX_CONCURRENT = 2;
  let activeRequests = 0;

  // ── Cache ──
  const cache = new Map();
  const MAX_CACHE = 50;

  // ── Callbacks ──
  let onLog = null;
  let onAssetReady = null;
  let onQueueUpdate = null;

  // ── Stats ──
  const stats = {
    total: 0,
    completed: 0,
    failed: 0,
    cached: 0,
    avgTime: 0
  };

  function init(config = {}) {
    onLog = config.onLog || (() => {});
    onAssetReady = config.onAssetReady || (() => {});
    onQueueUpdate = config.onQueueUpdate || (() => {});
    log('Asset Renderer initialized', 'system');
  }

  function log(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString();
    onLog({ time: ts, message: msg, type });
  }

  // ── Queue management ──
  function enqueue(request) {
    // request: { id, type, prompt, name, priority, callback }
    const id = request.id || `asset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Check cache
    const cacheKey = generateCacheKey(request);
    if (cache.has(cacheKey)) {
      log(`📦 Cache hit for "${request.name || request.prompt.substring(0, 40)}"`, 'cache');
      stats.cached++;
      const cachedUrl = cache.get(cacheKey);
      if (request.callback) request.callback(cachedUrl);
      if (onAssetReady) onAssetReady({ id, url: cachedUrl, name: request.name, cached: true });
      updateQueue();
      return id;
    }

    const item = {
      id,
      type: request.type || 'generic',
      prompt: request.prompt,
      name: request.name || 'unnamed',
      priority: request.priority || 0,
      callback: request.callback,
      status: 'queued',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null
    };

    queue.push(item);
    queue.sort((a, b) => b.priority - a.priority);

    stats.total++;
    log(`📝 Queued: "${item.name}" (${queue.length} in queue)`, 'queue');
    updateQueue();
    processQueue();

    return id;
  }

  function processQueue() {
    while (activeRequests < MAX_CONCURRENT && queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      activeRequests++;
      item.status = 'processing';
      item.startedAt = Date.now();
      log(`🎨 Rendering: "${item.name}"`, 'processing');
      updateQueue();
      renderAsset(item);
    }
  }

  function renderAsset(item) {
    const startTime = Date.now();

    // If no API key, generate a procedural fallback
    if (!API_KEY) {
      log(`⚠️ No API key — generating procedural fallback for "${item.name}"`, 'warning');
      setTimeout(() => {
        const fallbackUrl = generateProceduralAsset(item);
        completeAsset(item, fallbackUrl, startTime, true);
      }, 500);
      return;
    }

    // Build the enhanced prompt
    const enhancedPrompt = enhancePrompt(item.prompt, item.type);

    const body = {
      model: MODEL,
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    };

    fetch(DEEPINFRA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    })
    .then(res => {
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then(data => {
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('No image in response');
      const url = `data:image/png;base64,${b64}`;
      completeAsset(item, url, startTime, false);
    })
    .catch(err => {
      log(`❌ Failed to render "${item.name}": ${err.message}`, 'error');
      // Generate fallback
      const fallbackUrl = generateProceduralAsset(item);
      completeAsset(item, fallbackUrl, startTime, true);
    });
  }

  function completeAsset(item, url, startTime, isFallback) {
    activeRequests--;
    item.status = 'completed';
    item.completedAt = Date.now();
    const elapsed = item.completedAt - item.startedAt;
    stats.completed++;
    stats.avgTime = (stats.avgTime * (stats.completed - 1) + elapsed) / stats.completed;

    // Cache result
    const cacheKey = generateCacheKey(item);
    if (cache.size >= MAX_CACHE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(cacheKey, url);

    if (isFallback) {
      log(`✅ "${item.name}" ready (procedural fallback, ${elapsed}ms)`, 'complete');
    } else {
      log(`✅ "${item.name}" ready (${elapsed}ms)`, 'complete');
    }

    if (item.callback) item.callback(url);
    if (onAssetReady) onAssetReady({ id: item.id, url, name: item.name, fallback: isFallback });

    updateQueue();
    processQueue();
  }

  // ── Prompt enhancement ──
  function enhancePrompt(prompt, type) {
    const base = prompt;
    const styleSuffix = ', pixel art style, retro point-and-click adventure game, 320x200 resolution aesthetic, dark atmospheric lighting, high detail';
    const typeSuffix = {
      backdrop: ', background scene, wide establishing shot, no characters',
      character: ', character portrait, centered, transparent background',
      prop: ', game item icon, centered, simple background',
      scene: ', environmental scene, atmospheric',
      generic: ''
    };
    return base + (typeSuffix[type] || '') + styleSuffix;
  }

  // ── Procedural fallback assets (canvas-generated) ──
  function generateProceduralAsset(item) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    const seed = (item.prompt + item.name).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = mulberry32(seed);

    // Pick a palette based on keywords
    const p = item.prompt.toLowerCase();
    let palette;
    if (p.includes('forest') || p.includes('tree') || p.includes('green')) {
      palette = ['#0a1a08', '#1a2a14', '#2a3a20', '#0a3010', '#1a4a20'];
    } else if (p.includes('cave') || p.includes('underground') || p.includes('dark')) {
      palette = ['#000410', '#080020', '#100830', '#200840', '#301050'];
    } else if (p.includes('storm') || p.includes('ocean') || p.includes('sea')) {
      palette = ['#020410', '#041020', '#082030', '#0a3040', '#103050'];
    } else if (p.includes('space') || p.includes('star')) {
      palette = ['#000004', '#040008', '#080012', '#0c0020', '#100030'];
    } else if (p.includes('castle') || p.includes('stone') || p.includes('medieval')) {
      palette = ['#0a0604', '#1a1008', '#2a1810', '#3a2018', '#4a2820'];
    } else if (p.includes('island') || p.includes('beach') || p.includes('tropical')) {
      palette = ['#082028', '#0a3028', '#104030', '#205040', '#307050'];
    } else {
      palette = ['#0a0700', '#1a1208', '#2a1e10', '#3a2a18', '#4a3520'];
    }

    // Fill base
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, 320, 200);

    // Generate terrain-like layers
    for (let layer = 1; layer < palette.length; layer++) {
      ctx.fillStyle = palette[layer];
      const baseY = 50 + layer * 25;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= 320; x += 8) {
        const y = baseY + Math.sin(x * 0.02 + layer * 2 + rng() * 5) * (10 + layer * 5);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(320, 200);
      ctx.lineTo(0, 200);
      ctx.closePath();
      ctx.fill();
    }

    // Add some details based on type
    if (p.includes('forest') || p.includes('tree')) {
      // Draw tree silhouettes
      for (let i = 0; i < 12; i++) {
        const tx = rng() * 320;
        const ty = 80 + rng() * 80;
        const th = 30 + rng() * 40;
        ctx.fillStyle = palette[3];
        ctx.fillRect(tx, ty, 4, th);
        // Foliage
        ctx.beginPath();
        ctx.arc(tx + 2, ty - 5, 8 + rng() * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (p.includes('star') || p.includes('space') || p.includes('night')) {
      // Stars
      for (let i = 0; i < 40; i++) {
        const sx = rng() * 320;
        const sy = rng() * 100;
        ctx.fillStyle = '#a0c0d0';
        ctx.fillRect(sx, sy, 1, 1);
      }
    }

    if (p.includes('cave') || p.includes('crystal')) {
      // Crystal formations
      for (let i = 0; i < 6; i++) {
        const cx = 40 + rng() * 240;
        const cy = 120 + rng() * 60;
        const cs = 10 + rng() * 20;
        ctx.fillStyle = `hsl(${180 + rng() * 60}, 50%, ${20 + rng() * 20}%)`;
        ctx.beginPath();
        ctx.moveTo(cx, cy - cs);
        ctx.lineTo(cx - cs/2, cy);
        ctx.lineTo(cx + cs/2, cy);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Add vignette
    const grad = ctx.createRadialGradient(160, 100, 40, 160, 100, 180);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 200);

    return canvas.toDataURL();
  }

  // ── Seeded RNG ──
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = seed;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ── Cache key ──
  function generateCacheKey(item) {
    // Normalize prompt for cache lookup
    return item.type + ':' + item.prompt.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);
  }

  // ── Queue update callback ──
  function updateQueue() {
    if (onQueueUpdate) {
      onQueueUpdate({
        queueLength: queue.length,
        active: activeRequests,
        stats: { ...stats }
      });
    }
  }

  // ── Public API ──
  return {
    init,
    enqueue,
    generate: enqueue, // alias
    cache,
    queue,
    stats,
    clearCache: () => { cache.clear(); log('Cache cleared', 'cache'); },
    getQueueStatus: () => ({ queueLength: queue.length, active: activeRequests, stats: { ...stats } })
  };
})();
