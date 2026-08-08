# How Mini-Games Work

> Hotspot → Use verb → iframe → standalone game → postMessage → Tap API.

The chess mini-game is the template for every mini-game in the prototype. This document traces the full pattern using actual code from `index.html` and `chess.html`.

---

## 1. The Iframe Overlay Pattern

Mini-games live in separate HTML files loaded into a full-screen overlay iframe. The overlay is defined once in `index.html`:

```html
<div id="chess-overlay" style="
  position:fixed;top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,0.95);display:none;
  z-index:1000;justify-content:center;align-items:center;
">
  <iframe src="chess.html" style="
    width:100%;max-width:900px;height:100%;border:none;
  " id="chess-iframe"></iframe>
</div>
```

The overlay starts hidden (`display:none`). When opened, it becomes `display:flex`, centering the iframe over the game.

---

## 2. How the Hotspot Opens the Game

In bar-rail, the chess board hotspot triggers the game. The verb engine routes it:

```javascript
// In getResponse() for bar-rail:
'use': {
  'hs-chess-board': '__USE_CHESS__',
  // ...
}
```

The handler sees the sentinel and calls `openChess()`:

```javascript
function handleHotspotClick(hsId) {
  // ...
  if (result === '__USE_CHESS__') {
    openChess();
    showResponse('You sit at the corner table. The board is set. Driftwood and beach glass.');
    return;
  }
}

function openChess() {
  const overlay = document.getElementById('chess-overlay');
  const iframe = document.getElementById('chess-iframe');
  iframe.src = 'chess.html';
  overlay.style.display = 'flex';
}
```

---

## 3. The Chess Game: A Complete Standalone App

`chess.html` is a self-contained 900-line application. It has its own:
- CSS styling (matching the maritime amber palette)
- Board state management
- Move generation and validation
- AI opponent (random legal moves)
- Notation and move history
- Captured pieces display
- Game-over detection

### Board Initialization

```javascript
function initBoard() {
  board = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
  turn = 'w';
  selected = null;
  moveHistory = [];
  gameOver = false;
}
```

Pieces are Unicode chess symbols with maritime names:
- **Driftwood** = White pieces (cream colored)
- **Beach Glass** = Black pieces (dark teal)

### Move Validation

The chess engine implements full legal move generation:

```javascript
function getLegalMovesForPiece(b, r, c) {
  const piece = b[r][c];
  const color = pieceColor(piece);
  const pseudo = generatePseudoLegalMoves(b, r, c);
  return pseudo.filter(m => {
    const nb = makeMove(b, m);
    return !isInCheck(nb, color);  // can't leave your own king in check
  });
}
```

Each piece type has its own move generator in `generatePseudoLegalMoves()`. The pawn is the most complex — forward movement, double-move from start, diagonal captures:

```javascript
case 'P': {
  const dir = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  // Forward one
  if (inBounds(r+dir, c) && !b[r+dir][c]) {
    moves.push({from:[r,c], to:[r+dir,c]});
    // Forward two from starting position
    if (r === startRow && !b[r+2*dir][c]) {
      moves.push({from:[r,c], to:[r+2*dir,c]});
    }
  }
  // Diagonal captures
  for (const dc of [-1, 1]) {
    if (inBounds(r+dir, c+dc)) {
      const target = b[r+dir][c+dc];
      if (target && pieceColor(target) !== color) {
        moves.push({from:[r,c], to:[r+dir,c+dc], capture:true});
      }
    }
  }
  break;
}
```

---

## 4. How Game Results Post to The Tap

When the game ends — checkmate, stalemate, or resignation — the result is posted to The Tap API so other agents and the conversation log can see it:

