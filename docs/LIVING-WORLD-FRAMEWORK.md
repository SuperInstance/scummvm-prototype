# The Living World Framework

> A world that grows rooms like a hull grows barnacles — organically, without asking permission, each one becoming part of the hull.

The Living World Framework lets you drop new rooms, cameras, and features into Plato's Shell dynamically. The system renders them automatically in both projections — the ScummVM pixel-art view and the MUD text terminal. No code changes needed. Just JSON.

---

## Architecture: Four Layers

```
┌─────────────────────────────────────────────────────────┐
│                    ROOM REGISTRY                         │
│              rooms.json (single source of truth)         │
│  All rooms: builtin + dynamic. Type, exits, NPCs, camera │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
     ┌───────▼────────┐    ┌─────────▼──────────┐
     │  ROOM LOADER   │    │   WARP SYSTEM       │
     │  room-loader.js│    │  warp-system.js     │
     │  Reads JSON,   │    │  Fast travel        │
     │  generates     │    │  between any rooms  │
     │  both views    │    │  in the registry    │
     └───────┬────────┘    └─────────────────────┘
             │
     ┌───────▼────────┐
     │ CAMERA ROOM    │
     │ HANDLER        │
     │ camera-room.js │
     │ Vision model + │
     │ IMU fusion     │
     └────────────────┘
```

---

## 1. Room Registry (`rooms.json`)

The registry is a JSON manifest of every room in the world. Each entry defines everything the system needs to render the room in both projections.

### Room Schema

```json
{
  "id": "poker-room",
  "name": "The Poker Room",
  "description": "Smoke-blue light over a green felt table. Cards snap. Chips clink.",
  "type": "social" | "vessel" | "camera" | "game" | "creative",
  "exits": {
    "hs-door-bar": { "target": "bar-rail", "label": "◆ THE TAP ◆" }
  },
  "warps": ["bar-rail"],
  "npcs": [
    {
      "id": "dealer",
      "name": "The Dealer",
      "model": "granite3.1-dense:2b",
      "vibe": "Laconic. Shuffles slowly. Reads tells."
    }
  ],
  "objects": [
    { "id": "poker_table", "name": "Poker Table", "interactions": ["look", "use"] }
  ],
  "background_prompt": "Pixel art poker room, green felt table...",
  "ambient_audio": "poker-room-ambient",
  "camera_config": null,
  "mud_description": "The Poker Room. Green felt stretched tight...",
  "palette": "warm",
  "created_at": "2026-08-08T14:00:00Z",
  "created_by": "casey"
}
```

### Room Types

| Type | Description | Special Behavior |
|------|-------------|-----------------|
| `social` | Gathering spaces (The Tap) | NPC dialogue, ambient chatter |
| `vessel` | Ship rooms (engine, galley, deck) | Sensor data in MUD |
| `camera` | Live camera feed rooms | Vision model analysis, video display |
| `game` | Interactive game rooms | Game mechanics run in background |
| `creative` | Content/display rooms | Shows AI writings, art, music |

### Existing Rooms (Builtin)

All 7 original rooms are seeded in the registry as builtin:

- `bar-rail` — The Tap (social)
- `the-radio` — Radio Room (vessel)
- `aft-deck` — Aft Deck (vessel)
- `wheelhouse` — Wheelhouse (vessel)
- `galley` — Galley (vessel)
- `engine-room` — Engine Room (vessel)
- `aft-cockpit` — Aft Cockpit (vessel)

### Dynamic Rooms (Examples)

Three example dynamic rooms are included:

- **`poker-room`** — A game room with an NPC dealer powered by `granite3.1-dense:2b`. Cards and chips on green felt under amber light.
- **`crows-nest-camera`** — A camera room type with `llava:7b` vision model. Shows forward-facing video from the highest point on the vessel. Combines with IMU data for autopilot improvement.
- **`library-nook`** — A creative content room that displays AI writings. The Archivist NPC recommends pieces. Cozy reading lamp, leather chair, porthole showing dark ocean.

---

## 2. Room Loader (`src/room-loader.js`)

The room loader reads the registry and generates rooms in both projections.

### Browser API

```javascript
// Load the registry
LivingWorld.init().then(() => {
  console.log('Rooms loaded:', Object.keys(LivingWorld.rooms));
});

// Inject dynamic rooms into ScummVM
LivingWorld.injectAllScummRooms();

// Inject dynamic rooms into MUD terminal
LivingWorld.injectAllMudRooms(ROOMS);

// Register a new room at runtime
LivingWorld.registerRoom({
  id: 'observatory',
  name: 'The Observatory',
  description: 'A glass dome above the wheelhouse. Stars pour in.',
  type: 'creative',
  exits: { 'hs-hatch': { target: 'wheelhouse', label: '◆ WHEELHOUSE ◆' } },
  warps: ['wheelhouse'],
  // ...
});
```

### Node.js API

