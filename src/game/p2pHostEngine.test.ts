import test from 'node:test';
import assert from 'node:assert/strict';
import type { ServerMessage } from '../shared/types';
import {
  P2PHostRoomEngine,
  buildPeerIdForRoomCode,
  generateP2PRoomCode,
  normalizeRoomCode,
} from './p2pHostEngine';

test('P2P room code helpers normalize and build deterministic peer IDs', () => {
  const code = generateP2PRoomCode();
  assert.equal(code.length, 5);
  assert.equal(normalizeRoomCode('  a d7k-2  '), 'AD7K2');
  assert.equal(buildPeerIdForRoomCode('adda'), 'kebatpar-v1-ADDA');
});

test('P2P host room allows guest join by room code, bot fill, start match, and movement sync', () => {
  const clientInbox = new Map<string, ServerMessage[]>();
  const broadcasts: ServerMessage[] = [];

  const engine = new P2PHostRoomEngine('K7M4P', {
    sendToClient: (cid, msg) => {
      const arr = clientInbox.get(cid) ?? [];
      arr.push(msg);
      clientInbox.set(cid, arr);
    },
    broadcast: (msg) => {
      broadcasts.push(msg);
    },
  });

  // Host creates room
  assert.equal(engine.addClient('host_peer', 'Lal Mia', 'lal', true), true);
  // Guest joins with matching room code
  engine.handleMessage('guest_peer', {
    type: 'room:join',
    roomCode: 'k7m4p',
    name: 'Neel Babu',
    color: 'neel',
  });

  // Rejects mismatched room code
  engine.handleMessage('wrong_peer', {
    type: 'room:join',
    roomCode: 'ZZZZZ',
    name: 'Wrong',
    color: 'holud',
  });
  const wrongMsgs = clientInbox.get('wrong_peer') ?? [];
  assert.equal(wrongMsgs[0]?.type, 'room:error');

  // Cannot start with only 2 players
  engine.handleMessage('host_peer', { type: 'lobby:start' });
  const hostLast = clientInbox.get('host_peer')?.at(-1);
  assert.equal(hostLast?.type, 'room:error');

  // Add 1 bot and start
  engine.handleMessage('host_peer', { type: 'lobby:add_bot' });
  assert.equal(engine.getSnapshot().players.length, 3);
  engine.handleMessage('host_peer', { type: 'lobby:start' });
  assert.equal(engine.getSnapshot().phase, 'role_reveal');

  // Advance past role_reveal (8.0s)
  for (let i = 0; i < 170; i++) {
    engine.step(0.05);
  }
  assert.equal(engine.getSnapshot().phase, 'playing');

  // Guest moves and state updates
  const guestMsgs = clientInbox.get('guest_peer') ?? [];
  const joinedMsg = guestMsgs.find((m) => m.type === 'room:joined');
  assert.ok(joinedMsg && joinedMsg.type === 'room:joined');
  const guestId = joinedMsg.playerId;

  engine.handleMessage('guest_peer', {
    type: 'player:move',
    x: 2,
    z: -3,
    vx: 1,
    vz: 0,
    yaw: 0.5,
  });
  const movedGuest = engine.getSnapshot().players.find((p) => p.id === guestId);
  assert.ok(movedGuest);
  assert.ok(Math.abs(movedGuest.x - 2) < 0.01);
});

test('P2P multiplayer auto-assigns unique names, distinct colors, and random roles on join/start', () => {
  const engine = new P2PHostRoomEngine('M4M4A', {
    sendToClient: () => {},
    broadcast: () => {},
  });

  // Host + 2 guests all pass identical default name & color or blank names
  engine.addClient('h1', 'Lal Mia', 'lal', true);
  engine.handleMessage('g1', { type: 'room:join', roomCode: 'M4M4A', name: 'Lal Mia', color: 'lal' });
  engine.handleMessage('g2', { type: 'room:join', roomCode: 'M4M4A', name: '', color: 'lal' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });

  const players = engine.getSnapshot().players;
  assert.equal(players.length, 4);

  const uniqueNames = new Set(players.map((p) => p.name));
  const uniqueColors = new Set(players.map((p) => p.color));
  assert.equal(uniqueNames.size, 4, 'every player should have a unique auto-selected name');
  assert.equal(uniqueColors.size, 4, 'every player should have a unique auto-selected color');

  // Starting match auto-assigns at least 1 Batpar and Para-basi roles
  engine.handleMessage('h1', { type: 'lobby:start' });
  const started = engine.getSnapshot();
  assert.equal(started.phase, 'role_reveal');
  assert.equal(started.players.filter((p) => p.role === 'vondo').length, 1);
});

test('P2PHostRoomEngine promotes remaining human player when host leaves', () => {
  const engine = new P2PHostRoomEngine('H0ST1', {
    sendToClient: () => {},
    broadcast: () => {},
  });

  engine.addClient('h1', 'Host Dada', 'lal', true);
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('g1', { type: 'room:join', roomCode: 'H0ST1', name: 'Guest Mia', color: 'neel' });

  engine.removeClient('h1');
  assert.equal(engine.hasHumanClients(), true);
  const remaining = engine.getSnapshot().players;
  const newHost = remaining.find((p) => p.name === 'Guest Mia');
  const bot = remaining.find((p) => p.isBot);
  assert.equal(newHost?.isHost, true);
  assert.equal(bot?.isHost, false);
});

test('P2PHostRoomEngine extends voted Pukur ejection phase to 7.5s and marks victim dead as ghost', () => {
  const engine = new P2PHostRoomEngine('EJCT1', {
    sendToClient: () => {},
    broadcast: () => {},
  });

  engine.addClient('h1', 'Host Mia', 'lal', true);
  engine.addClient('g1', 'Neel Mia', 'neel', false);
  engine.addClient('g2', 'Shobuj Mia', 'shobuj', false);
  engine.addClient('g3', 'Holud Mia', 'holud', false);
  engine.addClient('g4', 'Beguni Apa', 'beguni', false);

  engine.handleMessage('h1', { type: 'lobby:start' });
  for (let i = 0; i < 170; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'playing');

  // Advance past initial emergencyCooldownRemaining (15s) before ringing Adda Bell
  for (let i = 0; i < 320; i++) engine.step(0.05);
  engine.handleMessage('h1', { type: 'player:move', x: 0, z: 0, vx: 0, vz: 0, yaw: 0 });
  engine.handleMessage('h1', { type: 'player:emergency_meeting' });
  assert.equal(engine.getSnapshot().phase, 'meeting');

  const players = engine.getSnapshot().players;
  const target = players.find((p) => p.id !== 'pl_host' && p.role === 'parabasi') ?? players[1];
  for (const cid of ['h1', 'g1', 'g2', 'g3', 'g4']) {
    engine.handleMessage(cid, { type: 'meeting:vote', targetId: target.id });
  }
  engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'vote_results');

  // Advance past 2.6s vote_results into ejecting
  for (let i = 0; i < 56; i++) engine.step(0.05);
  const ejectSnap = engine.getSnapshot();
  assert.equal(ejectSnap.phase, 'ejecting');
  assert.equal(ejectSnap.ejection?.reason, 'voted');
  assert.equal(ejectSnap.players.find((p) => p.id === target.id)?.alive, false);

  // At 4.5s into ejecting (still watching post-splash animation), phase must still be 'ejecting'
  for (let i = 0; i < 90; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'ejecting');

  // Advancing past 7.5s exits ejecting (back to playing or gameover)
  for (let i = 0; i < 70; i++) engine.step(0.05);
  assert.notEqual(engine.getSnapshot().phase, 'ejecting');
});
