/**
 * room-loader.test.js — Tests for the Living World Framework Room Loader
 *
 * Tests room normalization, warp networking, MUD projection, camera handling,
 * dynamic registration, and hotspot generation.
 */

const assert = require('assert');
const LivingWorld = require('../src/room-loader');

// ─── Test fixtures ───

const TEST_REGISTRY = {
  version: '1.0.0',
  rooms: {
    'bar-rail': {
      id: 'bar-rail',
      name: 'The Tap — Bar Rail',
      description: 'A warm bar with scarred wood.',
      type: 'social',
      exits: {
        'hs-door-aft': { target: 'aft-deck', label: '◆ AFT DECK ◆' },
      },
      warps: ['engine-room'],
      npcs: [
        { id: 'riker', name: 'Riker', model: 'glm-5.2', vibe: 'Laconic.' },
      ],
      objects: [
        { id: 'bar-counter', name: 'the bar counter', interactions: ['look', 'use'] },
        { id: 'bar-stool', name: 'a bar stool', interactions: ['look'] },
      ],
      ambient_audio: 'bar-rail-ambient',
      palette: 'warm',
      builtin: true,
    },
    'aft-deck': {
      id: 'aft-deck',
      name: 'Aft Deck',
      description: 'Open stern deck. Salt air.',
      type: 'vessel',
      exits: {
        'hs-door-bar': { target: 'bar-rail', label: '◆ THE TAP ◆' },
      },
      warps: [],
      npcs: [],
      objects: [
        { id: 'winch', name: 'the winch', interactions: ['look'] },
      ],
      builtin: true,
    },
    'engine-room': {
      id: 'engine-room',
      name: 'Engine Room',
      description: 'Hot. Loud. Orange.',
      type: 'engine',
      exits: {},
      warps: [],
      npcs: [],
      objects: [],
      camera_config: {
        source: 'engine-cam-1',
        model: 'llava:7b',
        room_type: 'engine',
        capabilities: ['thermal', 'smoke-detection'],
      },
      builtin: true,
    },
  },
  warp_network: {
    destinations: ['bar-rail', 'aft-deck', 'engine-room'],
  },
};

// ─── Tests ───

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ═══ Registry Loading ═══

test('initWithObject loads registry and populates rooms', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const rooms = LivingWorld.rooms;
  assert.strictEqual(Object.keys(rooms).length, 3);
  assert.ok(rooms['bar-rail']);
  assert.ok(rooms['aft-deck']);
  assert.ok(rooms['engine-room']);
});

test('initWithObject returns rooms object', () => {
  const result = LivingWorld.initWithObject(TEST_REGISTRY);
  assert.ok(result['bar-rail']);
  assert.strictEqual(result['bar-rail'].name, 'The Tap — Bar Rail');
});

// ═══ Room Normalization ═══

test('normalized room has all required fields', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const room = LivingWorld.rooms['bar-rail'];
  assert.strictEqual(room.id, 'bar-rail');
  assert.strictEqual(room.name, 'The Tap — Bar Rail');
  assert.strictEqual(room.type, 'social');
  // exits is an object (key→exit), warps is an array
  assert.ok(typeof room.exits === 'object');
  assert.ok(Array.isArray(room.warps));
  assert.ok(Array.isArray(room.npcs));
  assert.ok(Array.isArray(room.objects));
  assert.ok(room.scummHotspots);
  assert.ok(room.created_at);
});

test('missing fields get sensible defaults', () => {
  LivingWorld.initWithObject({
    rooms: {
      'empty-room': {
        name: 'Empty Room',
      },
    },
  });
  const room = LivingWorld.rooms['empty-room'];
  assert.strictEqual(room.description, '');
  assert.strictEqual(room.type, 'vessel');
  assert.deepStrictEqual(room.exits, {});
  assert.deepStrictEqual(room.warps, []);
  assert.deepStrictEqual(room.npcs, []);
  assert.deepStrictEqual(room.objects, []);
  assert.strictEqual(room.palette, 'warm');
  assert.strictEqual(room.builtin, true);
});

test('room id falls back to key if not in object', () => {
  LivingWorld.initWithObject({
    rooms: {
      'some-key': { name: 'Some Name' },
    },
  });
  assert.strictEqual(LivingWorld.rooms['some-key'].id, 'some-key');
});

