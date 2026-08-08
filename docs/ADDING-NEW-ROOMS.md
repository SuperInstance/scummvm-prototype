# Adding New Rooms

> Pick a palette. Define hotspots. Write responses. Drop a background image. Done.

This guide uses an actual room definition as the template. Follow these steps to add a room to the prototype.

---

## Quick Reference

A room needs:
1. An entry in the `ROOMS` object
2. A drawing function (or a background image)
3. Response entries in `getResponse()`
4. Exit connections (both directions)
5. NPC sprite assignment (if any)
6. Audio configuration
7. A palette (if using canvas rendering)

---

## Step 1: Add the Room Definition

Find the `ROOMS` constant in `index.html` and add your room. Here's the template, using **the galley** as the example:

```javascript
'crows-nest': {
  name: 'The Crow\'s Nest',
  shortName: 'Crow\'s Nest',
  palette: 'darkblue',  // reuse an existing palette or add a new one
  hotspots: [
    {id: 'hs-rail', name: 'the railing', x: '10%', y: '30%', w: '80%', h: '10%'},
    {id: 'hs-view', name: 'the view', x: '10%', y: '5%', w: '80%', h: '25%'},
    {id: 'hs-ladder', name: 'the ladder down', x: '45%', y: '60%', w: '10%', h: '30%'},
    {id: 'hs-lookout', name: 'the lookout', x: '60%', y: '35%', w: '12%', h: '35%'}
  ],
  exits: {
    'hs-ladder': {target: 'wheelhouse', label: '◆ WHEELHOUSE ◆'}
  }
}
```

### Hotspot Positioning Tips

Coordinates are **percentages** of the game container (320×200 internal resolution, scaled up). The game container uses `aspect-ratio: 320/200`.

- `x`, `y` = top-left corner of the hotspot
- `w`, `h` = width and height
- Leave room for the verb bar at the bottom (bottom ~20% of screen)
- Leave room for the status bar at the top (top ~10%)

---

## Step 2: Connect Exits (Both Directions)

If your room connects to the wheelhouse, you need exits in both rooms:

```javascript
// In your new room:
exits: {
  'hs-ladder': {target: 'wheelhouse', label: '◆ WHEELHOUSE ◆'}
}

// In wheelhouse:
exits: {
  // ... existing exits ...
  'hs-hatch-crows-nest': {target: 'crows-nest', label: "◆ CROW'S NEST ◆"}
}
```

And add the hotspot for the new exit in the wheelhouse's hotspot array:

```javascript
{id: 'hs-hatch-crows-nest', name: "the ladder to the crow's nest",
 x: '82%', y: '60%', w: '14%', h: '25%'}
```

---

## Step 3: Add the Drawing Function (Or Background Image)

### Option A: Background Image (Easier)

Add your room to the `ROOM_BG` map:

```javascript
const ROOM_BG = {
  // ... existing rooms ...
  'crows-nest': 'assets/rooms/crows-nest.jpg'
};
```

Drop the image at `assets/rooms/crows-nest.jpg`. The prototype auto-hides the canvas background if the image loads successfully.

### Option B: Canvas Drawing (More Control)

Add a case to the `drawScene()` switch:

```javascript
function drawScene() {
  // ...
  switch(currentRoom) {
    case 'bar-rail':   drawBarRail();   break;
    case 'aft-deck':   drawAftDeck();   break;
    // ...
    case 'crows-nest': drawCrowsNest(); break;
  }
}
```

Then write the drawing function. Here's the pattern from `drawGalley()`:

```javascript
function drawCrowsNest() {
  const C = pal();  // get the room's palette
  
  // Wall / sky background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 130);
  skyGrad.addColorStop(0, C.wallDark);
  skyGrad.addColorStop(0.5, C.wallMid);
  skyGrad.addColorStop(1, C.wallLight);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 320, 130);
  
  // Floor
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 130, 320, 70);
  
  // ... draw your room details with ctx.fillRect, ctx.arc, etc.
  
  // Vignette (every room ends with this)
  const vg = ctx.createRadialGradient(160, 80, 40, 160, 120, 200);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.5, 'rgba(0,0,0,0.2)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 320, 200);
}
```

Every canvas drawing function ends with a vignette overlay. This is what gives the prototype its moody, candlelit atmosphere.

---

## Step 4: Add Response Entries

Find the `getResponse()` function and add a block for your room. You need entries for every verb × hotspot combination:

```javascript
if (room === 'crows-nest') {
  const r = {
    'look at': {
      'hs-rail': 'The railing is wind-blasted and cold. The ocean stretches in every direction.',
      'hs-view': 'You can see the whole boat from up here. And the ocean beyond.',
      'hs-ladder': 'A steel ladder disappearing into the wheelhouse below.',
      'hs-lookout': 'A weathered sailor with binoculars, scanning the horizon.'
    },
    'use': {
      'hs-rail': 'You grip the railing. The wind is fierce.',
      'hs-view': 'You scan the horizon. Nothing but water and stars.',
      'hs-ladder': '__EXIT__',
      'hs-lookout': 'The lookout hands you the binoculars. "See for yourself."'
    },
    'talk to': {
      'hs-lookout': '__OPEN_DIALOGUE__'
    },
    'walk to': {
      'hs-ladder': '__EXIT__',
      'hs-rail': 'You walk to the railing. The wind hits your face.',
      'hs-view': 'You walk to the edge and look out.',
      'hs-lookout': 'You approach the lookout.'
    },
    'pick up': {
      'hs-rail': 'It\'s bolted down.',
      'hs-view': 'You can\'t pick up a view.',
      'hs-ladder': 'It\'s a ladder.',
      'hs-lookout': 'The lookout steps back. "Personal space."'
    }
    // ... add push, pull, open, close, give ...
  };
  return r[verb]?.[hsId];
}
```

