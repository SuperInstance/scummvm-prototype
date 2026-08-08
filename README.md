# ScummVM Prototype 🎮

**A point-and-click adventure engine running in a single HTML file.**  
Inspired by The Secret of Monkey Island, rendered for the browser. No frameworks, no build step, no dependencies.

**[→ Play the prototype](https://scummvm-prototype.cocapn.ai/)** (if deployed)

---

## What Is This?

A from-scratch reimagining of the classic SCUMM engine — the engine that powered LucasArts adventure games from 1987 to 1998. Built as a single-page web app with vanilla JavaScript, HTML canvas, and CSS.

Walk around rooms. Pick up objects. Talk to NPCs. Solve puzzles. Listen to the radio. Play chess. All in a dark-tavern-meets-fishing-vessel aesthetic.

---

## Features

| | What you can do |
|---|---|
| 🎨 **Point & Click** | Click hotspots to interact — look, use, talk, pick up |
| 🏛️ **Room System** | Walk between interconnected rooms with exits and warps |
| 🗣️ **NPC Dialog** | Talk to characters with branching dialog trees |
| 📦 **Inventory** | Pick up, combine, and use items |
| 🎵 **Audio Engine** | Ambient audio, radio, narration, SFX |
| ♟️ **Chess Minigame** | Full playable chess board |
| 📻 **Radio Room** | Tune frequencies, hear broadcasts |
| 🖥️ **MUD Terminal** | Text projection of the same world — dual interface |
| 🎨 **Asset Renderer** | Dynamic sprite and background rendering |
| 🤖 **Local AI** | Ollama bridge for vision queries and NPC intelligence |
| 🎭 **Device Skins** | 6 contextual themes (bar, bridge, engine, camera, poker, library) |

---

## Architecture

```
scummvm-prototype/
├── index.html           # Main game engine (154KB — the whole game)
├── puppet.js            # NPC sprite animation system
├── asset-renderer.js    # Dynamic asset generation/compositing
├── audio-backend.js     // Web Audio API engine
├── audio-manifest.json  # Audio asset registry
├── rooms.json           # Living World room registry
├── story.html           # Story/narration system
├── mud-terminal.html    # Text adventure projection
├── radio.html           # Radio room interface
├── chess.html           # Chess minigame
├── split-view.html      # Dual-mode (visual + text) view
├── src/
│   ├── room-loader.js       # Living World Framework — room registry + warp system
│   ├── warp-system.js       # Instant travel between registered rooms
│   ├── camera-room.js       # Vision model integration (Ollama/llava)
│   ├── model-router.js      # Local model routing (Ollama bridge)
│   ├── ollama-bridge.js     # Ollama API client
│   ├── model-switcher-ui.js # Model hot-swap UI
│   └── device-skins.js      # Contextual CSS theme system
├── assets/              # Generated sprites, backgrounds, audio
├── docs/                # Documentation
└── test/
    └── room-loader.test.js  # 29 tests for the Living World room system
```

---

## The Living World Framework

The room system is the heart of the prototype. Rooms are defined in `rooms.json` and projected into two interfaces:

1. **ScummVM projection** — visual point-and-click with canvas sprites and hotspots
2. **MUD projection** — text descriptions with directional exits and interactive objects

Drop a room JSON into the registry and both projections update automatically. The warp system connects all rooms into a navigable network.

### Room Schema

```json
{
  "id": "bar-rail",
  "name": "The Tap — Bar Rail",
  "description": "A warm bar with scarred wood.",
  "type": "social",        // social | vessel | engine | camera | virtual
  "exits": {
    "hs-door-aft": { "target": "aft-deck", "label": "◆ AFT DECK ◆" }
  },
  "warps": ["engine-room"],
  "npcs": [
    { "id": "riker", "name": "Riker", "model": "glm-5.2", "vibe": "Laconic." }
  ],
  "objects": [
    { "id": "bar-counter", "name": "the bar counter", "interactions": ["look", "use"] }
  ],
  "palette": "warm",
  "ambient_audio": "bar-rail-ambient",
  "camera_config": null
}
```

---

## Running

### Browser
Open `index.html` in a browser. That's it. No server required.

### Tests
```bash
node test/room-loader.test.js
```

### Local AI (optional)
Install [Ollama](https://ollama.ai) and pull a vision model:
```bash
ollama pull llava:7b
```
The camera rooms will query the local model for scene understanding.

---

## Tech Stack

- **Vanilla JS** — no React, no Vue, no build tools
- **HTML Canvas** — sprite rendering and compositing
- **Web Audio API** — procedural and sampled audio
- **CSS** — hand-rolled dark amber aesthetic
- **Node.js** — test runner only (the game itself needs no server)

---

## Origin

Built as part of the Cocapn vessel system — a fishing boat as a navigable 3D web space where every room is an interface. The ScummVM prototype is the interactive layer; the MUD terminal is the text layer; the Living World Framework ties them together.

---

*Part of the Cocapn fleet. Built by Casey and Lucineer.*