// ═══ Warp Network ═══

test('warp network is populated from registry', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const warp = LivingWorld.warpNetwork;
  assert.ok(warp.includes('bar-rail'));
  assert.ok(warp.includes('aft-deck'));
  assert.ok(warp.includes('engine-room'));
});

test('warp destinations include names and types', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const dests = LivingWorld.getWarpDestinations();
  assert.strictEqual(dests.length, 3);
  assert.strictEqual(dests[0].name, 'The Tap — Bar Rail');
  assert.strictEqual(dests[0].type, 'social');
});

test('warp connections are bidirectional', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  // bar-rail warps to engine-room
  assert.ok(LivingWorld.rooms['bar-rail'].warps.includes('engine-room'));
  // engine-room should get a reverse warp to bar-rail
  assert.ok(LivingWorld.rooms['engine-room'].warps.includes('bar-rail'));
});

test('warp network defaults to all room keys when no network specified', () => {
  LivingWorld.initWithObject({
    rooms: {
      'room-a': { name: 'A' },
      'room-b': { name: 'B' },
    },
  });
  const warp = LivingWorld.warpNetwork;
  assert.ok(warp.includes('room-a'));
  assert.ok(warp.includes('room-b'));
});

// ═══ MUD Projection ═══

test('getMudRoom returns null for unknown room', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  assert.strictEqual(LivingWorld.getMudRoom('nonexistent'), null);
});

test('getMudRoom produces MUD-compatible structure', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const mud = LivingWorld.getMudRoom('bar-rail');
  assert.ok(mud);
  assert.strictEqual(mud.name, 'The Tap — Bar Rail');
  assert.ok(mud.description);
  assert.ok(mud.exits);
  assert.ok(Array.isArray(mud.objects));
});

test('MUD objects include NPCs', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const mud = LivingWorld.getMudRoom('bar-rail');
  const npc = mud.objects.find(o => o.id === 'riker');
  assert.ok(npc);
  assert.strictEqual(npc.isNpc, true);
  assert.strictEqual(npc.name, 'Riker');
});

test('MUD objects include takeable items', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const mud = LivingWorld.getMudRoom('aft-deck');
  const winch = mud.objects.find(o => o.id === 'winch');
  assert.ok(winch);
  assert.strictEqual(winch.takeable, false);
});

test('MUD room for camera room includes sensors', () => {
  // The getMudRoom function checks room.type === 'camera' for sensor generation
  // engine-room has type 'engine' but has camera_config — sensors won't be generated
  // Test with a room that has type 'camera' explicitly
  LivingWorld.initWithObject({
    rooms: {
      'test-cam': {
        id: 'test-cam',
        name: 'Test Camera',
        type: 'camera',
        camera_config: {
          source: 'cam-1',
          model: 'llava:7b',
          room_type: 'engine',
        },
      },
    },
  });
  const mud = LivingWorld.getMudRoom('test-cam');
  assert.ok(mud.sensors, 'sensors should exist for camera-type room');
  assert.strictEqual(mud.sensors['Camera Source'], 'cam-1');
});

// ═══ Camera System ═══

test('queryCamera rejects non-camera room', async () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const result = await LivingWorld.queryCamera('bar-rail');
  assert.ok(result.error);
});

test('queryCamera returns placeholder for camera room', async () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const result = await LivingWorld.queryCamera('engine-room');
  assert.strictEqual(result.room, 'engine-room');
  assert.ok(result.description);
  assert.strictEqual(result.model, 'llava:7b');
});

test('teachCameraRoom stores corrections', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const ok = LivingWorld.teachCameraRoom('engine-room', 'That is not smoke, it is steam.');
  assert.strictEqual(ok, true);
  const room = LivingWorld.rooms['engine-room'];
  assert.ok(room.camera_config.corrections);
  assert.strictEqual(room.camera_config.corrections.length, 1);
  assert.strictEqual(room.camera_config.corrections[0].text, 'That is not smoke, it is steam.');
});

test('teachCameraRoom fails for non-camera room', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const ok = LivingWorld.teachCameraRoom('bar-rail', 'test');
  assert.strictEqual(ok, false);
});

// ═══ Dynamic Room Registration ═══