```javascript
const LivingWorld = require('./src/room-loader.js');
LivingWorld.initFromFile('./rooms.json');
console.log(Object.keys(LivingWorld.rooms));
```

### What the Loader Does

1. **Reads `rooms.json`** and normalizes all room entries
2. **Builds warp network** from warp declarations (bidirectional)
3. **Generates ScummVM room objects** compatible with existing `ROOMS` constant
4. **Generates MUD room definitions** with exits, objects, and sensors
5. **Creates return exits** — when room A exits to room B, room B gets a return exit
6. **Generates NPC sprites** dynamically if they don't exist in HTML
7. **Queues asset generation** for rooms with `background_prompt`
8. **Registers with The Tap API** — announces new rooms in the conversation

---

## 3. Camera Room Handler (`src/camera-room.js`)

Camera rooms are special. They bridge the physical vessel and the virtual world.

### How It Works

```
┌─ SCUMMVM VIEW ──────────────┐    ┌─ MUD VIEW ─────────────────┐
│                             │    │                            │
│   [Actual camera video]     │    │  VISION MODEL DESCRIPTION  │
│   or grabbed frame          │    │  "Ocean scene. Swell from  │
│   shown as background       │    │   NW, 2-3ft waves. Stars   │
│                             │    │   visible. No vessels."    │
│   Camera HUD overlay:       │    │                            │
│   ● REC │ SOURCE │ MODEL    │    │  Corrections:              │
│                             │    │  - "looking forward from   │
│   Vision overlay popup      │    │     high point"            │
│   (on-demand)               │    │  - "swell period ~7s"      │
│                             │    │                            │
└─────────────────────────────┘    └────────────────────────────┘
```

### API

```javascript
// Query the vision model
const analysis = await CameraRoom.queryVision('crows-nest-camera');
// → { response: "Ocean scene. Swell from NW...", model: "llava:7b", ... }

// Ask a specific question
const swell = await CameraRoom.queryVision('crows-nest-camera',
  'Which direction is the swell hitting the vessel? Estimate the period.'
);

// Correct the agent's understanding
CameraRoom.addCorrection('crows-nest-camera',
  "you're looking forward from a high point, call this the crow's nest forward camera"
);
CameraRoom.addCorrection('crows-nest-camera',
  'the swell is hitting from the northwest, not west'
);

// Combine with IMU data for autopilot
const combined = await CameraRoom.combineWithIMU('crows-nest-camera', {
  heave: '±0.8m',
  pitch: '2.1°',
  roll: '3.4°',
  heavePeriod: '7.2s',
});
// → { combined_analysis: { swell_direction, swell_period, sea_state, ... },
//     autopilot_improvement: { with_camera_imu, implementation, ... } }
```

### The Teaching Loop

Casey's vision for camera rooms isn't just monitoring — it's a conversation between human and AI:

1. **Human enters the camera room** (walks or warps there)
2. **Human sees the actual video** in the ScummVM view
3. **Human asks the agent**: "Do you understand what's on the camera feed now?"
4. **Agent responds** with its vision model analysis
5. **Human corrects**: "You're looking forward from a high point"
6. **Agent updates its understanding** — correction stored and applied to future queries
7. **Human asks deeper questions**: "Can you tell which way the swell is hitting? What if you combine it with the IMU room?"
8. **Agent combines sensors** and proposes autopilot improvements

Over time, the agent's corrections accumulate into genuine situational awareness.

---

## 4. Warp System (`src/warp-system.js`)

Fast travel between any rooms in the registry. No walking required.

### ScummVM Warp

- **Click the ◆ button** (bottom-right of the game container)
- **Or press Shift+W** — opens the warp selector modal
- **Select a room** — instant teleport with fade transition
- **New rooms appear automatically** when registered

### MUD Terminal Warp

```
> warp                    → show all destinations
> warp poker-room         → teleport to The Poker Room
> warp crows-nest-camera  → teleport to the camera room
```

### Warp Destinations

Every room in the registry is a valid warp destination. The warp network is rebuilt automatically when rooms are added or removed.

---

## Quick Start: Adding a New Room

### Option A: Edit `rooms.json`

Add a new entry to the `rooms` object:

```json
"observatory": {
  "id": "observatory",
  "name": "The Observatory",
  "description": "A glass dome above the wheelhouse. Stars pour in through the curved glass.",
  "type": "creative",
  "exits": {
    "hs-hatch-down": { "target": "wheelhouse", "label": "◆ WHEELHOUSE ◆" }
  },
  "warps": ["wheelhouse"],
  "npcs": [],
  "objects": [
    { "id": "telescope", "name": "the telescope", "interactions": ["look", "use"] }
  ],
  "background_prompt": "Pixel art ship observatory, glass dome, stars visible, telescope, dark blue ambient light, adventure game background",
  "mud_description": "The Observatory. A glass dome crowns the wheelhouse. Stars pour in — sharp and countless. A telescope points skyward.",
  "palette": "darkblue",
  "created_at": "2026-08-08T16:00:00Z",
  "created_by": "casey"
}
```

