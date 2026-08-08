# How Rooms Work

> One canvas. One HTML page. Seven rooms that feel like a ship.

This document explains how rooms are defined, connected, and rendered in the prototype — using actual code from `index.html`. Read this if you need to understand the existing rooms or add a new one.

---

## 1. The Room Object

Every room is a JavaScript object inside the `ROOMS` constant. Here's an actual room definition from the prototype — **bar-rail**, the starting room:

```javascript
'bar-rail': {
  name: 'The Tap — Bar Rail',
  shortName: 'Bar Rail',
  palette: 'warm',
  hotspots: [
    {id: 'hs-bar-counter', name: 'the bar counter', x: '15%', y: '45%', w: '35%', h: '20%'},
    {id: 'hs-bar-stool', name: 'the bar stool', x: '20%', y: '62%', w: '8%', h: '15%'},
    {id: 'hs-door-aft', name: 'the aft door', x: '82%', y: '20%', w: '12%', h: '50%'},
    {id: 'hs-door-radio', name: 'the radio room door', x: '5%', y: '15%', w: '10%', h: '55%'},
    {id: 'hs-jukebox', name: 'the jukebox', x: '68%', y: '45%', w: '10%', h: '30%'},
    {id: 'hs-chess-board', name: 'the chess board', x: '88%', y: '55%', w: '10%', h: '25%'},
    {id: 'hs-riker', name: 'Riker', x: '55%', y: '38%', w: '12%', h: '35%'}
  ],
  exits: {
    'hs-door-aft': {target: 'aft-deck', label: '◆ AFT DECK ◆'},
    'hs-door-radio': {target: 'the-radio', label: '◆ RADIO ROOM ◆'}
  }
}
```

### What each field does

| Field | Purpose |
|-------|---------|
| `name` | Full display name shown in the location indicator |
| `shortName` | Compact name for the status bar |
| `palette` | Which color palette key to use (see `PALETTES` object) |
| `hotspots` | Array of clickable regions on the scene |
| `exits` | Map of hotspot IDs to room transitions |

The `palette` field is the key to the room's visual identity. The prototype defines six palettes:

```javascript
const PALETTES = {
  warm:     { bg: '#0a0700', accent: '#e8b840', ... },  // bar-rail
  darkblue: { bg: '#020812', accent: '#20c0a0', ... },  // aft-deck
  cyan:     { bg: '#000a14', accent: '#44ccff', ... },  // wheelhouse, radio
  amber:    { bg: '#100800', accent: '#ff9020', ... },  // galley
  darkred:  { bg: '#0d0300', accent: '#ff6020', ... },  // engine-room
  darkgreen:{ bg: '#02080c', accent: '#20c080', ... }   // aft-cockpit
};
```

---

## 2. How Hotspots Work

Hotspots are invisible `<div>` elements positioned over the canvas using CSS percentages. They're created dynamically in `loadHotspots()`:

```javascript
function loadHotspots() {
  hotspotsLayer.innerHTML = '';
  const room = ROOMS[currentRoom];
  room.hotspots.forEach(hs => {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.id = hs.id;
    el.style.left = hs.x; el.style.top = hs.y;
    el.style.width = hs.w; el.style.height = hs.h;
    el.title = hs.name;
    hotspotsLayer.appendChild(el);
  });
  document.querySelectorAll('.hotspot').forEach(hs => {
    hs.addEventListener('click', () => handleHotspotClick(hs.id));
  });
}
```

Each hotspot has CSS that makes it invisible but responsive:

```css
.hotspot {
  position: absolute;
  cursor: crosshair;
  z-index: 20;
}
.hotspot:hover {
  outline: 1px dashed rgba(232,184,64,0.4);
}
```

The coordinates are percentages of the game container, not pixels. This means the game scales to any screen size and hotspots stay aligned. The `name` field is what the player sees when they hover (via the `title` attribute) and what appears in verb responses.

---

## 3. How Exits Connect Rooms

Exits are a subset of hotspots. When a hotspot ID appears in the room's `exits` map, clicking it with the **Walk to** verb triggers a room transition. Here's the exit map for the **aft-deck**:

```javascript
exits: {
  'hs-door-bar':       {target: 'bar-rail',    label: '◆ THE TAP ◆'},
  'hs-door-wheelhouse': {target: 'wheelhouse', label: '◆ WHEELHOUSE ◆'}
}
```

The connection is **one-directional** — the target room doesn't automatically know about this exit. You must define the return exit in the target room. Here's bar-rail pointing to aft-deck, and aft-deck pointing back:

```
bar-rail.exits['hs-door-aft'] → aft-deck
aft-deck.exits['hs-door-bar'] → bar-rail
```

The full room map looks like this:

