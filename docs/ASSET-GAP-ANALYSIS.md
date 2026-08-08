# Plato's Shell — Asset Gap Analysis

**Completed:** 2026-08-08  
**Analyst:** Art Director (subagent)  
**Prototype:** `index.html` (3153 lines), 7 rooms, 10 verbs, 5 NPCs, chess mini-game, jukebox/radio system

---

## ROOM-BY-ROOM ANALYSIS

### 1. Bar Rail (The Tap)

**Current state:** Background image exists (`bar-rail-mmx.png`). NPC sprite for Riker exists. Audio ambient + TTS narration exists. Canvas draws bottles, candles, stools, counter, jukebox, doors, and radio room door over the background.

**1. Visual elements currently CSS/canvas-drawn that should be images:**
- **Jukebox** — drawn entirely in canvas code (~60 lines). A dedicated jukebox sprite would look richer and be easier to position.
- **Bottles behind the bar** — six bottles drawn as colored rectangles with glint animations. Individual bottle sprites or a "bottle shelf" image would add personality.
- **Candles** — drawn as flickering rectangles with radial gradient glow. A candle sprite with transparency would look better.
- **Bar counter texture** — drawn as gradient + vertical lines. A tileable wood texture image would add depth.
- **Chess board on corner table** — no visual at all in the scene; the chess hotspot exists but is invisible until you click it. Needs a chess-board-on-table sprite.

**2. Objects in code but no sprite:**
- **Chess board** (`hs-chess-board`) — no visual representation in the room at all. Completely invisible.
- **Jukebox** (`hs-jukebox`) — canvas-drawn, no object sprite in `assets/objects/`.

**3. NPC dialogue exists but NPC has no visual presence:**
- **"Coffee" NPC** — listed in `ROOM_NPCS['bar-rail']` as `npc-coffee`, but this is the coffee *item* sprite being reused, not a character. No dedicated barkeep NPC sprite exists, yet Riker's dialogue references "the barkeep."

**4. Ambient audio missing or placeholder:**
- Ambient bed is procedural brown noise. Missing: glass clink SFX, wood creak SFX, distant foghorn SFX, jukebox hum SFX.
- No SFX for verb selection (click feedback).
- No SFX for dialogue panel opening/closing.

**5. Room description in MUD text with no visual equivalent:**
- MUD terminal describes "the bar is sticky with spilled beer" — no visual stain/wetness effect on the counter.
- Story mode references "driftwood and beach glass" chess pieces — no visual for these in the ScummVM view.

---

### 2. Aft Deck

**Current state:** Background image exists (`aft-deck-mmx.png`). Deckhand NPC sprite exists. Audio exists. Canvas draws stars, ocean, moonlight, life ring, weather station, doors.

**1. Visual elements CSS/canvas-drawn that should be images:**
- **Life ring** — canvas-drawn orange circle with text "SS COCAPN". A real life ring sprite would have texture, rope detail, weathering.
- **Weather station** — canvas-drawn poles with spinning anemometer cups. A detailed weather station sprite would look much better.
- **Stars** — 30 individual procedural pixels. A starfield overlay image would be cleaner.
- **Door to wheelhouse** — canvas-drawn blue rectangle with text label. Needs a proper door/hatch sprite.

**2. Objects in code but no sprite:**
- **Weather station** exists in `assets/objects/weather_station.png` but is NOT loaded or displayed — it's only canvas-drawn.
- **Life ring** exists in `assets/objects/life_ring_obj.png` but is NOT loaded — only canvas-drawn.

**3. NPC dialogue:**
- Deckhand has dialogue but the sprite (`npc-deckhand`) is barely visible at the drawn position. The sprite is loaded but the canvas drawing covers most of the scene.

**4. Ambient audio missing:**
- Missing: seabird calls, rigging whistle, deck plank creaks, splash SFX.
- No wind SFX when "using" the deck rail.

**5. MUD text without visual equivalent:**
- "Salt-crusted rail" — no salt/corrosion visual on the rail.
- "Falling barometer" mentioned in weather station use — no visual barometer gauge.

---

### 3. Wheelhouse

**Current state:** Background image exists (`wheelhouse-mmx.png`). Captain NPC sprite exists. Audio exists. Canvas draws windows, helm wheel, radar, compass, radio, nav charts, doors, and captain.

