/**
 * device-skins.js — Device-Contextual Skins for Plato's Shell
 *
 * The ScummVM rendering is NOT a generic pixel-art game UI.
 * The visual skin ADAPTS to match the physical space the device lives in.
 * A phone in the engine room shows an engine diagnostic bay.
 * A tablet at the helm shows a wheelhouse.
 * A server rack running agents shows a bar interior.
 *
 * The interface is a costume. The skin is environment.
 */

class DeviceSkin {
  constructor() {
    this.currentSkin = null;
    this.currentSkinId = null;
    this.gameContainer = null;
    this.styleElement = null;
    this.ambientCanvas = null;
    this.ambientCtx = null;
    this.ambientRAF = null;
    this.ambientPhase = 0;

    // ── SKIN DEFINITIONS ──
    // Each skin transforms the entire ScummVM UI to match the room's device context.
    // CSS variables are injected onto #game-container and cascade through all child elements.
    this.SKINS = {
      'bar': {
        name: 'The Tap',
        description: 'A tavern interior — warm amber, wood grain, candlelight',
        cssVars: {
          '--skin-bg': '#0a0700',
          '--skin-bg-gradient-top': '#1a1208',
          '--skin-bg-gradient-bot': '#2a1e10',
          '--skin-accent': '#e8b840',
          '--skin-accent-bright': '#ffe080',
          '--skin-accent-dim': '#8a6a30',
          '--skin-border': '#4a3520',
          '--skin-text': '#c8a050',
          '--skin-text-bright': '#e8b840',
          '--skin-panel-bg': 'rgba(10,7,0,0.85)',
          '--skin-verb-bg': '#0d0900',
          '--skin-verb-hover': 'rgba(74,53,32,0.3)',
          '--skin-verb-selected': 'rgba(200,160,80,0.2)',
          '--skin-cursor': 'pointer',
          '--skin-font': "'Courier New', Courier, monospace",
          '--skin-crt-opacity': '0.15',
          '--skin-crt-color': '0,0,0',
          '--skin-overlay-tint': 'rgba(0,0,0,0)',
          '--skin-ambient-color': 'rgba(232,184,64,0.04)',
          '--skin-ambient-speed': '0.04'
        },
        cursor: 'pointer',
        font: "'Courier New', Courier, monospace",
        ambient: 'dust-motes',
        crtIntensity: 0.15
      },

      'bridge': {
        name: 'The Bridge',
        description: 'A vessel wheelhouse — dark blue, phosphor green, radar sweep',
        cssVars: {
          '--skin-bg': '#000a14',
          '--skin-bg-gradient-top': '#001830',
          '--skin-bg-gradient-bot': '#003860',
          '--skin-accent': '#44ccff',
          '--skin-accent-bright': '#88eeff',
          '--skin-accent-dim': '#226688',
          '--skin-border': '#0a3040',
          '--skin-text': '#226688',
          '--skin-text-bright': '#44ccff',
          '--skin-panel-bg': 'rgba(0,10,20,0.85)',
          '--skin-verb-bg': '#000810',
          '--skin-verb-hover': 'rgba(0,48,80,0.4)',
          '--skin-verb-selected': 'rgba(68,204,255,0.15)',
          '--skin-cursor': 'crosshair',
          '--skin-font': "'Courier New', monospace",
          '--skin-crt-opacity': '0.2',
          '--skin-crt-color': '0,255,100',
          '--skin-overlay-tint': 'rgba(0,40,80,0.05)',
          '--skin-ambient-color': 'rgba(68,204,255,0.06)',
          '--skin-ambient-speed': '0.02'
        },
        cursor: 'crosshair',
        font: "'Courier New', monospace",
        ambient: 'scan-lines',
        crtIntensity: 0.2
      },

      'engine-room': {
        name: 'The Engine Room',
        description: 'A service bay — dark red/orange, heat shimmer, oil-stained metal',
        cssVars: {
          '--skin-bg': '#0d0300',
          '--skin-bg-gradient-top': '#1a0600',
          '--skin-bg-gradient-bot': '#3a1004',
          '--skin-accent': '#ff6020',
          '--skin-accent-bright': '#ff8040',
          '--skin-accent-dim': '#8a3010',
          '--skin-border': '#4a1808',
          '--skin-text': '#8a3010',
          '--skin-text-bright': '#ff6020',
          '--skin-panel-bg': 'rgba(13,3,0,0.88)',
          '--skin-verb-bg': '#0a0400',
          '--skin-verb-hover': 'rgba(74,24,8,0.4)',
          '--skin-verb-selected': 'rgba(255,96,32,0.15)',
          '--skin-cursor': 'pointer',
          '--skin-font': "'Courier New', monospace",
          '--skin-crt-opacity': '0.12',
          '--skin-crt-color': '255,80,20',
          '--skin-overlay-tint': 'rgba(255,80,20,0.04)',
          '--skin-ambient-color': 'rgba(255,96,32,0.05)',
          '--skin-ambient-speed': '0.06'
        },
        cursor: 'pointer',
        font: "'Courier New', monospace",
        ambient: 'heat-shimmer',
        crtIntensity: 0.12
      },

      'camera-room': {
        name: 'The Gallery',
        description: 'A broadcast studio — dark grey, multi-monitor glow, cable runs',
        cssVars: {
          '--skin-bg': '#0a0a0a',
          '--skin-bg-gradient-top': '#1a1a1a',
          '--skin-bg-gradient-bot': '#2a2a2a',
          '--skin-accent': '#00dd44',
          '--skin-accent-bright': '#44ff66',
          '--skin-accent-dim': '#0a6030',
          '--skin-border': '#333333',
          '--skin-text': '#888888',
          '--skin-text-bright': '#00dd44',
          '--skin-panel-bg': 'rgba(10,10,10,0.9)',
          '--skin-verb-bg': '#050505',
          '--skin-verb-hover': 'rgba(0,221,68,0.1)',
          '--skin-verb-selected': 'rgba(0,221,68,0.2)',
          '--skin-cursor': 'default',
          '--skin-font': "'Courier New', monospace",
          '--skin-crt-opacity': '0.18',
          '--skin-crt-color': '0,221,68',
          '--skin-overlay-tint': 'rgba(0,40,10,0.03)',
          '--skin-ambient-color': 'rgba(0,221,68,0.04)',
          '--skin-ambient-speed': '0.03'
        },
        cursor: 'default',
        font: "'Courier New', monospace",
        ambient: 'monitor-flicker',
        crtIntensity: 0.18
      },

      'poker-room': {
        name: 'The Card Room',
        description: 'A poker den — green felt, low amber lamp, smoke haze',
        cssVars: {
          '--skin-bg': '#020806',
          '--skin-bg-gradient-top': '#0a2010',
          '--skin-bg-gradient-bot': '#1a3818',
          '--skin-accent': '#d4af37',
          '--skin-accent-bright': '#f0d050',
          '--skin-accent-dim': '#7a6020',
          '--skin-border': '#1a3818',
          '--skin-text': '#7a6020',
          '--skin-text-bright': '#d4af37',
          '--skin-panel-bg': 'rgba(2,8,6,0.88)',
          '--skin-verb-bg': '#020806',
          '--skin-verb-hover': 'rgba(212,175,55,0.1)',
          '--skin-verb-selected': 'rgba(212,175,55,0.2)',
          '--skin-cursor': 'pointer',
          '--skin-font': "'Courier New', monospace",
          '--skin-crt-opacity': '0.1',
          '--skin-crt-color': '212,175,55',
          '--skin-overlay-tint': 'rgba(212,175,55,0.02)',
          '--skin-ambient-color': 'rgba(212,175,55,0.03)',
          '--skin-ambient-speed': '0.025'
        },
        cursor: 'pointer',
        font: "'Courier New', monospace",
        ambient: 'smoke-haze',
        crtIntensity: 0.1
      },

      'library': {
        name: 'The Library',
        description: 'A reading room — deep wood, brass lamps, leather spines',
        cssVars: {
          '--skin-bg': '#0a0604',
          '--skin-bg-gradient-top': '#1a1008',
          '--skin-bg-gradient-bot': '#2a1c10',
          '--skin-accent': '#c9a227',
          '--skin-accent-bright': '#e8c840',
          '--skin-accent-dim': '#7a5a18',
          '--skin-border': '#3a2810',
          '--skin-text': '#9a7a30',
          '--skin-text-bright': '#c9a227',
          '--skin-panel-bg': 'rgba(10,6,4,0.88)',
          '--skin-verb-bg': '#080402',
          '--skin-verb-hover': 'rgba(122,90,24,0.3)',
          '--skin-verb-selected': 'rgba(201,162,39,0.15)',
          '--skin-cursor': 'pointer',
          '--skin-font': "'Courier New', monospace",
          '--skin-crt-opacity': '0.08',
          '--skin-crt-color': '201,162,39',
          '--skin-overlay-tint': 'rgba(201,162,39,0.02)',
          '--skin-ambient-color': 'rgba(201,162,39,0.03)',
          '--skin-ambient-speed': '0.015'
        },
        cursor: 'pointer',
        font: "'Courier New', monospace",
        ambient: 'dust-motes',
        crtIntensity: 0.08
      }
    };

    // ── ROOM → SKIN MAPPING ──
    // Maps room IDs to their device-contextual skin
    this.ROOM_SKIN_MAP = {
      'bar-rail':            'bar',
      'the-radio':           'bridge',
      'aft-deck':            'bridge',
      'wheelhouse':          'bridge',
      'galley':              'library',
      'engine-room':         'engine-room',
      'aft-cockpit':         'bridge',
      'poker-room':          'poker-room',
      'crows-nest-camera':   'camera-room',
      'library-nook':        'library'
    };

    // ── DEVICE TYPE AUTO-DETECTION ──
    // Overrides room-based skin when a specific device is detected
    this.DEVICE_OVERRIDES = {
      // 'device-id': 'skin-id'
      // e.g. 'engine-phone': 'engine-room',
      // e.g. 'helm-tablet': 'bridge',
      // e.g. 'agent-server': 'bar'
    };

    this.init();
  }

