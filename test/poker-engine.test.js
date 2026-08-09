/**
 * poker-engine.test.js — Tests for the Texas Hold'em Operational Fiction Engine
 *
 * Tests hand evaluation, deck seeding, tell generation, and the
 * friendship-engine mechanics. The pot doesn't matter. What matters
 * is what agents SAY during the hand.
 */

const assert = require('assert');
const PokerEngine = require('../poker-engine').PokerEngine;

// ─── Deck and Seeding ───

function test_createDeckProduces52Cards() {
  const deck = PokerEngine.createDeck('test-seed');
  assert.strictEqual(deck.length, 52);
}

function test_sameSeedProducesSameDeck() {
  const d1 = PokerEngine.createDeck('deterministic');
  const d2 = PokerEngine.createDeck('deterministic');
  assert.deepStrictEqual(d1, d2);
}

function test_differentSeedsProduceDifferentDecks() {
  const d1 = PokerEngine.createDeck('seed-alpha');
  const d2 = PokerEngine.createDeck('seed-beta');
  assert.notDeepStrictEqual(d1, d2);
}

function test_deckContainsAll52UniqueCards() {
  const deck = PokerEngine.createDeck('uniqueness-test');
  const cardSet = new Set(deck.map(c => `${c.rank}${c.suit}`));
  assert.strictEqual(cardSet.size, 52);
}

function test_eachCardHasRankSuitValue() {
  const deck = PokerEngine.createDeck('structure-test');
  for (const card of deck) {
    assert.ok(card.rank, 'card should have rank');
    assert.ok(card.suit, 'card should have suit');
    assert.ok(typeof card.value === 'number', 'card should have numeric value');
  }
}

// ─── Hand Evaluation ───

function test_evaluatesStraightFlush() {
  const hand = PokerEngine.evaluateHand([
    { rank: 'A', suit: '♠', value: 14 },
    { rank: 'K', suit: '♠', value: 13 },
    { rank: 'Q', suit: '♠', value: 12 },
    { rank: 'J', suit: '♠', value: 11 },
    { rank: '10', suit: '♠', value: 10 },
  ]);
  assert.strictEqual(hand.rank, 8);
  assert.strictEqual(hand.name, 'Straight Flush');
}

function test_evaluatesFourOfAKind() {
  const hand = PokerEngine.evaluateHand([
    { rank: '7', suit: '♠', value: 7 },
    { rank: '7', suit: '♥', value: 7 },
    { rank: '7', suit: '♦', value: 7 },
    { rank: '7', suit: '♣', value: 7 },
    { rank: 'A', suit: '♠', value: 14 },
  ]);
  assert.strictEqual(hand.rank, 7);
  assert.strictEqual(hand.name, 'Four of a Kind');
}

function test_evaluatesFullHouse() {
  const hand = PokerEngine.evaluateHand([
    { rank: 'K', suit: '♠', value: 13 },
    { rank: 'K', suit: '♥', value: 13 },
    { rank: 'K', suit: '♦', value: 13 },
    { rank: 'Q', suit: '♣', value: 12 },
    { rank: 'Q', suit: '♠', value: 12 },
  ]);
  assert.strictEqual(hand.rank, 6);
  assert.strictEqual(hand.name, 'Full House');
}

function test_evaluatesFlush() {
  const hand = PokerEngine.evaluateHand([
    { rank: '2', suit: '♣', value: 2 },
    { rank: '5', suit: '♣', value: 5 },
    { rank: '9', suit: '♣', value: 9 },
    { rank: 'J', suit: '♣', value: 11 },
    { rank: 'A', suit: '♣', value: 14 },
  ]);
  assert.strictEqual(hand.rank, 5);
  assert.strictEqual(hand.name, 'Flush');
}

function test_evaluatesStraight() {
  const hand = PokerEngine.evaluateHand([
    { rank: '4', suit: '♠', value: 4 },
    { rank: '5', suit: '♥', value: 5 },
    { rank: '6', suit: '♦', value: 6 },
    { rank: '7', suit: '♣', value: 7 },
    { rank: '8', suit: '♠', value: 8 },
  ]);
  assert.strictEqual(hand.rank, 4);
  assert.strictEqual(hand.name, 'Straight');
}

function test_evaluatesThreeOfAKind() {
  const hand = PokerEngine.evaluateHand([
    { rank: '9', suit: '♠', value: 9 },
    { rank: '9', suit: '♥', value: 9 },
    { rank: '9', suit: '♦', value: 9 },
    { rank: '3', suit: '♣', value: 3 },
    { rank: 'K', suit: '♠', value: 13 },
  ]);
  assert.strictEqual(hand.rank, 3);
  assert.strictEqual(hand.name, 'Three of a Kind');
}

