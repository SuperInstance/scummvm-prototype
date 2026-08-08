// ════════════════════════════════════════════════════════════
// PUPPET SYSTEM — Agent controls sprites via text commands
// ════════════════════════════════════════════════════════════
// Commands:
//   <character> enter [from <direction>]  — character walks in
//   <character> exit [to <direction>]     — character walks out
//   <character> say "<text>"              — speech bubble + TTS
//   <character> gesture <type>            — animation (nod/shake/wave/point/confused)
//   <character> move <x> <y>              — move to position
//   <character> emotion <type>            — change expression
//   backdrop <name>                       — change scene background
//   prop <name> appear                    — spawn in-game object
//   prop <name> disappear                 — remove object
//   warp to <room>                        — full scene transition
//   ambient <name>                        — change audio
//   effect <name>                         — visual effect
//   minigame <name> start                 — launch a mini-game
//   minigame <name> stop                  — end mini-game
// ════════════════════════════════════════════════════════════

const PuppetSystem = (function() {

  // ── Character definitions ──
  const CHARACTERS = {
    riker:    { name: 'Riker',    sprite: 'assets/npcs/riker.png',    color: '#c8a878', defaultX: 52, defaultY: 28 },
    captain:  { name: 'Captain',  sprite: 'assets/npcs/captain.png',  color: '#ffd700', defaultX: 20, defaultY: 25 },
    deckhand: { name: 'Deckhand', sprite: 'assets/npcs/deckhand.png', color: '#b89878', defaultX: 42, defaultY: 30 },
    cook:     { name: 'Cook',     sprite: 'assets/npcs/cook.png',     color: '#eeeeee', defaultX: 26, defaultY: 28 },
    wesley:   { name: 'Wesley',   sprite: 'assets/npcs/wesley.png',   color: '#88ccff', defaultX: 60, defaultY: 35 },
    hermes:   { name: 'Hermes',   sprite: 'assets/npcs/hermes.png',   color: '#ffaa20', defaultX: 50, defaultY: 32 }
  };

  // ── Gesture definitions ──
  const GESTURES = {
    nod:      { duration: 1200, frames: [0, -4, 0, -4, 0],   type: 'translateY', label: 'nodding' },
    shake:    { duration: 1200, frames: [0, 4, 0, -4, 0],    type: 'translateX', label: 'shaking head' },
    wave:     { duration: 1500, frames: [0, -8, 0, -8, 0],   type: 'armWave',    label: 'waving' },
    point:    { duration: 2000, frames: [0],                  type: 'point',      label: 'pointing' },
    confused: { duration: 2000, frames: [0, 2, -2, 2, 0],    type: 'rotate',     label: 'confused' },
    bow:      { duration: 1800, frames: [0, 10, 15, 10, 0],  type: 'translateY', label: 'bowing' },
    laugh:    { duration: 1500, frames: [0, -3, 0, -3, 0],   type: 'translateY', label: 'laughing', fast: true },
    shrug:    { duration: 1500, frames: [0],                  type: 'shrug',      label: 'shrugging' }
  };

  // ── Backdrop presets (canvas-drawn or image) ──
  const BACKDROPS = {
    'bar-rail':     { type: 'preset', room: 'bar-rail' },
    'aft-deck':     { type: 'preset', room: 'aft-deck' },
    'wheelhouse':   { type: 'preset', room: 'wheelhouse' },
    'galley':       { type: 'preset', room: 'galley' },
    'engine-room':  { type: 'preset', room: 'engine-room' },
    'aft-cockpit':  { type: 'preset', room: 'aft-cockpit' },
    'forest':       { type: 'generated', prompt: 'dense misty pine forest, dark moody lighting, pixel art style, retro adventure game background', palette: 'forest' },
    'cave':         { type: 'generated', prompt: 'underground crystal cave, glowing minerals, dark cavernous space, pixel art style, retro adventure game', palette: 'cave' },
    'storm':        { type: 'generated', prompt: 'turbulent ocean storm, dark waves crashing, lightning in distance, pixel art style, retro adventure game', palette: 'storm' },
    'space':        { type: 'generated', prompt: 'starship bridge in deep space, stars visible through viewport, sci-fi pixel art, retro adventure game', palette: 'space' },
    'castle':       { type: 'generated', prompt: 'medieval castle great hall, torches on stone walls, pixel art style, retro adventure game', palette: 'castle' },
    'island':       { type: 'generated', prompt: 'tropical island beach, palm trees, turquoise water, pixel art style, retro adventure game', palette: 'island' }
  };

  // ── Props ──
  const PROPS = {
    chess_board: { name: 'Chess Board', icon: '♟', renders: 'canvas' },
    card_table:  { name: 'Card Table',  icon: '🂠', renders: 'canvas' },
    map_table:   { name: 'Map Table',   icon: '🗺', renders: 'canvas' },
    treasure:    { name: 'Treasure Chest', icon: '🧰', renders: 'sprite' },
    lantern:     { name: 'Lantern',     icon: '🏮', renders: 'sprite' },
    book:        { name: 'Ancient Book', icon: '📖', renders: 'sprite' },
    crystal:     { name: 'Crystal',     icon: '💎', renders: 'sprite' },
    sword:       { name: 'Sword',       icon: '⚔', renders: 'sprite' },
    potion:      { name: 'Potion',      icon: '🧪', renders: 'sprite' }
  };

  // ── Ambient tracks ──
  const AMBIENTS = {
    ocean_calm:   { file: 'assets/audio/aft-deck-ambient.wav',  label: 'Calm Ocean' },
    ocean_storm:  { file: '', label: 'Storm', generated: true },
    bar_busy:     { file: 'assets/audio/bar-rail-ambient.wav',  label: 'Busy Bar' },
    engine_hum:   { file: 'assets/audio/engine-room-ambient.wav', label: 'Engine Hum' },
    galley_warm:  { file: 'assets/audio/galley-ambient.wav',    label: 'Warm Galley' },
    wheelhouse:   { file: 'assets/audio/wheelhouse-ambient.wav', label: 'Wheelhouse' },
    mystical:     { file: '', label: 'Mystical', generated: true },
    silence:      { file: '', label: 'Silence' }
  };

  // ── Active state ──
  const state = {
    characters: {},   // id -> { el, x, y, visible, gesture, emotion }
    props: {},        // id -> { el, x, y, visible }
    backdrop: 'bar-rail',
    ambient: 'bar_busy',
    minigame: null,
    effects: []
  };

  // ── DOM refs (set on init) ──
  let stageEl = null;
  let canvasEl = null;
  let ctxRef = null;
  let onLog = null;       // callback for annotation feed
  let onStateChange = null; // callback for state tracker
  let onTTS = null;       // callback for TTS
  let onAssetRequest = null; // callback for asset generation
  let onWarp = null;      // callback for room warp

  // ── Speech bubble manager ──
  let speechBubbles = {};

  function init(config) {
    stageEl = config.stage;
    canvasEl = config.canvas;
    ctxRef = config.ctx;
    onLog = config.onLog || (() => {});
    onStateChange = config.onStateChange || (() => {});
    onTTS = config.onTTS || (() => {});
    onAssetRequest = config.onAssetRequest || (() => {});
    onWarp = config.onWarp || (() => {});

    log('Puppet System initialized. Awaiting commands.', 'system');
    updateStateTracker();
  }

  // ── Logging ──
  function log(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString();
    onLog({ time: ts, message: msg, type });
  }

  // ── State tracker update ──
  function updateStateTracker() {
    const chars = Object.keys(state.characters).filter(id => state.characters[id].visible);
    const props = Object.keys(state.props).filter(id => state.props[id].visible);
    const info = {
      backdrop: state.backdrop,
      ambient: state.ambient,
      characters: chars.map(id => ({
        id,
        name: CHARACTERS[id]?.name || id,
        gesture: state.characters[id]?.gesture || 'idle',
        emotion: state.characters[id]?.emotion || 'neutral'
      })),
      props: props.map(id => ({ id, name: PROPS[id]?.name || id })),
      minigame: state.minigame,
      tension: calculateTension()
    };
    onStateChange(info);
  }

  function calculateTension() {
    let t = 0;
    // More characters = more tension potential
    const visibleChars = Object.values(state.characters).filter(c => c.visible).length;
    t += visibleChars * 10;
    // Certain gestures add tension
    Object.values(state.characters).forEach(c => {
      if (c.gesture === 'confused') t += 15;
      if (c.gesture === 'point') t += 10;
    });
    // Storm backdrop adds tension
    if (state.backdrop === 'storm') t += 30;
    return Math.min(100, t);
  }

  // ════════════════════════════════════════════════════════════
  // COMMAND PARSER
  // ════════════════════════════════════════════════════════════

  function executeCommand(rawCmd) {
    const cmd = rawCmd.trim();
    if (!cmd) return { ok: false, error: 'Empty command' };

    log(`▶ ${cmd}`, 'command');

    // ── Character commands ──
    // Check if first word is a character name
    const lowerCmd = cmd.toLowerCase();
    const charMatch = Object.keys(CHARACTERS).find(name => lowerCmd.startsWith(name + ' '));

    if (charMatch) {
      const rest = cmd.substring(charMatch.length).trim();
      return handleCharacterCommand(charMatch, rest);
    }

    // ── Global commands ──
    if (lowerCmd.startsWith('backdrop ')) {
      const backdropName = cmd.substring(9).trim().toLowerCase().replace(/\s+/g, '_');
      return setBackdrop(backdropName);
    }

    if (lowerCmd.startsWith('prop ')) {
      return handlePropCommand(cmd.substring(5).trim());
    }

    if (lowerCmd.startsWith('warp to ')) {
      const room = cmd.substring(8).trim().toLowerCase().replace(/\s+/g, '_');
      return warpTo(room);
    }

    if (lowerCmd.startsWith('ambient ')) {
      const ambName = cmd.substring(8).trim().toLowerCase().replace(/\s+/g, '_');
      return setAmbient(ambName);
    }

    if (lowerCmd.startsWith('effect ')) {
      const effectName = cmd.substring(7).trim().toLowerCase();
      return playEffect(effectName);
    }

    if (lowerCmd.startsWith('minigame ')) {
      return handleMinigameCommand(cmd.substring(9).trim());
    }

    // ── Batch commands (semicolon-separated) ──
    if (cmd.includes(';')) {
      const commands = cmd.split(';').map(c => c.trim()).filter(c => c);
      const results = commands.map(subCmd => executeCommand(subCmd));
      const allOk = results.every(r => r.ok);
      return { ok: allOk, results };
    }

    return { ok: false, error: `Unknown command: "${cmd}"` };
  }

  // ── Character commands ──
  function handleCharacterCommand(charId, rest) {
    const char = CHARACTERS[charId];
    if (!char) return { ok: false, error: `Unknown character: ${charId}` };

    const parts = rest.split(/\s+/);
    const action = parts[0].toLowerCase();

    switch (action) {
      case 'enter':
        return characterEnter(charId, parts.slice(1));
      case 'exit':
        return characterExit(charId, parts.slice(1));
      case 'say':
        return characterSay(charId, rest.substring(4));
      case 'gesture':
        return characterGesture(charId, parts[1]);
      case 'move':
        return characterMove(charId, parseFloat(parts[1]), parseFloat(parts[2]));
      case 'emotion':
        return characterEmotion(charId, parts[1]);
      default:
        return { ok: false, error: `Unknown character action: ${action}` };
    }
  }

  function characterEnter(charId, opts) {
    const char = CHARACTERS[charId];
    if (!state.characters[charId]) {
      state.characters[charId] = { visible: false, x: char.defaultX, y: char.defaultY, gesture: 'idle', emotion: 'neutral' };
    }

    const charState = state.characters[charId];
    const direction = opts[0] || 'left';
    const stage = stageEl;

    // Create or get element
    let el = document.getElementById(`puppet-${charId}`);
    if (!el) {
      el = document.createElement('img');
      el.id = `puppet-${charId}`;
      el.className = 'puppet-sprite';
      el.src = char.sprite;
      el.style.cssText = `
        position: absolute;
        z-index: 15;
        pointer-events: none;
        image-rendering: pixelated;
        filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.7));
        transition: left 1.5s ease, opacity 0.8s ease;
        opacity: 0;
        width: 13%;
      `;
      stage.appendChild(el);
    }

    // Start from off-screen
    const startX = direction === 'right' ? '110%' : '-15%';
    el.style.left = startX;
    el.style.top = charState.y + '%';
    el.style.opacity = '0';
    el.style.display = 'block';

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.left = charState.x + '%';
        el.style.opacity = '1';
      });
    });

    charState.visible = true;
    charState.el = el;
    charState.gesture = 'idle';

    log(`🎭 ${char.name} enters from the ${direction}`, 'action');
    updateStateTracker();
    return { ok: true };
  }

  function characterExit(charId, opts) {
    const charState = state.characters[charId];
    if (!charState || !charState.visible) {
      return { ok: false, error: `${CHARACTERS[charId].name} is not on stage` };
    }

    const direction = opts[0] || 'left';
    const el = charState.el;
    if (el) {
      el.style.left = direction === 'right' ? '110%' : '-15%';
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 1500);
    }

    charState.visible = false;
    charState.gesture = 'idle';

    // Remove speech bubble
    removeSpeechBubble(charId);

    log(`🎭 ${CHARACTERS[charId].name} exits to the ${direction}`, 'action');
    updateStateTracker();
    return { ok: true };
  }

  function characterSay(charId, text) {
    const charState = state.characters[charId];
    if (!charState || !charState.visible) {
      return { ok: false, error: `${CHARACTERS[charId].name} is not on stage` };
    }

    // Clean text (remove surrounding quotes)
    const cleanText = text.replace(/^["']|["']$/g, '').replace(/^["']|["']$/g, '');
    if (!cleanText) return { ok: false, error: 'No text to say' };

    // Show speech bubble
    showSpeechBubble(charId, cleanText);

    // Trigger TTS
    if (onTTS) {
      onTTS(cleanText, charId);
    }

    // Mouth flap animation
    mouthFlap(charId);

    log(`💬 ${CHARACTERS[charId].name}: "${cleanText}"`, 'speech');
    return { ok: true };
  }

  function characterGesture(charId, gestureType) {
    const charState = state.characters[charId];
    if (!charState || !charState.visible) {
      return { ok: false, error: `${CHARACTERS[charId].name} is not on stage` };
    }

    const gesture = GESTURES[gestureType];
    if (!gesture) {
      return { ok: false, error: `Unknown gesture: ${gestureType}. Available: ${Object.keys(GESTURES).join(', ')}` };
    }

    const el = charState.el;
    if (!el) return { ok: false, error: 'No element' };

    // Stop any existing gesture animation
    el.getAnimations().forEach(a => a.cancel());

    charState.gesture = gestureType;

    // Animate based on gesture type
    if (gesture.type === 'translateY' || gesture.type === 'translateX') {
      animateAxis(el, gesture, charId);
    } else if (gesture.type === 'rotate') {
      animateRotate(el, gesture, charId);
    } else if (gesture.type === 'armWave') {
      animateArmWave(el, gesture, charId);
    } else if (gesture.type === 'point') {
      animatePoint(el, gesture, charId);
    } else if (gesture.type === 'shrug') {
      animateShrug(el, gesture, charId);
    }

    log(`🎭 ${CHARACTERS[charId].name} ${gesture.label}`, 'action');
    setTimeout(() => {
      if (charState.gesture === gestureType) {
        charState.gesture = 'idle';
        updateStateTracker();
      }
    }, gesture.duration);
    updateStateTracker();
    return { ok: true };
  }

  function characterMove(charId, x, y) {
    const charState = state.characters[charId];
    if (!charState || !charState.visible) {
      return { ok: false, error: `${CHARACTERS[charId].name} is not on stage` };
    }
    if (isNaN(x) || isNaN(y)) {
      return { ok: false, error: 'Invalid coordinates' };
    }

    charState.x = Math.max(2, Math.min(88, x));
    charState.y = Math.max(15, Math.min(65, y));

    if (charState.el) {
      charState.el.style.transition = 'left 2s ease, top 2s ease, opacity 0.8s ease';
      charState.el.style.left = charState.x + '%';
      charState.el.style.top = charState.y + '%';
    }

    log(`🎭 ${CHARACTERS[charId].name} moves to (${charState.x}, ${charState.y})`, 'action');
    return { ok: true };
  }

  function characterEmotion(charId, emotion) {
    const charState = state.characters[charId];
    if (!charState || !charState.visible) {
      return { ok: false, error: `${CHARACTERS[charId].name} is not on stage` };
    }
    const validEmotions = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'afraid', 'curious'];
    if (!validEmotions.includes(emotion)) {
      return { ok: false, error: `Unknown emotion: ${emotion}` };
    }
    charState.emotion = emotion;
    // Apply visual filter based on emotion
    if (charState.el) {
      const filters = {
        neutral: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7))',
        happy: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7)) brightness(1.15) saturate(1.2)',
        sad: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7)) brightness(0.8) saturate(0.6)',
        angry: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7)) brightness(1) sepia(0.4) hue-rotate(-10deg)',
        surprised: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7)) brightness(1.3) contrast(1.2)',
        afraid: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7)) brightness(0.7) hue-rotate(180deg) saturate(0.8)',
        curious: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7)) brightness(1.1) contrast(1.1)'
      };
      charState.el.style.filter = filters[emotion] || filters.neutral;
    }
    log(`🎭 ${CHARACTERS[charId].name} feels ${emotion}`, 'emotion');
    updateStateTracker();
    return { ok: true };
  }

  // ── Gesture animations ──
  function animateAxis(el, gesture, charId) {
    const axis = gesture.type === 'translateY' ? 'Y' : 'X';
    const speed = gesture.fast ? 100 : 250;
    let frameIdx = 0;

    function step() {
      if (frameIdx >= gesture.frames.length) {
        el.style.transform = '';
        return;
      }
      const val = gesture.frames[frameIdx];
      el.style.transform = `translate${axis}(${val}px)`;
      frameIdx++;
      setTimeout(step, speed);
    }
    step();
  }

  function animateRotate(el, gesture, charId) {
    let frameIdx = 0;
    function step() {
      if (frameIdx >= gesture.frames.length) {
        el.style.transform = '';
        return;
      }
      const angle = gesture.frames[frameIdx];
      el.style.transform = `rotate(${angle}deg)`;
      el.style.transformOrigin = 'bottom center';
      frameIdx++;
      setTimeout(step, 300);
    }
    step();
  }

  function animateArmWave(el, gesture, charId) {
    let frame = 0;
    const totalFrames = gesture.frames.length;
    function step() {
      if (frame >= totalFrames) {
        el.style.transform = '';
        return;
      }
      el.style.transform = `translateY(${gesture.frames[frame]}px) skewX(${frame % 2 === 0 ? -3 : 3}deg)`;
      frame++;
      setTimeout(step, 300);
    }
    step();
  }

  function animatePoint(el, gesture, charId) {
    el.style.transform = 'translateX(8px) skewX(-5deg)';
    setTimeout(() => { el.style.transform = ''; }, gesture.duration);
  }

  function animateShrug(el, gesture, charId) {
    el.style.transform = 'translateY(-3px) scaleY(0.95)';
    setTimeout(() => {
      el.style.transform = 'translateY(0px) scaleY(1.02)';
      setTimeout(() => { el.style.transform = ''; }, 400);
    }, 500);
  }

  function mouthFlap(charId) {
    const charState = state.characters[charId];
    if (!charState?.el) return;
    let flaps = 0;
    const maxFlaps = 8;
    const flapInterval = setInterval(() => {
      if (flaps >= maxFlaps || !charState.el) {
        clearInterval(flapInterval);
        charState.el.style.transform = '';
        return;
      }
      const offsetY = flaps % 2 === 0 ? -1 : 0;
      charState.el.style.transform = `translateY(${offsetY}px) scaleY(${flaps % 2 === 0 ? 0.98 : 1})`;
      flaps++;
    }, 120);
  }

  // ── Speech bubbles ──
  function showSpeechBubble(charId, text) {
    const charState = state.characters[charId];
    if (!charState?.el) return;

    removeSpeechBubble(charId);

    const bubble = document.createElement('div');
    bubble.className = 'puppet-speech-bubble';
    bubble.style.cssText = `
      position: absolute;
      background: rgba(10,7,0,0.94);
      border: 1px solid ${CHARACTERS[charId].color};
      color: ${CHARACTERS[charId].color};
      padding: 8px 12px;
      font-size: 12px;
      max-width: 200px;
      z-index: 60;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
      box-shadow: 2px 2px 8px rgba(0,0,0,0.6);
      border-radius: 4px;
    `;
    bubble.textContent = text;

    // Position above character
    const left = charState.x;
    const top = Math.max(2, charState.y - 12);
    bubble.style.left = left + '%';
    bubble.style.top = top + '%';

    stageEl.appendChild(bubble);
    requestAnimationFrame(() => { bubble.style.opacity = '1'; });

    speechBubbles[charId] = bubble;

    // Auto-remove after duration based on text length
    const duration = Math.max(3000, text.length * 80);
    setTimeout(() => removeSpeechBubble(charId), duration);
  }

  function removeSpeechBubble(charId) {
    if (speechBubbles[charId]) {
      const b = speechBubbles[charId];
      b.style.opacity = '0';
      setTimeout(() => b.remove(), 300);
      delete speechBubbles[charId];
    }
  }

  // ── Backdrop ──
  function setBackdrop(name) {
    const bd = BACKDROPS[name];
    if (!bd) {
      return { ok: false, error: `Unknown backdrop: ${name}. Available: ${Object.keys(BACKDROPS).join(', ')}` };
    }

    state.backdrop = name;

    if (bd.type === 'preset') {
      // Warp to preset room
      if (onWarp) onWarp(bd.room);
      log(`🎬 Backdrop → ${name} (preset room)`, 'backdrop');
    } else if (bd.type === 'generated') {
      // Request asset generation
      log(`🎬 Backdrop → ${name} (generating...)`, 'backdrop');
      if (onAssetRequest) {
        onAssetRequest({
          type: 'backdrop',
          prompt: bd.prompt,
          name,
          callback: (imageUrl) => {
            if (imageUrl) {
              applyGeneratedBackdrop(imageUrl, name);
              log(`✅ Backdrop "${name}" generated and applied`, 'backdrop');
            } else {
              log(`⚠️ Backdrop generation failed, using fallback`, 'backdrop');
              applyFallbackBackdrop(name);
            }
          }
        });
      } else {
        applyFallbackBackdrop(name);
      }
    }

    updateStateTracker();
    return { ok: true };
  }

  function applyGeneratedBackdrop(imageUrl, name) {
    const bgEl = document.getElementById('story-backdrop') || document.getElementById('scene-bg');
    if (bgEl) {
      bgEl.src = imageUrl;
      bgEl.style.display = 'block';
      bgEl.style.opacity = '0';
      bgEl.onload = () => {
        bgEl.style.transition = 'opacity 1.5s ease';
        bgEl.style.opacity = '1';
      };
    }
  }

  function applyFallbackBackdrop(name) {
    // Draw a colored fallback on canvas based on name
    const colors = {
      forest: '#0a1a08', cave: '#080014', storm: '#040814',
      space: '#000004', castle: '#1a0e08', island: '#082028'
    };
    if (canvasEl && ctxRef) {
      ctxRef.fillStyle = colors[name] || '#000';
      ctxRef.fillRect(0, 0, canvasEl.width, canvasEl.height);
    }
  }

  // ── Props ──
  function handlePropCommand(rest) {
    const parts = rest.split(/\s+/);
    const propName = parts[0]?.toLowerCase();
    const action = parts[1]?.toLowerCase();

    if (!PROPS[propName]) {
      return { ok: false, error: `Unknown prop: ${propName}. Available: ${Object.keys(PROPS).join(', ')}` };
    }

    if (action === 'appear' || action === 'show') {
      return propAppear(propName);
    } else if (action === 'disappear' || action === 'hide' || action === 'vanish') {
      return propDisappear(propName);
    }
    return { ok: false, error: `Unknown prop action: ${action}` };
  }

  function propAppear(propName) {
    if (!state.props[propName]) {
      state.props[propName] = { visible: false, x: 40, y: 50 };
    }

    const propState = state.props[propName];
    const prop = PROPS[propName];

    let el = document.getElementById(`prop-${propName}`);
    if (!el) {
      el = document.createElement('div');
      el.id = `prop-${propName}`;
      el.className = 'puppet-prop';
      el.style.cssText = `
        position: absolute;
        z-index: 14;
        pointer-events: auto;
        cursor: pointer;
        font-size: 32px;
        opacity: 0;
        transition: opacity 1s ease, transform 1s ease;
        transform: scale(0);
        text-align: center;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.6));
      `;
      el.textContent = prop.icon;
      stageEl.appendChild(el);

      el.addEventListener('click', () => {
        log(`📍 Player clicked on ${prop.name}`, 'action');
      });
    }

    propState.x = 35 + Math.random() * 30;
    propState.y = 40 + Math.random() * 20;
    el.style.left = propState.x + '%';
    el.style.top = propState.y + '%';
    el.style.display = 'flex';

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });

    propState.visible = true;
    propState.el = el;

    // If it's a minigame prop, launch the minigame
    if (propName === 'chess_board') {
      setTimeout(() => startMinigame('chess'), 800);
    } else if (propName === 'card_table') {
      setTimeout(() => startMinigame('cards'), 800);
    } else if (propName === 'map_table') {
      setTimeout(() => startMinigame('map'), 800);
    }

    log(`📦 ${prop.name} appears`, 'action');
    updateStateTracker();
    return { ok: true };
  }

  function propDisappear(propName) {
    const propState = state.props[propName];
    if (!propState || !propState.visible) {
      return { ok: false, error: `${PROPS[propName]?.name || propName} is not present` };
    }

    if (propState.el) {
      propState.el.style.opacity = '0';
      propState.el.style.transform = 'scale(0)';
      setTimeout(() => { propState.el.style.display = 'none'; }, 1000);
    }

    propState.visible = false;

    // Stop associated minigame
    if (state.minigame && (propName.includes('chess') || propName.includes('card') || propName.includes('map'))) {
      stopMinigame();
    }

    log(`📦 ${PROPS[propName]?.name || propName} disappears`, 'action');
    updateStateTracker();
    return { ok: true };
  }

  // ── Warp ──
  function warpTo(room) {
    const bd = BACKDROPS[room];
    if (!bd) {
      return { ok: false, error: `Unknown location: ${room}` };
    }

    log(`🌀 WARP → ${room}`, 'warp');

    // Fade out
    const fadeOverlay = document.getElementById('story-fade') || document.getElementById('fade-overlay');
    if (fadeOverlay) {
      fadeOverlay.style.opacity = '1';
      fadeOverlay.style.pointerEvents = 'auto';
    }

    setTimeout(() => {
      setBackdrop(room);
      if (fadeOverlay) {
        fadeOverlay.style.opacity = '0';
        fadeOverlay.style.pointerEvents = 'none';
      }
    }, 1000);

    return { ok: true };
  }

  // ── Ambient ──
  function setAmbient(name) {
    const amb = AMBIENTS[name];
    if (!amb) {
      return { ok: false, error: `Unknown ambient: ${name}. Available: ${Object.keys(AMBIENTS).join(', ')}` };
    }

    state.ambient = name;

    const audioEl = document.getElementById('audio-ambient');
    if (audioEl) {
      if (amb.file) {
        audioEl.src = amb.file;
        audioEl.play().catch(() => {});
      } else {
        audioEl.pause();
      }
    }

    log(`🎵 Ambient → ${amb.label}`, 'ambient');
    updateStateTracker();
    return { ok: true };
  }

  // ── Effects ──
  function playEffect(name) {
    const effects = {
      shake: () => {
        if (stageEl) {
          let frames = 0;
          const shake = setInterval(() => {
            if (frames > 10) { clearInterval(shake); stageEl.style.transform = ''; return; }
            stageEl.style.transform = `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*6}px)`;
            frames++;
          }, 50);
        }
      },
      flash: () => {
        const flash = document.createElement('div');
        flash.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:white;z-index:999;opacity:0.8;pointer-events:none;transition:opacity 0.5s;`;
        stageEl.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; }, 100);
        setTimeout(() => flash.remove(), 600);
      },
      fade: () => {
        const fade = document.createElement('div');
        fade.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:black;z-index:998;opacity:0;transition:opacity 1.5s;pointer-events:none;`;
        stageEl.appendChild(fade);
        requestAnimationFrame(() => { fade.style.opacity = '1'; });
        setTimeout(() => { fade.style.opacity = '0'; }, 2000);
        setTimeout(() => fade.remove(), 3500);
      },
      lightning: () => {
        playEffect('flash');
        setTimeout(() => playEffect('flash'), 200);
        setTimeout(() => playEffect('flash'), 500);
      },
      sparkles: () => {
        for (let i = 0; i < 15; i++) {
          setTimeout(() => createSparkle(), i * 100);
        }
      }
    };

    if (effects[name]) {
      effects[name]();
      log(`✨ Effect: ${name}`, 'effect');
      return { ok: true };
    }
    return { ok: false, error: `Unknown effect: ${name}` };
  }

  function createSparkle() {
    const sparkle = document.createElement('div');
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    sparkle.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: ${y}%;
      width: 4px;
      height: 4px;
      background: #ffe080;
      border-radius: 50%;
      z-index: 500;
      pointer-events: none;
      box-shadow: 0 0 8px #ffe080;
      animation: sparkleFade 2s ease forwards;
    `;
    stageEl.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 2000);
  }

  // Add sparkle keyframes if not present
  if (!document.getElementById('sparkle-keyframes')) {
    const style = document.createElement('style');
    style.id = 'sparkle-keyframes';
    style.textContent = `
      @keyframes sparkleFade {
        0% { opacity: 0; transform: scale(0); }
        30% { opacity: 1; transform: scale(1.5); }
        100% { opacity: 0; transform: scale(0.5) translateY(-20px); }
      }
      .puppet-sprite { image-rendering: pixelated; image-rendering: crisp-edges; }
    `;
    document.head.appendChild(style);
  }

  // ── Mini-games ──
  function handleMinigameCommand(rest) {
    const parts = rest.split(/\s+/);
    const gameName = parts[0]?.toLowerCase();
    const action = parts[1]?.toLowerCase();

    if (action === 'start' || action === 'begin' || !action) {
      return startMinigame(gameName);
    } else if (action === 'stop' || action === 'end') {
      return stopMinigame();
    }
    return { ok: false, error: `Unknown minigame action: ${action}` };
  }

  function startMinigame(name) {
    stopMinigame(); // clean up any existing

    const overlay = document.createElement('div');
    overlay.id = 'minigame-overlay';
    overlay.style.cssText = `
      position: absolute;
      bottom: 10%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10,7,0,0.95);
      border: 2px solid #4a3520;
      z-index: 70;
      padding: 12px;
      box-shadow: 4px 4px 16px rgba(0,0,0,0.8);
    `;

    if (name === 'chess') {
      overlay.innerHTML = buildChessBoard();
    } else if (name === 'cards') {
      overlay.innerHTML = buildCardGame();
    } else if (name === 'map') {
      overlay.innerHTML = buildMapTable();
    } else {
      overlay.remove();
      return { ok: false, error: `Unknown minigame: ${name}` };
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `position:absolute;top:4px;right:6px;background:none;border:none;color:#8a6a30;cursor:pointer;font-size:14px;`;
    closeBtn.onclick = () => stopMinigame();
    overlay.appendChild(closeBtn);

    stageEl.appendChild(overlay);
    state.minigame = name;

    // Wire up interactions
    if (name === 'chess') wireChess(overlay);
    if (name === 'cards') wireCards(overlay);
    if (name === 'map') wireMap(overlay);

    log(`🎮 Mini-game started: ${name}`, 'minigame');
    updateStateTracker();
    return { ok: true };
  }

  function stopMinigame() {
    const overlay = document.getElementById('minigame-overlay');
    if (overlay) overlay.remove();
    if (state.minigame) {
      log(`🎮 Mini-game ended: ${state.minigame}`, 'minigame');
    }
    state.minigame = null;
    updateStateTracker();
    return { ok: true };
  }

  // ── Chess Board ──
  function buildChessBoard() {
    let html = '<div style="color:#c8a050;font-size:10px;margin-bottom:6px;text-align:center;letter-spacing:1px;">♟ CHESS ♟</div>';
    html += '<div id="chess-board" style="display:grid;grid-template-columns:repeat(8,28px);grid-template-rows:repeat(8,28px);gap:0;border:2px solid #4a3520;">';
    const pieces = ['♜','♞','♝','♛','♚','♝','♞','♜'];
    const pawns = '♟';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const bg = isLight ? '#c8a050' : '#5a3e20';
        let piece = '';
        if (r === 0) piece = `<span style="color:#1a1a1a;font-size:20px;">${pieces[c]}</span>`;
        else if (r === 1) piece = `<span style="color:#1a1a1a;font-size:18px;">${pawns}</span>`;
        else if (r === 6) piece = `<span style="color:#f0f0f0;font-size:18px;">${pawns}</span>`;
        else if (r === 7) piece = `<span style="color:#f0f0f0;font-size:20px;">${pieces[c]}</span>`;
        html += `<div class="chess-square" data-r="${r}" data-c="${c}" style="width:28px;height:28px;background:${bg};display:flex;align-items:center;justify-content:center;cursor:pointer;">${piece}</div>`;
      }
    }
    html += '</div>';
    html += '<div id="chess-status" style="color:#888;font-size:9px;text-align:center;margin-top:4px;">Click a piece to select</div>';
    return html;
  }

  function wireChess(overlay) {
    let selected = null;
    overlay.querySelectorAll('.chess-square').forEach(sq => {
      sq.addEventListener('click', () => {
        const status = overlay.querySelector('#chess-status');
        if (selected) {
          // Try to move
          const piece = selected.querySelector('span');
          if (piece) {
            if (sq.querySelector('span')) sq.querySelector('span').remove();
            sq.appendChild(piece.cloneNode(true));
            piece.remove();
            status.textContent = 'Piece moved';
          }
          selected.style.outline = '';
          selected = null;
        } else {
          if (sq.querySelector('span')) {
            selected = sq;
            sq.style.outline = '2px solid #ffe080';
            status.textContent = 'Selected — click destination';
          }
        }
      });
    });
  }

  // ── Card Game ──
  function buildCardGame() {
    const suits = ['♠','♥','♦','♣'];
    const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const deck = [];
    suits.forEach(s => values.forEach(v => deck.push({ suit: s, value: v, red: s === '♥' || s === '♦' })));
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    let html = '<div style="color:#c8a050;font-size:10px;margin-bottom:6px;text-align:center;letter-spacing:1px;">🂠 CARDS 🂠</div>';
    html += '<div id="card-area" style="display:flex;gap:8px;min-height:80px;align-items:center;justify-content:center;">';
    html += '<div id="deck-pile" style="cursor:pointer;font-size:28px;">🂠</div>';
    html += '<div id="card-slots" style="display:flex;gap:8px;">';
    for (let i = 0; i < 3; i++) {
      html += '<div class="card-slot" data-idx="${i}" style="width:44px;height:60px;border:1px dashed #4a3520;display:flex;align-items:center;justify-content:center;"></div>';
    }
    html += '</div></div>';
    html += '<div id="card-status" style="color:#888;font-size:9px;text-align:center;margin-top:4px;">Click deck to draw</div>';
    return html;
  }

  function wireCards(overlay) {
    let drawn = 0;
    const suits = ['♠','♥','♦','♣'];
    const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const status = overlay.querySelector('#card-status');

    overlay.querySelector('#deck-pile').addEventListener('click', () => {
      const slots = overlay.querySelectorAll('.card-slot');
      const emptySlot = Array.from(slots).find(s => !s.querySelector('.card'));
      if (!emptySlot) {
        status.textContent = 'All slots full — clear to draw more';
        return;
      }
      const suit = suits[Math.floor(Math.random() * 4)];
      const value = values[Math.floor(Math.random() * 13)];
      const red = suit === '♥' || suit === '♦';

      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = `
        width:40px;height:56px;background:#f8f0e0;border:1px solid #4a3520;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:pointer;font-family:serif;animation:cardFlip 0.4s ease;
        color:${red ? '#cc2222' : '#1a1a1a'};
      `;
      card.innerHTML = `<span style="font-size:14px;">${value}</span><span style="font-size:16px;">${suit}</span>`;
      card.addEventListener('click', () => { card.remove(); status.textContent = 'Card discarded'; });
      emptySlot.appendChild(card);
      drawn++;
      status.textContent = `Drew ${value}${suit}`;
    });
  }

  // ── Map Table ──
  function buildMapTable() {
    let html = '<div style="color:#c8a050;font-size:10px;margin-bottom:6px;text-align:center;letter-spacing:1px;">🗺 NAUTICAL CHART 🗺</div>';
    html += '<canvas id="map-canvas" width="240" height="160" style="border:1px solid #4a3520;background:#0a2010;cursor:crosshair;"></canvas>';
    html += '<div style="display:flex;gap:8px;justify-content:center;margin-top:6px;">';
    html += '<button id="map-clear" style="background:#1a1208;color:#c8a050;border:1px solid #4a3520;padding:3px 10px;font-size:10px;cursor:pointer;">Clear</button>';
    html += '<span style="color:#888;font-size:9px;align-self:center;">Draw on the chart</span>';
    html += '</div>';
    return html;
  }

  function wireMap(overlay) {
    const mapCanvas = overlay.querySelector('#map-canvas');
    const mctx = mapCanvas.getContext('2d');
    mctx.fillStyle = '#0a2010';
    mctx.fillRect(0, 0, 240, 160);

    // Draw decorative grid
    mctx.strokeStyle = 'rgba(0,80,40,0.3)';
    mctx.lineWidth = 1;
    for (let x = 0; x < 240; x += 20) { mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, 160); mctx.stroke(); }
    for (let y = 0; y < 160; y += 20) { mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(240, y); mctx.stroke(); }

    // Draw a coastline
    mctx.strokeStyle = '#00aa44';
    mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.moveTo(20, 40); mctx.bezierCurveTo(60, 30, 80, 60, 120, 50);
    mctx.bezierCurveTo(160, 40, 180, 70, 220, 55);
    mctx.stroke();

    // Label
    mctx.fillStyle = '#0a6030';
    mctx.font = '8px monospace';
    mctx.fillText('CAPE HOPE', 80, 35);
    mctx.fillText('DEPTH 30m', 140, 120);

    let drawing = false;
    let lastX = 0, lastY = 0;

    mapCanvas.addEventListener('mousedown', (e) => {
      drawing = true;
      const rect = mapCanvas.getBoundingClientRect();
      lastX = (e.clientX - rect.left) * (mapCanvas.width / rect.width);
      lastY = (e.clientY - rect.top) * (mapCanvas.height / rect.height);
    });

    mapCanvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const rect = mapCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (mapCanvas.width / rect.width);
      const y = (e.clientY - rect.top) * (mapCanvas.height / rect.height);
      mctx.strokeStyle = '#ff4422';
      mctx.lineWidth = 2;
      mctx.beginPath();
      mctx.moveTo(lastX, lastY);
      mctx.lineTo(x, y);
      mctx.stroke();
      lastX = x;
      lastY = y;
    });

    mapCanvas.addEventListener('mouseup', () => { drawing = false; });
    mapCanvas.addEventListener('mouseleave', () => { drawing = false; });

    overlay.querySelector('#map-clear').addEventListener('click', () => {
      mctx.fillStyle = '#0a2010';
      mctx.fillRect(0, 0, 240, 160);
      // Redraw grid + coastline
      mctx.strokeStyle = 'rgba(0,80,40,0.3)';
      mctx.lineWidth = 1;
      for (let x = 0; x < 240; x += 20) { mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, 160); mctx.stroke(); }
      for (let y = 0; y < 160; y += 20) { mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(240, y); mctx.stroke(); }
      mctx.strokeStyle = '#00aa44';
      mctx.lineWidth = 2;
      mctx.beginPath();
      mctx.moveTo(20, 40); mctx.bezierCurveTo(60, 30, 80, 60, 120, 50);
      mctx.bezierCurveTo(160, 40, 180, 70, 220, 55);
      mctx.stroke();
      mctx.fillStyle = '#0a6030';
      mctx.font = '8px monospace';
      mctx.fillText('CAPE HOPE', 80, 35);
      mctx.fillText('DEPTH 30m', 140, 120);
    });
  }

  // ── Batch execute (for scripts) ──
  function executeScript(lines, delayMs = 1500) {
    let idx = 0;
    function next() {
      if (idx >= lines.length) return;
      const line = lines[idx].trim();
      if (line && !line.startsWith('//')) {
        executeCommand(line);
      }
      idx++;
      setTimeout(next, delayMs);
    }
    next();
  }

  // ── Get available commands (for autocomplete/help) ──
  function getHelp() {
    return {
      characters: Object.keys(CHARACTERS),
      gestures: Object.keys(GESTURES),
      backdrops: Object.keys(BACKDROPS),
      props: Object.keys(PROPS),
      ambients: Object.keys(AMBIENTS),
      effects: ['shake', 'flash', 'fade', 'lightning', 'sparkles'],
      minigames: ['chess', 'cards', 'map'],
      examples: [
        'riker enter',
        "riker say 'Hello there, traveler'",
        'riker gesture nod',
        'wesley enter from right',
        'wesley gesture confused',
        'backdrop forest',
        'prop chess_board appear',
        'warp to galley',
        'ambient ocean_storm',
        'effect lightning',
        'minigame cards start'
      ]
    };
  }

  return {
    init,
    executeCommand,
    executeScript,
    getHelp,
    state,
    CHARACTERS,
    GESTURES,
    BACKDROPS,
    PROPS,
    AMBIENTS
  };
})();
