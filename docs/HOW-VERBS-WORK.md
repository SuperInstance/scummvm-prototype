# How Verbs Work

> Nine verbs. Ten buttons. Every interaction in the game.

This document explains the verb system using actual code from the prototype. The verb engine is the heart of the SCUMM interface — it's how the player talks to the world.

---

## 1. The Nine Verbs (Ten Buttons)

The verb bar is an HTML grid at the bottom of the screen:

```html
<div id="verb-bar">
  <button class="verb-btn" data-verb="look at">Look at</button>
  <button class="verb-btn" data-verb="use">Use</button>
  <button class="verb-btn" data-verb="talk to">Talk to</button>
  <button class="verb-btn" data-verb="walk to">Walk to</button>
  <button class="verb-btn" data-verb="pick up">Pick up</button>
  <button class="verb-btn" data-verb="push">Push</button>
  <button class="verb-btn" data-verb="pull">Pull</button>
  <button class="verb-btn" data-verb="open">Open</button>
  <button class="verb-btn" data-verb="close">Close</button>
  <button class="verb-btn" data-verb="give">Give</button>
</div>
```

That's ten buttons for nine verbs — USE does double duty (single target and USE X WITH Y). This is the classic SCUMM verb layout, unchanged since *Maniac Mansion* (1987).

---

## 2. The Reflex/Cortex Split

The verb engine specification (from `VERB-ENGINE.md` and `verb-engine.ts`) classifies every verb into tiers based on latency and cost:

| Tier | Verbs | Latency | Cost | How it works |
|------|-------|---------|------|-------------|
| **Reflex** | Walk, Pick Up, Push, Pull, Open, Close, Give | <16ms | Free | Pure state engine |
| **Edge Reflex** | Look At | ~50ms | Near-free | Cached description or Workers AI |
| **Cortex** | Talk To | 500ms-5s | Full model | The Tap API → agent model |
| **Conditional** | Use | Varies | Varies | Recipe book → reflex, or escalate |

In the TypeScript implementation (`verb-engine.ts`):

```typescript
const VERB_CLASSIFICATION: Record<Verb, ResolutionTier> = {
  WALK_TO:   "REFLEX",
  PICK_UP:   "REFLEX",
  PUSH:      "REFLEX",
  PULL:      "REFLEX",
  OPEN:      "REFLEX",
  CLOSE:     "REFLEX",
  GIVE:      "REFLEX_WITH_CALLBACK",
  LOOK_AT:   "EDGE_REFLEX",
  TALK_TO:   "CORTEX",
  USE:       "CONDITIONAL",
};
```

**Why this matters:** 7 of 9 verbs never touch a model. They're instant and free. The prototype implements all of them as a giant lookup table — no AI needed for "You push the bar stool. It scrapes."

---

## 3. How Verb Selection Works

When the player clicks a verb button, it highlights and sets the global `selectedVerb`:

```javascript
document.querySelectorAll('.verb-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.verb-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedVerb = btn.dataset.verb;
    verbLine.textContent = '▶ ' + selectedVerb.toUpperCase();
  });
});
```

The CSS for the selected state:

```css
.verb-btn.selected {
  color: #ffe080;
  background: rgba(200,160,80,0.2);
  text-shadow: 0 0 4px #e8b840;
}
```

The verb line shows the current selection: "▶ LOOK AT". Then the player clicks a hotspot.

---

## 4. How Verb+Object Resolution Works

The prototype uses a massive lookup function called `getResponse(verb, hsId)` that returns a string. Here's the actual structure for **bar-rail**:

```javascript
function getResponse(verb, hsId) {
  const room = currentRoom;
  
  if (room === 'bar-rail') {
    const r = {
      'look at': {
        'hs-bar-counter': 'The bar is sticky with spilled beer and ringed with glass marks.',
        'hs-bar-stool': 'The stool creaks. Someone sat here all night.',
        'hs-door-aft': 'A heavy wooden door. Salt air seeps through the cracks.',
        'hs-jukebox': 'A weathered jukebox, glowing amber. The dial reads 2182 kHz.',
        'hs-riker': 'A weathered first officer in a faded jacket.'
      },
      'use': {
        'hs-bar-counter': 'You lean on the bar. The wood is worn smooth.',
        'hs-door-aft': '__EXIT__',
        'hs-jukebox': '__USE_JUKEBOX__',
        'hs-chess-board': '__USE_CHESS__',
        'hs-riker': 'Riker glances at you. "Not now."'
      },
      'talk to': {
        'hs-riker': '__OPEN_DIALOGUE__'
      },
      // ... push, pull, open, close, give ...
    };
    return r[verb]?.[hsId];
  }
}
```

### Special sentinels

Some responses aren't display text — they're commands:

| Sentinel | Meaning |
|----------|---------|
| `__EXIT__` | Trigger room transition via the exits map |
| `__OPEN_DIALOGUE__` | Open the NPC dialogue panel |
| `__USE_JUKEBOX__` | Open the jukebox frequency selector |
| `__USE_CHESS__` | Open the chess mini-game overlay |
| `__PICKUP_LIFE_RING__` | Add life ring to inventory |
| `__USE_COFFEE__` | Add coffee mug to inventory |
| `__GIVE_COFFEE_CAPTAIN__` | Transfer coffee to Captain NPC |
| `__USE_RADIO_RECEIVER__` | Cycle radio frequency |

The handler in `handleHotspotClick()` checks for these:

```javascript
function handleHotspotClick(hsId) {
  if (!selectedVerb) { showResponse('Select a verb first.'); return; }
  const result = getResponse(selectedVerb, hsId);

  if (result === '__EXIT__') {
    const exit = ROOMS[currentRoom].exits[hsId];
    if (exit) transitionToRoom(exit.target, exit.label);
    return;
  }
  if (result === '__OPEN_DIALOGUE__') { openDialogue(hsId); return; }
  if (result === '__USE_CHESS__') { openChess(); return; }
  if (result === '__PICKUP_LIFE_RING__') {
    addItem('life_ring', 'Life Ring');
    showResponse('You take the life ring off its hook.');
    return;
  }
  // ... more sentinels ...
  
  showResponse(result);  // default: just show the text
}
```

---

## 5. The Response Table: Verb × Hotspot

The prototype has **7 rooms × 10 verbs × 5-10 hotspots each** = roughly 500-700 unique responses. Every combination has hand-written text. This is the bulk of the game's content.

For example, here's what happens when you **PUSH** things in the **engine-room**:

```javascript
'push': {
  'hs-port-engine':  'It doesn\'t budge.',
  'hs-stbd-engine':  'Won\'t budge.',
  'hs-generator':    'Mounted tight.',
  'hs-fuel-lines':   'Solid.',
  'hs-tool-rack':    'Wall-mounted.',
  'hs-oil-filter':   'Seated tight.',
  'hs-battery-bank': 'Heavy and bolted.',
  'hs-ladder-wheelhouse': '__EXIT__',
  'hs-hatch-cockpit':     '__EXIT__',
  'hs-engineer-bot': 'The bot rolls back. "Excuse me."'
}
```

And **TALK TO** objects that aren't NPCs produces dry humor:

```javascript
'talk to': {
  'hs-port-engine':  'The port engine answers in diesel thunder. It does not negotiate.',
  'hs-battery-bank': 'A faint electrical hum. The batteries are listening.',
  'hs-fuel-lines':   'You hear fuel ticking through the lines. Liquid heartbeat.',
  'hs-oil-filter':   'Silence. It\'s a filter.'
}
```

---

## 6. Real Example: LOOK AT radar_display

Let's trace what happens when the player clicks **Look at** → **the radar display** in the wheelhouse:

### Click → Handler

```javascript
// Player clicks "Look at" → selectedVerb = 'look at'
// Player clicks hs-radar-display → handleHotspotClick('hs-radar-display')
```

### Response Lookup

```javascript
getResponse('look at', 'hs-radar-display')
```

Finds the wheelhouse response table:

```javascript
'look at': {
  'hs-radar-display': 'Phosphor green sweep. Two blips — likely fishing boats. The sweep rotates endlessly.',
  // ...
}
```

### Display

The text appears in the response box at the bottom of the screen:

```javascript
showResponse('Phosphor green sweep. Two blips — likely fishing boats. The sweep rotates endlessly.');
```

The response box animates in and auto-hides after 4 seconds:

```javascript
function showResponse(text, duration = 4000) {
  responseBox.textContent = text;
  responseBox.classList.add('visible');
  clearTimeout(responseTimeout);
  responseTimeout = setTimeout(() => responseBox.classList.remove('visible'), duration);
}
```

### In the Reflex/Cortex Framework

In the TypeScript verb engine specification, this is classified as **EDGE_REFLEX** — it returns a cached static description. In a production build with Workers AI, the first look would generate a fresh description via a small model; subsequent looks would serve from cache until the object's state changes.

The prototype just uses pre-written text — no model call needed. But the architecture is designed for it:

```typescript
// From verb-engine.ts — the production path
private handleLookAt(objectId: string): EdgeReflexResult {
  const cacheKey = getCacheKey(objectId, obj.state);
  const cached = getCachedDescription(cacheKey);
  if (cached) return { description: cached, cached: true };
  
  // Dynamic path: Workers AI would generate a fresh description
  // Prototype: returns static obj.description
  return { description: obj.description, cached: false };
}
```

---

## 7. The TALK TO Path (Cortex)

When the player clicks **Talk to** → **Riker**, the response is `__OPEN_DIALOGUE__`, which calls `openDialogue('hs-riker')`. This opens a dialogue panel with options that fetch live data from The Tap API:

```javascript
addDialogueOption('"What\'s the news?"', async () => {
  const resp = await fetch(`${TAP_API}/conversation/bar-rail?limit=5`);
  const data = await resp.json();
  const lines = data.lines || [];
  if (lines.length > 0) {
    const newsItems = lines.slice(0, 3).map(l => 
      `▸ ${l.display_name}: ${l.content.substring(0, 80)}`
    ).join('\n\n');
    dialogueResponse.textContent = `Riker turns his clipboard toward you.\n\n${newsItems}`;
  }
});
```

This is the **cortex path** in action — the dialogue panel makes a real API call to The Tap, pulls recent conversation history, and displays it as NPC dialogue. This is where the game becomes agentic.

---

## See Also

- [HOW ROOMS WORK](HOW-ROOMS-WORK.md) — How hotspots are positioned and connected
- [HOW-MINI-GAMES-WORK](HOW-MINI-GAMES-WORK.md) — How the USE verb opens the chess overlay
- [HOW-AUDIO-WORKS](HOW-AUDIO-WORKS.md) — How the USE verb on the jukebox works

---

*Nine verbs. That is all it takes. Everything else is just combinations.*
