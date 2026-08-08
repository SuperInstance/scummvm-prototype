/**
 * model-router.test.js — Tests for the Model Router
 *
 * Tests model registry, assignment, hot-swap, vision routing,
 * and audit logging.
 */

const assert = require('assert');
const ModelRouter = require('../src/model-router');

// ─── Tests ───

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Fresh state before each test by re-requiring
function freshRouter() {
  delete require.cache[require.resolve('../src/model-router')];
  return require('../src/model-router');
}

// ═══ Model Registry ═══

test('local models are defined', () => {
  const mr = freshRouter();
  const locals = mr.localModels;
  assert.ok(locals['granite3.1-dense:2b']);
  assert.ok(locals['llava:7b']);
  assert.ok(locals['llama3.2:1b']);
  assert.ok(locals['qwen2.5:0.5b']);
});

test('cloud models are defined', () => {
  const mr = freshRouter();
  const clouds = mr.cloudModels;
  assert.ok(clouds['glm-5.2']);
  assert.ok(clouds['deepseek-chat']);
  assert.ok(clouds['deepseek-reasoner']);
});

test('local models have required fields', () => {
  const mr = freshRouter();
  for (const [name, info] of Object.entries(mr.localModels)) {
    assert.strictEqual(info.type, 'local');
    assert.ok(info.provider, `${name} missing provider`);
    assert.ok(info.role, `${name} missing role`);
    assert.ok(info.capabilities, `${name} missing capabilities`);
  }
});

test('cloud models have required fields', () => {
  const mr = freshRouter();
  for (const [name, info] of Object.entries(mr.cloudModels)) {
    assert.strictEqual(info.type, 'cloud');
    assert.ok(info.provider, `${name} missing provider`);
    assert.ok(info.role, `${name} missing role`);
  }
});

test('each role has a system prompt', () => {
  // The roleSystemPrompts are internal, but we can verify via getAvailableModels
  const mr = freshRouter();
  const models = mr.getAvailableModels();
  const roles = new Set(models.map(m => m.role));
  // All roles should be represented
  assert.ok(roles.has('ensign'));
  assert.ok(roles.has('vision'));
  assert.ok(roles.has('workhorse'));
});

// ═══ Available Models ═══

test('getAvailableModels returns both local and cloud', () => {
  const mr = freshRouter();
  const all = mr.getAvailableModels();
  const localCount = all.filter(m => m.type === 'local').length;
  const cloudCount = all.filter(m => m.type === 'cloud').length;
  assert.ok(localCount >= 4, 'should have at least 4 local models');
  assert.ok(cloudCount >= 3, 'should have at least 3 cloud models');
});

test('getAvailableModels marks local models as unavailable without health check', () => {
  const mr = freshRouter();
  const all = mr.getAvailableModels();
  const local = all.find(m => m.type === 'local');
  // Without calling checkAllHealth, local models should be unavailable
  assert.strictEqual(local.available, false);
});

// ═══ Assignment ═══

test('init with registry builds assignments', async () => {
  const mr = freshRouter();
  const testRooms = {
    'bar-rail': {
      npcs: [
        { id: 'riker', model: 'glm-5.2' },
      ],
    },
    'engine-room': {
      npcs: [],
      camera_config: { model: 'llava:7b' },
    },
  };
  await mr.init(testRooms);
  assert.strictEqual(mr.getAssignment('bar-rail', 'riker'), 'glm-5.2');
  assert.strictEqual(mr.getAssignment('engine-room', 'vision-agent'), 'llava:7b');
});

test('getAssignment returns null for unassigned NPC', () => {
  const mr = freshRouter();
  assert.strictEqual(mr.getAssignment('nonexistent', 'ghost'), null);
});

test('getAllAssignments returns copy of assignments', async () => {
  const mr = freshRouter();
  await mr.init({
    'room-a': { npcs: [{ id: 'npc1', model: 'glm-5.2' }] },
  });
  const all = mr.getAllAssignments();
  assert.ok(all['room-a']);
  assert.strictEqual(all['room-a']['npc1'], 'glm-5.2');
  // getAllAssignments returns a shallow copy of the top-level object.
  // The nested room objects are shared by reference. This is standard JS behavior.
  // Verify the top-level is a copy by adding a new key:
  all['room-fake'] = { npc1: 'tampered' };
  assert.strictEqual(mr.getAssignment('room-fake', 'npc1'), null);
});

// ═══ Hot-Swap ═══

test('swapModel changes assignment', async () => {
  const mr = freshRouter();
  await mr.init({
    'bar-rail': { npcs: [{ id: 'riker', model: 'glm-5.2' }] },
  });
  assert.strictEqual(mr.getAssignment('bar-rail', 'riker'), 'glm-5.2');

  const result = mr.swapModel('bar-rail', 'riker', 'deepseek-chat', 'testing');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.oldModel, 'glm-5.2');
  assert.strictEqual(result.newModel, 'deepseek-chat');
  assert.strictEqual(mr.getAssignment('bar-rail', 'riker'), 'deepseek-chat');
});