**1. Visual elements CSS/canvas-drawn that should be images:**
- **Helm wheel** — beautifully drawn in canvas with rotating spokes, but a high-detail sprite would have wood grain, brass fittings, wear marks. `assets/objects/helm_wheel.png` exists but is NOT loaded.
- **Radar display** — canvas-drawn with sweeping line. `assets/objects/radar_display.png` exists but NOT loaded. The animated sweep should stay canvas-based, but could overlay a static bezel image.
- **Compass rose** — canvas-drawn circle with letters. `assets/objects/compass_obj.png` exists but NOT loaded.
- **Nav charts/chartplotter** — canvas-drawn grid with coastline. `assets/objects/nav_charts.png` exists but NOT loaded.
- **Radio console** — canvas-drawn rectangle with LED. `assets/objects/radio_console.png` exists but NOT loaded.
- **Window frames/mullions** — drawn as black lines. A window frame overlay image would add depth.

**2. Objects in code but no sprite loaded into the scene:**
- ALL six object sprites in `assets/objects/` for the wheelhouse exist but are **never loaded**. They're completely unused.

**3. NPC dialogue:**
- Captain has full dialogue tree (weather, fishing, location). Sprite exists and is positioned correctly.

**4. Ambient audio missing:**
- Missing: compass gimbal rotation sound, depth finder ping, VHF squelch burst, radar sweep tick.
- No audio feedback when interacting with instruments.

**5. MUD text without visual:**
- "Your position blinks red near Resurrection Bay" — the chartplotter shows this, but the actual bay/coastline shape is very simplified.

---

### 4. Galley

**Current state:** Background image exists (`galley-mmx.png`). Cook NPC sprite exists. Audio exists. Canvas draws coffee maker, stove, table, porthole with animated ocean, doors.

**1. Visual elements CSS/canvas-drawn that should be images:**
- **Coffee maker** — canvas-drawn box with animated drip. Detailed sprite would show brand, spout, carafe texture.
- **Propane stove** — canvas-drawn with animated flame. `assets/objects/propane_stove.png` exists but NOT loaded.
- **Galley table** — canvas-drawn rectangles. `assets/objects/galley_table.png` exists but NOT loaded.
- **Porthole** — beautifully animated canvas ocean. `assets/objects/porthole.png` exists but NOT loaded. The animation should stay, but the frame/brass ring could be an image overlay.
- **Overhead lamp** — canvas-drawn small rectangle with gradient glow. A lamp fixture sprite would add warmth.
- **Mug on table** — tiny canvas rectangle. Needs a proper mug sprite with steam.

**2. Objects in code but no sprite loaded:**
- `propane_stove.png`, `galley_table.png`, `porthole.png` all exist in `assets/objects/` but are never loaded.

