/**
 * twin-mode.js — Twin-Mode Personality System
 * 
 * Finding: The prototype scored 33/100 on tolerability.
 * The biggest fix: the system needs two personalities.
 * 
 * DECKHAND MODE (volume 0-50):
 *   - Minimal UI, no speech bubbles unless explicitly asked
 *   - Responses under 50 characters
 *   - Ambient sound only, no narration
 *   - Gets things done invisibly
 *   - Speaks in grunts, confirmations, status codes
 * 
 * COMPANION MODE (volume 51-100):
 *   - Full UI, proactive speech bubbles
 *   - Responses in full sentences
 *   - Asks questions, makes observations
 *   - Narrates the world
 *   - Tells stories, shares opinions
 * 
 * Volume knob: 0=silent, 50=deckhand, 100=companion
 * 
 * Commands:
 *   "be quiet"  → switches to DECKHAND
 *   "talk to me" → switches to COMPANION
 *   "shut up"   → switches to DECKHAND (volume 0)
 *   "say something" → switches to COMPANION (volume 100)
 * 
 * Usage:
 *   <script src="src/twin-mode.js"></script>
 *   TwinMode.init();  // reads saved preference or defaults to DECKHAND
 *   TwinMode.setVolume(75);  // 0-100
 *   const personality = TwinMode.getMode();  // 'deckhand' | 'companion'
 */

