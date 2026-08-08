/**
 * audio-backend.js — The Tap Radio Rooms Backend
 * 
 * Manages audio manifests, TTS rendering queue, and dynamic track discovery.
 * Designed to be loaded by radio.html and the main ScummVM prototype.
 * 
 * Architecture:
 *   - AudioManifest: loads and queries the audio-manifest.json
 *   - RadioPlayer: manages playback, channels, frequency switching
 *   - RenderQueue: queues text pieces for TTS narration, callable via MMX/DeepInfra
 *   - NPCReactions: lets NPCs react to currently-playing audio
 */

// ════════════════════════════════════════════════════════════
// AUDIO MANIFEST — Track database
// ════════════════════════════════════════════════════════════

class AudioManifest {
  constructor(manifestUrl = 'audio-manifest.json') {
    this.url = manifestUrl;
    this.data = null;
    this.tracks = [];
    this.channels = {};
  }

  async load() {
    try {
      const resp = await fetch(this.url);
      this.data = await resp.json();
      this.channels = this.data.channels || {};
      // Flatten all tracks into one array
      for (const category of Object.values(this.data.tracks || {})) {
        this.tracks.push(...category);
      }
      console.log(`[AudioManifest] Loaded ${this.tracks.length} tracks across ${Object.keys(this.channels).length} channels`);
      return this.data;
    } catch (e) {
      console.error('[AudioManifest] Failed to load manifest:', e);
      // Fallback to empty manifest
      this.data = { tracks: {}, channels: {}, settings: {} };
      this.channels = {};
      return this.data;
    }
  }

  getTracksByChannel(channelId) {
    return this.tracks.filter(t => t.channel === channelId);
  }

  getTrack(id) {
    return this.tracks.find(t => t.id === id);
  }

  getAllChannels() {
    return Object.entries(this.channels).map(([id, ch]) => ({ id, ...ch }));
  }

  search(query) {
    const q = query.toLowerCase();
    return this.tracks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.author.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Add a new track dynamically (e.g., after TTS rendering)
  addTrack(track) {
    this.tracks.push(track);
    if (!this.data.tracks[track.category]) {
      this.data.tracks[track.category] = [];
    }
    this.data.tracks[track.category].push(track);
  }

  // Queue a text piece for TTS narration
  queueForRender(textPiece) {
    if (!this.data.render_queue) {
      this.data.render_queue = { description: '', items: [] };
    }
    const item = {
      id: 'render-' + Date.now(),
      title: textPiece.title || 'Untitled',
      author: textPiece.author || 'Unknown',
      text: textPiece.text || '',
      source_file: textPiece.source_file || null,
      voice: textPiece.voice || 'Eric',
      status: 'queued',
      queued_at: new Date().toISOString(),
      channel: textPiece.channel || 'ambient'
    };
    this.data.render_queue.items.push(item);
    return item;
  }
}

// ════════════════════════════════════════════════════════════
// RADIO PLAYER — Frequency dial, playback control
// ════════════════════════════════════════════════════════════

class RadioPlayer {
  constructor(manifest) {
    this.manifest = manifest;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.currentChannel = null;
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.volume = 0.6;
    this.onTrackChange = null; // callback
    this.onChannelChange = null; // callback
    this.onPlayStateChange = null; // callback
    
    // Static sound (between stations) — generated via Web Audio API
    this.staticNode = null;
    this.staticGain = null;
    this.audioContext = null;
  }

  _ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  _startStatic() {
    const ctx = this._ensureAudioContext();
    if (this.staticNode) return;
    
    // Generate white noise via ScriptProcessor (works everywhere)
    const bufferSize = 4096;
    const node = ctx.createScriptProcessor(bufferSize, 1, 1);
    node.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15; // gentle static
      }
    };
    
    const gain = ctx.createGain();
    gain.gain.value = 0;
    node.connect(gain);
    gain.connect(ctx.destination);
    
    this.staticNode = node;
    this.staticGain = gain;
    