**3. NPC dialogue:**
- Cook has full dialogue tree (stories, what's cooking). Sprite exists and positioned correctly.

**4. Ambient audio missing:**
- Missing: coffee percolator sound, cutlery clink, fridge compressor hum, specific propane hiss SFX.
- No sizzling sound when looking at the stove.

**5. MUD text without visual:**
- "Fish chowder. Cod, potatoes, onion." — described in dialogue but no pot of chowder visible on the stove.

---

### 5. Engine Room

**Current state:** Background image exists (`engine-room.jpg` — NOTE: only original jpg, no MMX-enhanced version). NO NPC sprites loaded (`ROOM_NPCS['engine-room'] = []`). Audio exists. Canvas draws two engines, generator, fuel lines, tool rack, oil filter, battery bank, sensor display, ladder, hatch, and engineer bot.

**1. Visual elements CSS/canvas-drawn that should be images:**
- **Port and starboard engines** — extensively canvas-drawn (~100 lines each). `assets/objects/port_engine.png` exists but NOT loaded. A detailed engine sprite with animated exhaust glow overlay would be superior.
- **Tool rack** — canvas-drawn with individual tools. `assets/objects/tool_rack.png` exists but NOT loaded.
- **Battery bank** — canvas-drawn boxes with terminals. No sprite exists.
- **Generator** — canvas-drawn vibrating box. No sprite exists.
- **Oil filter** — canvas-drawn small rectangle. No sprite exists.
- **Sensor display** — canvas-drawn text readout. No sprite exists.

**2. Objects in code but no sprite loaded:**
- `port_engine.png` and `tool_rack.png` exist but are never loaded.

**3. NPC dialogue exists but NPC has no visual presence:**
- **Engineer Bot** (`hs-engineer-bot`) has full dialogue (status report, maintenance history, backstory) and is canvas-drawn as a robot. However, `ROOM_NPCS['engine-room']` is an empty array — no NPC sprite is shown. The engineer bot is ONLY canvas-drawn. Needs a proper sprite.

**4. Ambient audio missing:**
- Missing: fuel pump whine, mechanical clanking, ventilation fan whir, specific belt squeal.
- No audio for the generator vibration.

**5. MUD text without visual:**
- "Blue paint on a ceiling" (engineer bot's memory fragment) — no visual representation of this memory.
- The "heat shimmer" effect exists but is very subtle.

---

### 6. Aft Cockpit

**Current state:** **NO background image exists.** No entry in `ROOM_BG`. Entirely canvas-drawn. No NPC. No audio-specific files (uses wheelhouse ambient as fallback). Canvas draws stern drive, trim tabs, fishfinder, downrigger posts, bait well, transom sump, doors.

**1. Visual elements CSS/canvas-drawn that should be images:**
- **Entire room** — no background image at all. This is the most visually deficient room.
- **Stern drive** — canvas-drawn mounting plate with spinning props. Needs a proper sprite.
- **Fishfinder** — canvas-drawn with sonar circles and fish arches. Could use a detailed bezel sprite.
- **Bait well** — canvas-drawn with animated water and baitfish. Could use a lid/well sprite.

**2. Objects in code but no sprite:**
- **No objects exist in `assets/objects/` for this room.** Zero. The aft cockpit has 8 hotspots and not a single supporting asset.

**3. NPC dialogue:**
- No NPC exists in the aft cockpit. No dialogue to trigger. The room feels empty and lifeless.

**4. Ambient audio missing:**
- No dedicated audio for this room. Falls back to wheelhouse ambient.
- Missing: water slapping transom, outdrive gurgle, bait well pump, wind across stern.

**5. MUD text without visual:**
- "Something bigger below them" on the fishfinder — described in text but the sonar only shows vague dots.
- The room has no description text written for MUD mode — it's a ScummVM-only room.

---

### 7. The Radio Room

**Current state:** **NO background image exists.** No entry in `ROOM_BG`. Entirely canvas-drawn (most complex room rendering). No dedicated ambient audio (uses wheelhouse). Canvas draws receiver, tape deck, chalkboard, antenna, VU meter, jukebox overlay, door.

**1. Visual elements CSS/canvas-drawn that should be images:**
- **Radio receiver (Hammarlund HQ-180A)** — extensively canvas-drawn with LCD, knobs, LEDs, speaker grille. A detailed sprite would capture the analog warmth.
- **Tape deck (Revox B77)** — canvas-drawn with spinning reels. A sprite with animated reel overlay would be better.
- **Chalkboard** — canvas-drawn with frequency listings. Could be a sprite with hand-written text texture.
- **VU meter** — canvas-drawn with bouncing needle. Animation should stay canvas, but the bezel could be an image.
- **Console shelf** — canvas-drawn plain rectangle. Wood/metal texture image would add depth.

**2. Objects in code but no sprite:**
- No object sprites exist for the radio room. Zero files in `assets/objects/` for this room.

**3. NPC dialogue:**
- No NPC in the radio room. It's a solitary space (by design — the radio IS the character here).

**4. Ambient audio missing:**
- No dedicated audio. Falls back to wheelhouse ambient.
- Missing: tape hiss, carrier signal whine, Morse code background, specific frequency static textures.

**5. MUD text without visual:**
- Jukebox channel selection overlay is well-implemented in canvas.
- "Someone has labeled the tape" — no visible tape label sprite.

---

## SYSTEM-LEVEL GAPS

### 1. VERB FEEDBACK
- **Selected verb glow:** ✅ EXISTS — `.verb-btn.selected` applies a golden glow (`text-shadow: 0 0 4px #e8b840`) and background tint.
- **Verb line display:** ✅ EXISTS — shows `▶ USE` when a verb is selected.
- **Cursor change:** ❌ MISSING — cursor remains `crosshair` on hotspots regardless of selected verb. Should change to a pointing hand, magnifying glass, or mouth icon based on verb (classic LucasArts style).
- **Audio click feedback:** ❌ MISSING — no click sound when selecting verbs.
- **Verb-specific hotspot outlines:** ❌ MISSING — hovering a hotspot shows a generic dashed outline regardless of verb. Should show different colors/icons per verb.

### 2. ROOM TRANSITIONS
- **Fade-to-black transition:** ✅ EXISTS — `#room-transition` overlay with 0.5s fade, shows room name in amber text.
- **Transition background image:** ✅ EXISTS — `assets/rooms/transition.jpg` used as transition backdrop.
- **Audio crossfade:** ✅ EXISTS — ambient audio fades out/in over ~1.5s.
- **Iris wipe / slide animation:** ❌ MISSING — only fades. An iris wipe, horizontal wipe, or pixel-dissolve would feel more authentically ScummVM.
- **Door opening animation:** ❌ MISSING — clicking a door just fades. No visual of the door opening.

### 3. INVENTORY UI
- **Inventory bar:** ✅ EXISTS — top-right, 5 slots, updates dynamically.
- **Item icons:** ✅ EXISTS — 5 item icons in `assets/items/` (life-ring, coffee, compass, key, chart). Icons displayed via `<img>` tags.
- **Item pickup animation:** ❌ MISSING — item just appears in the inventory bar. No flying/swirl animation from the world to the inventory slot.
- **Item description on hover:** ❌ MISSING — hovering an inventory item shows nothing. Should display the item name.
- **Item use on world:** ❌ PARTIAL — coffee can be given to Captain/Engineer via hardcoded responses, but there's no drag-and-drop or click-item-then-click-target mechanic.
- **Inventory full state:** ❌ MISSING — no handling for 5+ items.

### 4. DIALOGUE UI
- **Dialogue panel:** ✅ EXISTS — centered modal with header, options, response area, close button.
- **Speech bubbles:** ✅ EXISTS — `.speech-bubble` CSS class defined with pointer arrow.
- **NPC portraits:** ❌ MISSING — no portraits shown during dialogue. The dialogue panel only shows text. Classic ScummVM games show a close-up portrait of the speaking character.
- **Typewriter text effect:** ❌ MISSING — dialogue text appears instantly. A character-by-character reveal would feel authentic.
- **Voice acting (TTS for dialogue):** ❌ MISSING — TTS only exists for room descriptions, not for NPC dialogue lines.

### 5. MAP
- ❌ COMPLETELY MISSING — no map exists anywhere in the prototype.
- No minimap, no room connection diagram, no "you are here" indicator.
- With 7 interconnected rooms, navigation is confusing without a map.
- Room connections are only discoverable by finding doors.

### 6. TITLE SCREEN
- ❌ COMPLETELY MISSING — the game drops straight into the Bar Rail after a brief "◆ entering Plato's Shell ◆" loading text.
- No title art, no "click to start," no intro sequence, no credits.
- Classic ScummVM games have iconic title screens.

### 7. SAVE/LOAD
- ❌ COMPLETELY MISSING — no save/load system.
- Room position, inventory, dialogue state, jukebox state — all lost on refresh.
- No localStorage persistence except for split-view sync.

### 8. SOUND EFFECTS
- **Ambient audio:** ✅ EXISTS — 5 rooms with ambient beds + narration.
- **Verb click sounds:** ❌ MISSING
- **Door opening sounds:** ❌ MISSING
- **Item pickup sounds:** ❌ MISSING
- **Chess move sounds:** ❌ UNKNOWN (need to check chess.html — likely missing)
- **UI sounds (dialogue open/close, inventory open):** ❌ MISSING
- **Jukebox button sounds:** ❌ MISSING
- **Room-specific SFX (engine roar, ocean wave, radio static burst):** ❌ MISSING

---

## SPECIFIC ASSET RECOMMENDATIONS

### Priority Legend
- **P0** = Blocks shipping / breaks core experience
- **P1** = Noticeable gap, diminishes quality
- **P2** = Polish, nice-to-have

---

### Room Backgrounds

| # | Asset Name | Purpose | Priority | Size | Format |
|---|-----------|---------|----------|------|--------|
| 1 | `engine-room-mmx.png` | Enhanced engine room background (currently only has basic jpg) | P1 | 960×600 | png |
| 2 | `aft-cockpit-bg.png` | Aft cockpit background (NO background exists) | P0 | 960×600 | png |
| 3 | `radio-room-bg.png` | Radio room background (NO background exists) | P1 | 960×600 | png |

### Object Sprites (exist but unused — need loading)

| # | Asset Name | Purpose | Priority | Size | Format |
|---|-----------|---------|----------|------|--------|
| 4 | Load `helm_wheel.png` | Wheelhouse helm (exists, never rendered) | P1 | 64×64 | png |
| 5 | Load `radar_display.png` | Wheelhouse radar (exists, never rendered) | P1 | 64×64 | png |
| 6 | Load `compass_obj.png` | Wheelhouse compass (exists, never rendered) | P1 | 48×48 | png |
| 7 | Load `radio_console.png` | Wheelhouse radio (exists, never rendered) | P1 | 48×48 | png |
| 8 | Load `nav_charts.png` | Wheelhouse chartplotter (exists, never rendered) | P1 | 64×48 | png |
| 9 | Load `propane_stove.png` | Galley stove (exists, never rendered) | P1 | 64×64 | png |
| 10 | Load `galley_table.png` | Galley table (exists, never rendered) | P1 | 96×64 | png |
| 11 | Load `porthole.png` | Galley porthole frame (exists, never rendered) | P2 | 64×64 | png |
| 12 | Load `weather_station.png` | Aft deck weather station (exists, never rendered) | P1 | 48×96 | png |
| 13 | Load `life_ring_obj.png` | Aft deck life ring (exists, never rendered) | P1 | 48×48 | png |
| 14 | Load `port_engine.png` | Engine room engine block (exists, never rendered) | P2 | 96×96 | png |
| 15 | Load `tool_rack.png` | Engine room tool rack (exists, never rendered) | P2 | 96×48 | png |
| 16 | Load `bar_counter_obj.png` | Bar counter detail (exists, never rendered) | P2 | 128×64 | png |

### New Object Sprites Needed

| # | Asset Name | Purpose | Priority | Size | Format |
|---|-----------|---------|----------|------|--------|
| 17 | `chess-board-table.png` | Chess board visible on corner table (currently invisible) | P0 | 48×48 | png |
| 18 | `engineer-bot.png` | NPC sprite for engineer bot (currently only canvas-drawn) | P0 | 48×72 | png |
| 19 | `generator.png` | Engine room generator (no sprite exists) | P1 | 64×48 | png |
| 20 | `battery-bank.png` | Engine room battery bank (no sprite exists) | P1 | 80×48 | png |
| 21 | `oil-filter.png` | Engine room oil filter (no sprite exists) | P2 | 24×36 | png |
| 22 | `sensor-display.png` | Engine room sensor screen (no sprite exists) | P1 | 96×48 | png |
| 23 | `fuel-lines.png` | Engine room fuel line bundle (no sprite exists) | P2 | 96×24 | png |
| 24 | `jukebox.png` | Bar rail jukebox (canvas-drawn, needs sprite) | P1 | 48×80 | png |
| 25 | `bottle-shelf.png` | Bar rail bottle collection (canvas-drawn) | P2 | 96×32 | png |
| 26 | `stern-drive.png` | Aft cockpit stern drive unit (no sprite exists) | P1 | 128×32 | png |
| 27 | `fishfinder.png` | Aft cockpit fishfinder display (no sprite exists) | P1 | 96×64 | png |
| 28 | `bait-well.png` | Aft cockpit bait well (no sprite exists) | P2 | 80×64 | png |
| 29 | `downrigger-post.png` | Aft cockpit downrigger (no sprite exists) | P2 | 24×120 | png |
| 30 | `trim-tabs.png` | Aft cockpit trim tabs (no sprite exists) | P2 | 64×16 | png |
| 31 | `transom-sump.png` | Aft cockpit sump (no sprite exists) | P2 | 80×32 | png |
| 32 | `radio-receiver.png` | Radio room Hammarlund receiver (no sprite exists) | P1 | 128×64 | png |
| 33 | `tape-deck.png` | Radio room Revox B77 (no sprite exists) | P1 | 96×48 | png |
| 34 | `chalkboard.png` | Radio room chalkboard (no sprite exists) | P2 | 48×32 | png |
| 35 | `vu-meter.png` | Radio room VU meter (no sprite exists) | P2 | 32×32 | png |

### NPC Portraits (for dialogue UI)

| # | Asset Name | Purpose | Priority | Size | Format |
|---|-----------|---------|----------|------|--------|
| 36 | `portrait-riker.png` | Riker close-up for dialogue | P1 | 128×128 | png |
| 37 | `portrait-captain.png` | Captain close-up for dialogue | P1 | 128×128 | png |
| 38 | `portrait-deckhand.png` | Deckhand close-up for dialogue | P1 | 128×128 | png |
| 39 | `portrait-cook.png` | Cook close-up for dialogue | P1 | 128×128 | png |
| 40 | `portrait-engineer-bot.png` | Engineer bot close-up for dialogue | P1 | 128×128 | png |

### System-Level Assets

| # | Asset Name | Purpose | Priority | Size | Format |
|---|-----------|---------|----------|------|--------|
| 41 | `title-screen.png` | Game title screen with art | P0 | 960×600 | png |
| 42 | `ship-map.png` | Room connection map showing all 7 rooms | P0 | 480×300 | png |
| 43 | `cursor-look.png` | Custom cursor for "look at" verb | P2 | 16×16 | png |
| 44 | `cursor-use.png` | Custom cursor for "use" verb | P2 | 16×16 | png |
| 45 | `cursor-talk.png` | Custom cursor for "talk to" verb | P2 | 16×16 | png |
| 46 | `cursor-hand.png` | Custom cursor for "pick up" verb | P2 | 16×16 | png |
| 47 | `sfx-verb-click.wav` | UI click sound for verb selection | P1 | — | wav |
| 48 | `sfx-door-open.wav` | Door opening sound | P1 | — | wav |
| 49 | `sfx-item-pickup.wav` | Item pickup sound | P1 | — | wav |
| 50 | `sfx-dialogue-open.wav` | Dialogue panel open sound | P2 | — | wav |
| 51 | `sfx-inventory-slot.wav` | Item placed in inventory sound | P2 | — | wav |

---

## PROMPT RECOMMENDATIONS FOR GENERATION

### Ready-to-Use Generation Prompts (Top 15 Highest Priority)

---

**1. Aft Cockpit Background (P0)**

**FLUX-1-schnell:**
```
Pixel art retro adventure game background, 320x200 resolution upscaled, aft cockpit of an Alaskan commercial fishing boat at night. Stern drive unit mounted on transom, trim tabs, downrigger posts, bait well with glowing LED, fishfinder display with green sonar, metal non-skid deck plates, safety rail around stern, dark ocean and starry sky beyond rail. Dark green and teal color palette, warm instrument glow, CRT scanline aesthetic, no characters, no text. Moody atmospheric lighting.
```

**MMX:**
```
Retro point-and-click adventure game background, pixel art style, 320x200 aspect ratio. Night-time aft cockpit of a commercial fishing vessel. Stern drive with dual props, stainless downrigger posts, bait well with internal blue LED glow, fishfinder sonar display. Metal grating deck, stern safety rail. Dark ocean horizon, stars. Teal and dark green palette with instrument glow. No characters. Atmospheric, moody.
```

---

**2. Chess Board on Table (P0)**

**FLUX-1-schnell:**
```
Pixel art game object, 48x48, worn wooden chess board sitting on a corner bar table, pieces carved from driftwood and beach glass, mid-game position, warm amber tavern lighting, transparent background, retro adventure game sprite, no text.
```

**MMX:**
```
Small pixel art game sprite, chess board on corner table, driftwood and beach glass pieces, warm lighting, transparent background, retro point-and-click adventure style, 48x48.
```

---

**3. Engineer Bot NPC Sprite (P0)**

**FLUX-1-schnell:**
```
Pixel art character sprite, 48x72, compact maintenance robot with chrome and copper body, rectangular head with glowing orange LED eyes, mechanical arms holding wrench, antenna with red blinking tip, chest panel with three small LEDs (orange, green, amber), industrial sci-fi design, transparent background, retro adventure game NPC, side view.
```

**MMX:**
```
Pixel art NPC sprite for point-and-click adventure, 48x72 pixels. Small maintenance robot, chrome and copper, boxy rectangular head, glowing orange eyes, mechanical arms, holding wrench, antenna with red light, chest LEDs. Industrial robot on a fishing boat. Transparent background.
```

---

**4. Title Screen (P0)**

**FLUX-1-schnell:**
```
Pixel art title screen for retro adventure game, 960x600. "PLATO'S SHELL" in golden serif letters across center. Background shows a commercial fishing boat at night in Resurrection Bay, Alaska. Warm light glowing from portholes and wheelhouse windows. Stern-lit ocean, stars, moonlight on water. Amber and teal color scheme, CRT vignette, atmospheric fog. No other text.
```

**MMX:**
```
Retro point-and-click adventure game title screen. Night scene, Alaskan fishing vessel on dark water, warm golden light from ship windows reflecting on ocean. Large title text space in center. Stars, moonlight, fog. Amber and teal palette, pixel art style, cinematic composition.
```

---

**5. Ship Map / Room Layout (P0)**

**FLUX-1-schnell:**
```
Pixel art map diagram, 480x300, top-down cutaway view of a commercial fishing boat showing 7 rooms: bar rail (center), aft deck (stern), wheelhouse (upper), galley (lower port), engine room (lower starboard), radio room (port of bar), aft cockpit (far stern). Rooms connected by lines showing doors and hatches. Warm amber and teal color scheme, retro game map style, "YOU ARE HERE" marker dot in bar rail. Clean, readable, diagram-like.
```

**MMX:**
```
Retro game map, pixel art, top-down ship cutaway diagram. Fishing vessel with labeled rooms: bar, deck, wheelhouse, galley, engine room, radio room, cockpit. Door connections shown as lines. Amber glowing room markers. Map style of classic adventure games. Clean and readable.
```

---

**6. Engine Room Enhanced Background (P1)**

**FLUX-1-schnell:**
```
Pixel art retro adventure game background, 320x200. Engine room of commercial fishing boat. Twin diesel engines with glowing orange exhaust manifolds, Onan generator with sound shield, battery bank on port side, tool rack on starboard, fuel lines along bulkhead, metal grating floor, riveted steel bulkheads, sensor display panel on wall. Dark red and orange palette, heat shimmer, industrial lighting from engine glow. CRT scanline aesthetic, no characters.
```

**MMX:**
```
Pixel art game background, engine room of fishing vessel. Twin diesel engines, exhaust manifolds glowing orange, generator, battery bank, tool rack, fuel lines, metal grate floor. Heat and grease atmosphere. Dark red and orange palette. Retro point-and-click adventure style. No characters.
```

---

**7. Radio Room Background (P1)**

**FLUX-1-schnell:**
```
Pixel art retro adventure game background, 320x200. Small ship radio room with dark bulkhead walls. Console shelf with Hammarlund tube radio receiver glowing green, Revox reel-to-reel tape deck with spinning reels, chalkboard with frequency listings on wall, copper antenna wire running up through ceiling, analog VU meter. Dark moody atmosphere, green and amber tube glow, CRT scanline aesthetic, no characters.
```

**MMX:**
```
Pixel art point-and-click adventure background. Dark ship radio room. Tube radio receiver with green LCD glow, reel-to-reel tape deck, chalkboard with frequencies, antenna wire to ceiling. Console shelf, metal deck plate floor. Tube glow atmosphere, green and amber palette. No characters.
```

---

**8. Riker Portrait (P1)**

**FLUX-1-schnell:**
```
Pixel art portrait close-up, 128x128, weathered first officer in faded jacket, beard, tired but kind eyes, warm amber lighting from bar, looking slightly to the side, retro adventure game dialogue portrait, dark background, transparent or black border.
```

**MMX:**
```
Pixel art character portrait, 128x128. Weathered ship's first officer, beard, faded jacket, tired kind eyes. Warm tavern lighting. Retro point-and-click adventure dialogue portrait style. Dark background.
```

---

**9. Captain Portrait (P1)**

**FLUX-1-schnell:**
```
Pixel art portrait close-up, 128x128, sea captain with captain's hat and gold trim, grey beard, steely eyes looking forward, navy blue uniform jacket, blue instrument glow lighting from below, retro adventure game dialogue portrait, dark background.
```

**MMX:**
```
Pixel art character portrait, 128x128. Sea captain with hat and gold trim, grey beard, navy jacket. Blue instrument lighting from below. Authoritative, weathered. Retro adventure game dialogue style. Dark background.
```

---

**10. Deckhand Portrait (P1)**

**FLUX-1-schnell:**
```
Pixel art portrait close-up, 128x128, lean deckhand in yellow oilskins, rain-speckled, wind-blown hair, cold cheeks, looking slightly upward, dark blue night sky background with stars, retro adventure game dialogue portrait.
```

**MMX:**
```
Pixel art character portrait, 128x128. Lean deckhand in yellow oilskins rain gear. Wind-blown appearance, cold reddened cheeks. Night ocean background. Retro adventure game dialogue portrait. Blue and yellow palette.
```

---

**11. Cook Portrait (P1)**

**FLUX-1-schnell:**
```
Pixel art portrait close-up, 128x128, ship's cook with white chef's hat and apron, thick mustache, warm face, holding ladle, warm orange galley lighting from below, steam wisps, retro adventure game dialogue portrait, dark background.
```

**MMX:**
```
Pixel art character portrait, 128x128. Ship's cook, white chef's hat and apron, thick mustache, warm expression. Holding ladle. Orange warm galley lighting. Steam. Retro point-and-click adventure dialogue style. Dark background.
```

---

**12. Engineer Bot Portrait (P1)**

**FLUX-1-schnell:**
```
Pixel art portrait close-up, 128x128, compact maintenance robot, chrome and copper body, rectangular head with large glowing orange LED eyes, antenna with red tip, chest panel with three indicator LEDs, mechanical precision, dark industrial background with orange engine glow, retro adventure game dialogue portrait.
```

**MMX:**
```
Pixel art character portrait, 128x128. Maintenance robot, chrome and copper, rectangular head, large orange glowing eyes, antenna, chest LEDs. Industrial background with orange glow. Retro adventure game dialogue portrait style.
```

---

**13. Jukebox Sprite (P1)**

**FLUX-1-schnell:**
```
Pixel art game object sprite, 48x80, vintage nautical jukebox with glass front, amber tube glow inside, frequency display reading 2182, selection buttons, speaker grille at bottom, weathered metal cabinet, transparent background, retro adventure game object, warm amber glow.
```

**MMX:**
```
Pixel art object sprite, 48x80. Vintage jukebox, glass front, amber glow, frequency display, selection buttons, speaker grille. Weathered nautical design. Transparent background. Retro point-and-click adventure style.
```

---

**14. Radio Receiver Sprite (P1)**

**FLUX-1-schnell:**
```
Pixel art game object sprite, 128x64, Hammarlund HQ-180A shortwave radio receiver, rack-mounted, green LCD frequency display, analog tuning knob, red and green LEDs, speaker grille, vintage tube radio warmth, transparent background, retro adventure game object.
```

**MMX:**
```
Pixel art object sprite, 128x64. Vintage tube radio receiver, Hammarlund style. Green LCD display, tuning knob, LEDs, speaker grille. Tube radio warmth. Transparent background. Retro point-and-click adventure style.
```

---

**15. Fishfinder Display Sprite (P1)**

**FLUX-1-schnell:**
```
Pixel art game object sprite, 96x64, color sonar fishfinder display with cyan concentric sonar rings, yellow fish arches, green bottom contour line, depth reading "20 fathoms", dark bezel, marine electronics style, transparent background, retro adventure game object.
```

**MMX:**
```
Pixel art object sprite, 96x64. Marine fishfinder sonar display. Cyan concentric rings, yellow fish arches, green bottom contour. Depth numbers. Dark bezel frame. Transparent background. Retro point-and-click adventure style.
```

---

## SUMMARY DASHBOARD

| Category | P0 (Blocks) | P1 (Noticeable) | P2 (Polish) | Total |
|----------|------------|-----------------|-------------|-------|
| Room Backgrounds | 2 | 1 | 0 | 3 |
| Object Sprites (load existing) | 0 | 7 | 5 | 12 |
| Object Sprites (new) | 2 | 7 | 6 | 15 |
| NPC Portraits | 0 | 5 | 0 | 5 |
| System Assets | 2 | 0 | 0 | 2 |
| Audio (SFX) | 0 | 3 | 2 | 5 |
| UI/Cursor | 0 | 0 | 4 | 4 |
| **TOTALS** | **6** | **23** | **17** | **46** |

### Critical Path (P0 items only):
1. **Aft Cockpit background** — room is completely invisible
2. **Chess board sprite** — hotspot is completely invisible
3. **Engineer Bot NPC sprite** — only canvas-drawn, not in sprite system
4. **Title screen** — no entry point
5. **Ship map** — no navigation aid for 7-room game
6. **Radio room background** — second room with no background image

### Quick Wins (load existing but unused assets):
13 object sprites already exist in `assets/objects/` but are **never loaded by the game**. Loading them would immediately improve visual quality with zero generation cost. See items #4–#16 above.