const TwinMode = (function () {
  'use strict';

  // ════════════════════════════════════════════════════════════
  // CONSTANTS
  // ════════════════════════════════════════════════════════════

  const MODES = {
    SILENT: 'silent',      // volume 0 — no output at all
    DECKHAND: 'deckhand',  // volume 1-50 — minimal, functional
    COMPANION: 'companion' // volume 51-100 — full, conversational
  };

  const DECKHAND_RESPONSES = {
    ack: ['ok.', 'done.', 'got it.', 'aye.', 'on it.', 'sure.', 'right.'],
    neg: ['no.', "can't.", 'negative.', 'nope.'],
    thinking: ['...', 'working.', 'hmm.', 'one sec.'],
    done: ['finished.', 'all set.', 'complete.', 'done.'],
    error: ['failed.', "can't do that.", 'no luck.', 'error.'],
    greeting: ['hey.', 'hi.', 'yo.'],
    farewell: ['later.', 'bye.', 'out.']
  };

  const COMPANION_RESPONSES = {
    ack: [
      "Consider it done. I'll take care of that right now.",
      "On it! Give me just a moment.",
      "Absolutely — that's a straightforward one.",
      "Got it. I'll handle that and let you know when it's ready."
    ],
    neg: [
      "I'm afraid I can't do that right now. Want me to try another approach?",
      "Hmm, that didn't work. Shall I try something different?",
      "I hit a wall on that one. But I have a few ideas — want to hear them?"
    ],
    thinking: [
      "Let me think about that for a second...",
      "Hmm, that's an interesting one. Let me work through it.",
      "Give me a moment — I want to get this right."
    ],
    done: [
      "All finished! Anything else you'd like me to handle?",
      "Done and dusted. What's next on the list?",
      "That's taken care of. I also noticed a few things while I was in there — want me to mention them?"
    ],
    error: [
      "I ran into trouble with that. Here's what happened: ",
      "That didn't go as planned. But I've got a backup idea —",
      "Something went sideways. Let me walk you through it."
    ],
    greeting: [
      "Hey there! Good to see you. What are we working on today?",
      "Hello! I've been keeping an eye on things. All quiet.",
      "Hi! Ready when you are. What's on your mind?"
    ],
    farewell: [
      "Take care! I'll keep watch while you're away.",
      "See you later. I'll be here if you need anything.",
      "Goodbye for now. The ship's in good hands."
    ],
    proactive: [
      "I noticed something interesting in the logs —",
      "By the way, the engine room has been quiet for a while.",
      "Just so you know, there's a new message on the radio.",
      "I was thinking about what you said earlier."
    ]
  };

  // ════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════

  let volume = 50;          // default: deckhand
  let mode = MODES.DECKHAND;
  let listeners = [];
  let proactiveTimer = null;
  let lastSpoke = 0;
  let speechCount = 0;
  let suppressed = false;   // fully silent

  // ════════════════════════════════════════════════════════════
  // VOLUME / MODE MANAGEMENT
  // ════════════════════════════════════════════════════════════

  function setVolume(v) {
    v = Math.max(0, Math.min(100, Math.round(v)));
    const oldMode = mode;
    volume = v;

    if (v === 0) {
      mode = MODES.SILENT;
      suppressed = true;
    } else if (v <= 50) {
      mode = MODES.DECKHAND;
      suppressed = false;
    } else {
      mode = MODES.COMPANION;
      suppressed = false;
    }

    _saveState();

    if (oldMode !== mode) {
      _notifyModeChange(oldMode, mode);
    }

    _updateProactiveTimer();
    _updateUI();

    return mode;
  }

  function getVolume() {
    return volume;
  }

  function getMode() {
    return mode;
  }

  function isDeckhand() {
    return mode === MODES.DECKHAND || mode === MODES.SILENT;
  }

  function isCompanion() {
    return mode === MODES.COMPANION;
  }

  function isSilent() {
    return mode === MODES.SILENT;
  }

  // ════════════════════════════════════════════════════════════
  // SPEECH GENERATION
  // ════════════════════════════════════════════════════════════

  /**
   * Generate a response appropriate to the current mode.
   * Deckhand: short, functional, under 50 chars.
   * Companion: full sentences, conversational.
   * Silent: nothing.
   */
  function speak(type = 'ack', customText = null) {
    if (suppressed && !customText) return null;
    if (customText) return _deliver(customText);

    const responses = isCompanion()
      ? COMPANION_RESPONSES[type] || COMPANION_RESPONSES.ack
      : DECKHAND_RESPONSES[type] || DECKHAND_RESPONSES.ack;

    const text = responses[Math.floor(Math.random() * responses.length)];
    return _deliver(text);
  }

  function _deliver(text) {
    lastSpoke = Date.now();
    speechCount++;

    // Truncate deckhand responses to 50 chars
    if (isDeckhand() && text.length > 50) {
      text = text.substring(0, 47) + '...';
    }

    _showSpeechBubble(text);
    _notifySpeak(text);
    return text;
  }

  /**
   * Check if the agent should speak proactively.
   * Only in COMPANION mode, and only every 60+ seconds.
   */
  function maybeSpeakProactively() {
    if (!isCompanion()) return null;
    if (Date.now() - lastSpoke < 60000) return null;

    const lines = COMPANION_RESPONSES.proactive;
    const text = lines[Math.floor(Math.random() * lines.length)];
    return _deliver(text);
  }

  // ════════════════════════════════════════════════════════════
  // COMMAND PARSING
  // ════════════════════════════════════════════════════════════

  const COMMANDS = {
    'be quiet': () => setVolume(40),
    'quiet': () => setVolume(40),
    'shh': () => setVolume(20),
    'shut up': () => setVolume(0),
    'silence': () => setVolume(0),
    'talk to me': () => setVolume(100),
    'say something': () => setVolume(100),
    'chat': () => setVolume(75),
    'keep me company': () => setVolume(90),
    'tell me everything': () => setVolume(100),
    'enough': () => setVolume(30),
    'too loud': () => setVolume(40),
    'too quiet': () => setVolume(80),
  };

  /**
   * Parse a user message for twin-mode commands.
   * Returns true if the message was a mode command.
   */
  function parseCommand(input) {
    const lower = input.toLowerCase().trim();

    // Exact match
    if (COMMANDS[lower]) {
      COMMANDS[lower]();
      return true;
    }

    // Partial match — "can you be quiet" → "be quiet"
    for (const [cmd, fn] of Object.entries(COMMANDS)) {
      if (lower.includes(cmd)) {
        fn();
        return true;
      }
    }

    // Volume set: "volume 75" or "set volume to 60"
    const volMatch = lower.match(/(?:set\s+)?volume\s+(?:to\s+)?(\d+)/);
    if (volMatch) {
      setVolume(parseInt(volMatch[1]));
      return true;
    }

    return false;
  }

  // ════════════════════════════════════════════════════════════
  // UI: SPEECH BUBBLE
  // ════════════════════════════════════════════════════════════

  function _showSpeechBubble(text) {
    if (typeof document === 'undefined') return;

    let bubble = document.getElementById('twin-mode-bubble');
    if (!bubble) {
      bubble = _createSpeechBubble();
    }

    // Don't show bubbles in silent mode
    if (isSilent()) return;

    // In deckhand mode, only show if explicitly asked or for important things
    if (isDeckhand() && speechCount % 3 !== 0 && text.length < 20) {
      // Subtle: just flash the status indicator
      _flashIndicator();
      return;
    }

    bubble.textContent = text;
    bubble.classList.add('visible');

    // Auto-hide based on mode
    const duration = isDeckhand() ? 2000 : 5000;
    clearTimeout(bubble._hideTimer);
    bubble._hideTimer = setTimeout(() => {
      bubble.classList.remove('visible');
    }, duration);
  }

  function _createSpeechBubble() {
    const bubble = document.createElement('div');
    bubble.id = 'twin-mode-bubble';
    bubble.style.cssText = `
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 7, 0, 0.92);
      border: 1px solid var(--twin-accent, #4a3520);
      color: var(--twin-text, #c8a050);
      padding: 8px 16px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-width: 280px;
      text-align: center;
      border-radius: 2px;
      z-index: 250;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    bubble.classList.add('twin-mode-bubble');
    
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(bubble);
    return bubble;
  }

  // ════════════════════════════════════════════════════════════
  // UI: VOLUME KNOB
  // ════════════════════════════════════════════════════════════

  function _createVolumeKnob() {
    if (typeof document === 'undefined') return;

    // Remove existing
    const existing = document.getElementById('twin-mode-knob');
    if (existing) existing.remove();

    const knob = document.createElement('div');
    knob.id = 'twin-mode-knob';
    knob.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 200;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(10, 7, 0, 0.7);
      padding: 2px 6px;
      border: 1px solid #3a2a10;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 9px;
    `;

    // Label
    const label = document.createElement('span');
    label.id = 'twin-mode-label';
    label.style.cssText = 'color: #8a6a30; min-width: 60px; text-transform: uppercase; letter-spacing: 1px;';
    knob.appendChild(label);

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 100;
    slider.value = volume;
    slider.id = 'twin-mode-slider';
    slider.style.cssText = `
      width: 60px;
      height: 10px;
      -webkit-appearance: none;
      background: linear-gradient(to right, #2a1a08, #4a3520, #c8a050);
      outline: none;
      border-radius: 5px;
    `;
    slider.oninput = (e) => setVolume(parseInt(e.target.value));
    knob.appendChild(slider);

    // Insert into game container or body
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(knob);

    _updateUI();
  }

  function _updateUI() {
    if (typeof document === 'undefined') return;

    const label = document.getElementById('twin-mode-label');
    if (label) {
      if (isSilent()) {
        label.textContent = '○ SILENT';
        label.style.color = '#5a4020';
      } else if (isDeckhand()) {
        label.textContent = '◐ DECKHAND';
        label.style.color = '#8a6a30';
      } else {
        label.textContent = '● COMPANION';
        label.style.color = '#e8b840';
      }
    }

    const slider = document.getElementById('twin-mode-slider');
    if (slider) {
      slider.value = volume;
    }

    // Update CSS variables for speech bubble color
    document.documentElement.style.setProperty(
      '--twin-accent',
      isCompanion() ? '#e8b840' : '#4a3520'
    );
    document.documentElement.style.setProperty(
      '--twin-text',
      isCompanion() ? '#ffe080' : '#c8a050'
    );

    // Toggle speech bubble visibility
    const bubble = document.getElementById('twin-mode-bubble');
    if (bubble && isSilent()) {
      bubble.classList.remove('visible');
    }
  }

  function _flashIndicator() {
    const label = document.getElementById('twin-mode-label');
    if (label) {
      label.style.transition = 'color 0.15s';
      label.style.color = '#ffe080';
      setTimeout(() => _updateUI(), 300);
    }
  }

  // ════════════════════════════════════════════════════════════
  // PROACTIVE TIMER
  // ════════════════════════════════════════════════════════════

  function _updateProactiveTimer() {
    if (proactiveTimer) {
      clearInterval(proactiveTimer);
      proactiveTimer = null;
    }

    if (isCompanion()) {
      // Every 90 seconds, try to speak proactively
      proactiveTimer = setInterval(() => {
        maybeSpeakProactively();
      }, 90000);
    }
  }

  // ════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ════════════════════════════════════════════════════════════

  function _saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('twin-mode-volume', String(volume));
      }
    } catch (e) { /* ignore */ }
  }

  function _loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('twin-mode-volume');
        if (saved !== null) {
          setVolume(parseInt(saved));
          return;
        }
      }
    } catch (e) { /* ignore */ }
    // Default: deckhand mode
    setVolume(50);
  }

  // ════════════════════════════════════════════════════════════
  // EVENT SYSTEM
  // ════════════════════════════════════════════════════════════

  function onModeChange(cb) {
    listeners.push(cb);
  }

  function _notifyModeChange(oldMode, newMode) {
    listeners.forEach(cb => cb(oldMode, newMode, volume));
  }

  function _notifySpeak(text) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twin-mode-speak', {
        detail: { text, mode, volume }
      }));
    }
  }

  // ════════════════════════════════════════════════════════════
  // INTEGRATION HOOKS
  // ════════════════════════════════════════════════════════════

  /**
   * Filter an agent's response through the current mode.
   * Use this to wrap NPC dialogue.
   */
  function filterResponse(text) {
    if (isSilent()) return '';
    if (isDeckhand()) {
      // Truncate to 50 chars, keep first sentence
      const firstSentence = text.split(/[.!?]/)[0];
      if (firstSentence.length <= 50) return firstSentence + '.';
      return firstSentence.substring(0, 47) + '...';
    }
    return text; // companion: full text
  }

  /**
   * Should the agent show a speech bubble right now?
   */
  function shouldShowBubble() {
    if (isSilent()) return false;
    if (isDeckhand()) {
      // In deckhand mode, show bubbles rarely
      return speechCount % 3 === 0;
    }
    return true;
  }

  /**
   * Get the maximum response length for the current mode.
   */
  function maxResponseLength() {
    if (isSilent()) return 0;
    if (isDeckhand()) return 50;
    return Infinity;
  }

  // ════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════

  function init() {
    _loadState();
    _createVolumeKnob();
    _updateProactiveTimer();

    // Listen for page messages to intercept commands
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'player-input') {
          parseCommand(e.data.text);
        }
      });
    }

    console.log(`[TwinMode] Initialized: ${mode} (volume ${volume})`);
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    MODES,
    init,
    setVolume,
    getVolume,
    getMode,
    isDeckhand,
    isCompanion,
    isSilent,
    speak,
    maybeSpeakProactively,
    parseCommand,
    filterResponse,
    shouldShowBubble,
    maxResponseLength,
    onModeChange,
  };
})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TwinMode;
}
if (typeof window !== 'undefined') {
  window.TwinMode = TwinMode;
}