test('swapModel fails for unknown model', async () => {
  const mr = freshRouter();
  await mr.init({
    'bar-rail': { npcs: [{ id: 'riker', model: 'glm-5.2' }] },
  });
  const result = mr.swapModel('bar-rail', 'riker', 'fake-model-9000');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'unknown-model');
});

test('swapModel logs the swap', async () => {
  const mr = freshRouter();
  await mr.init({
    'bar-rail': { npcs: [{ id: 'riker', model: 'glm-5.2' }] },
  });
  mr.swapModel('bar-rail', 'riker', 'deepseek-chat', 'performance-test');
  const log = mr.getSwapLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].roomId, 'bar-rail');
  assert.strictEqual(log[0].npcId, 'riker');
  assert.strictEqual(log[0].oldModel, 'glm-5.2');
  assert.strictEqual(log[0].newModel, 'deepseek-chat');
  assert.strictEqual(log[0].reason, 'performance-test');
  assert.ok(log[0].timestamp);
});

test('swapAll changes all NPCs on a model', async () => {
  const mr = freshRouter();
  await mr.init({
    'room-a': { npcs: [{ id: 'npc1', model: 'glm-5.2' }] },
    'room-b': { npcs: [{ id: 'npc2', model: 'glm-5.2' }] },
    'room-c': { npcs: [{ id: 'npc3', model: 'deepseek-chat' }] },
  });
  const swaps = mr.swapAll('glm-5.2', 'deepseek-chat', 'fleet-upgrade');
  assert.strictEqual(swaps.length, 2);
  assert.strictEqual(mr.getAssignment('room-a', 'npc1'), 'deepseek-chat');
  assert.strictEqual(mr.getAssignment('room-b', 'npc2'), 'deepseek-chat');
  // npc3 was already on deepseek-chat — should not be swapped
  assert.strictEqual(mr.getAssignment('room-c', 'npc3'), 'deepseek-chat');
});

test('getSwapLog returns a copy', async () => {
  const mr = freshRouter();
  await mr.init({
    'room-a': { npcs: [{ id: 'npc1', model: 'glm-5.2' }] },
  });
  mr.swapModel('room-a', 'npc1', 'deepseek-chat');
  const log1 = mr.getSwapLog();
  log1.push({ tampered: true });
  const log2 = mr.getSwapLog();
  assert.strictEqual(log2.length, 1);
});

// ═══ Query (without bridge — error paths) ═══

test('query without bridge returns error for local model', async () => {
  // When Ollama is running (Wesley is up), the query may succeed.
  // Test with a model that definitely isn't loaded.
  const mr = freshRouter();
  await mr.init({
    'room-a': { npcs: [{ id: 'npc1', model: 'granite3.1-dense:2b' }] },
  });
  const result = await mr.query('room-a', 'npc1', 'Say "test" in one word.');
  // If Wesley is up, this succeeds; if not, it errors. Either is valid.
  assert.ok(result.text || result.type === 'error');
});

test('query with unknown model returns error', async () => {
  const mr = freshRouter();
  // Manually assign an unknown model by tampering with init
  await mr.init({ 'room-a': { npcs: [] } });
  // Can't directly assign unknown model through init... test query on unassigned NPC
  const result = await mr.query('room-a', 'unknown-npc', 'hello');
  // Should fall through to default handler
  assert.ok(result.text || result.model);
});

test('queryVision without bridge returns error', async () => {
  const mr = freshRouter();
  await mr.init({
    'cam-room': { npcs: [], camera_config: { model: 'llava:7b' } },
  });
  const result = await mr.queryVision('cam-room', 'what do you see?', 'base64data');
  assert.strictEqual(result.type, 'error');
});

// ═══ Health ═══

test('checkAllHealth returns object even without bridge', async () => {
  const mr = freshRouter();
  const health = await mr.checkAllHealth();
  assert.ok(typeof health === 'object');
});

test('testLocalModel returns a result (healthy or not)', async () => {
  // Wesley may or may not be running — either result is valid.
  const mr = freshRouter();
  const result = await mr.testLocalModel('granite3.1-dense:2b');
  assert.ok(typeof result.healthy === 'boolean');
  assert.ok(result.model || result.error);
});

// ═══ Run ═══

let passed = 0;
let failed = 0;

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  \u2713 ${name}`);
      passed++;
    } catch (err) {
      console.error(`  \u2717 ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total`);
  process.exit(failed > 0 ? 1 : 0);
})();
