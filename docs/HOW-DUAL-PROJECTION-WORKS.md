# How Dual Projection Works

> One world. Two windows. A door between them.

The split-view architecture is the load-bearing design of Plato's Shell. This document explains how the prototype implements it, using actual code from `split-view.html`, `mud-terminal.html`, and `index.html`.

---

## 1. The Split View Architecture

`split-view.html` loads both projections side by side in iframes:

```html
<div id="split-container">
  <!-- LEFT: Agent View (MUD Terminal) -->
  <div id="mud-side">
    <div class="side-label">◀ AGENT VIEW — TEXT INTERFACE</div>
    <iframe id="mud-terminal-frame" src="mud-terminal.html"></iframe>
  </div>

  <!-- DIVIDER: The Door Between Caves -->
  <div id="divider-door"></div>

  <!-- RIGHT: Human View (ScummVM) -->
  <div id="scumm-side">
    <div class="side-label">HUMAN VIEW — VISUAL SCENE ▶</div>
    <div id="scumm-frame-container">
      <iframe id="scumm-frame" src="index.html"></iframe>
    </div>
  </div>
</div>
```

The divider is styled as a golden door between the two views:

```css
#divider-door {
  width: 2px;
  background: linear-gradient(180deg,
    transparent 0%, #4a3520 10%, #c8a050 50%, #4a3520 90%, transparent 100%
  );
}
#divider-door::after {
  content: '◆';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  color: #e8b840;
  background: #000;
  padding: 4px 2px;
}
```

The split is 45% MUD, 55% ScummVM — the agent gets the smaller half because text is dense.

---

## 2. How localStorage Syncs State Between Iframes

Both projections share a single world state via `localStorage`. The key is `platos-shell-world`:

```javascript
const WORLD_KEY = 'platos-shell-world';

// In mud-terminal.html:
function getWorldState() {
  try {
    const s = localStorage.getItem(WORLD_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return { currentRoom: 'bar-rail', inventory: [] };
}

function setWorldState(state) {
  try {
    localStorage.setItem(WORLD_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('world-update', { detail: state }));
  } catch(e) {}
}
```

When the MUD terminal writes to localStorage, the parent `split-view.html` picks it up via the `storage` event:

```javascript
window.addEventListener('storage', (e) => {
  if (e.key === WORLD_KEY) {
    updateRoomDisplay();
    const now = Date.now();
    if (now - lastSyncInitiated > SYNC_COOLDOWN_MS) {
      syncScummFrame();  // Push the change to the ScummVM iframe
    }
  }
});
```

---

## 3. The Sync Loop (And Anti-Loop Protection)

The trickiest part of dual projection is preventing infinite loops. When the MUD changes room → the parent syncs ScummVM → ScummVM fires a room event → the parent syncs MUD → repeat forever.

The solution is a **cooldown timestamp**:

```javascript
let lastSyncInitiated = 0;
const SYNC_COOLDOWN_MS = 1500;  // 1.5s cooldown to cover transition animation
```

When the parent initiates a sync, it records the time:

```javascript
function syncScummFrame() {
  // ...
  lastSyncInitiated = Date.now();
  if (scummWindow.transitionToRoom) {
    scummWindow.transitionToRoom(targetRoom);
  }
}
```

The polling fallback checks the cooldown before acting:

```javascript
function pollScummRoom() {
  const now = Date.now();
  if (now - lastSyncInitiated < SYNC_COOLDOWN_MS) return;  // skip during cooldown
  
  const scummWindow = scummFrame.contentWindow;
  if (scummWindow.currentRoom !== state.currentRoom) {
    // ScummVM changed rooms independently — sync MUD to match
    lastSyncInitiated = Date.now();
    state.currentRoom = mappedMud;
    localStorage.setItem(WORLD_KEY, JSON.stringify(state));
    // Notify MUD terminal to re-render
    mudFrame.contentWindow.dispatchEvent(new CustomEvent('world-update', { detail: state }));
  }
}
```

---

## 4. Bidirectional Sync: postMessage + localStorage

The ScummVM iframe sends `postMessage` when the player walks through a door:

```javascript
// In index.html — during room transition:
window.parent.postMessage({ type: 'room-change', room: currentRoom }, '*');
```

The parent listens for it:

```javascript
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'room-change') {
    const newRoom = e.data.room;
    const state = getWorldState();
    if (state.currentRoom !== newRoom) {
      lastSyncInitiated = Date.now();
      state.currentRoom = newRoom;
      localStorage.setItem(WORLD_KEY, JSON.stringify(state));
      // Tell MUD terminal to re-render
      mudFrame.contentWindow.dispatchEvent(new CustomEvent('world-update', { detail: state }));
    }
  }
});
```

