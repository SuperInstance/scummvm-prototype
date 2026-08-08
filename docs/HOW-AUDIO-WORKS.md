# How Audio Works

> Four channels. One frequency dial. NPCs who react to what's playing.

The audio system spans three files: `audio-backend.js` (the class architecture), `radio.html` (the standalone radio room), and the jukebox system embedded in `index.html`. This document uses actual code from all three.

---

## 1. The Audio Backend Architecture

`audio-backend.js` defines five classes that make up the audio system:

```
AudioManifest ──► loads tracks from audio-manifest.json
      │
RadioPlayer ────► manages playback, frequency switching, static
      │
RenderQueue ────► queues text pieces for TTS narration
      │
NPCReactions ───► NPCs react to currently-playing audio
      │
Jukebox ────────► bridge between game UI and radio player
```

Each class is framework-agnostic. They attach to `window` for browser use or export via `module.exports` for Node.js.

---

## 2. How Room Ambient Audio Works

Each room has an audio configuration in `index.html`:

```javascript
const ROOM_AUDIO = {
  'bar-rail':    { ambient: 'assets/audio/bar-rail-ambient.wav',    narration: 'assets/audio/bar-rail-tts.wav' },
  'aft-deck':    { ambient: 'assets/audio/aft-deck-ambient.wav',    narration: 'assets/audio/aft-deck-tts.wav' },
  'wheelhouse':  { ambient: 'assets/audio/wheelhouse-ambient.wav',  narration: 'assets/audio/wheelhouse-tts.wav' },
  'galley':      { ambient: 'assets/audio/galley-ambient.wav',      narration: 'assets/audio/galley-tts.wav' },
  'engine-room': { ambient: 'assets/audio/engine-room-ambient.wav', narration: 'assets/audio/engine-room-tts.wav' },
  'the-radio':   { ambient: 'assets/audio/wheelhouse-ambient.wav',  narration: null }
};
```

When the player transitions between rooms, audio crossfades:

```javascript
function playRoomAudio(roomId) {
  const config = ROOM_AUDIO[roomId];
  if (!config) return;
  
  const ambient = document.getElementById('audio-ambient');
  // Fade out current, fade in new
  // (crossfade logic in the transition function)
}
```

The room transition calls `playRoomAudio(targetRoom)` during the 500ms fade-to-black, so audio swaps while the screen is dark.

Two `<audio>` elements exist in the DOM:

```html
<audio id="audio-ambient" loop preload="auto"></audio>
<audio id="audio-narration" preload="auto"></audio>
```

The ambient track loops continuously. The narration track plays TTS readings of room descriptions.

---

## 3. The Radio Frequency Dial

The radio room (`radio.html`) and the bar-rail jukebox share a common state object:

```javascript
const radioState = {
  freqText: '2182',
  knobAngle: -Math.PI / 2,
  signalLevel: 5,
  transmitting: false,
  playing: false,
  currentChannel: '2182',
  currentTrack: null
};

const jukeboxState = {
  isOpen: false,
  selectedChannel: 0,
  nowPlaying: null,
  npcReaction: null,
  channels: [
    { id: '2182',    label: '2182 kHz — Fleet Radio', freq: '2182' },
    { id: 'podcast', label: 'Ch 4   — Podcast Channel', freq: 'PODCAST' },
    { id: 'ambient', label: 'Ch 7   — Ambient/Narration', freq: 'AMBIENT' },
    { id: 'static',  label: '0000   — Static', freq: 'STATIC' }
  ]
};
```

### Selecting a Channel

When the player selects a frequency on the jukebox:

```javascript
function selectJukeboxChannel(channelIdx) {
  jukeboxState.selectedChannel = channelIdx;
  const channel = jukeboxState.channels[channelIdx];
  const tracks = RADIO_TRACKS[channel.id] || [];
  
  // Update radio state
  radioState.currentChannel = channel.id;
  radioState.freqText = channel.freq;
  
  // Rotate the knob
  const rotations = {
    '2182':    -Math.PI/2,
    'podcast':  0,
    'ambient':  Math.PI/2,
    'static':   Math.PI
  };
  radioState.knobAngle = rotations[channel.id] ?? -Math.PI / 2;
  radioState.signalLevel = channel.id === 'static' ? 1 : channel.id === 'ambient' ? 3 : 5;
  
  // Select a track
  if (tracks.length > 0 && channel.id !== 'static') {
    jukeboxTrackIndex = (jukeboxTrackIndex + 1) % tracks.length;
    const track = tracks[jukeboxTrackIndex];
    jukeboxState.nowPlaying = `♪ ${track.title} — ${track.author} ♪`;
    
    // Play actual audio if available
    if (audioMap[channel.id] && audioMap[channel.id][track.title]) {
      const narrationAudio = document.getElementById('audio-narration');
      narrationAudio.src = '../ai-writings/' + audioMap[channel.id][track.title];
      narrationAudio.play().catch(() => {});
    }
  }
  
  // NPC reaction after 1.5 seconds
  setTimeout(() => {
    const reactions = JUKEBOX_REACTIONS[channel.id];
    jukeboxState.npcReaction = reactions[Math.floor(Math.random() * reactions.length)];
    showAmbientBubble({ display_name: '', content: jukeboxState.npcReaction });
  }, 1500);
}
```

---

## 4. NPC Reactions to Audio

NPCs have channel-specific reactions. Here's the actual reaction table from `index.html`:

