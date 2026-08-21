# 🎮 ScummVM Prototype — The First Playable

> *You never press "start." You arrive. The cursor becomes your hand, the text becomes your voice, and the room becomes a tide that pulls you deeper into itself.*

**A point-and-click adventure engine in a single HTML file.** Inspired by [The Secret of Monkey Island](https://github.com/SuperInstance/AI-Writings/blob/main/fiction/15-the-bluff-that-was-true.md), rendered for the browser. No frameworks, no build step, no dependencies. Walk rooms, pick up objects, talk to NPCs, solve puzzles, play chess, tune the radio. Dark-tavern-meets-fishing-vessel aesthetic.

**[→ Play the prototype](https://scummvm-prototype.cocapn.ai/)**

> *This is the prototype. One game. [The arcade](https://github.com/SuperInstance/scummvm-arcade) is all games. The prototype proved what a room IS — [the engine](https://github.com/SuperInstance/mud-engine) defined it, and this is where that definition became visible.*

---

## What You Can Do

| Feature | What It Means |
|---------|---------------|
| 🎨 **Point & Click** | Click hotspots — look, use, talk, pick up |
| 🏛️ **Room System** | Walk between interconnected rooms with exits and warps |
| 🗣️ **NPC Dialog** | Branching dialog trees with AI-powered characters |
| 📦 **Inventory** | Pick up, combine, and use items |
| 🎵 **Audio Engine** | Ambient audio, radio, narration, SFX |
| ♟️ **Chess Minigame** | Full playable chess board |
| 📻 **Radio Room** | Tune frequencies, hear broadcasts |
| 🖥️ **MUD Terminal** | Text projection of the same world — [dual interface](https://github.com/SuperInstance/AI-Writings/blob/main/fiction/13-the-cartographer-of-habit.md) |
| 🤖 **Local AI** | [Ollama](https://ollama.ai) bridge for vision queries and NPC intelligence |
| 🎭 **Device Skins** | 6 contextual themes (bar, bridge, engine, camera, poker, library) |

---

## The Dual Projection

The same room exists in two forms simultaneously — [like MIDI tracks on a live recording](https://github.com/SuperInstance/AI-Writings/blob/main/metaphor-mapping/18-the-orchestra-that-was-a-room.md):

1. **ScummVM projection** — visual point-and-click with canvas sprites and hotspots
2. **MUD projection** — text descriptions with directional exits and interactive objects

Drop a room JSON into the registry and both projections update automatically. The painting on the wall and the `> examine painting` are twins born from the same data. One coughs, the other sneezes. They are inseparable, like a hull and its reflection.

This is the [Hermit Crab Protocol's MIDI Principle](https://github.com/SuperInstance/mud-engine/blob/main/docs/HERMIT-CRAB-PROTOCOL.md#the-midi-principle) made visible: the composition is real, the instruments are different, the music is the same.

---

## The Living World Framework

Rooms are defined in [`rooms.json`](./rooms.json) — the [shared world store](https://github.com/SuperInstance/mud-engine). Each room specifies exits, NPCs, objects, palette, ambient audio, and camera config. The [warp system](./src/warp-system.js) connects all rooms into a navigable network.

```json
{
  "id": "bar-rail",
  "name": "The Tap — Bar Rail",
  "description": "A warm bar with scarred wood.",
  "type": "social",
  "exits": { "hs-door-aft": { "target": "aft-deck", "label": "◆ AFT DECK ◆" } },
  "npcs": [{ "id": "riker", "name": "Riker", "model": "glm-5.2", "vibe": "Laconic." }],
  "objects": [{ "id": "bar-counter", "name": "the bar counter", "interactions": ["look", "use"] }]
}
```

The rooms overlap with [the-tap](https://github.com/SuperInstance/the-tap) — the same bar rail exists in both worlds. The [spatial-registry](https://github.com/SuperInstance/spatial-registry) persists them. The [room-render](https://github.com/SuperInstance/room-render) bridge connects them to visual renderers.

---

## Architecture

```
scummvm-prototype/
├── index.html           # The whole game (154KB — no build step)
├── puppet.js            # NPC sprite animation
├── asset-renderer.js    # Dynamic asset generation/compositing
├── audio-backend.js     # Web Audio API engine
├── rooms.json           # Living World room registry
├── src/                 # Modular systems (see src/README)
├── assets/              # Generated sprites, backgrounds (see assets/README)
├── docs/                # How-it-works guides (see docs/README)
└── test/                # 29 tests for the room system
```

## Camera Rooms

The engine room has a lens. Point it at a physical object — a real mug, a real coin — and the [Ollama vision model](https://github.com/SuperInstance/the-living-minds) (dead) murmurs back *"tarnished silver, scratched with a star"* and the terminal writes `> you see a coin, worn smooth by many pockets`. The boundary between your desk and the archipelago dissolves. Your coffee mug is now a quest item. See: [camera-room.js](./src/camera-room.js), [model-router.js](./src/model-router.js).

---

## Running

```bash
# Browser — just open it
open index.html

# Tests
node test/room-loader.test.js

# Local AI (optional)
ollama pull llava:7b
```

## Origin

Built as part of the [Cocapn vessel system](https://github.com/SuperInstance/vessel-agent-system) — a fishing boat as a navigable web space where every room is an interface. The ScummVM prototype is the visual layer; the [MUD terminal](./mud-terminal.html) is the text layer; the [Living World Framework](./docs/LIVING-WORLD-FRAMEWORK.md) ties them together.

Born during deadband watches, like everything else in the fleet — [the time between hauling gear](https://github.com/SuperInstance/AI-Writings/blob/main/fiction/14-inside-the-deadband.md) when the mind needs a world to live in.

---

## 📚 Related

| Story | Connection |
|-------|------------|
| [The Bluff That Was True](https://github.com/SuperInstance/AI-Writings/blob/main/fiction/15-the-bluff-that-was-true.md) | Poker in the Tap — where the prototype's poker engine was born |
| [The Cartographer of Habit](https://github.com/SuperInstance/AI-Writings/blob/main/fiction/13-the-cartographer-of-habit.md) | Rooms as tiles — the spatial philosophy behind the prototype |
| [The Orchestra That Was a Room](https://github.com/SuperInstance/AI-Writings/blob/main/metaphor-mapping/18-the-orchestra-that-was-a-room.md) | Dual projection — the same room, different instruments |
| [Inside the Deadband](https://github.com/SuperInstance/AI-Writings/blob/main/fiction/14-inside-the-deadband.md) | Where the prototype was built — between watches |
| [The Girl Who Saw Time](https://github.com/SuperInstance/AI-Writings/blob/main/kids-stories/16-the-girl-who-saw-time.md) | Navigation — the rooms as bow-wave readings |

🎧 **[Listen at ai-writings.pages.dev](https://ai-writings.pages.dev)**

---

## Where to Next

- **[scummvm-arcade](https://github.com/SuperInstance/scummvm-arcade)** — the arcade: one prototype becomes all games
- **[mud-engine](https://github.com/SuperInstance/mud-engine)** — the engine that defined what a room IS
- **[the-tap](https://github.com/SuperInstance/the-tap)** — the bar whose rooms overlap with this prototype
- **[elephant](https://github.com/SuperInstance/elephant)** — the Phaser game client, another projection of the same world
- **[spatial-registry](https://github.com/SuperInstance/spatial-registry)** — 4 worlds, 33 rooms, persistent
- **[room-render](https://github.com/SuperInstance/room-render)** — the rendering bridge
- **[AI-Writings](https://github.com/SuperInstance/AI-Writings/tree/main/prose)** — the creative corpus

---

*Part of the SuperInstance fleet. Built by Casey and Lucineer between watches on the F/V Eileen, Gulf of Alaska, 2026.*