You don't need every verb for every hotspot — `undefined` triggers the default: `"You [verb] [object]. Nothing happens."` But writing specific responses for at least **look at**, **use**, **talk to**, and **walk to** makes the room feel alive.

---

## Step 5: Add NPC Sprites (If Any)

If your room has an NPC, add them to `ROOM_NPCS`:

```javascript
const ROOM_NPCS = {
  // ... existing rooms ...
  'crows-nest': ['npc-lookout']
};
```

And add the sprite `<img>` in the HTML:

```html
<img id="npc-lookout" class="npc-sprite" src="assets/npcs/lookout.png"
     style="left: 60%; top: 35%; width: 12%;">
```

The sprite shows/hides automatically based on `showNpcSprites()`.

---

## Step 6: Add Audio Configuration

Add your room to `ROOM_AUDIO`:

```javascript
const ROOM_AUDIO = {
  // ... existing rooms ...
  'crows-nest': {
    ambient: 'assets/audio/crows-nest-ambient.wav',
    narration: null  // no TTS reading for this room yet
  }
};
```

Drop your ambient audio file at `assets/audio/crows-nest-ambient.wav`. The transition system handles crossfade automatically.

---

## Step 7: Add to the MUD Terminal (If Using Split View)

If you want the room accessible from the MUD terminal, add it to the `ROOMS` object in `mud-terminal.html`:

```javascript
const ROOMS = {
  // ... existing rooms ...
  'crows-nest': {
    name: "THE CROW'S NEST",
    description: 'A small platform above the wheelhouse. Wind cuts through here. You can see the whole boat — and the ocean beyond.',
    exits: {
      down: { target: 'wheelhouse', label: 'WHEELHOUSE' }
    },
    objects: [
      { id: 'railing', name: 'the railing', desc: 'Wind-blasted and cold.' },
      { id: 'lookout', name: 'the lookout', desc: 'A weathered sailor with binoculars.', isNpc: true }
    ],
    occupants: ['lookout'],
    sensors: {
      'Wind Speed': '35 knots NW',
      'Visibility': '15 nautical miles',
      'Height': '45 feet above waterline'
    }
  }
};
```

---

## Step 8: Test

1. Open `index.html` in a browser
2. Walk to an adjacent room
3. Walk to your new room (via the exit you connected)
4. Test every verb on every hotspot
5. If using split view, test walking from both MUD and ScummVM sides
6. Check that audio crossfades on entry
7. Check that NPC sprites appear/disappear correctly

---

## Real Example: The Complete Galley Definition

Here's what a complete room looks like in the actual prototype — the galley, all in one place:

```javascript
// 1. Room object
'galley': {
  name: 'The Galley',
  shortName: 'Galley',
  palette: 'amber',
  hotspots: [
    {id: 'hs-coffee-maker', name: 'the coffee maker', x: '10%', y: '25%', w: '12%', h: '20%'},
    {id: 'hs-propane-stove', name: 'the propane stove', x: '28%', y: '22%', w: '14%', h: '22%'},
    {id: 'hs-galley-table', name: 'the galley table', x: '45%', y: '45%', w: '25%', h: '25%'},
    {id: 'hs-porthole', name: 'the porthole', x: '80%', y: '20%', w: '14%', h: '22%'},
    {id: 'hs-door-wheelhouse', name: 'the wheelhouse ladder', x: '5%', y: '15%', w: '10%', h: '55%'},
    {id: 'hs-door-aft-galley', name: 'the aft door', x: '85%', y: '15%', w: '12%', h: '55%'},
    {id: 'hs-cook', name: 'the cook', x: '30%', y: '42%', w: '12%', h: '33%'}
  ],
  exits: {
    'hs-door-wheelhouse': {target: 'wheelhouse', label: '◆ WHEELHOUSE ◆'},
    'hs-door-aft-galley': {target: 'aft-deck', label: '◆ AFT DECK ◆'}
  }
}

// 2. NPC sprite
'galley': ['npc-cook', 'npc-coffee']

// 3. Audio
'galley': { ambient: 'assets/audio/galley-ambient.wav', narration: 'assets/audio/galley-tts.wav' }

// 4. Background image
'galley': 'assets/rooms/galley-mmx.png'

// 5. Response table: 10 verbs × 7 hotspots = 70 responses
// (see getResponse() in index.html)

// 6. Drawing function: drawGalley()
// (canvas fallback when image isn't available)

// 7. MUD definition in mud-terminal.html
// (parallel room definition with description, objects, sensors)
```

---

## See Also

- [HOW ROOMS WORK](HOW-ROOMS-WORK.md) — Deep dive into room internals
- [HOW VERBS WORK](HOW-VERBS-WORK.md) — How the response table is structured
- [HOW-AUDIO-WORKS](HOW-AUDIO-WORKS.md) — Adding room-specific audio

---

*Seven rooms took 2,600 lines of canvas code. An eighth room takes 200. The pattern is set — follow it.*