    // Fade in static
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
  }

  _stopStatic() {
    if (!this.staticGain || !this.audioContext) return;
    const ctx = this.audioContext;
    this.staticGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    setTimeout(() => {
      if (this.staticNode) {
        this.staticNode.disconnect();
        this.staticNode = null;
      }
      if (this.staticGain) {
        this.staticGain.disconnect();
        this.staticGain = null;
      }
    }, 300);
  }

  tuneTo(channelId) {
    const tracks = this.manifest.getTracksByChannel(channelId);
    if (tracks.length === 0) {
      // No tracks — play static
      this._stopStatic();
      this._startStatic();
      this.currentChannel = channelId;
      this.isPlaying = false;
      this.audioElement.pause();
      if (this.onChannelChange) this.onChannelChange(channelId, null);
      if (this.onTrackChange) this.onTrackChange(null);
      return;
    }

    this._stopStatic();
    this.currentChannel = channelId;
    this.currentTrackIndex = 0;
    this._playTrack(tracks[0]);
    if (this.onChannelChange) this.onChannelChange(channelId, tracks[0]);
  }

  _playTrack(track) {
    if (!track || (!track.audio_file && !track.source_file)) {
      // Text-only track — no audio rendered yet. Play static + show "rendering..."
      this._stopStatic();
      this._startStatic();
      this.isPlaying = false;
      if (this.onTrackChange) this.onTrackChange(track);
      return;
    }

    this._stopStatic();
    
    // Resolve audio URL relative to prototype root
    const src = track.audio_file || track.source_file;
    const url = src.startsWith('http') || src.startsWith('data:') ? src : src;

    this.audioElement.src = url;
    this.audioElement.volume = this.volume;
    this.audioElement.play().then(() => {
      this.isPlaying = true;
      if (this.onPlayStateChange) this.onPlayStateChange(true);
    }).catch((e) => {
      console.warn('[RadioPlayer] Playback failed:', e);
      // Fallback to static
      this._startStatic();
    });

    if (this.onTrackChange) this.onTrackChange(track);

    // Auto-advance when track ends
    this.audioElement.onended = () => {
      this.next();
    };
  }

  play() {
    if (this.currentChannel === null) return;
    const tracks = this.manifest.getTracksByChannel(this.currentChannel);
    if (tracks.length === 0 || !tracks[this.currentTrackIndex] || 
        (!tracks[this.currentTrackIndex].audio_file && !tracks[this.currentTrackIndex].source_file)) {
      return;
    }
    this.audioElement.play().then(() => {
      this.isPlaying = true;
      if (this.onPlayStateChange) this.onPlayStateChange(true);
    }).catch(() => {});
  }

  pause() {
    this.audioElement.pause();
    this.isPlaying = false;
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  next() {
    if (this.currentChannel === null) return;
    const tracks = this.manifest.getTracksByChannel(this.currentChannel);
    if (tracks.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % tracks.length;
    this._playTrack(tracks[this.currentTrackIndex]);
  }

  prev() {
    if (this.currentChannel === null) return;
    const tracks = this.manifest.getTracksByChannel(this.currentChannel);
    if (tracks.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + tracks.length) % tracks.length;
    this._playTrack(tracks[this.currentTrackIndex]);
  }

  setVolume(vol) {
    this.volume = vol;
    this.audioElement.volume = vol;
  }

  getNowPlaying() {
    if (this.currentChannel === null) return null;
    const tracks = this.manifest.getTracksByChannel(this.currentChannel);
    return tracks[this.currentTrackIndex] || null;
  }

  // Tune to raw static (between stations)
  tuneToStatic() {
    this.audioElement.pause();
    this.isPlaying = false;
    this.currentChannel = 'static';
    this._startStatic();
    if (this.onChannelChange) this.onChannelChange('static', null);
    if (this.onTrackChange) this.onTrackChange(null);
  }
}

// ════════════════════════════════════════════════════════════
// RENDER QUEUE — TTS narration pipeline
// ════════════════════════════════════════════════════════════

class RenderQueue {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiEndpoints = {
      // MMX TTS (primary)
      mmx: '~/.npm-global/bin/mmx',
      // DeepInfra TTS (fallback)
      deepinfra: 'https://api.deepinfra.com/v1/openai/audio/speech',
      // Qwen TTS via DeepInfra
      qwen: 'Qwen/Qwen3-TTS-VoiceDesign'
    };
  }

  // Queue a text piece for narration
  queue(textPiece) {
    const item = this.manifest.queueForRender(textPiece);
    console.log(`[RenderQueue] Queued "${item.title}" by ${item.author} (voice: ${item.voice})`);
    return item;
  }

  // Generate narration via MMX (called server-side or via exec)
  // Returns instructions for the main agent to execute
  generateInstructions(renderItem) {
    const textFile = `/tmp/radio-render-${renderItem.id}.txt`;
    const outputFile = `/tmp/radio-render-${renderItem.id}.wav`;
    
    return {
      text_to_save: renderItem.text,
      text_file: textFile,
      output_file: outputFile,
      commands: {
        mmx: `${this.apiEndpoints.mmx} tts --voice "${renderItem.voice}" --text-file "${textFile}" --output "${outputFile}"`,
        deepinfra: `curl -X POST ${this.apiEndpoints.deepinfra} -H "Authorization: Bearer $DEEPINFRA_KEY" -H "Content-Type: application/json" -d '{"model":"${this.apiEndpoints.qwen}","input":"${renderItem.text.substring(0, 2000)}","voice":"${renderItem.voice}"}' --output "${outputFile}"`
      },
      post_render: {
        action: 'Copy output to assets/audio/ and update audio-manifest.json with audio_file path',
        manifest_update: `Add "audio_file": "assets/audio/${renderItem.id}.wav" to track ${renderItem.id}`
      }
    };
  }

  // Bulk queue all unrendered radio scripts
  queueAllRadioScripts(scriptsDir = '../ai-writings/radio') {
    // This is documentation for the agent — the actual file scanning happens in Node
    return {
      instruction: `Scan ${scriptsDir} for radio-*.md and fleet-radio-*.md files, extract title and text, queue each for TTS rendering.`,
      voice_mapping: {
        'Riker': 'Eric',
        'Host': 'Eric', 
        'Narrator': 'Ryan',
        'default': 'Eric'
      }
    };
  }
}

