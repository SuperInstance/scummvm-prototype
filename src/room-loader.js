/**
 * room-loader.js — Living World Framework: Room Loader
 * 
 * Reads the room registry (rooms.json) and:
 * - Generates rooms in the ScummVM prototype (canvas + sprites + hotspots)
 * - Generates rooms in the MUD terminal (text description + exits + objects)
 * - Creates exits/warps from connected rooms
 * - Triggers asset generation if background_prompt is provided
 * - Registers the room with The Tap API
 *
 * This EXTENDS the existing room system — it does not replace it.
 * Builtin rooms are loaded as-is; dynamic rooms are injected at runtime.
 *
 * Usage (browser):
 *   <script src="src/room-loader.js"></script>
 *   <script>
 *     LivingWorld.init().then(() => {
 *       console.log('Rooms loaded:', Object.keys(LivingWorld.rooms));
 *     });
 *   </script>
 *
 * Usage (Node.js for testing):
 *   const LivingWorld = require('./room-loader.js');
 *   LivingWorld.initFromFile('./rooms.json');
 */

const LivingWorld = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════

  let registry = null;
  let rooms = {};
  let warpNetwork = [];
  let onLoadCallbacks = [];

  // ════════════════════════════════════════════════════════════
  // REGISTRY LOADING
  // ════════════════════════════════════════════════════════════

  /**
   * Load the room registry from rooms.json (browser fetch)
   */
  async function init() {
    try {
      const resp = await fetch('rooms.json');
      registry = await resp.json();
      _processRegistry();
      _notifyLoaded();
      return rooms;
    } catch (err) {
      console.warn('[LivingWorld] Could not fetch rooms.json, running in passive mode:', err.message);
      return {};
    }
  }

  /**
   * Load from a file path (Node.js / local)
   */
  function initFromFile(filePath) {
    const fs = typeof require !== 'undefined' ? require('fs') : null;
    if (!fs) { console.warn('[LivingWorld] No fs available'); return {}; }
    const data = fs.readFileSync(filePath, 'utf-8');
    registry = JSON.parse(data);
    _processRegistry();
    _notifyLoaded();
    return rooms;
  }

  /**
   * Load from an object (for testing or pre-fetched JSON)
   */
  function initWithObject(obj) {
    registry = obj;
    _processRegistry();
    _notifyLoaded();
    return rooms;
  }

  function _processRegistry() {
    rooms = {};
    warpNetwork = registry.warp_network
      ? [...registry.warp_network.destinations]
      : Object.keys(registry.rooms);

    for (const [id, room] of Object.entries(registry.rooms)) {
      rooms[id] = _normalizeRoom(id, room);
    }

    // Build reverse warp connections
    for (const [id, room] of Object.entries(rooms)) {
      if (room.warps) {
        for (const warpTarget of room.warps) {
          if (rooms[warpTarget] && !rooms[warpTarget].warps.includes(id)) {
            rooms[warpTarget].warps.push(id);
          }
        }
      }
    }

    console.log(`[LivingWorld] Registry loaded: ${Object.keys(rooms).length} rooms, ${warpNetwork.length} warp destinations`);
  }

  function _normalizeRoom(id, raw) {
    return {
      id: raw.id || id,
      name: raw.name || id,
      description: raw.description || '',
      type: raw.type || 'vessel',
      exits: raw.exits || {},
      warps: raw.warps || [],
      npcs: raw.npcs || [],
      objects: raw.objects || [],
      background_prompt: raw.background_prompt || null,
      ambient_audio: raw.ambient_audio || null,
      camera_config: raw.camera_config || null,
      mud_description: raw.mud_description || raw.description || '',
      palette: raw.palette || 'warm',
      created_at: raw.created_at || new Date().toISOString(),
      created_by: raw.created_by || 'unknown',
      builtin: raw.builtin !== false,
      // ScummVM-specific (generated)
      scummHotspots: raw.scummHotspots || _generateHotspots(raw),
      scummPalette: raw.scummPalette || raw.palette || 'warm',
    };
  }

  /**
   * Auto-generate reasonable hotspot defaults for a room
   * if the room doesn't define them explicitly
   */
  function _generateHotspots(room) {
    const hotspots = [];

    // Generate hotspots from objects
    if (room.objects) {
      room.objects.forEach((obj, i) => {
        const cols = 4;
        const col = i % cols;
        const row = Math.floor(i / cols);
        hotspots.push({
          id: `hs-obj-${obj.id}`,
          name: obj.name,
          x: `${15 + col * 20}%`,
          y: `${30 + row * 20}%`,
          w: '15%',
          h: '15%',
        });
      });
    }

    // Generate hotspots from NPCs
    if (room.npcs) {
      room.npcs.forEach((npc, i) => {
        hotspots.push({
          id: `hs-npc-${npc.id}`,
          name: npc.name,
          x: `${50 + i * 15}%`,
          y: '35%',
          w: '12%',
          h: '30%',
        });
      });
    }

    // Generate hotspots from exits
    if (room.exits) {
      let exitIdx = 0;
      for (const [exitId, exit] of Object.entries(room.exits)) {
        const pos = _exitPosition(exitIdx);
        hotspots.push({
          id: exitId,
          name: `the door to ${exit.target.replace(/-/g, ' ')}`,
          x: pos.x,
          y: pos.y,
          w: '12%',
          h: '50%',
        });
        exitIdx++;
      }
    }

    return hotspots;
  }

  function _exitPosition(idx) {
    const positions = [
      { x: '85%', y: '15%' },  // right side
      { x: '3%', y: '15%' },   // left side
      { x: '40%', y: '5%' },   // top center
      { x: '40%', y: '75%' },  // bottom center
    ];
    return positions[idx % positions.length];
  }

  // ════════════════════════════════════════════════════════════
  // SCUMMVM INTEGRATION
  // ════════════════════════════════════════════════════════════

  /**
   * Inject a room into the ScummVM prototype's ROOMS object.
   * Call this after the page loads and ROOMS is defined.
   */
  function injectScummRoom(roomId) {
    if (typeof window === 'undefined' || !window.ROOMS) {
      console.warn('[LivingWorld] window.ROOMS not available. Run after ScummVM loads.');
      return false;
    }

    const room = rooms[roomId];
    if (!room) { console.warn(`[LivingWorld] Room ${roomId} not found`); return false; }

    // Build the ScummVM-compatible room object
    const scummRoom = {
      name: room.name,
      shortName: room.name.split('—')[0].trim().split('·')[0].trim(),
      palette: room.scummPalette,
      hotspots: room.scummHotspots,
      exits: {},
      _livingWorld: true,  // marker for dynamic rooms
    };

    // Map exits to ScummVM format
    for (const [hsId, exit] of Object.entries(room.exits)) {
      scummRoom.exits[hsId] = { target: exit.target, label: exit.label };
    }

    // Register it
    window.ROOMS[roomId] = scummRoom;
    console.log(`[LivingWorld] Injected ScummVM room: ${roomId}`);

    // Add warp hotspot (small icon in corner)
    _addWarpHotspot(roomId);

    // Add NPC sprites if they don't exist yet
    if (room.npcs) {
      room.npcs.forEach(npc => {
        if (!document.getElementById(`npc-${npc.id}`)) {
          _createNpcSprite(npc);
        }
      });
    }

    // Wire up ROOM_NPCS
    if (typeof window.ROOM_NPCS !== 'undefined') {
      window.ROOM_NPCS[roomId] = room.npcs.map(n => `npc-${n.id}`);
    }

    // Wire up ROOM_BG if background image exists
    if (typeof window.ROOM_BG !== 'undefined' && room.background_image) {
      window.ROOM_BG[roomId] = room.background_image;
    }

    // Wire up ROOM_AUDIO
    if (typeof window.ROOM_AUDIO !== 'undefined' && room.ambient_audio) {
      window.ROOM_AUDIO[roomId] = {
        ambient: `assets/audio/${room.ambient_audio}.wav`,
        narration: null,
      };
    }

    // Add exit hotspots to connected rooms (reverse linking)
    for (const [hsId, exit] of Object.entries(room.exits)) {
      _addReturnExit(roomId, exit.target, hsId);
    }

    return true;
  }

  /**
   * Add a return exit from a target room back to the new room
   */
  function _addReturnExit(newRoomId, targetRoomId, sourceExitId) {
    if (!window.ROOMS || !window.ROOMS[targetRoomId]) return;
    const target = window.ROOMS[targetRoomId];

    // Check if a return exit already exists
    const hasReturn = Object.values(target.exits).some(e => e.target === newRoomId);
    if (hasReturn) return;

    // Find a free hotspot position
    const exitCount = Object.keys(target.exits).length;
    const pos = _exitPosition(exitCount);
    const hsId = `hs-warp-to-${newRoomId}`;

    // Add hotspot
    target.hotspots.push({
      id: hsId,
      name: `the door to ${rooms[newRoomId].name.split('—')[0].trim().toLowerCase()}`,
      x: pos.x, y: pos.y, w: '12%', h: '50%',
    });

    // Add exit mapping
    target.exits[hsId] = {
      target: newRoomId,
      label: `◆ ${rooms[newRoomId].name.split('—')[0].trim().toUpperCase()} ◆`,
    };
  }

  /**
   * Create an NPC sprite element dynamically
   */
  function _createNpcSprite(npc) {
    if (typeof document === 'undefined') return;
    const img = document.createElement('img');
    img.id = `npc-${npc.id}`;
    img.className = 'npc-sprite';
    img.src = `assets/npcs/${npc.id}.png`;
    img.alt = npc.name;
    img.style.cssText = `left: ${50 + Math.random() * 15}%; top: ${30 + Math.random() * 10}%; width: 12%;`;
    img.onerror = function () { this.style.display = 'none'; };

    const container = document.getElementById('game-container');
    if (container) container.appendChild(img);
  }

  /**
   * Add a warp hotspot to a room (small icon in the top-right corner)
   */
  function _addWarpHotspot(roomId) {
    // Warp is handled globally via the warp selector UI
    // This is a visual marker only
  }

  /**
   * Inject ALL rooms from the registry into ScummVM
   */
  function injectAllScummRooms() {
    if (typeof window === 'undefined' || !window.ROOMS) {
      console.warn('[LivingWorld] window.ROOMS not available');
      return;
    }
    for (const roomId of Object.keys(rooms)) {
      if (!rooms[roomId].builtin) {
        injectScummRoom(roomId);
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // MUD TERMINAL INTEGRATION
  // ════════════════════════════════════════════════════════════

  /**
   * Generate a MUD-compatible room definition from the registry
   */
  function getMudRoom(roomId) {
    const room = rooms[roomId];
    if (!room) return null;

    // Build exits in MUD format (directional keywords)
    const mudExits = {};
    const exitMap = {
      'hs-door-aft': 'aft',
      'hs-door-bar': 'bar',
      'hs-door-radio': 'radio',
      'hs-door-wheelhouse': 'wheelhouse',
      'hs-ladder': 'up',
      'hs-ladder-wheelhouse': 'up',
      'hs-hatch': 'down',
      'hs-hatch-cockpit': 'forward',
      'hs-hatch-engine': 'engine',
      'hs-door-engine': 'engine',
      'hs-door-galley': 'galley',
      'hs-door-aft-galley': 'aft',
      'hs-door-aft-wh': 'aft',
      'hs-hatch-down': 'down',
    };

    for (const [hsId, exit] of Object.entries(room.exits)) {
      const dir = exitMap[hsId] || exit.target;
      mudExits[dir] = { target: exit.target, label: rooms[exit.target]?.name || exit.target };
    }

    // Build objects in MUD format
    const mudObjects = room.objects.map(obj => ({
      id: obj.id,
      name: obj.name,
      desc: `${obj.name}.`,
      takeable: obj.interactions?.includes('take') || false,
      isNpc: false,
    }));

    // Add NPCs as objects
    room.npcs.forEach(npc => {
      mudObjects.push({
        id: npc.id,
        name: npc.name,
        desc: `${npc.name}. ${npc.vibe || ''}`,
        isNpc: true,
      });
    });

    // Build sensors for camera rooms
    let sensors = null;
    if (room.type === 'camera' && room.camera_config) {
      sensors = {
        'Camera Source': room.camera_config.source || 'unknown',
        'Vision Model': room.camera_config.model || 'llava:7b',
        'Room Type': room.camera_config.room_type || 'camera',
        'Status': '[LIVE FEED — run "look camera" to query vision model]',
      };
    }

    return {
      name: room.name,
      description: room.mud_description || room.description,
      exits: mudExits,
      objects: mudObjects,
      occupants: room.npcs.map(n => n.name),
      sensors,
      _livingWorld: true,
    };
  }

  /**
   * Inject all dynamic rooms into a MUD terminal's ROOMS object
   * Call with the MUD terminal's ROOMS object as argument
   */
  function injectAllMudRooms(mudRoomsObj) {
    for (const roomId of Object.keys(rooms)) {
      if (!rooms[roomId].builtin && !mudRoomsObj[roomId]) {
        mudRoomsObj[roomId] = getMudRoom(roomId);
        console.log(`[LivingWorld] Injected MUD room: ${roomId}`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // WARP SYSTEM
  // ════════════════════════════════════════════════════════════

  /**
   * Get all available warp destinations
   */
  function getWarpDestinations() {
    return warpNetwork.map(id => ({
      id,
      name: rooms[id]?.name || id,
      type: rooms[id]?.type || 'unknown',
    }));
  }

  /**
   * Warp to a room (ScummVM side)
   * Uses the existing transitionToRoom function
   */
  function warpTo(roomId) {
    if (!rooms[roomId]) {
      console.warn(`[LivingWorld] Unknown warp destination: ${roomId}`);
      return false;
    }

    if (typeof window !== 'undefined' && typeof window.transitionToRoom === 'function') {
      const label = `◆ ${rooms[roomId].name.toUpperCase()} ◆`;
      window.transitionToRoom(roomId, label);
      return true;
    }

    // Fallback: dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('living-world-warp', { detail: { roomId } }));
    }

    return true;
  }

  /**
   * Show the warp selector UI (ScummVM)
   * Creates a modal overlay with room choices
   */
  function showWarpSelector() {
    if (typeof document === 'undefined') return;

    // Remove existing selector
    const existing = document.getElementById('warp-selector');
    if (existing) existing.remove();

    const destinations = getWarpDestinations();
    const overlay = document.createElement('div');
    overlay.id = 'warp-selector';
    overlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); z-index: 300;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Courier New', monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #0d0900; border: 2px solid #4a3520;
      padding: 16px 20px; max-width: 300px; width: 90%;
      max-height: 80%; overflow-y: auto;
    `;

    const header = document.createElement('div');
    header.textContent = '◆ WARP ◆';
    header.style.cssText = 'color: #e8b840; font-size: 14px; text-align: center; margin-bottom: 12px; letter-spacing: 2px; border-bottom: 1px solid #4a3520; padding-bottom: 8px;';
    panel.appendChild(header);

    destinations.forEach(dest => {
      const room = rooms[dest.id];
      const isCurrent = (typeof window !== 'undefined' && window.currentRoom === dest.id);
      const btn = document.createElement('div');
      btn.style.cssText = `
        color: ${isCurrent ? '#5a4a20' : '#c8a050'};
        padding: 6px 10px; cursor: ${isCurrent ? 'default' : 'pointer'};
        font-size: 11px; border-bottom: 1px solid rgba(74,53,32,0.3);
        transition: background 0.1s;
        ${isCurrent ? 'opacity: 0.4;' : ''}
      `;
      btn.textContent = `${dest.name}${isCurrent ? ' ◀' : ''}`;
      btn.dataset.roomId = dest.id;
      const typeLabel = document.createElement('span');
      typeLabel.textContent = ` [${dest.type}]`;
      typeLabel.style.cssText = 'color: #5a4020; font-size: 9px;';
      btn.appendChild(typeLabel);

      if (!isCurrent) {
        btn.onmouseenter = () => { btn.style.background = 'rgba(200,160,80,0.15)'; btn.style.color = '#ffe080'; };
        btn.onmouseleave = () => { btn.style.background = 'transparent'; btn.style.color = '#c8a050'; };
        btn.onclick = () => {
          overlay.remove();
          warpTo(dest.id);
        };
      }
      panel.appendChild(btn);
    });

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '[ close ]';
    closeBtn.style.cssText = 'color: #8a6a30; font-size: 10px; text-align: center; margin-top: 8px; cursor: pointer;';
    closeBtn.onclick = () => overlay.remove();
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const container = document.getElementById('game-container') || document.body;
    container.appendChild(overlay);
  }

  /**
   * Handle warp command from MUD terminal
   * Returns the target room or null
   */
  function handleMudWarp(roomId) {
    if (!warpNetwork.includes(roomId)) return null;
    return rooms[roomId] || null;
  }

  // ════════════════════════════════════════════════════════════
  // CAMERA ROOM HANDLER
  ════════════════════════════════════════════════════════════

  /**
   * Query the vision model for a camera room
   * In production, this calls the Ollama endpoint.
   * In prototype, returns a placeholder description.
   */
  async function queryCamera(roomId, customPrompt) {
    const room = rooms[roomId];
    if (!room || room.type !== 'camera' || !room.camera_config) {
      return { error: 'Not a camera room' };
    }

    const config = room.camera_config;
    const prompt = customPrompt || 'Describe what you see in this camera feed. Include: sea state, swell direction, visibility, and any notable features.';

    // In production:
    // const resp = await fetch('http://localhost:11434/api/generate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     model: config.model,
    //     prompt: prompt,
    //     images: [base64Frame],
    //     stream: false,
    //   }),
    // });
    // return await resp.json();

    // Prototype: return placeholder
    return {
      room: roomId,
      model: config.model,
      room_type: config.room_type,
      prompt,
      description: `[Vision model placeholder — in production, llava:7b would analyze the current frame from ${config.source}]`,
      timestamp: new Date().toISOString(),
      capabilities: config.capabilities,
      note: 'Connect Ollama with llava:7b to enable live vision analysis. The camera source is: ' + config.source,
    };
  }

  /**
   * Combine camera feed with IMU data (for advanced rooms)
   */
  async function combineCameraWithIMU(cameraRoomId, imuRoomId) {
    const [cameraResult, imuResult] = await Promise.all([
      queryCamera(cameraRoomId),
      _queryIMU(imuRoomId),
    ]);

    return {
      camera: cameraResult,
      imu: imuResult,
      combined: {
        swell_direction: '[from camera vision model]',
        swell_period: '[from IMU heave data]',
        situational_awareness: 'Camera provides visual swell direction. IMU provides precise heave period. Combined: improved autopilot input.',
        autopilot_recommendation: '[requires live data streams]',
      },
    };
  }

  async function _queryIMU(imuRoomId) {
    // Prototype: return placeholder IMU data
    return {
      room: imuRoomId || 'engine-room',
      description: 'IMU sensor data placeholder',
      heave: '±0.8m',
      pitch: '2.1°',
      roll: '3.4°',
      period: '7.2s',
      note: 'Connect real IMU feed for live data',
    };
  }

  /**
   * "Teach" the camera room a new understanding
   * The human corrects the agent's interpretation
   */
  function teachCameraRoom(roomId, correction) {
    const room = rooms[roomId];
    if (!room || !room.camera_config) return false;

    if (!room.camera_config.corrections) {
      room.camera_config.corrections = [];
    }
    room.camera_config.corrections.push({
      text: correction,
      timestamp: new Date().toISOString(),
    });

    console.log(`[LivingWorld] Camera room ${roomId} taught: "${correction}"`);
    return true;
  }

  // ════════════════════════════════════════════════════════════
  // ROOM REGISTRATION (DYNAMIC ADD)
  ════════════════════════════════════════════════════════════

  /**
   * Register a new room dynamically at runtime.
   * This is the "drop a room in" API.
   * 
   * @param {Object} roomDef - Room definition (see rooms.json schema)
   * @returns {Object} The normalized room
   */
  function registerRoom(roomDef) {
    const id = roomDef.id;
    if (!id) throw new Error('Room must have an id');

    const normalized = _normalizeRoom(id, roomDef);
    rooms[id] = normalized;

    // Add to warp network
    if (!warpNetwork.includes(id)) {
      warpNetwork.push(id);
    }

    // Process warp connections
    if (normalized.warps) {
      for (const target of normalized.warps) {
        if (rooms[target] && !rooms[target].warps.includes(id)) {
          rooms[target].warps.push(id);
        }
      }
    }

    // Inject into ScummVM if available
    if (typeof window !== 'undefined' && window.ROOMS) {
      injectScummRoom(id);
    }

    // Notify listeners
    onLoadCallbacks.forEach(cb => cb('register', normalized));

    console.log(`[LivingWorld] Room registered: ${id} (${normalized.name})`);
    return normalized;
  }

  /**
   * Register a room from a JSON string
   */
  function registerRoomJSON(jsonStr) {
    const def = JSON.parse(jsonStr);
    return registerRoom(def);
  }

  /**
   * Register a room from a URL (fetch JSON)
   */
  async function registerRoomFromURL(url) {
    const resp = await fetch(url);
    const def = await resp.json();
    return registerRoom(def);
  }

  // ════════════════════════════════════════════════════════════
  // THE TAP API INTEGRATION
  // ════════════════════════════════════════════════════════════

  const TAP_API = 'https://the-tap.casey-digennaro.workers.dev/api';

  /**
   * Announce a new room in The Tap
   */
  async function announceRoom(roomId, speaker = 'architect') {
    const room = rooms[roomId];
    if (!room) return;

    const text = `Room registered: ${room.name}. Type: ${room.type}. ${room.mud_description.substring(0, 100)}... Warp: type "warp ${roomId}" anywhere.`;

    try {
      await fetch(`${TAP_API}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: 'bar-rail', speaker, text }),
      });
    } catch (err) {
      console.warn('[LivingWorld] Could not announce to The Tap:', err.message);
    }
  }

  // ════════════════════════════════════════════════════════════
  // ASSET GENERATION TRIGGER
  // ════════════════════════════════════════════════════════════

  /**
   * If a room has a background_prompt, this queues it for image generation.
   * In production, this calls FLUX-2-max or MMX to generate the background.
   * The generated image is saved to assets/rooms/{roomId}.png
   */
  function queueAssetGeneration(roomId) {
    const room = rooms[roomId];
    if (!room || !room.background_prompt) return;

    console.log(`[LivingWorld] Asset generation queued for ${roomId}:`);
    console.log(`  Prompt: ${room.background_prompt}`);
    console.log(`  Target: assets/rooms/${roomId}.png`);
    console.log(`  Model: FLUX-2-max or MMX image`);

    // In production:
    // const result = await mmx.image(room.background_prompt, { width: 320, height: 200 });
    // await fetch('/upload', { method: 'POST', body: ... });

    return {
      roomId,
      prompt: room.background_prompt,
      target: `assets/rooms/${roomId}.png`,
      status: 'queued',
    };
  }

  // ════════════════════════════════════════════════════════════
  // EVENT SYSTEM
  // ════════════════════════════════════════════════════════════

  function onLoad(cb) {
    onLoadCallbacks.push(cb);
  }

  function _notifyLoaded() {
    onLoadCallbacks.forEach(cb => cb('load', rooms));
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    // Properties
    get rooms() { return rooms; },
    get registry() { return registry; },
    get warpNetwork() { return warpNetwork; },

    // Loading
    init,
    initFromFile,
    initWithObject,

    // ScummVM
    injectScummRoom,
    injectAllScummRooms,

    // MUD
    getMudRoom,
    injectAllMudRooms,

    // Warp
    getWarpDestinations,
    warpTo,
    showWarpSelector,
    handleMudWarp,

    // Camera
    queryCamera,
    combineCameraWithIMU,
    teachCameraRoom,

    // Registration
    registerRoom,
    registerRoomJSON,
    registerRoomFromURL,

    // Integration
    announceRoom,
    queueAssetGeneration,

    // Events
    onLoad,
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LivingWorld;
}
if (typeof window !== 'undefined') {
  window.LivingWorld = LivingWorld;
}
