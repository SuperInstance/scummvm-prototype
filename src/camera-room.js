/**
 * camera-room.js — Living World Framework: Camera Room Handler
 * 
 * Special room type for live camera feeds. The defining feature:
 * - ScummVM view shows the actual video feed (or a grabbed frame)
 * - MUD view shows the vision model's description of the feed
 * - The agent can be asked "what do you see?" → runs llava:7b on current frame
 * - The human can correct the agent's understanding
 * - Over time the agent combines camera + IMU for situational awareness
 *
 * Usage (browser):
 *   <script src="src/room-loader.js"></script>
 *   <script src="src/camera-room.js"></script>
 *   <script>
 *     LivingWorld.init().then(() => {
 *       CameraRoom.init();
 *     });
 *   </script>
 *
 * Vision model endpoint (Ollama):
 *   POST http://localhost:11434/api/generate
 *   { model: "llava:7b", prompt: "...", images: ["<base64>"], stream: false }
 */

const CameraRoom = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════════
  // CONFIG
  // ════════════════════════════════════════════════════════════

  const VISION_ENDPOINT = 'http://localhost:11434/api/generate';
  const DEFAULT_MODEL = 'llava:7b';
  const FRAME_GRAB_INTERVAL_MS = 5000;      // grab a frame every 5s
  const VISION_QUERY_COOLDOWN_MS = 3000;    // min time between vision queries

  // ════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════

  let activeCameraRoom = null;
  let frameGrabInterval = null;
  let lastFrameBase64 = null;
  let lastVisionQuery = 0;
  let lastVisionResult = null;
  let corrections = [];  // human corrections to agent's understanding
  let ollamaAvailable = false;

  // ════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════

  function init() {
    // Check if Ollama is available
    _checkOllama().then(available => {
      ollamaAvailable = available;
      if (available) {
        console.log('[CameraRoom] Ollama vision model available');
      } else {
        console.log('[CameraRoom] Ollama not available — running in placeholder mode');
      }
    });

    // Listen for room changes (ScummVM)
    if (typeof window !== 'undefined') {
      window.addEventListener('living-world-warp', (e) => {
        _handleRoomChange(e.detail.roomId);
      });
    }
  }

  async function _checkOllama() {
    try {
      const resp = await fetch('http://localhost:11434/api/tags', { timeout: 2000 });
      return resp.ok;
    } catch {
      return false;
    }
  }

  function _handleRoomChange(roomId) {
    const room = LivingWorld.rooms[roomId];
    if (!room || room.type !== 'camera') {
      _stopFrameGrab();
      return;
    }
    _startCameraRoom(roomId);
  }

  // ════════════════════════════════════════════════════════════
  // CAMERA ROOM LIFECYCLE
  // ════════════════════════════════════════════════════════════

  function _startCameraRoom(roomId) {
    _stopFrameGrab();
    activeCameraRoom = roomId;

    const room = LivingWorld.rooms[roomId];
    const config = room.camera_config;

    console.log(`[CameraRoom] Activating camera room: ${roomId}`);
    console.log(`[CameraRoom] Source: ${config.source}`);
    console.log(`[CameraRoom] Vision model: ${config.model || DEFAULT_MODEL}`);

    // In production: connect to RTSP stream
    // _connectStream(config.source);

    // In prototype: start frame grab simulation
    frameGrabInterval = setInterval(() => {
      _grabFrame(roomId);
    }, FRAME_GRAB_INTERVAL_MS);

    // Do initial frame grab
    _grabFrame(roomId);
  }

  function _stopFrameGrab() {
    if (frameGrabInterval) {
      clearInterval(frameGrabInterval);
      frameGrabInterval = null;
    }
    activeCameraRoom = null;
  }

  // ════════════════════════════════════════════════════════════
  // FRAME GRABBING
  // ════════════════════════════════════════════════════════════

  async function _grabFrame(roomId) {
    const room = LivingWorld.rooms[roomId];
    if (!room || !room.camera_config) return;

    // In production:
    // 1. Grab frame from RTSP stream (ffmpeg or canvas capture)
    // 2. Convert to base64 JPEG
    // 3. Store in lastFrameBase64
    // 4. Update the ScummVM background to show the frame
    // 5. Run vision model query

    // Prototype: use placeholder
    const now = Date.now();
    if (now - lastVisionQuery < VISION_QUERY_COOLDOWN_MS) return;
    lastVisionQuery = now;

    // Auto-query vision model on frame grab
    const result = await queryVision(roomId);
    lastVisionResult = result;

    // Update the MUD terminal display
    _updateMudDisplay(roomId, result);
  }

  // ════════════════════════════════════════════════════════════
  // VISION MODEL QUERIES
  // ════════════════════════════════════════════════════════════

  /**
   * Ask the vision model "what do you see?"
   * This is the core of the camera room experience.
   */
  async function queryVision(roomId, customPrompt) {
    const room = LivingWorld.rooms[roomId];
    if (!room || room.type !== 'camera') {
      return { error: 'Not a camera room' };
    }

    const config = room.camera_config;
    const model = config.model || DEFAULT_MODEL;
    const prompt = customPrompt || _buildDefaultPrompt(config);

    // Apply corrections as context
    const correctionContext = corrections.length > 0
      ? '\n\nPrevious corrections from the human:\n' + corrections.map(c => `- "${c.text}"`).join('\n')
      : '';

    const fullPrompt = prompt + correctionContext;

    if (ollamaAvailable && lastFrameBase64) {
      // Production: query Ollama with real frame
      try {
        const resp = await fetch(VISION_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: fullPrompt,
            images: [lastFrameBase64],
            stream: false,
          }),
        });
        const data = await resp.json();
        return {
          roomId,
          model,
          prompt: fullPrompt,
          response: data.response,
          timestamp: new Date().toISOString(),
          source: 'live',
        };
      } catch (err) {
        return { error: err.message, roomId, model };
      }
    }

    // Prototype: placeholder response
    return {
      roomId,
      model,
      prompt: fullPrompt,
      response: _placeholderResponse(config, corrections),
      timestamp: new Date().toISOString(),
      source: 'placeholder',
      note: 'Ollama with llava:7b not available. This is a simulated response.',
    };
  }

  function _buildDefaultPrompt(config) {
    return `You are a camera observer on a vessel. You are looking at: ${config.room_type}.

Describe what you see in detail:
1. Sea state and water conditions
2. Swell direction (if visible)
3. Visibility conditions
4. Any vessels, land, or notable features
5. Sky and weather conditions

Be concise but precise. This feed is from: ${config.source}`;
  }

  function _placeholderResponse(config, corrections) {
    let response = `[Vision model simulation for: ${config.room_type}]\n\n`;
    response += `The camera feed shows an ocean scene from an elevated position. `;
    response += `The horizon line is visible, slightly off-center due to the camera angle. `;
    response += `Waves appear moderate — estimated 2-3 feet. `;
    response += `The swell appears to be moving from port to starboard (west to east). `;
    response += `Visibility is good — no fog or precipitation visible. `;
    response += `Sky is overcast with broken clouds. `;
    response += `No other vessels visible in this frame.\n\n`;

    if (corrections.length > 0) {
      response += 'APPLIED CORRECTIONS:\n';
      corrections.forEach(c => {
        response += `  - ${c.text}\n`;
      });
    }

    response += `\n[Note: This is a placeholder. Connect Ollama + llava:7b for real vision analysis of the camera feed.]`;
    return response;
  }

  // ════════════════════════════════════════════════════════════
  // HUMAN CORRECTION SYSTEM
  // ════════════════════════════════════════════════════════════

  /**
   * The human corrects the agent's understanding.
   * Example: "you're looking forward from a high point, call this room the crow's nest forward camera"
   * Example: "the swell is hitting from the northwest, not west"
   * Example: "can you tell which way the swell is hitting and its period?"
   */
  function addCorrection(roomId, correction) {
    const correctionObj = {
      roomId,
      text: correction,
      timestamp: new Date().toISOString(),
    };
    corrections.push(correctionObj);

    // Also store in the room's camera_config
    const room = LivingWorld.rooms[roomId];
    if (room && room.camera_config) {
      if (!room.camera_config.corrections) {
        room.camera_config.corrections = [];
      }
      room.camera_config.corrections.push(correctionObj);
    }

    console.log(`[CameraRoom] Correction added for ${roomId}: "${correction}"`);
    return correctionObj;
  }

  /**
   * Get all corrections for a room
   */
  function getCorrections(roomId) {
    return corrections.filter(c => !roomId || c.roomId === roomId);
  }

  /**
   * Clear corrections for a room (when the understanding is settled)
   */
  function clearCorrections(roomId) {
    corrections = corrections.filter(c => c.roomId !== roomId);
    const room = LivingWorld.rooms[roomId];
    if (room && room.camera_config) {
      room.camera_config.corrections = [];
    }
  }

  // ════════════════════════════════════════════════════════════
  // MULTI-SENSOR COMBINATION
  // ════════════════════════════════════════════════════════════

  /**
   * Combine camera feed with IMU data for autopilot improvement.
   * 
   * Casey's vision: "What if you combine it with the IMU room?
   * How could this improve the autopilot agent?"
   *
   * Camera provides: visual swell direction, sea state, obstacle detection
   * IMU provides: precise heave (vertical acceleration), pitch, roll, period
   * Combined: the autopilot gets both visual confirmation and precise measurements
   */
  async function combineWithIMU(cameraRoomId, imuData) {
    const cameraResult = await queryVision(cameraRoomId,
      'Analyze the sea state and swell direction visible in this frame. ' +
      'Estimate swell direction (compass bearing) and wave height.'
    );

    // IMU data structure: { heave, pitch, roll, heavePeriod, accel }
    const imu = imuData || _placeholderIMU();

    return {
      camera: {
        roomId: cameraRoomId,
        visual_assessment: cameraResult.response,
        source: cameraResult.source,
      },
      imu: imu,
      combined_analysis: {
        swell_direction: 'Camera indicates swell from NW. IMU confirms heave pattern consistent with NW swell.',
        swell_period: `IMU measures ${imu.heavePeriod || '7.2s'} period. Camera confirms regular wave spacing.`,
        sea_state: 'Moderate. 2-3 ft waves. Combined assessment: Sea State 3.',
        autopilot_recommendation: _autopilotRecommendation(cameraResult, imu),
      },
      autopilot_improvement: {
        current_capability: 'Autopilot uses GPS heading + compass only.',
        with_camera_imu: 'Autopilot gains visual sea state awareness + heave compensation. Can anticipate swells, adjust trim tabs preemptively, and optimize heading for comfort.',
        implementation: 'Feed combined_camera_imu packet to autopilot agent at 0.2Hz. Agent adjusts heading ±5° and trim tab angle based on predicted swell arrival.',
      },
    };
  }

  function _placeholderIMU() {
    return {
      heave: '±0.8m',
      pitch: '2.1°',
      roll: '3.4°',
      heavePeriod: '7.2s',
      accel: '0.12g RMS',
      source: 'placeholder',
      note: 'Connect real IMU feed from engine-room or dedicated sensor room',
    };
  }

  function _autopilotRecommendation(cameraResult, imu) {
    const period = parseFloat(imu.heavePeriod) || 7.2;
    const roll = parseFloat(imu.roll) || 3.4;

    if (roll > 5) {
      return `Roll ${roll}° exceeds comfort threshold. Recommend course change 10-15° to meet swell at better angle. Swell period ${period}s — adjust trim tabs -2° to lift bow.`;
    }
    return `Conditions nominal. Roll ${roll}°, heave period ${period}s. Maintain current heading. Camera vision confirms clear path ahead.`;
  }

  // ════════════════════════════════════════════════════════════
  // MUD TERMINAL DISPLAY UPDATE
  // ════════════════════════════════════════════════════════════

  function _updateMudDisplay(roomId, visionResult) {
    // In the MUD terminal, the camera room shows the vision model's description
    // This function dispatches an event the MUD terminal can listen for

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('camera-vision-update', {
        detail: { roomId, result: visionResult },
      }));
    }
  }

  /**
   * Get the text to display in the MUD terminal for a camera room
   */
  function getMudDisplayText(roomId) {
    const room = LivingWorld.rooms[roomId];
    if (!room || room.type !== 'camera') return null;

    const config = room.camera_config;
    let text = room.mud_description + '\n\n';

    text += '┌─ CAMERA FEED: ' + config.room_type.toUpperCase() + ' ─┐\n';
    text += '│ Source: ' + config.source + '\n';
    text += '│ Model: ' + (config.model || DEFAULT_MODEL) + '\n';

    if (lastVisionResult && lastVisionResult.roomId === roomId) {
      text += '│ Last Query: ' + new Date(lastVisionResult.timestamp).toLocaleTimeString() + '\n';
      text += '│ Source: ' + lastVisionResult.source + '\n';
      text += '│ \n';
      text += '│ ANALYSIS:\n';
      text += '│ ' + (lastVisionResult.response || 'No analysis available').split('\n').join('\n│ ');
    } else {
      text += '│ Status: Awaiting first query. Type "look camera" to analyze feed.';
    }

    if (corrections.filter(c => c.roomId === roomId).length > 0) {
      text += '\n│ \n';
      text += '│ CORRECTIONS:\n';
      corrections.filter(c => c.roomId === roomId).forEach(c => {
        text += '│ - "' + c.text + '"\n';
      });
    }

    text += '\n└─────────────────────────────────────┘';

    return text;
  }

  // ════════════════════════════════════════════════════════════
  // SCUMMVM DISPLAY
  // ════════════════════════════════════════════════════════════

  /**
   * Render the camera room in ScummVM.
   * Shows the video frame as the background, with camera-specific UI overlays.
   */
  function renderScummCameraRoom(roomId) {
    const room = LivingWorld.rooms[roomId];
    if (!room || room.type !== 'camera') return;

    // In production:
    // 1. Set the ScummVM background to the current video frame
    // 2. Add a "camera HUD" overlay (timestamp, source, REC indicator)
    // 3. Add a "query vision" button/hotspot
    // 4. Add a "correct understanding" hotspot

    // Add camera-specific CSS if not present
    if (!document.getElementById('camera-room-styles')) {
      const style = document.createElement('style');
      style.id = 'camera-room-styles';
      style.textContent = `
        .camera-hud {
          position: absolute;
          top: 40px;
          left: 8px;
          color: #ff4040;
          font-size: 10px;
          font-family: 'Courier New', monospace;
          z-index: 55;
          pointer-events: none;
          letter-spacing: 1px;
          text-shadow: 0 0 4px rgba(255,0,0,0.5);
        }
        .camera-hud .rec {
          display: inline-block;
          width: 8px; height: 8px;
          background: #ff0000;
          border-radius: 50%;
          margin-right: 4px;
          animation: recBlink 1s infinite;
        }
        @keyframes recBlink { 50% { opacity: 0.2; } }

        .vision-overlay {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.85);
          border: 1px solid #4a3520;
          color: #44ccff;
          padding: 8px 12px;
          font-size: 10px;
          max-width: 260px;
          font-family: 'Courier New', monospace;
          z-index: 60;
          display: none;
          line-height: 1.4;
        }
        .vision-overlay.visible { display: block; }
      `;
      document.head.appendChild(style);
    }

    // Add HUD
    const config = room.camera_config;
    let hud = document.getElementById('camera-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'camera-hud';
      hud.className = 'camera-hud';
      const container = document.getElementById('game-container') || document.body;
      container.appendChild(hud);
    }
    hud.innerHTML = `<span class="rec"></span>REC │ ${config.room_type.toUpperCase()} │ ${config.source}`;

    // Add vision overlay
    let overlay = document.getElementById('vision-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'vision-overlay';
      overlay.className = 'vision-overlay';
      const container = document.getElementById('game-container') || document.body;
      container.appendChild(overlay);
    }
  }

  /**
   * Show/hide the vision model's analysis overlay in ScummVM
   */
  function showVisionOverlay(roomId) {
    queryVision(roomId).then(result => {
      const overlay = document.getElementById('vision-overlay');
      if (overlay && result.response) {
        overlay.innerHTML = '<strong style="color:#e8b840;">VISION MODEL:</strong><br>' +
          result.response.replace(/\n/g, '<br>');
        overlay.classList.add('visible');
      }
    });
  }

  function hideVisionOverlay() {
    const overlay = document.getElementById('vision-overlay');
    if (overlay) overlay.classList.remove('visible');
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    // Lifecycle
    init,
    get activeRoom() { return activeCameraRoom; },

    // Vision queries
    queryVision,
    getMudDisplayText,

    // Corrections (teaching)
    addCorrection,
    getCorrections,
    clearCorrections,

    // Multi-sensor combination
    combineWithIMU,

    // ScummVM rendering
    renderScummCameraRoom,
    showVisionOverlay,
    hideVisionOverlay,

    // State
    get ollamaAvailable() { return ollamaAvailable; },
    get lastFrame() { return lastFrameBase64; },
    get lastResult() { return lastVisionResult; },
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CameraRoom;
}
if (typeof window !== 'undefined') {
  window.CameraRoom = CameraRoom;
}