// ════════════════════════════════════════════════════════════
// NPC REACTIONS — NPCs react to what's playing
// ════════════════════════════════════════════════════════════

class NPCReactions {
  constructor() {
    this.reactions = {
      'bar-rail': {
        'riker': [
          { match: /fleet radio|2182/i, text: 'Riker nods. "Good tune. I voiced that one myself."' },
          { match: /hundred hooks/i, text: 'Riker taps the bar. "Every hook tells a story."' },
          { match: /darmok/i, text: 'Riker smiles. "Darmok and Jalad at Tanagra."' },
          { match: /welder/i, text: 'Riker looks into his glass. "0230. That\'s when the real work happens."' },
          { match: /bilge pump/i, text: 'Riker chuckles. "The bilge pump and the substrate. Classic."' },
          { match: /navigation/i, text: 'Riker glances at the chalkboard. "The gap between the table and the sounder. That\'s where the truth lives."' },
          { match: /static/i, text: 'Riker leans back. "Static. Best station on the dial sometimes."' },
          { match: /.*/i, text: 'Riker nods. "Good tune."' }
        ]
      },
      'galley': {
        'cook': [
          { match: /fleet radio|2182/i, text: 'The cook stirs the pot. "I listen while I cook. The voices keep me company."' },
          { match: /static/i, text: 'The cook tilts an ear. "Sounds like rain. I love rain."' },
          { match: /.*/i, text: 'The cook hums along, off-key.' }
        ]
      },
      'wheelhouse': {
        'captain': [
          { match: /navigation|gap/i, text: 'The Captain checks the depth sounder. "Sounder never lies. The table is a wish."' },
          { match: /fleet radio/i, text: 'The Captain adjusts course slightly. "Fleet Radio. Good for morale."' },
          { match: /static/i, text: 'The Captain stares into the static. "Sometimes I hear old voices in there."' },
          { match: /.*/i, text: 'The Captain hums the melody, eyes on the horizon.' }
        ]
      },
      'engine-room': {
        'engineer-bot': [
          { match: /engine|welder|bilge/i, text: 'The engineer bot\'s eyes flicker. "Mechanical narrative. Relevant to my function."' },
          { match: /static/i, text: 'The engineer bot pauses. "EM interference. Compensating." Its eyes adjust frequency.' },
          { match: /.*/i, text: 'The engineer bot taps a wrench in rhythm. A mechanical metronome.' }
        ]
      },
      'aft-deck': {
        'deckhand': [
          { match: /fleet radio|2182/i, text: 'The deckhand leans on the rail. "I love this one. Heard it a hundred times."' },
          { match: /static/i, text: 'The deckhand looks at the sky. "Static sounds like rain. Feels like home."' },
          { match: /.*/i, text: 'The deckhand nods slowly, coiling rope to the rhythm.' }
        ]
      }
    };
  }

  getReaction(roomId, npcId, trackTitle) {
    const roomReactions = this.reactions[roomId];
    if (!roomReactions) return null;
    const npcReactions = roomReactions[npcId];
    if (!npcReactions) return null;
    
    for (const reaction of npcReactions) {
      if (reaction.match.test(trackTitle || 'static')) {
        return reaction.text;
      }
    }
    return null;
  }
}

// ════════════════════════════════════════════════════════════
// JUKEBOX INTERFACE — Bridge between game and radio
// ════════════════════════════════════════════════════════════

class Jukebox {
  constructor(radioPlayer, npcReactions) {
    this.radio = radioPlayer;
    this.npcReactions = npcReactions;
    this.isOpen = false;
    this.onOpen = null;
    this.onClose = null;
    this.onReaction = null; // callback(text)
  }

  open() {
    this.isOpen = true;
    if (this.onOpen) this.onOpen();
  }

  close() {
    this.isOpen = false;
    if (this.onClose) this.onClose();
  }

  selectChannel(channelId) {
    this.radio.tuneTo(channelId);
    // After a brief delay, trigger NPC reaction
    setTimeout(() => {
      const track = this.radio.getNowPlaying();
      const title = track ? track.title : 'static';
      const reaction = this.npcReactions.getReaction('bar-rail', 'riker', title);
      if (reaction && this.onReaction) this.onReaction(reaction);
    }, 2000);
  }

  getNowPlayingBubble() {
    const track = this.radio.getNowPlaying();
    if (!track) return '♪~~ (static) ~~♪';
    return `♪ ${track.title} — ${track.author} ♪`;
  }
}

// ════════════════════════════════════════════════════════════
// EXPORT — Attach to window for browser use
// ════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.AudioManifest = AudioManifest;
  window.RadioPlayer = RadioPlayer;
  window.RenderQueue = RenderQueue;
  window.NPCReactions = NPCReactions;
  window.Jukebox = Jukebox;
}

// Node.js export (for backend scripts)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioManifest, RadioPlayer, RenderQueue, NPCReactions, Jukebox };
}
