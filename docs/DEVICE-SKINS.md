# Device-Contextual Skins

> The interface is a costume. The skin is environment.

## The Concept

Plato's Shell is not a generic pixel-art game UI. It is a **device-contextual rendering system** — the visual appearance of the ScummVM prototype adapts to match the physical space the device inhabits.

A phone mounted in the engine room shows an **engine diagnostic bay** — red/orange palette, heat shimmer, industrial fonts, warning-sticker dialogue panels. A tablet at the helm shows a **wheelhouse** — dark blue, phosphor green instruments, radar sweep animation, tactical overlay. A server rack running agents shows a **bar interior** — warm amber, wood grain, candlelight, parchment dialogue.

Same MUD underneath. Same rooms. Same objects. Same NPCs. Different clothes.

The device dresses for its room.

## The 6 Default Skins

| Skin ID | Name | Visual Theme | Ambient Effect | Where It Lives |
|---------|------|-------------|----------------|----------------|
| `bar` | The Tap | Warm amber, wood grain, candlelight | Dust motes | Server room, social hub, agent gathering space |
| `bridge` | The Bridge | Dark blue, phosphor green, radar sweep | Scan lines | Helm, wheelhouse, navigation console, any command center |
| `engine-room` | The Engine Room | Dark red/orange, heat shimmer, oil-stained metal | Heat shimmer | Engine room, service bay, mechanical diagnostic terminal |
| `camera-room` | The Gallery | Dark grey, multi-monitor glow, cable runs | Monitor flicker | Camera monitoring station, broadcast gallery, vision room |
| `poker-room` | The Card Room | Green felt, low amber lamp, smoke | Smoke haze | Game room, social gaming space, card parlor |
| `library` | The Library | Deep wood, brass lamps, leather spines | Dust motes / rain | Reading room, creative writing space, archive |

## How Skin Selection Works

### 1. Room-Based Mapping (Default)

Each room in `rooms.json` has a `skin` property. When the player enters a room, the skin system reads this property and applies the corresponding visual theme.

```json
{
  "id": "engine-room",
  "skin": "engine-room",
  ...
}
```

### 2. Device Override

When a device has a known identity (set via URL parameter `?device=engine-phone` or stored in `localStorage`), the device override takes precedence over the room mapping.

```javascript
DeviceSkin.setDeviceOverride('engine-phone', 'engine-room');
DeviceSkin.setDeviceOverride('helm-tablet', 'bridge');
DeviceSkin.setDeviceOverride('agent-server', 'bar');
```

### 3. Auto-Detection

The system checks:
1. URL parameter: `?device=<id>`
2. localStorage: `platos-shell-device-id`
3. User agent: mobile → phone, tablet → tablet
4. Falls back to room-based mapping

## CSS Variables

Each skin overrides these CSS variables on the `#game-container` element:

| Variable | Purpose |
|----------|---------|
| `--skin-bg` | Base background color |
| `--skin-bg-gradient-top` | Top of background gradient |
| `--skin-bg-gradient-bot` | Bottom of background gradient |
| `--skin-accent` | Primary accent color (highlights, borders) |
| `--skin-accent-bright` | Bright accent (selected items, active states) |
| `--skin-accent-dim` | Dim accent (inactive text, borders) |
| `--skin-border` | Border color for panels and UI elements |
| `--skin-text` | Default text color |
| `--skin-text-bright` | Bright text color |
| `--skin-panel-bg` | Background for panels (status bar, dialogue, inventory) |
| `--skin-verb-bg` | Background for the verb bar |
| `--skin-cursor` | Cursor style (pointer, crosshair, default) |
| `--skin-font` | Font family |
| `--skin-crt-opacity` | CRT scanline overlay intensity |
| `--skin-crt-color` | CRT scanline tint color |
| `--skin-overlay-tint` | Ambient color tint over the whole scene |
| `--skin-ambient-color` | Particle color for ambient effects |
| `--skin-ambient-speed` | Animation speed for ambient particles |

## Ambient Effects

Each skin includes an ambient particle/effect layer rendered on a separate canvas:

- **dust-motes** (bar, library): Floating dust particles in warm light
- **scan-lines** (bridge): Moving phosphor scan line with random pixel blips
- **heat-shimmer** (engine-room): Horizontal wave distortion with occasional sparks
- **monitor-flicker** (camera-room): Random flicker bands with status LED blips
- **smoke-haze** (poker-room): Slow-drifting smoke clouds

## Creating a Custom Skin

### 1. Register the Skin

```javascript
DeviceSkin.registerSkin('med-bay', {
  name: 'The Med Bay',
  description: 'A medical station — clinical white, blue readouts, calm',
  cssVars: {
    '--skin-bg': '#02080a',
    '--skin-accent': '#44aaff',
    '--skin-accent-bright': '#88ddff',
    '--skin-accent-dim': '#224466',
    '--skin-border': '#0a2030',
    '--skin-text': '#446688',
    '--skin-text-bright': '#88ccff',
    '--skin-panel-bg': 'rgba(2,8,10,0.9)',
    '--skin-verb-bg': '#02080a',
    '--skin-font': "'Courier New', monospace",
    '--skin-crt-opacity': '0.1',
    '--skin-crt-color': '68,170,255',
    '--skin-overlay-tint': 'rgba(68,170,255,0.02)',
    '--skin-ambient-color': 'rgba(68,170,255,0.04)',
    '--skin-ambient-speed': '0.02'
  },
  cursor: 'pointer',
  ambient: 'scan-lines',
  crtIntensity: 0.1
});
```

### 2. Map Rooms to the Skin

```javascript
DeviceSkin.registerRoomSkin('ship-infirmary', 'med-bay');
```

### 3. Create a CSS File (Optional)

Create `src/skins/skin-med-bay.css` with detailed styling for each UI element. The skin system applies a class `skin-med-bay` to `#game-container`, which the CSS targets.

### 4. Add to rooms.json

```json
{
  "id": "ship-infirmary",
  "skin": "med-bay",
  ...
}
```

## File Structure

```
src/
  device-skins.js          # Core skin system
  skins/
    skin-bar.css           # The Tap — warm amber/wood/brass
    skin-bridge.css        # The Bridge — dark blue/phosphor/steel
    skin-engine.css        # The Engine Room — dark red/heat/industrial
    skin-camera.css        # The Gallery — dark grey/monitor/broadcast
    skin-poker.css         # The Card Room — green felt/velvet/chips
    skin-library.css       # The Library — deep wood/brass/leather
```

## Integration

The skin system hooks into the existing `transitionToRoom()` function. When a room change occurs:

1. The skin system reads the new room ID
2. It checks for device overrides
3. It applies the mapped skin's CSS variables
4. It updates verb bar, status bar, inventory, dialogue styles
5. It swaps the ambient effect
6. It updates the CRT overlay tint

The player sees the transition happen in real-time — walking from the bar to the engine room, the entire UI shifts from warm amber to industrial red. The costume changes. The room reveals itself through the interface.

---

*The phone puts on its work clothes when it enters the engine room. The tablet wears its dress uniform at the helm. The server dresses in tavern warmth because that's what it is — a gathering place. The UI is not separate from the space. The UI is the space, wearing pixels.*
