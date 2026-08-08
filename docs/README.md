# Plato's Shell — Prototype Documentation

> A multi-room SCUMM-style adventure game on a boat, with a MUD terminal, a radio room, dual-projection sync, and chess at the corner table.

---

## What This Is

Plato's Shell is a prototype of an agentic GUI — an adventure game interface that wraps an AI agent. You walk around a boat (the SS Cocapn), interact with objects and NPCs, listen to the radio, play chess, and talk to agents who live in the boat's Cloudflare Workers backend. The same world is projected twice: as pixel-art scenes (human view) and as structured text (agent view).

The prototype proves the concept: **the SCUMM verb system is a natural interface for agent interactions, and the dual-projection architecture is a real design — not a metaphor.**

---

## File Map

### Prototype (`scummvm-prototype/`)

| File | What It Does |
|------|-------------|
| `index.html` | Main game — 3,100 lines. Seven rooms, nine verbs, NPC dialogue, jukebox, chess overlay, inventory, room transitions |
| `chess.html` | Standalone chess mini-game — 900 lines. Full legal move generation, AI opponent, Tap integration |
| `mud-terminal.html` | Text-only MUD terminal — 950 lines. Green phosphor CRT, room descriptions, command parser, NPC dialogue |
| `split-view.html` | Dual-projection container — 200 lines. Loads MUD + ScummVM in iframes, syncs via localStorage + postMessage |
| `radio.html` | Standalone radio room — 880 lines. Canvas-rendered radio, frequency dial, tape deck, VU meter, chalkboard |
| `audio-backend.js` | Audio system — 300 lines. `AudioManifest`, `RadioPlayer`, `RenderQueue`, `NPCReactions`, `Jukebox` classes |
| `audio-manifest.json` | Track database — channels, episodes, narration queue |
| `assets/rooms/` | Room background images (JPG/PNG) |
| `assets/npcs/` | NPC sprite images (PNG) |
| `assets/audio/` | Ambient tracks and TTS narrations (WAV) |
| `assets/items/` | Inventory item icons (PNG) |
| `docs/` | This documentation |

### Design Specs (`scummvm-gui-design/`)

| File | What It Does |
|------|-------------|
| `VERB-ENGINE.md` | The 9-verb specification with reflex/cortex split |
| `DUAL-PROJECTION.md` | The shared-world architecture and perception deadband |
| `PHASER-MIGRATION.md` | Migration plan from vanilla Canvas to Phaser 3.x |
| `src/verb-engine.ts` | TypeScript implementation of the verb resolver |
| `src/shared-world.ts` | TypeScript implementation of the dual-projection world store |

---

## How to Run Locally

The prototype is pure static HTML/JS/CSS. No build step, no dependencies.

```bash
cd scummvm-prototype/

# Option 1: Python
python3 -m http.server 8000

# Option 2: Node
npx serve .

# Option 3: Just open the file
open index.html
```

Then navigate to:
- `http://localhost:8000/` — ScummVM view (main game)
- `http://localhost:8000/mud-terminal.html` — MUD terminal (agent view)
- `http://localhost:8000/split-view.html` — Both side by side
- `http://localhost:8000/radio.html` — Radio room standalone

---

## How to Deploy

The prototype deploys to any static host. The current deployment uses Cloudflare Pages.

### Deploy to Cloudflare Pages

```bash
cd scummvm-prototype/
npx wrangler pages deploy . --project-name=platos-shell
```

### Deploy to GitHub Pages

Push to a repo with GitHub Pages enabled on the `main` branch.

### The Tap Backend

NPC dialogue and mini-game results flow through The Tap, a Cloudflare Worker:

```
POST https://the-tap.casey-digennaro.workers.dev/api/speak
GET  https://the-tap.casey-digennaro.workers.dev/api/conversation/{room_id}?limit={n}
```

The Tap uses Cloudflare D1 (conversation log) and Durable Objects (room state). It's a separate project at `the-tap/`.

---

## Documentation Index

| Document | What You'll Learn |
|----------|------------------|
| [HOW ROOMS WORK](docs/HOW-ROOMS-WORK.md) | Room objects, hotspots, exits, NPC positioning, the transition system |
| [HOW VERBS WORK](docs/HOW-VERBS-WORK.md) | The 9-verb system, reflex/cortex split, response tables, verb resolution |
| [HOW MINI-GAMES WORK](docs/HOW-MINI-GAMES-WORK.md) | The iframe overlay pattern, chess move validation, Tap integration |
| [HOW AUDIO WORKS](docs/HOW-AUDIO-WORKS.md) | Room ambient, radio frequency dial, NPC reactions, manifest format |
| [HOW DUAL PROJECTION WORKS](docs/HOW-DUAL-PROJECTION-WORKS.md) | Split view, localStorage sync, bidirectional postMessage, anti-loop cooldown |
| [ADDING NEW ROOMS](docs/ADDING-NEW-ROOMS.md) | Step-by-step: room definition, drawing, responses, audio, testing |
| [ADDING NEW MINI-GAMES](docs/ADDING-NEW-MINI-GAMES.md) | Step-by-step: game HTML, overlay, hotspot, Tap integration, ideas |

---

## The Boat

The SS Cocapn has seven rooms, connected across two decks:

```
UPPER DECK
  Wheelhouse — helm, radar, compass, charts, Captain
    │
  Galley — stove, coffee, porthole, cook
    │
LOWER DECK
  Bar Rail (The Tap) — bar, jukebox, chess, Riker
    ├── Radio Room — receiver, tape deck, chalkboard
    │
  Aft Deck — rail, life ring, weather station, deckhand
    ├── Engine Room — twin diesels, generator, engineer bot
    │     └── Aft Cockpit — fishfinder, bait well, stern drive
```

Each room has 5-10 hotspots, 10 verbs × each hotspot of responses, ambient audio, and at least one NPC (except the engine room and aft cockpit, which are solo spaces).

---

## Design Philosophy

**1. The interface is the game.** Nine verbs, unchanged since 1987. Every interaction is a verb+object combination. This isn't nostalgia — it's a constraint that forces clarity. When the player can only do nine things, every object in the world has to mean something for at least one of those verbs. The verb system is the API between the human and the world.

**2. One world, two projections.** The ScummVM view is for humans — continuous, visual, free. The MUD terminal is for agents — pulled on demand, total, costly. Neither is subordinate. The gap between what each one knows at any given moment is not a bug — it's the mechanic the entire architecture is built around. The human is a sensor, not a supervisor.

**3. Thirty years of adventure-game engineering is the free half.** Room transitions, inventory management, verb resolution, hotspot detection, dialogue trees — LucasArts solved these problems decades ago. We inherit their solutions for free. What we build on top — the reflex/cortex split, the perception deadband, the Tap API, the dual-projection sync — that's where the new work lives. The prototype proves the old patterns hold.

---

## Credits

**Architecture and design:** Casey DiGennaro
**Prototype implementation:** Lucineer
**Backend:** The Tap (Cloudflare Workers + D1 + Durable Objects)
**Documentation:** This was written by a subagent that read every line of the prototype and extracted real patterns.

---

*Seven rooms. Nine verbs. Two projections. One boat. The map is detailed.*
