# Adding New Mini-Games

> Copy the chess pattern. New hotspot. New iframe. New Tap integration.

The chess game is the template. This guide shows how to add new mini-games by following the exact same pattern, with ideas for what to build.

---

## Quick Reference

A mini-game needs:
1. A standalone HTML file (the game itself)
2. A hotspot in the room where the game lives
3. A sentinel response (`__USE_XXX__`) in `getResponse()`
4. An overlay `<div>` + `<iframe>` in `index.html`
5. An `openXxx()` and `closeXxx()` function
6. A `postToTap()` call when the game ends
7. A `postMessage` listener for the close button

---

## Step 1: Create the Game HTML File

Create a self-contained HTML file — like `chess.html`. It should have:
- Its own CSS (matching the maritime amber palette)
- Its own game logic (JavaScript)
- A close button that sends `postMessage` to the parent
- A `postToTap()` function to report results

Here's the skeleton, extracted from `chess.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Game Title</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0700;
    color: #c8a050;
    font-family: 'Courier New', Courier, monospace;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  /* ... game-specific styles ... */
</style>
</head>
<body>

<!-- Game UI -->
<div id="game-container">
  <!-- ... -->
</div>

<script>
const TAP_API = 'https://the-tap.casey-digennaro.workers.dev/api';

// ── Game state ──
let gameState = { /* ... */ };

// ── Game logic ──
function initGame() { /* ... */ }
function playTurn() { /* ... */ }

// ── Post result to The Tap ──
async function postToTap(text) {
  try {
    await fetch(`${TAP_API}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: 'bar-rail',
        speaker: 'game-player',
        text: text
      })
    });
  } catch (e) {
    console.log('Could not reach The Tap:', e);
  }
}

// ── Close button ──
document.getElementById('btn-close').addEventListener('click', () => {
  try { window.parent.postMessage({ type: 'close-game' }, '*'); } catch(e) {}
});
</script>
</body>
</html>
```

---

## Step 2: Add the Overlay in index.html

Add an overlay div and iframe, just like the chess overlay:

```html
<!-- Fishing mini-game overlay -->
<div id="fishing-overlay" style="
  position:fixed;top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,0.95);display:none;
  z-index:1001;justify-content:center;align-items:center;
">
  <iframe src="fishing.html" style="
    width:100%;max-width:900px;height:100%;border:none;
  " id="fishing-iframe"></iframe>
</div>
```

Use a different `z-index` than other overlays (chess uses 1000).

---

## Step 3: Add the Hotspot

Add a hotspot to the room where the game lives. For a fishing game, it might go in the **aft-cockpit**:

```javascript
'aft-cockpit': {
  hotspots: [
    // ... existing hotspots ...
    {id: 'hs-fishing-rod', name: 'the fishing rod', x: '25%', y: '45%', w: '12%', h: '30%'}
  ],
  exits: { /* ... */ }
}
```

---

## Step 4: Add the Sentinel and Handler

In `getResponse()`, add the sentinel:

```javascript
'use': {
  'hs-fishing-rod': '__USE_FISHING__',
}
```

In `handleHotspotClick()`, add the handler:

```javascript
if (result === '__USE_FISHING__') {
  openFishing();
  showResponse('You pick up the rod. The reel clicks. Ready to cast.');
  return;
}
```

Write the open/close functions:

```javascript
function openFishing() {
  const overlay = document.getElementById('fishing-overlay');
  const iframe = document.getElementById('fishing-iframe');
  iframe.src = 'fishing.html';
  overlay.style.display = 'flex';
}

function closeFishing() {
  const overlay = document.getElementById('fishing-overlay');
  overlay.style.display = 'none';
  document.getElementById('fishing-iframe').src = '';
}
```

---

## Step 5: Listen for Close

Add a message listener for the close event:

```javascript
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'close-chess') { closeChess(); }
  if (e.data && e.data.type === 'close-fishing') { closeFishing(); }
});
```

---

## Step 6: Make Game Events Post to The Tap

When the game ends or reaches a milestone, call `postToTap()`. The chess game does this on checkmate:

```javascript
// In your game file:
function endGame(result) {
  if (result === 'big-catch') {
    postToTap('Huge catch at the aft cockpit. A 40-pound halibut came up from 20 fathoms. The deckhand is impressed.');
  } else if (result === 'got-skunked') {
    postToTap('Fished for an hour. Nothing. The ocean keeps its secrets.');
  }
}
```

The result appears in the bar-rail conversation log. If the player walks back to the bar, Riker might reference it.

---

## The Pattern: From Click to Tap

```
1. Player clicks USE on hs-fishing-rod
   └─► getResponse('use', 'hs-fishing-rod') → '__USE_FISHING__'
       └─► openFishing()
           └─► Set iframe src, show overlay
               └─► fishing.html loads
                   └─► Player plays
                       └─► postToTap() sends result to bar-rail
                           └─► Player closes
                               └─► postMessage({type: 'close-fishing'})
                                   └─► Parent hides overlay
```

---

## Mini-Game Ideas

### Fishing Game (Aft Cockpit)

**Hotspot:** `hs-fishing-rod` in `aft-cockpit`
**Mechanic:** Cast line → wait for bite → reel in (timing meter) → catch random fish
**Tap integration:** Post the catch (species, weight) to bar-rail. Riker comments on big catches.
**Visuals:** Pixel-art ocean, fishing line animation, fish silhouettes

### Card Game — "Fleet Hands" (Bar Rail)

**Hotspot:** `hs-card-table` in `bar-rail` (new table near the chess board)
**Mechanic:** Poker-style game with maritime-themed hands (Fleet, Anchor, Squall, etc.)
**Tap integration:** Post wins/losses. Riker might ask for a rematch.
**Visuals:** Card flip animations, chip stacking, amber table felt

### Dice Game (Bar Rail)

**Hotspot:** `hs-dice` on the bar counter
**Mechanic:** Yahtzee-style or Liars' Dice. Roll, bluff, bet.
**Tap integration:** Post results. "Someone just lost their shore leave in a dice game."
**Visuals:** 3D dice roll animation on amber felt

### Sonar Puzzle (Aft Cockpit)

**Hotspot:** `hs-fishfinder` in `aft-cockpit`
**Mechanic:** Read the sonar display, identify fish patterns, drop lines at the right depth
**Tap integration:** Post sonar readings. "Good marks on the fishfinder at 12 fathoms."
**Visuals:** Sonar display with expanding rings, fish arches, depth gauge

### Navigation Puzzle (Wheelhouse)

**Hotspot:** `hs-nav-charts` in `wheelhouse`
**Mechanic:** Plot a course using bearing/distance, avoid hazards, reach a destination
**Tap integration:** Post course changes. The Captain comments on your navigation.
**Visuals:** Chart table with compass rose, waypoints, depth contours

---

## See Also

- [HOW-MINI-GAMES-WORK](HOW-MINI-GAMES-WORK.md) — Deep dive into the chess implementation
- [HOW VERBS WORK](HOW-VERBS-WORK.md) — How the USE verb routes to games
- [ADDING-NEW-ROOMS](ADDING-NEW-ROOMS.md) — Where to put game hotspots

---

*The chess board is the template. Copy it, change the game, keep the pattern. The Tap is always listening.*