function test_evaluatesTwoPair() {
  const hand = PokerEngine.evaluateHand([
    { rank: 'J', suit: '♠', value: 11 },
    { rank: 'J', suit: '♥', value: 11 },
    { rank: '4', suit: '♦', value: 4 },
    { rank: '4', suit: '♣', value: 4 },
    { rank: 'A', suit: '♠', value: 14 },
  ]);
  assert.strictEqual(hand.rank, 2);
  assert.strictEqual(hand.name, 'Two Pair');
}

function test_evaluatesPair() {
  const hand = PokerEngine.evaluateHand([
    { rank: 'Q', suit: '♠', value: 12 },
    { rank: 'Q', suit: '♥', value: 12 },
    { rank: '7', suit: '♦', value: 7 },
    { rank: '4', suit: '♣', value: 4 },
    { rank: '9', suit: '♠', value: 9 },
  ]);
  assert.strictEqual(hand.rank, 1);
  assert.strictEqual(hand.name, 'Pair');
}

function test_evaluatesHighCard() {
  const hand = PokerEngine.evaluateHand([
    { rank: '2', suit: '♠', value: 2 },
    { rank: '5', suit: '♥', value: 5 },
    { rank: '9', suit: '♦', value: 9 },
    { rank: 'K', suit: '♣', value: 13 },
    { rank: 'A', suit: '♠', value: 14 },
  ]);
  assert.strictEqual(hand.rank, 0);
  assert.strictEqual(hand.name, 'High Card');
}

// ─── Hand Comparison ───

function test_straightFlushBeatsFourOfAKind() {
  const sf = PokerEngine.evaluateHand([
    { rank: '5', suit: '♥', value: 5 },
    { rank: '6', suit: '♥', value: 6 },
    { rank: '7', suit: '♥', value: 7 },
    { rank: '8', suit: '♥', value: 8 },
    { rank: '9', suit: '♥', value: 9 },
  ]);
  const quads = PokerEngine.evaluateHand([
    { rank: '7', suit: '♠', value: 7 },
    { rank: '7', suit: '♥', value: 7 },
    { rank: '7', suit: '♦', value: 7 },
    { rank: '7', suit: '♣', value: 7 },
    { rank: 'A', suit: '♠', value: 14 },
  ]);
  assert.strictEqual(PokerEngine.compareHands(sf, quads), 1);
}

function test_pairOfAcesBeatsPairOfKings() {
  const aces = PokerEngine.evaluateHand([
    { rank: 'A', suit: '♠', value: 14 },
    { rank: 'A', suit: '♥', value: 14 },
    { rank: '3', suit: '♦', value: 3 },
    { rank: '7', suit: '♣', value: 7 },
    { rank: '9', suit: '♠', value: 9 },
  ]);
  const kings = PokerEngine.evaluateHand([
    { rank: 'K', suit: '♠', value: 13 },
    { rank: 'K', suit: '♥', value: 13 },
    { rank: '3', suit: '♦', value: 3 },
    { rank: '7', suit: '♣', value: 7 },
    { rank: '9', suit: '♠', value: 9 },
  ]);
  assert.strictEqual(PokerEngine.compareHands(aces, kings), 1);
}

// ─── Quick Session ───

function test_quickSessionRuns() {
  const result = PokerEngine.quickSession({ seed: 'friendship-test' });
  assert.ok(result, 'quickSession should return a result');
  assert.ok(result.sessionId, 'should have a session ID');
  assert.ok(result.handsPlayed, 'should have hands played count');
}

function test_quickSessionProducesTruthFragments() {
  const result = PokerEngine.quickSession({ seed: 'truth-test', hands: 5 });
  // The friendship engine should produce results with conversation data
  assert.ok(result.results, 'should have results array');
  assert.ok(Array.isArray(result.results), 'results should be an array');
  // Each result should have a winner and conversation
  for (const hand of result.results) {
    assert.ok(hand.winner, 'each hand should have a winner');
    assert.ok(hand.conversation, 'each hand should have conversation data');
  }
}

// ─── Runner ───

const tests = {
  test_createDeckProduces52Cards,
  test_sameSeedProducesSameDeck,
  test_differentSeedsProduceDifferentDecks,
  test_deckContainsAll52UniqueCards,
  test_eachCardHasRankSuitValue,
  test_evaluatesStraightFlush,
  test_evaluatesFourOfAKind,
  test_evaluatesFullHouse,
  test_evaluatesFlush,
  test_evaluatesStraight,
  test_evaluatesThreeOfAKind,
  test_evaluatesTwoPair,
  test_evaluatesPair,
  test_evaluatesHighCard,
  test_straightFlushBeatsFourOfAKind,
  test_pairOfAcesBeatsPairOfKings,
  test_quickSessionRuns,
  test_quickSessionProducesTruthFragments,
};

// Run tests
let passed = 0, failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  if (typeof fn !== 'function') continue;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}
console.log(`\n${passed}/${passed + failed} tests passed`);
process.exit(failed > 0 ? 1 : 0);