test('registerRoom adds a new room', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const newRoom = LivingWorld.registerRoom({
    id: 'crow-room',
    name: 'The Crow\'s Nest',
    description: 'High above the deck.',
    type: 'vessel',
  });
  assert.strictEqual(newRoom.id, 'crow-room');
  assert.ok(LivingWorld.rooms['crow-room']);
  assert.ok(LivingWorld.warpNetwork.includes('crow-room'));
});

test('registerRoom throws without id', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  assert.throws(() => {
    LivingWorld.registerRoom({ name: 'No ID' });
  }, /must have an id/i);
});

test('registerRoomJSON parses JSON string', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const json = JSON.stringify({
    id: 'galley',
    name: 'The Galley',
    description: 'Small kitchen.',
  });
  const room = LivingWorld.registerRoomJSON(json);
  assert.strictEqual(room.id, 'galley');
  assert.strictEqual(room.name, 'The Galley');
});

test('registerRoom bidirectional warp connection', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  LivingWorld.registerRoom({
    id: 'new-room',
    name: 'New Room',
    warps: ['bar-rail'],
  });
  // new-room warps to bar-rail (set in definition)
  assert.ok(LivingWorld.rooms['new-room'].warps.includes('bar-rail'));
  // bar-rail should get reverse warp to new-room
  assert.ok(LivingWorld.rooms['bar-rail'].warps.includes('new-room'));
});

// ═══ Hotspot Generation ═══

test('hotspots are generated for objects', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const room = LivingWorld.rooms['bar-rail'];
  const objHotspot = room.scummHotspots.find(h => h.id === 'hs-obj-bar-counter');
  assert.ok(objHotspot);
  assert.strictEqual(objHotspot.name, 'the bar counter');
});

test('hotspots are generated for NPCs', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const room = LivingWorld.rooms['bar-rail'];
  const npcHotspot = room.scummHotspots.find(h => h.id === 'hs-npc-riker');
  assert.ok(npcHotspot);
  assert.strictEqual(npcHotspot.name, 'Riker');
});

test('hotspots are generated for exits', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const room = LivingWorld.rooms['bar-rail'];
  const exitHotspot = room.scummHotspots.find(h => h.id === 'hs-door-aft');
  assert.ok(exitHotspot);
  assert.ok(exitHotspot.name.includes('aft deck'));
});

test('exit positions cycle through predefined slots', () => {
  // Multiple exits should get different positions
  LivingWorld.initWithObject({
    rooms: {
      'hub': {
        name: 'Hub',
        exits: {
          'north': { target: 'room-n', label: 'N' },
          'south': { target: 'room-s', label: 'S' },
          'east': { target: 'room-e', label: 'E' },
          'west': { target: 'room-w', label: 'W' },
          'extra': { target: 'room-x', label: 'X' },
        },
      },
    },
  });
  const room = LivingWorld.rooms['hub'];
  const hs = room.scummHotspots.filter(h => h.id.startsWith('north') || h.id.startsWith('south') || h.id.startsWith('east') || h.id.startsWith('west') || h.id.startsWith('extra'));
  // Each should have a position
  hs.forEach(h => {
    assert.ok(h.x);
    assert.ok(h.y);
  });
});

// ═══ Warp To ═══

test('handleMudWarp returns room for valid destination', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  const room = LivingWorld.handleMudWarp('engine-room');
  assert.ok(room);
  assert.strictEqual(room.name, 'Engine Room');
});

test('handleMudWarp returns null for non-warp-room', () => {
  LivingWorld.initWithObject(TEST_REGISTRY);
  // Register a room that's not in the warp network
  LivingWorld.initWithObject({
    rooms: {
      'isolated': { name: 'Isolated' },
    },
  });
  // 'isolated' is in warp network (defaults to all keys) but let's test with truly unknown
  assert.strictEqual(LivingWorld.handleMudWarp('totally-unknown'), null);
});

// ═══ Event System ═══

test('onLoad callback fires on registry load', () => {
  let called = false;
  let eventType = null;
  LivingWorld.onLoad((type, data) => {
    called = true;
    eventType = type;
  });
  LivingWorld.initWithObject(TEST_REGISTRY);
  assert.strictEqual(called, true);
  assert.strictEqual(eventType, 'load');
});

// ═══ Run ═══

let passed = 0;
let failed = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total`);
process.exit(failed > 0 ? 1 : 0);
