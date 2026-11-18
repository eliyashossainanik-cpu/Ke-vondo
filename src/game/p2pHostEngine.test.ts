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

  // Advance past role_reveal (2.8s)
  for (let i = 0; i < 60; i++) {
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