```javascript
const JUKEBOX_REACTIONS = {
  '2182': [
    'Riker nods. "Good tune. I voiced that one myself."',
    'Riker taps the bar. "Every hook tells a story."',
    'Riker leans in. "Fleet Radio. Best frequency on the dial."'
  ],
  'podcast': [
    'Riker chuckles. "The bilge pump and the substrate. Classic."',
    'Riker listens. "Darmok at the noise floor. Temba, his arms wide."',
    'Riker smiles. "The welder\'s prayer. 0230. That\'s when the real work happens."'
  ],
  'ambient': [
    'Riker closes his eyes. "Room tone. I could listen to this all night."',
    'Riker breathes deep. "The ocean sounds. Feels like home."'
  ],
  'static': [
    'Riker leans back. "Static. Best station on the dial sometimes."',
    'Riker stares into the middle distance. "Sometimes I hear old voices in the static."'
  ]
};
```

The `NPCReactions` class in `audio-backend.js` generalizes this to all rooms:

```javascript
class NPCReactions {
  constructor() {
    this.reactions = {
      'bar-rail': {
        'riker': [
          { match: /fleet radio|2182/i, text: 'Riker nods. "Good tune. I voiced that one myself."' },
          { match: /hundred hooks/i, text: 'Riker taps the bar. "Every hook tells a story."' },
          { match: /darmok/i, text: 'Riker smiles. "Darmok and Jalad at Tanagra."' },
          { match: /static/i, text: 'Riker leans back. "Static. Best station on the dial sometimes."' },
          { match: /.*/i, text: 'Riker nods. "Good tune."' }
        ]
      },
      'galley': {
        'cook': [
          { match: /fleet radio|2182/i, text: 'The cook stirs the pot. "I listen while I cook."' },
          { match: /static/i, text: 'The cook tilts an ear. "Sounds like rain. I love rain."' },
          { match: /.*/i, text: 'The cook hums along, off-key.' }
        ]
      },
      'wheelhouse': {
        'captain': [
          { match: /navigation|gap/i, text: 'The Captain checks the depth sounder.' },
          { match: /static/i, text: 'The Captain stares into the static. "Sometimes I hear old voices."' },
        ]
      }
    };
  }
}
```

---

## 5. The Audio Manifest Format

The manifest lives at `audio-manifest.json` and defines all tracks, channels, and the render queue:

```json
{
  "version": "2.0.0",
  "channels": {
    "2182": {
      "label": "2182 kHz — Fleet Radio",
      "description": "Distress frequency. Stories from the fleet, hosted by Riker.",
      "category": "fleet-radio",
      "color": "#44ff44"
    },
    "podcast": {
      "label": "Podcast Channel",
      "description": "Long-form pieces from the ai-writings corpus.",
      "category": "podcast",
      "color": "#e8b840"
    },
    "ambient": {
      "label": "Ambient Channel — Narrations",
      "description": "TTS readings of shorter works and essays.",
      "category": "ambient",
      "color": "#44ccff"
    },
    "static": {
      "label": "Static",
      "description": "Between stations. The sound of rain that isn't rain.",
      "category": "static",
      "color": "#666666"
    }
  },
  "tracks": {
    "fleet-radio": [
      {
        "id": "radio-001",
        "title": "Navigation in the Gap",
        "author": "Fleet Radio",
        "duration": "~12 min",
        "channel": "2182",
        "source_file": "radio/radio-001-navigation-in-the-gap.md",
        "audio_file": null,
        "description": "The art of knowing where you are when the charts say otherwise."
      }
    ],
    "podcast": [
      {
        "id": "podcast-001",
        "title": "The Hundred Hooks",
        "author": "ai-writings",
        "channel": "podcast",
        "audio_file": "podcasts/episode-1-the-hundred-hooks-final.mp3"
      }
    ]
  }
}
```

The `AudioManifest` class loads and queries this:

```javascript
class AudioManifest {
  async load() {
    const resp = await fetch(this.url);
    this.data = await resp.json();
    this.channels = this.data.channels || {};
    for (const category of Object.values(this.data.tracks || {})) {
      this.tracks.push(...category);
    }
  }

  getTracksByChannel(channelId) {
    return this.tracks.filter(t => t.channel === channelId);
  }
}
```

---

## 6. Static Generation (Between Stations)

When the frequency is set to static, the `RadioPlayer` class generates white noise via the Web Audio API:

```javascript
_startStatic() {
  const ctx = this._ensureAudioContext();
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;  // gentle static
    }
  };
  const gain = ctx.createGain();
  gain.gain.value = 0;
  node.connect(gain);
  gain.connect(ctx.destination);
  
  // Fade in
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
}
```

This means the radio can play "static" even without any audio files — it generates the noise procedurally.

---

## 7. The Render Queue (TTS Pipeline)

The `RenderQueue` class manages text-to-speech for audio that hasn't been rendered yet:

```javascript
class RenderQueue {
  generateInstructions(renderItem) {
    return {
      commands: {
        mmx: `mmx tts --voice "${renderItem.voice}" --text-file "${textFile}" --output "${outputFile}"`,
        deepinfra: `curl -X POST .../audio/speech -d '{"model":"Qwen/Qwen3-TTS-VoiceDesign",...}'`
      },
      post_render: {
        action: 'Copy output to assets/audio/ and update audio-manifest.json',
      }
    };
  }
}
```

Tracks with `"audio_file": null` in the manifest are unrendered — they have a text source but no audio file. The render queue generates TTS instructions so the agent can produce them on demand.

---

## See Also

- [HOW ROOMS WORK](HOW-ROOMS-WORK.md) — How rooms trigger ambient audio on transition
- [HOW-DUAL-PROJECTION-WORKS](HOW-DUAL-PROJECTION-WORKS.md) — The split-view architecture
- [ADDING NEW ROOMS](ADDING-NEW-ROOMS.md) — Adding room-specific audio

---

*Four channels: fleet radio, podcasts, ambient, and static. Each one is a doorway.*
