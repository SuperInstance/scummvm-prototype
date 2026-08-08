# Sound Design Document — Plato's Shell

## The Boat Has a Voice Now

Every room in Plato's Shell has a sonic identity. The audio system uses two layers per room: an **ambient bed** (procedurally generated, looping) and a **narration layer** (TTS via Qwen3-TTS on DeepInfra) that plays the room description on entry.

---

## Room Sound Profiles

### bar-rail — The Tap
**Mood:** Low tavern murmur, salt-stained wood, the kind of place where the bartender knows your silence.

| Layer | Source | Character |
|-------|--------|-----------|
| Ambient | ffmpeg brown noise, low-passed at 400Hz, high-passed at 60Hz | Low murmur, muffled conversation simulation |
| Narration | Qwen3-TTS voice: **Eric** (deep male) | Room description on entry |
| Missing (future) | Glass clinks, wood creaking, distant foghorn | Layer as SFX triggers |

**Palette:** Warm, muffled, enclosed. You're below the waterline with old wood around you.

### aft-deck — Open Water
**Mood:** The whole ocean stretches behind you. Wind and waves and the cry of birds you can't name.

| Layer | Source | Character |
|-------|--------|-----------|
| Ambient | ffmpeg white noise, bandpassed at 800Hz ±600Hz, tremolo at 0.3Hz | Ocean waves with swell modulation |
| Narration | Qwen3-TTS voice: **Ryan** (warm male) | Room description on entry |
| Missing (future) | Rigging wind, seabird calls, deck plank creaks | Layer as positional SFX |

**Palette:** Open, bright, cold. The air moves freely here.

### wheelhouse — Command
**Mood:** Green dials in the dark. The quiet authority of instruments that know more than you do.

| Layer | Source | Character |
|-------|--------|-----------|
| Ambient | ffmpeg pink noise (high-passed) + 60Hz sine wave | Radio static + engine hum through deck |
| Narration | Qwen3-TTS voice: **Vivian** (clear female) | Room description on entry |
| Missing (future) | Compass gimbal, depth finder pings, VHF squelch | Layer as intermittent SFX |

**Palette:** Electronic, precise, dimly lit. Technology humming in the dark.

### galley — Below Decks
**Mood:** Something's always cooking. The hiss of propane, the bubble of a pot, the warmth of a space too small for its purpose.

| Layer | Source | Character |
|-------|--------|-----------|
| Ambient | ffmpeg pink noise (high-passed 3kHz) + brown noise (low-passed 300Hz, tremolo 2Hz) | Propane hiss + bubbling pot |
| Narration | Qwen3-TTS voice: **Serena** (warm female) | Room description on entry |
| Missing (future) | Cutlery on plates, coffee percolator, fridge compressor | Layer as action-triggered SFX |

**Palette:** Domestic, warm, confined. The kitchen of a boat that shouldn't have one.

### engine-room — The Throat
**Mood:** Deep diesel thunder. The boat's heartbeat, felt more than heard.

| Layer | Source | Character |
|-------|--------|-----------|
| Ambient | ffmpeg brown noise, low-passed at 120Hz, high-passed at 30Hz | Deep diesel rumble |
| Narration | Qwen3-TTS voice: **Dylan** (deep male) | Room description on entry |
| Missing (future) | Fuel pump whine, mechanical clanking, ventilation fan whir | Layer as rhythmic SFX |

**Palette:** Industrial, dangerous, resonant. The sound of power you can't control.

---

## Technical Details

### Generation Pipeline
1. **Ambient beds:** Generated with ffmpeg's `anoisesrc` filter using brown/pink/white noise, shaped with bandpass/lowpass/highpass filters and tremolo for modulation
2. **TTS narration:** Generated via Qwen3-TTS (1.7B parameter model) on DeepInfra API
3. **Final mix:** TTS + ambient bed mixed at 25% ambient volume in ffmpeg

### File Structure
```
assets/audio/
├── SOUND-DESIGN.md          (this document)
├── manifest.json             (room → file mapping)
├── bar-rail.wav              (final mix: narration + ambient)
├── bar-rail-ambient.wav      (ambient bed only, for looping)
├── bar-rail-tts.wav          (narration only)
├── aft-deck.wav
├── aft-deck-ambient.wav
├── aft-deck-tts.wav
├── wheelhouse.wav
├── wheelhouse-ambient.wav
├── wheelhouse-tts.wav
├── galley.wav
├── galley-ambient.wav
├── galley-tts.wav
├── engine-room.wav
├── engine-room-ambient.wav
└── engine-room-tts.wav
```

### Voice Casting
| Room | Voice | Why |
|------|-------|-----|
| bar-rail | Eric | Gravelly, lived-in — the bar speaks in his register |
| aft-deck | Ryan | Open and warm, like the sky |
| wheelhouse | Vivian | Clear, precise — instrument-like |
| galley | Serena | Domestic warmth |
| engine-room | Dylan | Deep enough to live next to the diesel |

### Future Enhancements
- [ ] Procedural SFX triggers (glass clinks, foghorn, seabirds)
- [ ] Positional audio (left/right panning based on hotspot proximity)
- [ ] Adaptive layers that intensify during puzzles
- [ ] Music stings for room entry/exit transitions
- [ ] Web Audio API integration for real-time procedural generation
