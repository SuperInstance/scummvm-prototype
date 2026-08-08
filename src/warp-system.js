/**
 * warp-system.js — Living World Framework: Warp System UI
 *
 * Fast travel between any rooms in the registry.
 * - Type "warp poker-room" in MUD → instant teleport
 * - Click warp icon in ScummVM → room selector → teleport
 * - New rooms automatically appear in the warp list when registered
 *
 * This auto-initializes when LivingWorld is loaded.
 * It patches into the existing transitionToRoom function.
 */

const WarpSystem = (function () {
  'use strict';

  let warpButton = null;
  let initialized = false;

  /**
   * Initialize the warp system for ScummVM.
   * Call after LivingWorld.init() and after the page loads.
   */
  function initScumm() {
    if (initialized || typeof document === 'undefined') return;
    if (typeof LivingWorld === 'undefined') {
      console.warn('[WarpSystem] LivingWorld not loaded. Load room-loader.js first.');
      return;
    }

    // Add warp button to ScummVM UI
    _addWarpButton();

    // Add keyboard shortcut (W key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'w' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        LivingWorld.showWarpSelector();
      }
    });

    initialized = true;
    console.log('[WarpSystem] ScummVM warp system initialized (Shift+W for selector)');
  }

  function _addWarpButton() {
    const container = document.getElementById('game-container');
    if (!container) {
      // Retry on next tick
      setTimeout(_addWarpButton, 500);
      return;
    }

    warpButton = document.createElement('div');
    warpButton.id = 'warp-button';
    warpButton.innerHTML = '◆';
    warpButton.title = 'Warp (Shift+W)';
    warpButton.style.cssText = `
      position: absolute;
      bottom: 88px;
      right: 8px;
      width: 28px; height: 28px;
      background: rgba(10,7,0,0.85);
      border: 1px solid #4a3520;
      color: #e8b840;
      font-size: 16px;
      cursor: pointer;
      z-index: 55;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-family: 'Courier New', monospace;
    `;

    warpButton.onmouseenter = () => {
      warpButton.style.background = 'rgba(74,53,32,0.6)';
      warpButton.style.color = '#ffe080';
      warpButton.style.boxShadow = '0 0 8px rgba(232,184,64,0.3)';
    };
    warpButton.onmouseleave = () => {
      warpButton.style.background = 'rgba(10,7,0,0.85)';
      warpButton.style.color = '#e8b840';
      warpButton.style.boxShadow = 'none';
    };
    warpButton.onclick = (e) => {
      e.stopPropagation();
      LivingWorld.showWarpSelector();
    };

    container.appendChild(warpButton);
  }

  // ════════════════════════════════════════════════════════════
  // MUD TERMINAL WARP COMMAND
  // ════════════════════════════════════════════════════════════

  /**
   * Process a warp command for the MUD terminal.
   * Call this from the MUD terminal's command handler.
   *
   * Usage in MUD terminal:
   *   case 'warp':
   *     WarpSystem.handleMudCommand(args, ROOMS, goToRoom, println);
   *     break;
   */
  function handleMudCommand(args, mudRooms, goToRoomFn, printlnFn) {
    if (!args || args.trim() === '') {
      // Show available destinations
      printlnFn('◆ WARP DESTINATIONS ◆', 'room-name');
      const destinations = LivingWorld.getWarpDestinations();
      destinations.forEach(d => {
        const room = LivingWorld.rooms[d.id];
        const tag = room?.builtin ? '[builtin]' : '[dynamic]';
        const type = `[${d.type}]`;
        printlnFn(`  ▸ warp ${d.id.padEnd(22)} ${type.padEnd(10)} ${tag}`, 'object-list');
      });
      printlnFn('', '');
      printlnFn('Usage: warp <room-id>', 'command-output');
      return;
    }

    const targetId = args.trim().toLowerCase();
    const room = LivingWorld.handleMudWarp(targetId);

    if (!room) {
      printlnFn(`Unknown destination: ${targetId}`, 'command-output error');
      printlnFn('Type "warp" (no arguments) to see available destinations.', 'command-output');
      return;
    }

    // Get or generate MUD room definition
    let mudRoom = mudRooms[targetId];
    if (!mudRoom) {
      mudRoom = LivingWorld.getMudRoom(targetId);
      if (mudRoom) {
        mudRooms[targetId] = mudRoom;
      }
    }

    // Perform the warp
    printlnFn(`◆ WARPING TO ${room.name.toUpperCase()} ◆`, 'command-output system');
    printlnFn('The world folds. You arrive.', 'command-output');

    // Use the MUD terminal's goToRoom if available
    if (goToRoomFn) {
      // Update world state
      const WORLD_KEY = 'platos-shell-world';
      try {
        const s = localStorage.getItem(WORLD_KEY);
        const state = s ? JSON.parse(s) : { currentRoom: 'bar-rail', inventory: [] };
        state.currentRoom = targetId;
        localStorage.setItem(WORLD_KEY, JSON.stringify(state));
      } catch {}

      // Force re-render
      setTimeout(() => {
        if (typeof renderRoom === 'function') renderRoom();
      }, 300);
    }
  }

  /**
   * Add the warp command to the MUD terminal's command handler.
   * Call this after the MUD terminal initializes.
   */
  function initMud(mudTerminalWindow) {
    const w = mudTerminalWindow || window;
    if (!w.ROOMS) {
      console.warn('[WarpSystem] MUD terminal ROOMS not found');
      return;
    }

    // Inject dynamic rooms
    LivingWorld.injectAllMudRooms(w.ROOMS);

    // Store original command handler if it exists
    // The MUD terminal uses processCommand() — we patch it
    if (w._originalProcessCommand) return; // already patched

    if (typeof w.processCommand !== 'function') {
      console.warn('[WarpSystem] MUD terminal processCommand not found. Warp command must be added manually.');
      return;
    }

    w._originalProcessCommand = w.processCommand;
    w.processCommand = function (input) {
      const parts = input.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();

      if (cmd === 'warp') {
        const args = parts.slice(1).join(' ');
        handleMudCommand(args, w.ROOMS, null, w.println || function (t) { console.log(t); });
        return;
      }

      // Fall through to original handler
      return w._originalProcessCommand(input);
    };

    console.log('[WarpSystem] MUD terminal warp command initialized');
  }

  // ════════════════════════════════════════════════════════════
  // SPLIT-VIEW INTEGRATION
  // ════════════════════════════════════════════════════════════

  /**
   * Initialize warp for split-view mode.
   * Call from split-view.html after both iframes load.
   */
  function initSplitView(mudFrame, scummFrame) {
    // Initialize MUD side
    if (mudFrame && mudFrame.contentWindow) {
      const mudW = mudFrame.contentWindow;

      // Wait for MUD terminal to be ready
      const tryInit = () => {
        if (mudW.ROOMS && mudW.processCommand) {
          initMud(mudW);
        } else {
          setTimeout(tryInit, 500);
        }
      };
      tryInit();
    }

    // Initialize ScummVM side
    if (scummFrame && scummFrame.contentWindow) {
      const scummW = scummFrame.contentWindow;

      const tryInitScumm = () => {
        if (scummW.LivingWorld) {
          scummW.WarpSystem.initScumm();
        } else {
          setTimeout(tryInitScumm, 500);
        }
      };
      tryInitScumm();
    }
  }

  // ════════════════════════════════════════════════════════════
  // ROOM DISCOVERY
  // ════════════════════════════════════════════════════════════

  /**
   * Scan the registry for rooms added since last check.
   * Returns new room IDs that weren't in the warp network before.
   * Useful for live-updating the warp selector.
   */
  function discoverNewRooms() {
    const current = new Set(LivingWorld.warpNetwork);
    const allRooms = Object.keys(LivingWorld.rooms);
    const newRooms = allRooms.filter(id => !current.has(id));

    // Add them to the warp network
    newRooms.forEach(id => {
      LivingWorld.warpNetwork.push(id);
      // Inject into ScummVM if available
      if (typeof window !== 'undefined' && window.ROOMS) {
        LivingWorld.injectScummRoom(id);
      }
    });

    return newRooms;
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    initScumm,
    initMud,
    initSplitView,
    handleMudCommand,
    discoverNewRooms,
    get initialized() { return initialized; },
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WarpSystem;
}
if (typeof window !== 'undefined') {
  window.WarpSystem = WarpSystem;
}