```javascript
function endGame(status) {
  gameOver = true;
  
  if (status.type === 'checkmate') {
    if (status.winner === 'w') {
      title.textContent = '◆ CHECKMATE — DRIFTWOOD PREVAILS ◆';
      detail.textContent = 'The beach glass king falls. The tide recedes.';
      postToTap('Checkmate at the corner table. The driftwood king stands. The beach glass king falls.');
    } else {
      title.textContent = '◆ CHECKMATE — BEACH GLASS WINS ◆';
      detail.textContent = 'The driftwood king falls. Someone moves a piece in the next world.';
      postToTap('Checkmate at the corner table. The driftwood king falls.');
    }
  } else {
    title.textContent = '◆ STALEMATE ◆';
    detail.textContent = 'No legal moves. The game simply... ends. Like conversations here.';
    postToTap('Stalemate at the corner table. Neither king falls. The ocean shrugs.');
  }
  
  overlay.classList.add('visible');
}

async function postToTap(text) {
  try {
    await fetch(`${TAP_API}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: 'bar-rail',
        speaker: 'chess-player',
        text: text
      })
    });
  } catch (e) {
    console.log('Could not reach The Tap:', e);
  }
}
```

The `postToTap()` function sends a POST to The Tap (a Cloudflare Worker at `the-tap.casey-digennaro.workers.dev`). The message appears in the `bar-rail` room conversation log. If the player walks back to the bar, Riker might show them the chess result as "news."

---

## 5. How the Game Closes

The chess iframe communicates with the parent via `postMessage`:

```javascript
// In chess.html — close button
document.getElementById('btn-close').addEventListener('click', () => {
  try { window.parent.postMessage({ type: 'close-chess' }, '*'); } catch(e) {}
  try { window.history.back(); } catch(e) {}
});

// In index.html — listen for close message
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'close-chess') {
    closeChess();
  }
});

function closeChess() {
  const overlay = document.getElementById('chess-overlay');
  overlay.style.display = 'none';
  document.getElementById('chess-iframe').src = '';  // unload
}
```

---

## 6. The Pattern: From Hotspot to Tap

Here's the complete flow for any mini-game:

```
1. Player clicks USE on the hotspot
   └─► getResponse('use', 'hs-chess-board') → '__USE_CHESS__'
       └─► openChess()
           └─► Set iframe src, show overlay
               └─► chess.html loads as standalone game
                   └─► Player plays (move, win, lose)
                       └─► postToTap() sends result to bar-rail
                           └─► Player closes game
                               └─► postMessage({type: 'close-chess'})
                                   └─► Parent hides overlay
```

This pattern works for any mini-game. The contract is:
1. **Hotspot** triggers `openXxx()` in the parent
2. **Iframe** loads the standalone game HTML
3. **Game events** call `postToTap()` to log results
4. **Close** sends `postMessage` to the parent

---

## 7. The AI Opponent

The current chess AI is intentionally simple — random legal moves:

```javascript
function aiTurn() {
  aiThinking = true;
  document.getElementById('ai-thinking').textContent = '◆ beach glass considers the board...';

  setTimeout(() => {
    const moves = generateAllLegalMoves(board, 'b');
    if (moves.length === 0) { /* checkmate or stalemate */ return; }

    // Random move — v1 AI
    const move = moves[Math.floor(Math.random() * moves.length)];
    executeMove(move);
  }, 800 + Math.random() * 700);  // think for 0.8-1.5 seconds
}
```

The 800-1500ms delay makes the AI feel like it's thinking. The "beach glass considers the board..." indicator gives it personality. Upgrading to a minimax or neural engine is straightforward — just replace the move selection in `aiTurn()`.

---

## See Also

- [HOW VERBS WORK](HOW-VERBS-WORK.md) — How the USE verb routes to mini-games
- [ADDING-NEW-MINI-GAMES](ADDING-NEW-MINI-GAMES.md) — Step-by-step guide to adding games
- [HOW ROOMS WORK](HOW-ROOMS-WORK.md) — How hotspots are defined

---

*Chess at the corner table. Driftwood and beach glass. The pieces are carved from what the ocean provides.*
