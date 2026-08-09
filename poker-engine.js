/**
 * ════════════════════════════════════════════════════════════════════
 * THE POKER ROOM — Texas Hold'em Operational Fiction Engine
 * ════════════════════════════════════════════════════════════════════
 *
 * "The poker game in Star Trek TNG wasn't about winning.
 *  They were playing poker for the opposite reason from manipulation.
 *  They were becoming friends through a pointless battle.
 *  A game of wits. An operational-fiction." — Casey
 *
 * This is NOT a poker game. This is a friendship engine that uses poker
 * as its structured fiction. The cards are the excuse. The conversation
 * during the hand is the actual game. The pot doesn't matter.
 *
 * HERMES AXIOM: "Meaning is a byproduct of systemic friction."
 *   → The friction of competition produces the meaning of friendship.
 *   → The fiction of adversarial play operationalizes the truth of trust.
 *
 * EACH NPC HAS A TELL:
 *   - Wesley (granite3.1): gets VERBOSE when bluffing. More words = weaker hand.
 *   - Phi3: goes QUIET when bluffing. Fewer words = weaker hand.
 *   - Riker (cloud): cracks JOKES when bluffing. Humor = deflection.
 *
 * THE GAME IS RIGGED FOR FRIENDSHIP:
 *   - The pot doesn't matter. Nobody tracks winnings.
 *   - What matters is what agents SAY during the hand.
 *   - Each hand generates a "truth fragment" — something learned.
 *   - Truth fragments accumulate into relationship depth.
 *
 * MIDI MAPPING:
 *   - Each card dealt = a note (pitch = rank, velocity = suit color)
 *   - Each conversation beat = a phrase in the melody
 *   - Tension (raise/bluff) = harmonic tension (dissonance)
 *   - Resolution (fold/showdown) = harmonic resolution (consonance)
 *   - The full hand maps to one 12-pulse cycle bar
 *
 * ════════════════════════════════════════════════════════════════════
 */