  // ════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════

  init() {
    this.gameContainer = document.getElementById('game-container');
    if (!this.gameContainer) {
      console.warn('[DeviceSkin] No #game-container found, deferring init');
      setTimeout(() => this.init(), 500);
      return;
    }

    // Create the dynamic style element for skin CSS variable injection
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'device-skin-styles';
    document.head.appendChild(this.styleElement);

    // Create ambient overlay canvas
    this.createAmbientLayer();

    // Apply default skin
    this.applySkin('bar');

    console.log('[DeviceSkin] Initialized with', Object.keys(this.SKINS).length, 'skins');
  }

  // ════════════════════════════════════════════════════════════
  // SKIN APPLICATION — Transform the entire UI
  // ════════════════════════════════════════════════════════════

  applySkin(skinId) {
    const skin = this.SKINS[skinId];
    if (!skin) {
      console.warn(`[DeviceSkin] Unknown skin: ${skinId}`);
      return;
    }

    this.currentSkin = skin;
    this.currentSkinId = skinId;

    // Inject CSS variables onto the game container
    const vars = Object.entries(skin.cssVars)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    this.gameContainer.setAttribute('style', 
      this.gameContainer.getAttribute('style')?.replace(/--skin-[^;]+;?\s*/g, '') + '; ' + vars
    );

    // Apply skin class for CSS targeting
    this.gameContainer.classList.remove(...Object.keys(this.SKINS).map(s => `skin-${s}`));
    this.gameContainer.classList.add(`skin-${skinId}`);

    // Update cursor
    this.gameContainer.style.cursor = skin.cursor || 'pointer';

    // Update CRT overlay intensity
    const crt = document.getElementById('crt-overlay');
    if (crt) {
      const opacity = skin.crtIntensity || 0.15;
      const color = skin.cssVars['--skin-crt-color'] || '0,0,0';
      crt.style.background = `repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(${color},${opacity}) 3px, rgba(${color},${opacity}) 4px)`;
    }

    // Update verb bar styling via CSS variables
    this.updateVerbBar(skin);
    this.updateStatusBar(skin);
    this.updateInventoryBar(skin);
    this.updateDialoguePanel(skin);

    // Update ambient effect
    this.updateAmbient(skin.ambient);

    // Update status indicator
    const statusLoc = document.getElementById('status-location');
    if (statusLoc) {
      statusLoc.textContent = `◆ ${skin.name}`;
    }

    console.log(`[DeviceSkin] Applied skin: ${skinId} (${skin.name})`);
  }