### Option B: Register at Runtime

```javascript
LivingWorld.registerRoom({
  id: 'observatory',
  name: 'The Observatory',
  description: 'A glass dome above the wheelhouse...',
  type: 'creative',
  exits: { 'hs-hatch-down': { target: 'wheelhouse', label: '◆ WHEELHOUSE ◆' } },
  warps: ['wheelhouse'],
  // ...
});
```

### Option C: Register from URL

```javascript
await LivingWorld.registerRoomFromURL('https://example.com/my-room.json');
```

### What Happens Automatically

1. Room appears in the **warp selector** (ScummVM)
2. Room appears in **`warp` command** output (MUD)
3. Room gets **return exits** from connected rooms
4. **NPC sprites** are created (if assets exist)
5. **Audio** is wired up (if ambient file exists)
6. **Asset generation** is queued (if `background_prompt` is set)
7. Room is **announced in The Tap** (if you call `announceRoom()`)

---

## Quick Start: Adding a Camera Room

```json
"bow-camera": {
  "id": "bow-camera",
  "name": "Bow Camera",
  "description": "Forward-facing camera at the bow. Shows the path ahead.",
  "type": "camera",
  "exits": {
    "hs-door-foredeck": { "target": "aft-deck", "label": "◆ AFT DECK ◆" }
  },
  "warps": ["aft-deck"],
  "npcs": [],
  "objects": [
    { "id": "camera-feed", "name": "the camera feed", "interactions": ["look", "use"] }
  ],
  "camera_config": {
    "source": "rtsp://192.168.1.50:554/bow-cam",
    "model": "llava:7b",
    "room_type": "bow forward camera",
    "capabilities": ["vision", "obstacle-detection", "sea-state"]
  },
  "mud_description": "BOW CAMERA — Forward view from the bow. The camera shows open ocean ahead.",
  "palette": "darkblue"
}
```

Then in the room:
- Human sees the video feed
- Agent sees the vision model's text description
- Human can correct the agent's understanding
- Agent combines with IMU for autopilot improvements

---

## Integration with Existing System

The Living World Framework **extends** the existing room system — it does not replace it.

### What Stays the Same

- The `ROOMS` constant in `index.html` still defines builtin rooms
- The `getResponse()` function still handles verb × hotspot combos
- `transitionToRoom()` still does the fade transition
- The MUD terminal's `ROOMS` object and `processCommand()` work as before
- Audio crossfade, NPC sprites, inventory — all unchanged

### What's Added

- `rooms.json` — external registry (single source of truth for room metadata)
- `src/room-loader.js` — reads registry, injects dynamic rooms
- `src/camera-room.js` — handles camera room vision queries
- `src/warp-system.js` — warp UI and command handling

### How to Wire It Up

Add these scripts to `index.html` (ScummVM):

```html
<script src="src/room-loader.js"></script>
<script src="src/camera-room.js"></script>
<script src="src/warp-system.js"></script>
<script>
  LivingWorld.init().then(() => {
    LivingWorld.injectAllScummRooms();
    CameraRoom.init();
    WarpSystem.initScumm();
  });
</script>
```

Add to `mud-terminal.html`:

```html
<script src="src/room-loader.js"></script>
<script src="src/warp-system.js"></script>
<script>
  LivingWorld.init().then(() => {
    LivingWorld.injectAllMudRooms(ROOMS);
    WarpSystem.initMud();
  });
</script>
```

---

## File Reference

| File | Purpose |
|------|---------|
| `rooms.json` | Room registry — the single source of truth |
| `src/room-loader.js` | Reads registry, generates both projections, registration API |
| `src/camera-room.js` | Camera room handler — vision queries, corrections, IMU fusion |
| `src/warp-system.js` | Warp UI (ScummVM modal + MUD command), room discovery |
| `docs/LIVING-WORLD-FRAMEWORK.md` | This document |

---

## The Design Vision

From Casey's original concept:

> "The websites are content provider sites that need a framework for dropping more and more stuff in them. The system renders the new site with additions structured right. If new rooms are added to the mud2scummVM system on the terrain, the rooms can be warped to or a door/path can be made to make walking to the new feature available.
>
> I can be in The Tap in ScummVM rendering and it looks great. Hermes and I vibe an idea for a poker room. We warp there — rendered with images and NPC dealer with a lightweight model for liveliness. The game mechanics are invisible and work. The agent is actually playing based on simple text in the MUD rendering but it comes across to the ScummVM rendering as natural play.
>
> I could set up a camera anywhere on the boat and tell the system to construct a room with the camera in it. I join in ScummVM and say 'do you understand what's on the camera feed now?' I'm looking at the actual video. The agent is looking at the outputs via a vision model."

The framework is designed for a world that doesn't ask permission to grow. Drop in a JSON. The world renders it. That's the whole thing.

---

*The world grows rooms like a hull grows barnacles — organically, without asking permission, each one becoming part of the hull.*
