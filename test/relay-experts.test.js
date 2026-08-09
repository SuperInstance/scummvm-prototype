/**
 * relay-experts.test.js — Tests for the Relay of Experts system
 *
 * Run with: node test/relay-experts.test.js
 * Or with vitest: npx vitest run test/relay-experts.test.js
 */

const RelayExperts = require('../src/relay-experts.js');
const { ModelRegistry, BatonPass, SelfSelector, MultiModelChat, RoomOfMinds, RelayOrchestrator } = RelayExperts;

// ── Test runner ──
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    passed++;
    console.log(`  ✓ ${name}`);
  }).catch(err => {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════

async function runTests() {
  console.log('\n╔═══ Relay of Experts — Test Suite ═══╗\n');

  // ── Model Registry ──
  console.log('── Model Registry ──');

  await test('Registry has all local models', () => {
    const local = ModelRegistry.local();
    assert(local.length >= 6, `Expected ≥6 local models, got ${local.length}`);
    const ids = local.map(m => m.id);
    assert(ids.includes('granite3.1-dense:2b'), 'Missing granite3.1-dense:2b');
    assert(ids.includes('phi3:3.8b'), 'Missing phi3:3.8b');
    assert(ids.includes('qwen2.5:3b'), 'Missing qwen2.5:3b');
    assert(ids.includes('llava:7b'), 'Missing llava:7b');
    assert(ids.includes('llama3.2:1b'), 'Missing llama3.2:1b');
    assert(ids.includes('qwen2.5:0.5b'), 'Missing qwen2.5:0.5b');
  });

  await test('Registry has all cloud models', () => {
    const cloud = ModelRegistry.cloud();
    assert(cloud.length >= 5, `Expected ≥5 cloud models, got ${cloud.length}`);
    const ids = cloud.map(m => m.id);
    assert(ids.includes('glm-5.2'), 'Missing glm-5.2');
    assert(ids.includes('deepseek-chat'), 'Missing deepseek-chat');
    assert(ids.includes('deepseek-reasoner'), 'Missing deepseek-reasoner');
    assert(ids.includes('seed-2.0-pro'), 'Missing seed-2.0-pro');
    assert(ids.includes('hermes-3-405b'), 'Missing hermes-3-405b');
  });

  await test('Wesley has correct profile', () => {
    const wesley = ModelRegistry.get('granite3.1-dense:2b');
    assert(wesley, 'Wesley not found');
    assertEqual(wesley.name, 'Wesley');
    assert(wesley.strengths.includes('safety'), 'Missing safety strength');
    assert(wesley.weaknesses.includes('complex-math'), 'Missing complex-math weakness');
  });

  await test('Phi3 (John Anderson) has correct profile', () => {
    const phi3 = ModelRegistry.get('phi3:3.8b');
    assert(phi3, 'Phi3 not found');
    assertEqual(phi3.name, 'John Anderson');
    assert(phi3.strengths.includes('marine-biology'), 'Missing marine-biology strength');
  });

  await test('bestFor returns ranked candidates', () => {
    const candidates = ModelRegistry.bestFor('deep-reasoning');
    assert(candidates.length > 0, 'No candidates for deep-reasoning');
    assertEqual(candidates[0].id, 'deepseek-reasoner');
  });

  await test('bestFor vision returns llava first', () => {
    const candidates = ModelRegistry.bestFor('vision');
    assert(candidates.length > 0, 'No candidates for vision');
    assertEqual(candidates[0].id, 'llava:7b');
  });

  await test('bestFor creative-writing returns multiple candidates', () => {
    const candidates = ModelRegistry.bestFor('creative-writing');
    assert(candidates.length >= 3, `Expected ≥3 creative-writing models, got ${candidates.length}`);
  });

  await test('withStrength returns matching models', () => {
    const creative = ModelRegistry.withStrength('creative-writing');
    assert(creative.length >= 3, `Expected ≥3 creative models, got ${creative.length}`);
  });

  await test('Tiny model knows its limits', () => {
    const tiny = ModelRegistry.get('qwen2.5:0.5b');
    assert(tiny, 'Tiny not found');
    assert(tiny.weaknesses.includes('everything-complex'), 'Tiny should know its limits');
    assert(tiny.strengths.includes('routing-decisions'), 'Tiny should be good at routing');
  });

  // ── Baton Pass ──
  console.log('\n── Baton Pass ──');

  await test('Baton create works', () => {
    BatonPass.reset();
    const baton = BatonPass.create({
      from: 'granite3.1-dense:2b',
      to: 'deepseek-reasoner',
      reason: 'Needs deeper reasoning',
      context: 'Camera room design',
      work_done: 'Identified components',
      handoff_to: 'Integration architecture',
    });
    assert(baton.baton_id.startsWith('baton-'), 'Baton should have baton_id');
    assertEqual(baton.from, 'granite3.1-dense:2b');
    assertEqual(baton.to, 'deepseek-reasoner');
    assertEqual(baton.status, 'created');
  });

  await test('Baton accept changes status', () => {
    BatonPass.reset();
    const baton = BatonPass.create({
      from: 'granite3.1-dense:2b',
      to: 'deepseek-reasoner',
      reason: 'test',
      context: '',
      work_done: '',
      handoff_to: '',
    });
    BatonPass.accept(baton);
    assertEqual(baton.status, 'accepted');
    assert(baton.acceptedAt, 'Should have acceptedAt timestamp');
  });

  await test('Baton complete changes status and stores result', () => {
    BatonPass.reset();
    const baton = BatonPass.create({
      from: 'granite3.1-dense:2b',
      to: 'deepseek-reasoner',
      reason: 'test',
      context: '',
      work_done: '',
      handoff_to: '',
    });
    BatonPass.complete(baton, 'The fusion architecture uses a Kalman filter...');
    assertEqual(baton.status, 'completed');
    assert(baton.result.includes('Kalman filter'), 'Result should be stored');
  });

  await test('Baton passAgain creates new baton from receiver', () => {
    BatonPass.reset();
    const baton1 = BatonPass.create({
      from: 'granite3.1-dense:2b',
      to: 'deepseek-reasoner',
      reason: 'needs reasoning',
      context: 'design task',
      work_done: 'identified parts',
      handoff_to: 'architecture',
    });
    const baton2 = BatonPass.passAgain(baton1, {
      to: 'deepseek-chat',
      reason: 'needs creative touch',
      work_done: 'designed the fusion architecture',
      handoff_to: 'write the UI description',
    });
    assertEqual(baton1.status, 'passed');
    assertEqual(baton2.from, 'deepseek-reasoner');
    assertEqual(baton2.to, 'deepseek-chat');
  });

  await test('Baton chain tracks full history', () => {
    BatonPass.reset();
    const taskId = 'test-chain-001';
    const b1 = BatonPass.create({ task_id: taskId, from: 'a', to: 'b', reason: 'r1', context: '', work_done: '', handoff_to: '' });
    const b2 = BatonPass.create({ task_id: taskId, from: 'b', to: 'c', reason: 'r2', context: '', work_done: '', handoff_to: '' });
    const b3 = BatonPass.create({ task_id: taskId, from: 'c', to: 'd', reason: 'r3', context: '', work_done: '', handoff_to: '' });
    const chain = BatonPass.getChain(taskId);
    assertEqual(chain.length, 3);
    assertEqual(chain[0].from, 'a');
    assertEqual(chain[2].to, 'd');
  });

  // ── Room of Minds ──
  console.log('\n── Room of Minds ──');

  await test('RoomOfMinds STATES are defined', () => {
    assertEqual(RoomOfMinds.STATES.WORKING, 'working');
    assertEqual(RoomOfMinds.STATES.IDLE, 'idle');
    assertEqual(RoomOfMinds.STATES.UNLOADED, 'unloaded');
    assertEqual(RoomOfMinds.STATES.CLOUD, 'cloud');
  });

  await test('RoomOfMinds renderText produces output', async () => {
    await RoomOfMinds.init();
    const text = RoomOfMinds.renderText();
    assert(text.includes('ROOM OF MINDS'), 'Should have header');
    assert(text.includes('Wesley'), 'Should list Wesley');
    assert(text.includes('GLM'), 'Should list GLM');
  });

  await test('RoomOfMinds markWorking updates state', () => {
    RoomOfMinds.markWorking('granite3.1-dense:2b', 'testing task');
    const status = RoomOfMinds.getStatus();
    const wesley = status.find(s => s.id === 'granite3.1-dense:2b');
    assert(wesley, 'Wesley should be in status');
    assertEqual(wesley.state, 'working');
    assert(wesley.currentTask.includes('testing'), 'Should have task');
  });

  await test('RoomOfMinds markIdle updates state', () => {
    RoomOfMinds.markWorking('granite3.1-dense:2b', 'test');
    RoomOfMinds.markIdle('granite3.1-dense:2b');
    const status = RoomOfMinds.getStatus();
    const wesley = status.find(s => s.id === 'granite3.1-dense:2b');
    assertEqual(wesley.state, 'idle');
    assertEqual(wesley.currentTask, null);
  });

  await test('RoomOfMinds subscribe receives updates', () => {
    let received = null;
    const unsub = RoomOfMinds.subscribe(s => { received = s; });
    RoomOfMinds.markWorking('llama3.2:1b', 'quick check');
    assert(received, 'Subscriber should have received status');
    assert(received.find(s => s.id === 'llama3.2:1b').state === 'working');
    unsub();
  });

  // ── Orchestrator ──
  console.log('\n── Relay Orchestrator ──');

  await test('Orchestrator has MAX_PASSES', () => {
    assert(RelayOrchestrator.MAX_PASSES >= 3, 'MAX_PASSES should be ≥3');
    assert(RelayOrchestrator.MAX_PASSES <= 10, 'MAX_PASSES should be ≤10');
  });

  // ── Summary ──
  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\n  Failures:');
    failures.forEach(f => console.log(`    ✗ ${f.name}: ${f.error}`));
  }
  console.log('═══════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