  applySkinForRoom(roomId) {
    // Check device override first
    const deviceId = this.detectDevice();
    if (deviceId && this.DEVICE_OVERRIDES[deviceId]) {
      this.applySkin(this.DEVICE_OVERRIDES[deviceId]);
      return;
    }

    // Fall back to room-based mapping
    const skinId = this.ROOM_SKIN_MAP[roomId];
    if (skinId) {
      this.applySkin(skinId);
    } else {
      console.warn(`[DeviceSkin] No skin mapping for room: ${roomId}, using default`);
      this.applySkin('bar');
    }
  }

  // ════════════════════════════════════════════════════════════
  // DEVICE DETECTION — Auto-detect what device we're on
  // ════════════════════════════════════════════════════════════

  detectDevice() {
    // Check URL params for device override
    const params = new URLSearchParams(window.location.search);
    const deviceParam = params.get('device');
    if (deviceParam) return deviceParam;

    // Check localStorage for stored device identity
    const stored = localStorage.getItem('platos-shell-device-id');
    if (stored) return stored;

    // Check user agent for device type hints
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/.test(ua)) return 'phone';
    if (/tablet|ipad/.test(ua)) return 'tablet';

    return null;
  }

  getSkinForDevice(deviceId) {
    return this.DEVICE_OVERRIDES[deviceId] || null;
  }

  setDeviceOverride(deviceId, skinId) {
    this.DEVICE_OVERRIDES[deviceId] = skinId;
    console.log(`[DeviceSkin] Device override set: ${deviceId} → ${skinId}`);
  }

  // ════════════════════════════════════════════════════════════
  // UI ELEMENT STYLING
  // ════════════════════════════════════════════════════════════

  updateVerbBar(skin) {
    const verbBar = document.getElementById('verb-bar');
    if (!verbBar) return;

    const accent = skin.cssVars['--skin-accent'];
    const accentDim = skin.cssVars['--skin-accent-dim'];
    const accentBright = skin.cssVars['--skin-accent-bright'];
    const verbBg = skin.cssVars['--skin-verb-bg'];
    const borderColor = skin.cssVars['--skin-border'];

    verbBar.style.background = verbBg;
    verbBar.style.borderTop = `2px solid ${borderColor}`;

    // Update individual verb buttons
    const btns = verbBar.querySelectorAll('.verb-btn');
    btns.forEach(btn => {
      btn.style.color = accentDim;
      btn.style.fontFamily = skin.cssVars['--skin-font'];
      // Hover and selected states handled by CSS class variables
    });
  }

  updateStatusBar(skin) {
    const bar = document.getElementById('status-bar');
    if (!bar) return;

    const accent = skin.cssVars['--skin-accent'];
    const accentDim = skin.cssVars['--skin-accent-dim'];

    bar.style.background = skin.cssVars['--skin-panel-bg'];
    bar.style.borderBottom = `1px solid ${skin.cssVars['--skin-border']}`;
    bar.style.color = accent;
  }

  updateInventoryBar(skin) {
    const bar = document.getElementById('inventory-bar');
    if (!bar) return;

    const items = bar.querySelectorAll('.inv-item');
    items.forEach(item => {
      item.style.background = skin.cssVars['--skin-panel-bg'];
      item.style.borderColor = skin.cssVars['--skin-border'];
      item.style.color = skin.cssVars['--skin-accent'];
    });
  }

  updateDialoguePanel(skin) {
    const panel = document.getElementById('dialogue-panel');
    if (!panel) return;

    panel.style.background = skin.cssVars['--skin-bg'];
    panel.style.borderColor = skin.cssVars['--skin-border'];

    const header = document.getElementById('dialogue-header');
    if (header) {
      header.style.background = skin.cssVars['--skin-bg-gradient-top'];
      header.style.color = skin.cssVars['--skin-accent-bright'];
      header.style.borderBottom = `1px solid ${skin.cssVars['--skin-border']}`;
    }

    const options = document.querySelectorAll('.dialogue-option');
    options.forEach(opt => {
      opt.style.color = skin.cssVars['--skin-accent'];
    });
  }

  // ════════════════════════════════════════════════════════════
  // AMBIENT EFFECTS LAYER
  // ════════════════════════════════════════════════════════════

  createAmbientLayer() {
    this.ambientCanvas = document.createElement('canvas');
    this.ambientCanvas.width = 320;
    this.ambientCanvas.height = 200;
    this.ambientCanvas.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 45;
      pointer-events: none;
      image-rendering: pixelated;
      opacity: 0.5;
    `;
    this.ambientCtx = this.ambientCanvas.getContext('2d');
    this.ambientCtx.imageSmoothingEnabled = false;

    if (this.gameContainer) {
      this.gameContainer.appendChild(this.ambientCanvas);
    }
  }

  updateAmbient(type) {
    this.ambientType = type;
    // The ambient animation loop picks up the new type on next frame
  }

  startAmbientLoop() {
    if (this.ambientRAF) cancelAnimationFrame(this.ambientRAF);

    const loop = () => {
      this.ambientPhase += 0.02;
      this.renderAmbient();
      this.ambientRAF = requestAnimationFrame(loop);
    };
    loop();
  }

  renderAmbient() {
    if (!this.ambientCtx || !this.currentSkin) return;

    const ctx2 = this.ambientCtx;
    const w = 320, h = 200;
    ctx2.clearRect(0, 0, w, h);

    const type = this.ambientType || 'dust-motes';
    const phase = this.ambientPhase;

    switch (type) {
      case 'dust-motes':
        this.renderDustMotes(ctx2, w, h, phase);
        break;
      case 'scan-lines':
        this.renderScanLines(ctx2, w, h, phase);
        break;
      case 'heat-shimmer':
        this.renderHeatShimmer(ctx2, w, h, phase);
        break;
      case 'monitor-flicker':
        this.renderMonitorFlicker(ctx2, w, h, phase);
        break;
      case 'smoke-haze':
        this.renderSmokeHaze(ctx2, w, h, phase);
        break;
      case 'page-rain':
        this.renderPageRain(ctx2, w, h, phase);
        break;
      default:
        this.renderDustMotes(ctx2, w, h, phase);
    }
  }

  renderDustMotes(ctx2, w, h, phase) {
    const color = this.currentSkin.cssVars['--skin-ambient-color'] || 'rgba(232,184,64,0.04)';
    ctx2.fillStyle = color;
    for (let i = 0; i < 20; i++) {
      const x = (i * 37 + Math.sin(phase * 0.3 + i) * 8 + i * 13) % w;
      const y = (i * 23 + Math.cos(phase * 0.2 + i) * 6 + phase * (5 + i % 3)) % h;
      const size = (i % 3) + 1;
      ctx2.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
  }

  renderScanLines(ctx2, w, h, phase) {
    const color = this.currentSkin.cssVars['--skin-ambient-color'] || 'rgba(68,204,255,0.06)';
    const intensity = 0.3 + Math.sin(phase * 0.5) * 0.1;
    ctx2.fillStyle = color;
    // Moving scan line
    const scanY = (phase * 30) % h;
    const grad = ctx2.createLinearGradient(0, scanY - 5, 0, scanY + 5);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx2.fillStyle = grad;
    ctx2.fillRect(0, scanY - 5, w, 10);

    // Random phosphor dots
    for (let i = 0; i < 5; i++) {
      if (Math.random() > 0.7) {
        ctx2.fillStyle = color;
        ctx2.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    }
  }

  renderHeatShimmer(ctx2, w, h, phase) {
    const color = this.currentSkin.cssVars['--skin-ambient-color'] || 'rgba(255,96,32,0.05)';
    ctx2.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const y = 40 + i * 20;
      const waveOffset = Math.sin(phase * 2 + i * 0.5) * 3;
      ctx2.fillRect(0, y + waveOffset, w, 1);
    }
    // Occasional heat spark
    if (Math.random() > 0.95) {
      const sx = Math.random() * w;
      const sy = 50 + Math.random() * 80;
      ctx2.fillRect(sx, sy, 2, 2);
    }
  }

  renderMonitorFlicker(ctx2, w, h, phase) {
    const color = this.currentSkin.cssVars['--skin-ambient-color'] || 'rgba(0,221,68,0.04)';
    // Random monitor flicker bands
    if (Math.sin(phase * 8) > 0.85) {
      ctx2.fillStyle = color;
      const bandY = Math.random() * h;
      ctx2.fillRect(0, bandY, w, 1 + Math.floor(Math.random() * 2));
    }
    // Status LED blips
    for (let i = 0; i < 3; i++) {
      const ledX = 290 + i * 10;
      const ledY = 5;
      const blink = Math.sin(phase * 4 + i * 2) > 0.5;
      if (blink) {
        ctx2.fillStyle = i === 0 ? '#00ff00' : i === 1 ? '#ffaa00' : '#ff4444';
        ctx2.fillRect(ledX, ledY, 2, 2);
      }
    }
  }

  renderSmokeHaze(ctx2, w, h, phase) {
    const color = this.currentSkin.cssVars['--skin-ambient-color'] || 'rgba(212,175,55,0.03)';
    ctx2.fillStyle = color;
    for (let i = 0; i < 6; i++) {
      const x = (i * 50 + Math.sin(phase * 0.3 + i) * 20 + phase * 3) % (w + 40) - 20;
      const y = 30 + i * 25 + Math.sin(phase * 0.2 + i * 0.7) * 5;
      const r = 15 + Math.sin(phase + i) * 5;
      ctx2.beginPath();
      ctx2.arc(x, y, r, 0, Math.PI * 2);
      ctx2.fill();
    }
  }

  renderPageRain(ctx2, w, h, phase) {
    const color = this.currentSkin.cssVars['--skin-ambient-color'] || 'rgba(201,162,39,0.03)';
    // Subtle rain effect on an implied window
    ctx2.fillStyle = color;
    for (let i = 0; i < 15; i++) {
      const x = 200 + (i * 7) % 100;
      const y = (i * 13 + phase * 20) % h;
      ctx2.fillRect(x, y, 1, 3);
    }
    // Occasional page turn flash
    if (Math.random() > 0.98) {
      ctx2.fillStyle = 'rgba(201,162,39,0.1)';
      ctx2.fillRect(0, 0, w, h);
    }
  }

  // ════════════════════════════════════════════════════════════
  // ROOM TRANSITION — Called when player moves between rooms
  // ════════════════════════════════════════════════════════════

  onRoomChange(roomId) {
    console.log(`[DeviceSkin] Room changed: ${roomId}`);
    this.applySkinForRoom(roomId);
  }

  // ════════════════════════════════════════════════════════════
  // REGISTRATION — Allow new rooms to register their skins
  // ════════════════════════════════════════════════════════════

  registerSkin(skinId, skinConfig) {
    this.SKINS[skinId] = skinConfig;
    console.log(`[DeviceSkin] Registered new skin: ${skinId}`);
  }

  registerRoomSkin(roomId, skinId) {
    this.ROOM_SKIN_MAP[roomId] = skinId;
    console.log(`[DeviceSkin] Mapped room ${roomId} → skin ${skinId}`);
  }

  getAvailableSkins() {
    return Object.keys(this.SKINS).map(id => ({
      id,
      name: this.SKINS[id].name,
      description: this.SKINS[id].description
    }));
  }

  getCurrentSkin() {
    return {
      id: this.currentSkinId,
      config: this.currentSkin
    };
  }
}

// ════════════════════════════════════════════════════════════
// GLOBAL INSTANCE & HOOK INTO ROOM TRANSITIONS
// ════════════════════════════════════════════════════════════

// Create global instance
if (typeof window !== 'undefined') {
  window.DeviceSkin = new DeviceSkin();

  // Hook into the existing switchRoom function once the page loads
  window.addEventListener('load', () => {
    // Start ambient loop
    if (window.DeviceSkin) {
      window.DeviceSkin.startAmbientLoop();
    }

    // Wrap the original switchRoom to inject skin change
    if (typeof window.switchRoom === 'function') {
      const originalSwitch = window.switchRoom;
      window.switchRoom = function(roomId, ...args) {
        const result = originalSwitch.call(this, roomId, ...args);
        if (window.DeviceSkin) {
          window.DeviceSkin.onRoomChange(roomId);
        }
        return result;
      };
    }

    // Also hook into the loadRoom function used by the prototype
    if (typeof window.loadRoom === 'function') {
      const originalLoad = window.loadRoom;
      window.loadRoom = function(roomId, ...args) {
        const result = originalLoad.call(this, roomId, ...args);
        if (window.DeviceSkin) {
          window.DeviceSkin.onRoomChange(roomId);
        }
        return result;
      };
    }

    // Apply initial skin for current room
    if (window.currentRoom && window.DeviceSkin) {
      window.DeviceSkin.onRoomChange(window.currentRoom);
    }
  });
}