```
                  ┌──────────────┐
                  │  WHEELHOUSE  │
                  └──┬────┬──────┘
              galley  │    │  engine-room
                  ┌──┴────┴──┐  ┌──┴──────────┐
                  │  GALLEY  │  │ ENGINE ROOM  │
                  └──────────┘  └──────┬───────┘
                                       │
              ┌──────────┐    ┌────────┴───────┐
              │ BAR RAIL │────│   AFT DECK     │
              └────┬─────┘    └────────────────┘
                   │                   │
              ┌────┴─────┐    ┌────────┴───────┐
              │RADIO ROOM│    │  AFT COCKPIT   │
              └──────────┘    └────────────────┘
```

---

## 4. How NPC Sprites Are Positioned

NPC sprites are `<img>` elements positioned with inline CSS percentages. They're defined once in the HTML and shown/hidden per room:

```html
<img id="npc-riker" class="npc-sprite" src="assets/npcs/riker.png"
     style="left: 52%; top: 28%; width: 13%;">
<img id="npc-captain" class="npc-sprite" src="assets/npcs/captain.png"
     style="left: 20%; top: 25%; width: 13%;">
<img id="npc-deckhand" class="npc-sprite" src="assets/npcs/deckhand.png"
     style="left: 42%; top: 30%; width: 13%;">
```

The `ROOM_NPCS` map controls which sprites are visible in each room:

```javascript
const ROOM_NPCS = {
  'bar-rail':    ['npc-riker', 'npc-coffee'],
  'wheelhouse':  ['npc-captain', 'npc-compass'],
  'aft-deck':    ['npc-deckhand', 'npc-life-ring'],
  'galley':      ['npc-cook', 'npc-coffee'],
  'engine-room': []  // engineer-bot is canvas-drawn, no sprite
};
```

NPC sprites have a gentle idle bob animation:

```css
.npc-sprite.visible {
  display: block;
  animation: npcBob 2.5s ease-in-out infinite;
}

@keyframes npcBob {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}
```

Some NPCs (like the engineer bot) are drawn directly on the canvas via pixel commands in `drawEngineerBot()`, not as sprite overlays. Both approaches work.

---

## 5. Real Example: Clicking the Aft Door from Bar-Rail

Let's trace exactly what happens when the player clicks **Walk to** → **the aft door**:

### Step 1: Verb Selection

The player clicks "Walk to" in the verb bar:

```javascript
document.querySelectorAll('.verb-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.verb-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedVerb = btn.dataset.verb;  // "walk to"
    verbLine.textContent = '▶ ' + selectedVerb.toUpperCase();  // "▶ WALK TO"
  });
});
```

### Step 2: Hotspot Click

The player clicks the aft door hotspot (`hs-door-aft`):

```javascript
function handleHotspotClick(hsId) {
  if (!selectedVerb) { showResponse('Select a verb first.'); return; }
  const result = getResponse(selectedVerb, hsId);
  // ...
}
```

### Step 3: Response Lookup

`getResponse('walk to', 'hs-door-aft')` looks up the bar-rail response table:

```javascript
'walk to': {
  'hs-door-aft': '__EXIT__',   // ← special sentinel
  // ...
}
```

### Step 4: Exit Resolution

The handler sees `__EXIT__` and looks up the exit map:

```javascript
if (result === '__EXIT__') {
  const exit = ROOMS[currentRoom].exits[hsId];
  if (exit) transitionToRoom(exit.target, exit.label);
  return;
}
```

`ROOMS['bar-rail'].exits['hs-door-aft']` returns `{target: 'aft-deck', label: '◆ AFT DECK ◆'}`.

### Step 5: Room Transition

```javascript
function transitionToRoom(targetRoom, label) {
  const rt = document.getElementById('room-transition');
  rt.textContent = label;  // "◆ AFT DECK ◆"
  rt.classList.add('visible');

  playRoomAudio(targetRoom);  // crossfade audio

  setTimeout(() => {
    currentRoom = targetRoom;        // 'aft-deck'
    loadHotspots();                  // create new hotspot divs
    loadRoomBackground(currentRoom); // swap background image
    updateLocationIndicator();       // update status bar
    showNpcSprites(currentRoom);     // show deckhand sprite

    // Sync to split-view via localStorage + postMessage
    const state = JSON.parse(localStorage.getItem('platos-shell-world'));
    state.currentRoom = currentRoom;
    localStorage.setItem('platos-shell-world', JSON.stringify(state));
    window.parent.postMessage({ type: 'room-change', room: currentRoom }, '*');

    setTimeout(() => rt.classList.remove('visible'), 200);
  }, 500);
}
```

The player sees: fade-to-black overlay with "◆ AFT DECK ◆" text → 500ms later, the new room renders → fade out.

---

## See Also

- [HOW VERBS WORK](HOW-VERBS-WORK.md) — What happens after the hotspot click
- [ADDING NEW ROOMS](ADDING-NEW-ROOMS.md) — Step-by-step guide to creating a room
- [HOW AUDIO WORKS](HOW-AUDIO-WORKS.md) — Room ambient audio crossfade

---

*The ship has seven rooms. Each one is a JavaScript object, a canvas drawing function, and a response table. That's all a room is.*