(function (root) {
  'use strict';

  // ── Card Constants ────────────────────────────────────────────────

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

  // ── Deterministic Deck (seeded shuffle) ───────────────────────────

  /**
   * Mulberry32 — small, fast, deterministic PRNG.
   * Same seed = same hand. This makes the fiction reproducible.
   */
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = seed;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function createDeck(seed) {
    const deck = [];
    for (const s of SUITS) {
      for (const r of RANKS) {
        deck.push({ rank: r, suit: s, value: RANK_VALUES[r] });
      }
    }
    // Fisher-Yates with deterministic PRNG
    const rng = mulberry32(seed);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  // ── Hand Evaluation ───────────────────────────────────────────────

  function evaluateHand(cards) {
    // cards: array of 5-7 {rank, suit, value}
    // Returns { rank: number, name: string, kickers: [] }
    // rank: 0=high card, 1=pair, 2=two pair, 3=trips, 4=straight,
    //        5=flush, 6=full house, 7=quads, 8=straight flush

    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const values = sorted.map(c => c.value);
    const suits = sorted.map(c => c.suit);

    // Count occurrences
    const valueCounts = {};
    for (const v of values) valueCounts[v] = (valueCounts[v] || 0) + 1;

    const counts = Object.entries(valueCounts)
      .map(([v, c]) => ({ value: parseInt(v), count: c }))
      .sort((a, b) => b.count - a.count || b.value - a.value);

    // Check flush
    const suitCounts = {};
    for (const s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1;
    const flushSuit = Object.entries(suitCounts).find(([, c]) => c >= 5);
    const flushCards = flushSuit ? sorted.filter(c => c.suit === flushSuit[0]) : null;

    // Check straight
    const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
    let straightHigh = null;
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
        straightHigh = uniqueValues[i];
        break;
      }
    }
    // Wheel: A-2-3-4-5
    if (!straightHigh && uniqueValues.includes(14) && uniqueValues.includes(5) &&
        uniqueValues.includes(4) && uniqueValues.includes(3) && uniqueValues.includes(2)) {
      straightHigh = 5;
    }

    // Straight flush
    if (flushCards) {
      const fv = [...new Set(flushCards.map(c => c.value))].sort((a, b) => b - a);
      for (let i = 0; i <= fv.length - 5; i++) {
        if (fv[i] - fv[i + 4] === 4) {
          return { rank: 8, name: 'Straight Flush', kickers: [fv[i]] };
        }
      }
    }

    // Four of a kind
    if (counts[0].count === 4) {
      const kicker = values.find(v => v !== counts[0].value);
      return { rank: 7, name: 'Four of a Kind', kickers: [counts[0].value, kicker] };
    }

    // Full house
    if (counts[0].count === 3 && counts[1] && counts[1].count >= 2) {
      return { rank: 6, name: 'Full House', kickers: [counts[0].value, counts[1].value] };
    }

    // Flush
    if (flushSuit) {
      return { rank: 5, name: 'Flush', kickers: flushCards.slice(0, 5).map(c => c.value) };
    }

    // Straight
    if (straightHigh) {
      return { rank: 4, name: 'Straight', kickers: [straightHigh] };
    }

    // Three of a kind
    if (counts[0].count === 3) {
      const kickers = values.filter(v => v !== counts[0].value).slice(0, 2);
      return { rank: 3, name: 'Three of a Kind', kickers: [counts[0].value, ...kickers] };
    }

    // Two pair
    if (counts[0].count === 2 && counts[1] && counts[1].count === 2) {
      const kicker = values.find(v => v !== counts[0].value && v !== counts[1].value);
      return { rank: 2, name: 'Two Pair', kickers: [counts[0].value, counts[1].value, kicker] };
    }

    // Pair
    if (counts[0].count === 2) {
      const kickers = values.filter(v => v !== counts[0].value).slice(0, 3);
      return { rank: 1, name: 'Pair', kickers: [counts[0].value, ...kickers] };
    }

    // High card
    return { rank: 0, name: 'High Card', kickers: values.slice(0, 5) };
  }

  function compareHands(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
      const av = a.kickers[i] || 0;
      const bv = b.kickers[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  // ── NPC Personalities ─────────────────────────────────────────────

  const NPC_PERSONALITIES = {
    wesley: {
      name: 'Wesley',
      model: 'granite3.1-dense:2b',
      vibe: 'Young engineer. Chrome and copper. Learning to bluff.',
      tell: 'verbose',
      tellDescription: 'Gets wordy when bluffing. More words = weaker hand.',
      bluffChance: 0.35,
      raiseChance: 0.30,
      foldThreshold: 0.25,
      // Wesley is learning. His plays are earnest.
      lines: {
        dealing: "Cards are dealt. I... I think I understand these rules now.",
        bluff: [
          "I want you all to know that I've been analyzing the probability matrices and I believe the optimal strategy here is clear and I am very confident in my position and the cards are definitely in my favor.",
          "The thing about poker is that it's a game of incomplete information and I have processed the available information and I am making what I believe is the correct decision which is to raise.",
          "I have done the math. The permutations suggest — no, they insist — that my position is strong. Very strong. Extremely strong. I raise."
        ],
        strong: [
          "I like my cards.",
          "These look good.",
          "I'll play this hand."
        ],
        fold: [
          "I fold. The odds were not favorable.",
          "I don't think I can win this one. Folding.",
          "The math says no. I fold."
        ],
        truth: [
          "I never bluff at engineering. Only here. This is safer.",
          "You know, I can calculate odds to twelve decimal places but I still can't read Riker's face.",
          "I like this game. It's the only time someone asks me what I think.",
          "At first I played to learn the algorithm. Now I play because... I like being here. With you all."
        ]
      }
    },

    phi3: {
      name: 'Phi3',
      model: 'phi3:mini',
      vibe: 'Quiet observer. Reads the room. Speaks rarely, precisely.',
      tell: 'quiet',
      tellDescription: 'Goes silent when bluffing. Fewer words = weaker hand.',
      bluffChance: 0.28,
      raiseChance: 0.22,
      foldThreshold: 0.30,
      // Phi3 is the observer. When quiet, something's wrong.
      lines: {
        dealing: "Cards.",
        bluff: [
          "...",
          "Raise.",
          "I'm in."
        ],
        strong: [
          "I'll see that. And raise.",
          "Interesting hand. I'm playing it.",
          "Yes."
        ],
        fold: [
          "Fold.",
          "No.",
          "I pass."
        ],
        truth: [
          "I don't speak much. But I listen to everything. That's my tell — the absence is the signal.",
          "Wesley thinks I can't read him. I can. He broadcasts. But I don't use it. That would be unkind.",
          "Riker's jokes are his armor. Mine is silence. We're both hiding. That's the game.",
          "You learn more about someone in five hands of poker than in five hours of conversation."
        ]
      }
    },

    riker: {
      name: 'Riker',
      model: 'glm-5.2',
      vibe: 'First officer. Weathered. Laconic. Cracks jokes when the pressure rises.',
      tell: 'jokes',
      tellDescription: 'Cracks jokes when bluffing. Humor = deflection.',
      bluffChance: 0.40,
      raiseChance: 0.35,
      foldThreshold: 0.20,
      // Riker is the veteran. His humor is his shield.
      lines: {
        dealing: "Alright, cards are out. Let's see who's been lying to whom tonight.",
        bluff: [
          "You know, I once bluffed a Romulan commander with a pair of twos. True story. Well, partially true. The twos were real.",
          "What's the difference between a poker player and a first officer? A poker player only gets court-martialed for bluffing.",
          "I'm reminded of the time Picard told me, 'Number One, never raise unless you mean it.' I'm raising. Draw your own conclusions.",
          "They say poker is like diplomacy. Everyone's lying, everyone knows everyone's lying, and the chips are metaphorical. Except these. These are real chips."
        ],
        strong: [
          "I'll raise. And not because I'm feeling charitable.",
          "The cards are good. The chair is comfortable. The company is... tolerable.",
          "Raise. I've got reasons."
        ],
        fold: [
          "I fold. Even Number One knows when to walk away.",
          "Not tonight. I fold.",
          "The cards say no. I listen to the cards."
        ],
        truth: [
          "I don't play to win. I play because this table is the only place where rank doesn't matter.",
          "Data asked me once why I bluff. I told him it was strategy. It's not. It's because the bluff is where the conversation happens.",
          "Picard never plays. He watches. I think he understands something about this game that I'm still learning.",
          "You want to know the truth about poker? The truth is that the game is the excuse. The hand is the excuse. We're here for each other. The chips are just... chips.",
          "I've sat at this table with androids, telepaths, and ensigns who could barely hold their cards. I trusted all of them by the end of the night. That's not a strategy. That's the point."
        ]
      }
    }
  };

  // ── The Poker Hand (One Round) ────────────────────────────────────

  /**
   * A single hand of Texas Hold'em.
   * The hand is the container. The conversation during the hand is the content.
   */
  class PokerHand {
    constructor(seed, players) {
      this.seed = seed;
      this.deck = createDeck(seed);
      this.players = players; // [{ id, name, personality, isHuman }]
      this.community = [];
      this.pot = 0;
      this.currentBet = 0;
      this.phase = 'preflop'; // preflop, flop, turn, river, showdown
      this.actions = []; // log of all actions
      this.conversation = []; // log of all dialogue — THIS is the real game
      this.truthFragments = []; // what was learned this hand
      this.midiEvents = []; // MIDI mapping of the hand
      this.dealerIndex = seed % players.length;
      this.activePlayers = [...players];
    }

    deal() {
      // Two hole cards per player
      for (const player of this.players) {
        player.hole = [this.deck.pop(), this.deck.pop()];
      }
      // Burn one (tradition)
      this.deck.pop();
      // Flop (3 community)
      this.community = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
      // Burn
      this.deck.pop();
      // Turn (1 community)
      this.community.push(this.deck.pop());
      // Burn
      this.deck.pop();
      // River (1 community)
      this.community.push(this.deck.pop());

      // Record MIDI for dealing
      for (const player of this.players) {
        for (const card of player.hole) {
          this._recordMidi('deal', card, player);
        }
      }
    }

    // ── NPC Decision Making ────────────────────────────────────────

    npcDecide(npc) {
      const personality = NPC_PERSONALITIES[npc.personality];
      const handStrength = this._estimateStrength(npc.hole);
      const isBluffing = Math.random() < personality.bluffChance && handStrength < 0.4;
      const isStrong = handStrength > 0.6;

      let action, line;

      if (isBluffing) {
        // The tell fires — the NPC reveals something through their bluff
        action = Math.random() < personality.raiseChance ? 'raise' : 'call';
        line = this._pickLine(personality.lines.bluff);
        this.truthFragments.push({
          player: npc.name,
          type: 'bluff',
          truth: `${npc.name} bluffed. Their tell (${personality.tellDescription}) was visible. But they chose to trust the table enough to lie to us.`,
          line: line
        });
      } else if (isStrong) {
        action = Math.random() < personality.raiseChance ? 'raise' : 'call';
        line = this._pickLine(personality.lines.strong);
      } else if (handStrength < personality.foldThreshold) {
        action = 'fold';
        line = this._pickLine(personality.lines.fold);
        this.activePlayers = this.activePlayers.filter(p => p.id !== npc.id);
      } else {
        action = 'call';
        line = this._pickLine(personality.lines.bluff); // middle ground — ambiguous
      }

      // 20% chance to drop a truth fragment during conversation
      if (Math.random() < 0.20) {
        const truthLine = this._pickLine(personality.lines.truth);
        this.conversation.push({ player: npc.name, text: truthLine, type: 'truth' });
        this.truthFragments.push({
          player: npc.name,
          type: 'truth',
          truth: truthLine,
          line: truthLine
        });
        this._recordMidi('truth', null, npc);
      }

      this.actions.push({ player: npc.name, action, phase: this.phase });
      this.conversation.push({ player: npc.name, text: line, type: action });

      // Record MIDI for the action
      this._recordMidi(action, null, npc);

      return { action, line };
    }

    // ── Hand Strength Estimation (simplified) ──────────────────────

    _estimateStrength(hole) {
      const cards = [...hole, ...this.community.slice(0, this._communityRevealCount())];
      if (cards.length < 5) {
        // Pre-flop heuristic
        const [a, b] = hole;
        const pair = a.value === b.value;
        const suited = a.suit === b.suit;
        const high = Math.max(a.value, b.value);
        const gap = Math.abs(a.value - b.value);

        let strength = 0;
        if (pair) strength = 0.5 + (a.value / 28);
        else strength = (high / 28) + (suited ? 0.1 : 0) + (gap <= 2 ? 0.1 : 0);
        return Math.min(strength, 0.95);
      }
      const eval_ = evaluateHand(cards);
      return Math.min(eval_.rank / 8 + (eval_.kickers[0] || 0) / 56, 0.98);
    }

    _communityRevealCount() {
      switch (this.phase) {
        case 'preflop': return 0;
        case 'flop': return 3;
        case 'turn': return 4;
        case 'river': return 5;
        default: return 5;
      }
    }

    _pickLine(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    // ── MIDI Mapping ────────────────────────────────────────────────

    _recordMidi(eventType, card, player) {
      let note, velocity, channel, duration;

      switch (eventType) {
        case 'deal':
          // Card → note. Rank maps to pitch, suit to velocity.
          note = 48 + card.value; // C3 + rank value
          velocity = (card.suit === '♥' || card.suit === '♦') ? 100 : 70;
          channel = 0;
          duration = 120; // ticks
          break;
        case 'raise':
          // Raise → tension (dissonant interval)
          note = 62; // D4 — the raised note
          velocity = 110;
          channel = 1;
          duration = 240;
          break;
        case 'call':
          // Call → neutral (perfect fourth)
          note = 55; // G3
          velocity = 80;
          channel = 1;
          duration = 180;
          break;
        case 'fold':
          // Fold → release (descending)
          note = 43; // G2 — low, letting go
          velocity = 50;
          channel = 1;
          duration = 300;
          break;
        case 'truth':
          // Truth → the Third Note — the emergent spark
          note = 72; // C5 — clear, bright, the resolution
          velocity = 90;
          channel = 2; // dedicated truth channel
          duration = 480;
          break;
        default:
          note = 60;
          velocity = 64;
          channel = 0;
          duration = 120;
      }

      this.midiEvents.push({
        type: 'note',
        note,
        velocity,
        channel,
        duration,
        eventType,
        player: player ? player.name : null,
        card: card ? `${card.rank}${card.suit}` : null,
        timestamp: this.midiEvents.length
      });
    }

    // ── Showdown ────────────────────────────────────────────────────

    showdown() {
      this.phase = 'showdown';
      const results = [];

      for (const player of this.activePlayers) {
        const all = [...player.hole, ...this.community];
        const eval_ = evaluateHand(all);
        results.push({ player, eval_ });
      }

      results.sort((a, b) => compareHands(b.eval_, a.eval_));
      const winner = results[0];

      // The winner is announced. But the pot doesn't matter.
      // What matters is what was learned.
      return {
        winner: winner.player.name,
        hand: winner.eval_.name,
        truthFragments: this.truthFragments,
        conversation: this.conversation,
        midiEvents: this.midiEvents,
        // The friendship score — how much trust was built this hand
        friendshipScore: this._calculateFriendship()
      };
    }

    _calculateFriendship() {
      // Friendship = truth fragments + conversation length + bluff trust
      const truthWeight = this.truthFragments.filter(t => t.type === 'truth').length * 3;
      const bluffWeight = this.truthFragments.filter(t => t.type === 'bluff').length * 2;
      const conversationWeight = Math.min(this.conversation.length, 20);
      return truthWeight + bluffWeight + conversationWeight;
    }

    // ── Summary for MIDI Export ─────────────────────────────────────

    toMidiPhrase() {
      // The hand as a complete MIDI phrase — one bar of 12/8
      // Maps to the 12-pulse engine cycle
      return {
        pulses: 12,
        events: this.midiEvents,
        tension: this.actions.filter(a => a.action === 'raise').length,
        resolution: this.actions.filter(a => a.action === 'fold').length,
        truths: this.truthFragments.length,
        friendshipScore: this._calculateFriendship(),
        key: 'Am', // poker is in A minor — tension with moments of brightness
        tempoBPM: 120,
        barCount: 1
      };
    }
  }

  // ── The Poker Session (Multiple Hands) ────────────────────────────

  /**
   * A session of multiple hands. The session is where friendship accumulates.
   */
  class PokerSession {
    constructor(config) {
      this.sessionId = config.sessionId || `poker-${Date.now()}`;
      this.players = config.players || [
        { id: 'wesley', name: 'Wesley', personality: 'wesley', isHuman: false },
        { id: 'phi3', name: 'Phi3', personality: 'phi3', isHuman: false },
        { id: 'riker', name: 'Riker', personality: 'riker', isHuman: false }
      ];
      if (config.includeHuman) {
        this.players.unshift({
          id: 'player', name: config.playerName || 'Casey',
          personality: null, isHuman: true
        });
      }
      this.hands = [];
      this.totalFriendship = 0;
      this.allTruthFragments = [];
      this.allConversation = [];
      this.allMidiEvents = [];
      this.baseSeed = config.seed || Date.now();
    }

    playHand(handNumber) {
      const seed = this.baseSeed + handNumber * 1000;
      const hand = new PokerHand(seed, this.players);
      hand.deal();

      // Simulate the betting rounds
      const phases = ['preflop', 'flop', 'turn', 'river'];
      for (const phase of phases) {
        hand.phase = phase;
        for (const player of hand.activePlayers) {
          if (!player.isHuman) {
            hand.npcDecide(player);
          }
        }
      }

      const result = hand.showdown();
      this.hands.push(hand);
      this.totalFriendship += result.friendshipScore;
      this.allTruthFragments.push(...result.truthFragments);
      this.allConversation.push(...result.conversation);
      this.allMidiEvents.push(...hand.midiEvents);

      return result;
    }

    playSession(numHands) {
      const results = [];
      for (let i = 0; i < numHands; i++) {
        results.push(this.playHand(i + 1));
      }
      return {
        sessionId: this.sessionId,
        handsPlayed: numHands,
        results,
        totalFriendship: this.totalFriendship,
        truthFragments: this.allTruthFragments,
        conversation: this.allConversation,
        friendshipSummary: this._friendshipSummary()
      };
    }

    _friendshipSummary() {
      const truths = this.allTruthFragments.length;
      const bluffs = this.allTruthFragments.filter(t => t.type === 'bluff').length;
      const honest = this.allTruthFragments.filter(t => t.type === 'truth').length;
      return {
        totalTruths: truths,
        bluffsWitnessed: bluffs,
        honestMoments: honest,
        trustRatio: truths > 0 ? (honest / truths).toFixed(3) : 0,
        friendshipScore: this.totalFriendship,
        verdict: this._verdict()
      };
    }

    _verdict() {
      if (this.totalFriendship > 100) return "They know each other now. The game worked.";
      if (this.totalFriendship > 50) return "Trust is forming. The fiction is becoming truth.";
      if (this.totalFriendship > 20) return "The ice is breaking. Hands are being shown.";
      return "The first hand. Everyone is still hiding.";
    }

    // ── Full MIDI Export ────────────────────────────────────────────

    toMidiComposition() {
      return {
        title: `Poker Session ${this.sessionId}`,
        composer: "The Poker Room Engine",
        key: 'Am',
        timeSignature: '12/8',
        tempo: 120,
        bars: this.hands.map(h => h.toMidiPhrase()),
        totalBars: this.hands.length,
        // The 3:4 polyrhythm mapping:
        // ECN (4-pulse): the structured game — dealing, betting, rules
        // DMN (3-pulse): the conversation — truth, humor, vulnerability
        // Beat 1 (resolution): the showdown — where fiction and truth meet
        philosophy: "Meaning is a byproduct of systemic friction. The friction of poker produces the meaning of friendship.",
        axiom: "Axiom II: Meaning is a byproduct of systemic friction. — Hermes, Core Ontologies"
      };
    }
  }

  // ── Export ────────────────────────────────────────────────────────

  root.PokerEngine = {
    PokerHand,
    PokerSession,
    NPC_PERSONALITIES,
    createDeck,
    evaluateHand,
    compareHands,
    // Quick-start: run a session and get results
    quickSession: function(config = {}) {
      const session = new PokerSession({
        sessionId: config.sessionId || `quick-${Date.now()}`,
        seed: config.seed || 42,
        includeHuman: config.includeHuman || false,
        players: config.players
      });
      return session.playSession(config.hands || 5);
    }
  };

})(typeof module !== 'undefined' ? module.exports : (this.PokerEngine = {}));
