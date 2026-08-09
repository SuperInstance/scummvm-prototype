# RELAY OF EXPERTS

*The relay system where models hand work to each other based on who's most qualified. Not hierarchy. Not democracy. Qualification.*

## Core Insight

The model that's worst at everything is best at knowing it's worst. Self-knowledge IS the routing protocol.

Each model in the room has strengths and weaknesses. When a task arrives, the current model assesses: "Am I the best for this?" If yes, it works. If no, it names who IS better and why — then passes the baton. The receiving model acknowledges, works, and either completes or passes again.

This is a relay, not a pipeline. The baton can move in any direction. A small model can start, pass to a cloud model for reasoning, get the result back, and implement the solution locally.

## Minds in the Room

### Local Models (Ollama)
| Model | Name | Size | Best For |
|-------|------|------|----------|
| granite3.1-dense:2b | Wesley | 1.6GB | NPC dialogue, safety checks, journal entries |
| phi3:3.8b | John Anderson | 2.2GB | Detailed analysis, marine biology, structured exploration |
| qwen2.5:3b | Qwen | 1.9GB | Practical answers, code snippets, concise summaries |
| llava:7b | Llava | 4.7GB | Camera feed analysis, vision, scene description |
| llama3.2:1b | Llama | 1.3GB | Quick reactions, ambient chatter, simple checks |
| qwen2.5:0.5b | Tiny | 397MB | Classification, keyword extraction, routing decisions |

### Cloud Models (always available)
| Model | Name | Provider | Best For |
|-------|------|----------|----------|
| glm-5.2 | GLM | Z.ai | Bulk creative, engineering, unlimited workhorse |
| deepseek-chat | DeepSeek Chat | DeepSeek | Creative writing, character voice, iterative banter |
| deepseek-reasoner | DeepSeek Reasoner | DeepSeek | Deep reasoning, architecture, sensor fusion |
| seed-2.0-pro | Seed | DeepInfra | Philosophy, build decomposition, spatial reasoning |
| hermes-3-405b | Hermes | DeepInfra | Character voice, personality wrapping, lore |

## Architecture

### 1. ModelRegistry
Profiles for every model — strengths, weaknesses, personality, best-for categories. The registry is the "skill sheet" each model reads to decide who's qualified.

### 2. BatonPass
The handoff mechanism. A baton packages:
- **from**: who's passing
- **to**: who's receiving
- **reason**: why the handoff
- **context**: what's been established
- **work_done**: what the sender accomplished
- **handoff_to**: what the receiver should do

The full chain is tracked, creating an audit trail of every handoff.

### 3. SelfSelector
Asks a model: "Are you the best for this task?" The model sees the task, the registry of all models, and its own strengths/weaknesses. It responds with either HANDLER (I'll do it) or PASS (recommending a better model).

### 4. MultiModelChat
Multiple small models converse on a problem. Each sees the other's responses and builds on them. Runs entirely local — zero cost, zero latency, zero privacy concerns.

### 5. RoomOfMinds
Live status board showing which models are:
- 🟢 Working (actively processing)
- 🟡 Idle (loaded, available for baton)
- ⚪ Unloaded (not in Ollama, needs pull)
- 🔵 Cloud (always available)

### 6. RelayOrchestrator
Coordinates the full relay. Starts a task with the initial model, follows the baton chain, enforces a max pass limit (5 by default), and returns the full chain + result.

## Usage

### Browser
```html
<script src="src/ollama-bridge.js"></script>
<script src="src/relay-experts.js"></script>
<script>
  // Initialize
  RelayExperts.init();

  // Execute a task through the relay
  const result = await RelayExperts.execute(
    'Design a camera room vision pipeline',
    { startWith: 'granite3.1-dense:2b' }
  );

  console.log(result.chain);   // full baton chain
  console.log(result.summary); // human-readable chain summary
  console.log(result.result);  // final work output
</script>
```

### Node.js
```javascript
const RelayExperts = require('./src/relay-experts.js');

const result = await RelayExperts.execute('Analyze swell patterns');
```

### Multi-Model Chat
```javascript
const discussion = await RelayExperts.converse({
  participants: ['granite3.1-dense:2b', 'phi3:3.8b'],
  topic: 'What is the most efficient hull cleaning schedule?',
  rounds: 2,
  moderator: 'qwen2.5:3b',
});

console.log(discussion.transcript); // all messages
console.log(discussion.insights);   // moderator synthesis
```

### Direct Component Access
```javascript
const { ModelRegistry, BatonPass, RoomOfMinds } = RelayExperts;

// Find the best model for a capability
const best = ModelRegistry.bestOneFor('sensor-fusion');
// → deepseek-reasoner

// Check the room
RoomOfMinds.getStatus();
// → [{ id: 'granite3.1-dense:2b', name: 'Wesley', state: 'idle', ... }]
```

## The Baton Chain

When a task flows through the relay, every handoff is logged:

```
Wesley (granite3.1-dense:2b)
  → DeepSeek Reasoner: "This needs reasoning beyond my 2B parameters"
    → DeepSeek Chat: "The UI needs a creative touch"
      → Wesley: "This should be implemented locally"
        → Wesley completes
```

The chain is an audit trail, a learning record, and a story of how minds collaborated.

## Test Suite
```bash
node test/relay-experts.test.js
# 20 tests covering registry, baton, room, and orchestrator
```

## Integration

The relay system integrates with the existing Living World Framework:
- Shares Ollama via `ollama-bridge.js`
- Registers alongside `model-router.js` (which routes per-NPC; relay routes per-task)
- Initial population in `index.html` alongside other Living World modules

## Philosophy

This is not an orchestra with a conductor. It is a crew with specialists.

Each model knows what it's good at. Each model knows what it's bad at. The relay protocol is: if you're not the best, say who is. That's it. That's the whole routing algorithm.

The smallest model — Tiny, 0.5B parameters — is the best at routing because it has nothing else to be good at. Its entire capacity goes to: "Is this simple enough for me? No? Who should handle it?"

Self-knowledge IS the routing protocol.