This gives us two sync channels:
1. **localStorage events** — MUD → parent → ScummVM
2. **postMessage** — ScummVM → parent → MUD

Both land in the same place: the parent's synchronizer, which updates world state and pushes to the other iframe.

---

## 5. The MUD Terminal: Agent's Eye

The MUD terminal renders the world as structured text. When the agent enters a room, they see:

```
═══════════════════════════════════════════════════════
📍 THE WHEELHOUSE
The nerve center. Navigation electronics line the console. Large windows
give 270 degrees of visibility. Blue instrument light bathes everything.

OBJECTS:
  ▸ the helm wheel
  ▸ the radar display
  ▸ the compass rose
  ▸ the radio console
  ▸ the nav charts
  ▸ GPS receiver

OCCUPANTS:
  ◈ Captain

EXITS:
  [AFT → AFT DECK]  [DOWN → GALLEY]

📡 SENSOR DATA:
  Position:       60.157°N, 149.437°W
  Heading:        312° NW
  Speed:          7.2 knots
  Depth:          20 fathoms (120 ft)
  Radar Contacts: 2 vessels, NE, 4nm
```

This is the **pull-based projection** — the agent perceives everything the world contains, on demand, at the cost of one model call per perception check.

---

## 6. Real Example: "go aft" in the MUD Terminal

Let's trace what happens when someone types `go aft` in the MUD terminal while in bar-rail:

### Step 1: Command Parse

```javascript
case 'go':
  const exitKey = Object.keys(room.exits).find(k =>
    k.startsWith(args)  // "aft" matches "aft"
  );
  if (exitKey) {
    goToRoom(room.exits[exitKey].target, exitKey);
  }
  break;
```

### Step 2: State Update + localStorage Write

```javascript
function goToRoom(targetRoom, direction) {
  println('You move ' + direction.toUpperCase() + '...');
  const state = getWorldState();
  state.currentRoom = targetRoom;  // 'aft-deck'
  setWorldState(state);  // writes to localStorage
  setTimeout(() => renderRoom(), 300);
}
```

### Step 3: Storage Event Fires in Parent

```javascript
window.addEventListener('storage', (e) => {
  if (e.key === WORLD_KEY) {
    updateRoomDisplay();  // "Room: The Aft Deck"
    syncScummFrame();     // tell ScummVM to transition
  }
});
```

### Step 4: ScummVM Transitions

```javascript
function syncScummFrame() {
  const scummWindow = scummFrame.contentWindow;
  const targetRoom = ROOM_ID_MAP[state.currentRoom];  // 'aft-deck'
  if (scummWindow.currentRoom !== targetRoom) {
    lastSyncInitiated = Date.now();
    scummWindow.transitionToRoom(targetRoom);  // fade-to-black, load new room
  }
}
```

### Step 5: MUD Re-renders

After 300ms, the MUD terminal clears and renders the new room description, objects, exits, and sensor data.

**Result:** The player types a text command on the left, and the pixel-art scene transitions on the right. Both projections show the same room. The world state is the source of truth; both views are renderings of it.

---

## 7. Perception Checks: The Design Vision

The full dual-projection design (documented in `DUAL-PROJECTION.md`) includes a perception deadband between the two views. In the prototype, this is simplified — both projections always show the same room. But the architecture is designed for the full system where:

- The **ScummVM view** runs continuously (push-based, free)
- The **MUD terminal** is pulled on demand (costs one model call per check)
- Between checks, events accumulate in a "deadband" with salience scores
- High-salience events interrupt the agent immediately

The `SharedWorldStore` class in `shared-world.ts` implements this fully:

```typescript
perceive(agentId: string): PerceptionCheck {
  const agent = this.state.agents[agentId];
  const since = agent.perception.lastCheck;
  
  // Get all unperceived events
  const deltas = this.eventLog.filter(e =>
    e.t > since && e.roomId === roomId && !e.perceivedBy.includes(agentId)
  );
  
  // Mark as perceived
  for (const e of deltas) e.perceivedBy.push(agentId);
  
  // Update lastCheck
  agent.perception.lastCheck = now;
  
  return { room, deltas, perceptionLagMs: now - since };
}
```

The prototype is the simpler version: what you see in the MUD is what's in the world, right now, every time you look. The production version adds the deadband, salience scoring, and the integral creep detector.

---

## See Also

- [HOW ROOMS WORK](HOW-ROOMS-WORK.md) — Room transitions from the ScummVM side
- [HOW-AUDIO-WORKS](HOW-AUDIO-WORKS.md) — Audio that follows the player between projections
- [README](README.md) — Overview of all files

---

*Neither projection is the real one. The world is the real one, and it's cheaper than either view suggests.*
