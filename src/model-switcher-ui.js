/**
 * model-switcher-ui.js — Living World Framework: Model Switcher UI
 *
 * Adds a "Model" indicator showing which model powers each NPC.
 * Click the indicator to open a model selector (swap models live).
 * Shows latency, memory usage, and model size.
 *
 * Usage (browser):  <script src="src/model-switcher-ui.js"></script>
 *                    ModelSwitcherUI.init();
 */

const ModelSwitcherUI = (function () {
  'use strict';

  let container = null;
  let indicators = new Map(); // npcId -> indicator element
  let initialized = false;

  // ════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════

  function init() {
    if (initialized) return;
    if (typeof document === 'undefined') return;

    // Create the indicators container
    container = document.createElement('div');
    container.id = 'model-indicators';
    container.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 0;
      width: 100%;
      z-index: 40;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 8px;
      font-family: 'Courier New', monospace;
    `;

    const gameContainer = document.getElementById('game-container') || document.body;
    gameContainer.appendChild(container);

    // Listen for room changes to update indicators
    if (typeof window !== 'undefined') {
      window.addEventListener('model-swapped', _onModelSwapped);
      window.addEventListener('roomChanged', refresh);
    }

    // Initial render
    refresh();

    initialized = true;
    console.log('[ModelSwitcherUI] Initialized');
  }

  // ════════════════════════════════════════════════════════════
  // REFRESH INDICATORS
  // ════════════════════════════════════════════════════════════

  function refresh() {
    if (!container) return;

    const currentRoom = _getCurrentRoom();
    if (!currentRoom) return;

    const npcs = _getRoomNPCs(currentRoom);
    container.innerHTML = '';
    indicators.clear();

    npcs.forEach(npc => {
      const indicator = _createIndicator(currentRoom, npc);
      container.appendChild(indicator);
      indicators.set(npc.id, indicator);
    });

    // Add camera model indicator if it's a camera room
    const cameraModel = _getCameraModel(currentRoom);
    if (cameraModel) {
      const camIndicator = _createIndicator(currentRoom, {
        id: 'vision-agent',
        name: '📷 Vision',
        model: cameraModel,
        vibe: 'Camera vision system',
      });
      container.appendChild(camIndicator);
    }
  }

  // ════════════════════════════════════════════════════════════
  // INDICATOR CREATION
  // ════════════════════════════════════════════════════════════

  function _createIndicator(roomId, npc) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 8px;
      letter-spacing: 0.5px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 2px;
      transition: background 0.15s;
      max-width: 200px;
    `;

    // Model badge
    const badge = document.createElement('span');
    const modelName = _getAssignedModel(roomId, npc.id) || npc.model || 'unassigned';
    const isLocal = modelName.includes(':') || modelName === 'unassigned';
    const modelShort = _shortModelName(modelName);

    badge.textContent = `◆ ${modelShort}`;
    badge.style.cssText = `
      color: ${isLocal ? '#5da89a' : '#9a7ada'};
      text-shadow: 1px 1px 0 #000;
      font-weight: bold;
    `;

    // NPC name
    const nameLabel = document.createElement('span');
    nameLabel.textContent = npc.name;
    nameLabel.style.cssText = `
      color: #8a6a30;
      text-shadow: 1px 1px 0 #000;
    `;

    wrapper.appendChild(badge);
    wrapper.appendChild(nameLabel);

    // Hover effect
    wrapper.onmouseenter = () => {
      wrapper.style.background = 'rgba(74,53,32,0.4)';
      _showTooltip(wrapper, roomId, npc, modelName);
    };
    wrapper.onmouseleave = () => {
      wrapper.style.background = 'transparent';
      _hideTooltip();
    };

    // Click to open selector
    wrapper.onclick = (e) => {
      e.stopPropagation();
      _openModelSelector(roomId, npc);
    };

    return wrapper;
  }

  // ════════════════════════════════════════════════════════════
  // TOOLTIP
  // ════════════════════════════════════════════════════════════

  let tooltipEl = null;

  function _showTooltip(parent, roomId, npc, modelName) {
    _hideTooltip();

    const info = _getModelInfo(modelName);
    if (!info) return;

    tooltipEl = document.createElement('div');
    tooltipEl.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      background: rgba(10,7,0,0.95);
      border: 1px solid #4a3520;
      padding: 6px 8px;
      font-size: 9px;
      color: #c8a050;
      white-space: nowrap;
      z-index: 200;
      pointer-events: none;
      font-family: 'Courier New', monospace;
      line-height: 1.5;
      letter-spacing: 0.5px;
      max-width: 250px;
      white-space: normal;
    `;

    const healthInfo = _getHealthInfo(modelName);
    const lines = [
      `◆ ${modelName}`,
      `${info.type === 'local' ? 'LOCAL' : 'CLOUD'} · ${info.role}`,
      info.size ? `Size: ${info.size}` : null,
      info.parameterSize ? `Params: ${info.parameterSize}` : null,
      info.quantization ? `Quant: ${info.quantization}` : null,
      info.latency ? `Latency: ${info.latency}` : null,
      healthInfo?.available === true ? '● ONLINE' : healthInfo?.available === false ? '○ OFFLINE' : null,
      info.roleDescription ? '' : null,
      info.roleDescription || '',
    ].filter(l => l !== null);

    tooltipEl.innerHTML = lines.map(l =>
      l === '' ? '<br>' : `<div>${l}</div>`
    ).join('');

    parent.style.position = 'relative';
    parent.appendChild(tooltipEl);
  }

  function _hideTooltip() {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  // ════════════════════════════════════════════════════════════
  // MODEL SELECTOR MODAL
  // ════════════════════════════════════════════════════════════

  function _openModelSelector(roomId, npc) {
    _closeModelSelector();

    const currentModel = _getAssignedModel(roomId, npc.id) || npc.model || 'unassigned';
    const availableModels = _getAvailableModels();

    const overlay = document.createElement('div');
    overlay.id = 'model-selector';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85);
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #0d0900;
      border: 2px solid #4a3520;
      padding: 14px 18px;
      max-width: 340px;
      width: 90%;
      max-height: 85%;
      overflow-y: auto;
    `;

    // Header
    const header = document.createElement('div');
    header.innerHTML = `◆ MODEL SELECTOR ◆<br><span style="color:#5a4a20;font-size:9px;">${npc.name} · ${roomId}</span>`;
    header.style.cssText = `
      color: #e8b840;
      font-size: 12px;
      text-align: center;
      margin-bottom: 10px;
      letter-spacing: 2px;
      border-bottom: 1px solid #4a3520;
      padding-bottom: 6px;
      line-height: 1.6;
    `;
    panel.appendChild(header);

    // Current model display
    const currentDisplay = document.createElement('div');
    currentDisplay.style.cssText = `
      text-align: center;
      font-size: 9px;
      color: #5da89a;
      margin-bottom: 10px;
      padding: 4px;
      background: rgba(93,168,154,0.1);
      border: 1px solid rgba(93,168,154,0.3);
    `;
    currentDisplay.textContent = `Current: ${currentModel}`;
    panel.appendChild(currentDisplay);

    // Local models section
    const localHeader = document.createElement('div');
    localHeader.textContent = '── LOCAL (Ollama) ──';
    localHeader.style.cssText = 'color: #5da89a; font-size: 9px; text-align: center; margin: 8px 0 4px;';
    panel.appendChild(localHeader);

    availableModels.filter(m => m.type === 'local' && m.capabilities?.includes('text')).forEach(model => {
      panel.appendChild(_createModelOption(model, currentModel, roomId, npc, overlay));
    });

    // Cloud models section
    const cloudHeader = document.createElement('div');
    cloudHeader.textContent = '── CLOUD ──';
    cloudHeader.style.cssText = 'color: #9a7ada; font-size: 9px; text-align: center; margin: 8px 0 4px;';
    panel.appendChild(cloudHeader);

    availableModels.filter(m => m.type === 'cloud').forEach(model => {
      panel.appendChild(_createModelOption(model, currentModel, roomId, npc, overlay));
    });

    // Close button
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '[ close ]';
    closeBtn.style.cssText = `
      color: #8a6a30; font-size: 10px; text-align: center;
      margin-top: 8px; cursor: pointer;
    `;
    closeBtn.onclick = () => overlay.remove();
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const gameContainer = document.getElementById('game-container') || document.body;
    gameContainer.appendChild(overlay);
  }

  function _createModelOption(model, currentModel, roomId, npc, overlay) {
    const isCurrent = model.name === currentModel;
    const health = _getHealthInfo(model.name);
    const isOnline = model.type === 'cloud' || health?.available;

    const btn = document.createElement('div');
    btn.style.cssText = `
      color: ${isCurrent ? '#5a4a20' : isOnline ? '#c8a050' : '#4a3a20'};
      padding: 5px 8px;
      cursor: ${isCurrent ? 'default' : 'pointer'};
      font-size: 10px;
      border-bottom: 1px solid rgba(74,53,32,0.3);
      transition: background 0.1s;
      ${isCurrent ? 'opacity: 0.5;' : ''}
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const left = document.createElement('div');
    left.innerHTML = `
      <div style="font-weight: bold;">${model.name}${isCurrent ? ' ◀' : ''}</div>
      <div style="font-size: 8px; color: #5a4020;">
        ${model.role} · ${model.size || 'cloud'} · ${model.latency || ''}
      </div>
    `;

    const status = document.createElement('div');
    status.style.cssText = `font-size: 8px; color: ${isOnline ? '#5da89a' : '#a04a4a'};`;
    status.textContent = isOnline ? '●' : '○';

    btn.appendChild(left);
    btn.appendChild(status);

    if (!isCurrent && isOnline) {
      btn.onmouseenter = () => {
        btn.style.background = 'rgba(200,160,80,0.15)';
        btn.style.color = '#ffe080';
      };
      btn.onmouseleave = () => {
        btn.style.background = 'transparent';
        btn.style.color = '#c8a050';
      };
      btn.onclick = () => {
        if (typeof window !== 'undefined' && window.ModelRouter) {
          const result = window.ModelRouter.swapModel(roomId, npc.id, model.name, 'ui-selector');
          if (result.success) {
            console.log(`[ModelSwitcherUI] Swapped ${npc.id} to ${model.name}`);
          }
        }
        overlay.remove();
        refresh();
      };
    }

    return btn;
  }

  function _closeModelSelector() {
    const existing = document.getElementById('model-selector');
    if (existing) existing.remove();
  }

  // ════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ════════════════════════════════════════════════════════════

  function _onModelSwapped(event) {
    const { roomId, npcId, newModel } = event.detail;
    const indicator = indicators.get(npcId);
    if (indicator) {
      // Rebuild indicator
      refresh();
    }
    // Flash effect
    if (indicator) {
      indicator.style.transition = 'background 0.3s';
      indicator.style.background = 'rgba(200,160,80,0.4)';
      setTimeout(() => { indicator.style.background = 'transparent'; }, 600);
    }
  }

  // ════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════

  function _getCurrentRoom() {
    if (typeof window !== 'undefined') {
      return window.currentRoom || (window.LivingWorld?.rooms && Object.keys(window.LivingWorld.rooms)[0]);
    }
    return null;
  }

  function _getRoomNPCs(roomId) {
    if (typeof window !== 'undefined' && window.LivingWorld?.rooms) {
      const room = window.LivingWorld.rooms[roomId];
      return room?.npcs || [];
    }
    return [];
  }

  function _getCameraModel(roomId) {
    if (typeof window !== 'undefined' && window.LivingWorld?.rooms) {
      const room = window.LivingWorld.rooms[roomId];
      return room?.camera_config?.model || null;
    }
    return null;
  }

  function _getAssignedModel(roomId, npcId) {
    if (typeof window !== 'undefined' && window.ModelRouter) {
      return window.ModelRouter.getAssignment(roomId, npcId);
    }
    return null;
  }

  function _getAvailableModels() {
    if (typeof window !== 'undefined' && window.ModelRouter) {
      return window.ModelRouter.getAvailableModels();
    }
    return [];
  }

  function _getModelInfo(modelName) {
    if (typeof window !== 'undefined' && window.ModelRouter) {
      const locals = window.ModelRouter.localModels;
      const clouds = window.ModelRouter.cloudModels;
      return locals[modelName] || clouds[modelName] || null;
    }
    return null;
  }

  function _getHealthInfo(modelName) {
    if (typeof window !== 'undefined' && window.ModelRouter) {
      return window.ModelRouter.health[modelName];
    }
    return null;
  }

  function _shortModelName(modelName) {
    if (!modelName || modelName === 'unassigned') return '?';
    // granite3.1-dense:2b → granite:2b
    // qwen2.5:0.5b → qwen:0.5b
    // glm-5.2 → glm-5.2
    const parts = modelName.split(':');
    if (parts.length === 1) return modelName.toUpperCase();
    const name = parts[0].replace(/[\d.]+/g, '').replace(/-dense|-chat|-instruct/g, '');
    return `${name}:${parts[1]}`;
  }

  // ════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    init,
    refresh,
  };
})();

if (typeof window !== 'undefined') {
  window.ModelSwitcherUI = ModelSwitcherUI;
}
