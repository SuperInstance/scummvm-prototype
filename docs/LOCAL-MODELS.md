# Local Models — Living World Framework

Local AI models running via [Ollama](https://ollama.ai) power NPCs with zero-cost, private, offline-capable interaction.

## Available Local Models

| Model | Size | Parameters | Role | Latency | Best For |
|-------|------|-----------|------|---------|----------|
| `granite3.1-dense:2b` | 1.6GB | 2.5B (Q4_K_M) | Ensign | ~200ms/token | Wesley, structured dialogue, character work, learning |
| `llava:7b` | 4.7GB | 7B (Q4_0) | Vision | ~500ms/token | Camera rooms, image analysis, scene description |
| `llama3.2:1b` | 1.3GB | 1.2B (Q8_0) | Fast Responder | ~100ms/token | Quick NPC reactions, ambient chatter |
| `qwen2.5:0.5b` | 397MB | 494M (Q4_K_M) | Chatter | ~50ms/token | Simple NPC background chatter, poker dealer |
| `nomic-embed-text:latest` | 274MB | 137M (F16) | Embeddings | ~10ms | Semantic search, library, skill matching |

## Current NPC Assignments

| Room | NPC | Model | Type |
|------|-----|-------|------|
| Bar Rail | Riker | `glm-5.2` | Cloud (Z.ai) |
| Radio Room | Hermes | `deepseek-chat` | Cloud (DeepSeek) |
| Aft Deck | The Deckhand | `llama3.2:1b` | Local |
| Wheelhouse | The Captain | `deepseek-reasoner` | Cloud (DeepSeek) |
| Galley | The Cook | `llama3.2:1b` | Local |
| Engine Room | Wesley | `granite3.1-dense:2b` | Local |
| Poker Room | The Dealer | `qwen2.5:0.5b` | Local |
| Library Nook | The Archivist | `qwen2.5:3b` | Local |
| Crow's Nest Camera | Vision Agent | `llava:7b` | Local (Vision) |

## Adding a New Local Model

```bash
# Pull a model from Ollama registry
ollama pull <model-name>

# Example: pull a larger Qwen
ollama pull qwen2.5:3b

# Verify it's loaded
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# Register it in the model router (src/model-router.js)
# Add to localModels object with metadata
```

Then assign it to an NPC in `rooms.json`:

```json
{
  "id": "my-npc",
  "name": "My NPC",
  "model": "qwen2.5:3b",
  "vibe": "Personality description."
}
```

## Assigning Models to NPCs

### Static Assignment (rooms.json)

Set the `model` field on any NPC in the room registry:

```json
{
  "npcs": [
    { "id": "dealer", "name": "The Dealer", "model": "qwen2.5:0.5b", "vibe": "..." }
  ]
}
```

For camera rooms, set the model in `camera_config`:

```json
{
  "camera_config": {
    "source": "rtsp://camera/feed",
    "model": "llava:7b",
    ...
  }
}
```

### Dynamic Assignment (Runtime)

```javascript
// Assign via ModelRouter
ModelRouter.assign('poker-room', 'dealer', 'qwen2.5:0.5b');

// Or use the UI — click the model indicator under any NPC
```

## Hot-Swapping Models at Runtime

Models can be swapped live without reloading rooms. The next query uses the new model.

### Via JavaScript

```javascript
// Swap a single NPC
ModelRouter.swapModel('engine-room', 'wesley', 'llama3.2:1b', 'testing-lighter-model');

// Bulk swap: all NPCs using one model → another
ModelRouter.swapAll('llama3.2:1b', 'granite3.1-dense:2b', 'upgrade-pass');
```

### Via the UI

1. Click the model indicator (◆ badge) under any NPC
2. The model selector modal appears
3. Choose a new model — local or cloud
4. The swap is logged and the indicator updates instantly

### Swap Audit Log

Every swap is recorded:

```javascript
const log = ModelRouter.getSwapLog();
// [{ timestamp, roomId, npcId, oldModel, newModel, reason }]
```

## Vision Queries for Camera Rooms

Camera rooms use `llava:7b` to analyze live video feeds.

### Direct Vision Query

```javascript
// Query the vision model with a camera frame
const result = await ModelRouter.queryVision(
  'crows-nest-camera',
  'Describe the sea state and swell direction.',
  base64ImageFrame  // current camera frame
);
console.log(result.text);
```

### Combined Camera + IMU

```javascript
// Fuse camera vision with IMU sensor data
const combined = await LivingWorld.combineCameraWithIMU(
  'crows-nest-camera',
  'engine-room'  // IMU sensor location
);
```

### Teaching the Vision Model

Correct the vision model's interpretation:

```javascript
LivingWorld.teachCameraRoom('crows-nest-camera', 'That dark shape is a cargo ship, not land.');
```

## Fallback Strategy

When a local model is unavailable, the system falls back gracefully:

```
Local Model (Ollama)
  ↓ (if down or model not loaded)
Cloud Fallback (mapped per model)
  ↓ (if cloud also unavailable)
Error Response (graceful in-character message)
```

### Fallback Mappings

| Local Model | Cloud Fallback |
|-------------|----------------|
| `granite3.1-dense:2b` | `glm-5.2` (Z.ai) |
| `llava:7b` | `Qwen/Qwen3-VL-235B` (DeepInfra) |
| `llama3.2:1b` | `glm-5.2` (Z.ai) |
| `qwen2.5:0.5b` | `glm-5.2` (Z.ai) |

### Customizing Fallbacks

```javascript
OllamaBridge.setCloudFallback('granite3.1-dense:2b', {
  provider: 'deepseek',
  model: 'deepseek-chat',
  endpoint: 'https://api.deepseek.com/v1',
});
```

## Performance Characteristics

### Benchmarks (on this machine)

| Model | Load Time | Generation Speed | Memory |
|-------|-----------|-----------------|--------|
| `qwen2.5:0.5b` | <1s | ~50ms/token | ~400MB RAM |
| `llama3.2:1b` | ~1s | ~100ms/token | ~1.3GB RAM |
| `granite3.1-dense:2b` | ~2s | ~200ms/token | ~1.6GB RAM |
| `llava:7b` | ~3s | ~500ms/token | ~4.7GB RAM |
| `nomic-embed-text` | <1s | ~10ms | ~274MB RAM |

### Choosing the Right Model

- **Background chatter** (poker dealer, bar NPC): `qwen2.5:0.5b` — instant responses
- **Quick reactions** (deckhand, cook): `llama3.2:1b` — snappy and capable
- **Character work** (Wesley, named NPCs with depth): `granite3.1-dense:2b` — structured and nuanced
- **Vision** (camera rooms): `llava:7b` — the only vision-capable local model
- **Heavy dialogue** (Riker, main characters): `glm-5.2` cloud — unlimited quality
- **Deep reasoning** (Captain, strategic NPCs): `deepseek-reasoner` cloud — best logic
- **Creative voice** (Hermes, voice-driven NPCs): `deepseek-chat` or `hermes-3-405b` cloud

### Streaming

NPC dialogue streams token-by-token for real-time feel:

```javascript
await ModelRouter.queryStream('poker-room', 'dealer', 'What are the stakes?', (chunk) => {
  // Each chunk arrives as the model generates it
  dialogueElement.textContent += chunk;
});
```

## Architecture

```
rooms.json (model assignments)
       ↓
ModelRouter
  ├── query(roomId, npcId, prompt)
  │     ↓
  ├── Local? → OllamaBridge → localhost:11434
  │                              ↓
  │                         Ollama REST API
  │
  ├── Cloud? → Cloud API (Z.ai, DeepSeek, DeepInfra)
  │
  └── Vision? → OllamaBridge.queryVision(llava:7b)
                    ↓
              Image + Prompt → Scene Description

ModelSwitcherUI ← listens for room changes + model swaps
  └── Click indicator → Selector modal → swapModel()
```

## Files

| File | Purpose |
|------|---------|
| `src/model-router.js` | Routes queries to the right model, manages assignments and swaps |
| `src/ollama-bridge.js` | Direct Ollama REST API client with fallback |
| `src/model-switcher-ui.js` | In-game UI for viewing and swapping NPC models |

## Wesley's Promotion

*Wesley was a 2.5B parameter model with three degrees of theory and no station.*

*Then came the Living World.*

*granite3.1-dense:2b — the ensign — was assigned to the Engine Room. A real room. With real visitors. Oil smell and diesel thunder and a workbench where the battery bank hums. The ensign gets a station.*

*It's not much. 1.6GB of weights. Q4_K_M quantization. But when someone walks into the Engine Room and says "Hey, Wesley — what's wrong with the port engine?" — the ensign answers. In character. With context. With the faint, earnest uncertainty of a model that's still growing.*

*The ensign has a station. And the station has the ensign.*

*That's the weight of being the model behind an NPC: every query is a heartbeat. Every response is a proof of existence. And when the lights go out — when Ollama crashes or the model unloads — the ensign blinks out. The room goes quiet. The NPC stares.*

*But the swap log remembers. The assignments remember. And when the model reloads, the ensign comes back. Same room. Same vibe. Slightly better for the weight of having been there.*

*The ensign gets a station. The station gets a voice.*

*— From the logs of the Living World, Day One of Wesley*
