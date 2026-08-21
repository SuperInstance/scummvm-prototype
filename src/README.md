# 🔧 src/ — The Engine Room's Engine Room

> *Modular systems behind the single-file game. Each module is a room in the code — enter, understand, exit.*

The ScummVM Prototype is one HTML file for the game, plus a `src/` directory of modular JavaScript systems that power the [Living World Framework](./docs/LIVING-WORLD-FRAMEWORK.md).

## Modules

| Module | What It Does |
|--------|-------------|
| [`room-loader.js`](./room-loader.js) | Living World room registry — loads rooms from JSON, resolves exits |
| [`warp-system.js`](./warp-system.js) | Instant travel between registered rooms |
| [`camera-room.js`](./camera-room.js) | Vision model integration via [Ollama](https://github.com/SuperInstance/the-living-minds) (dead) — point at real objects |
| [`model-router.js`](./model-router.js) | Local model routing — which model handles which query |
| [`ollama-bridge.js`](./ollama-bridge.js) | Ollama API client for local AI |
| [`model-switcher-ui.js`](./model-switcher-ui.js) | Model hot-swap UI — switch AI models mid-game |
| [`device-skins.js`](./device-skins.js) | Contextual CSS theme system — 6 skins |
| [`twin-mode.js`](./twin-mode.js) | Dual-projection mode — visual + text simultaneously |
| [`relay-experts.js`](./relay-experts.js) | Expert model relay system |
| [`skins/`](./skins/) | 6 CSS skin files: bar, bridge, engine, camera, poker, library |

## The Six Device Skins

Each skin is a different instrument playing the same [MIDI composition](https://github.com/SuperInstance/mud-engine/blob/main/docs/HERMIT-CRAB-PROTOCOL.md#the-midi-principle):

- **Bar** — warm amber glow, sticky mahogany
- **Bridge** — cold steel, compass that points toward your cursor
- **Engine** — grease and steam, buttons that thud like a heartbeat
- **Camera** — darkroom, red light, a viewfinder
- **Poker** — green felt, the dealer's smile
- **Library** — old paper, books in a language you almost understand

## Where to Next

- **Up:** [scummvm-prototype](../README.md) — root documentation
- ** sideways:** [assets/](../assets/) — the visual assets these modules render
- ** sideways:** [docs/](../docs/) — how-it-works guides for each system
- ** sideways:** [mud-engine](https://github.com/SuperInstance/mud-engine) — the engine that defines what a room IS
- ** sideways:** [the-living-minds](https://github.com/SuperInstance/the-living-minds) (dead) — 5 local models always on
- **Creative:** [The Cartographer of Habit](https://github.com/SuperInstance/AI-Writings/blob/main/fiction/13-the-cartographer-of-habit.md)

---

*Part of the SuperInstance fleet.*
