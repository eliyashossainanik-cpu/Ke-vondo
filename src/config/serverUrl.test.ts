import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveServerConfig } from './serverUrl';

test('defaults to same-origin ws and relative API paths when VITE_SERVER_URL is empty', () => {
  const httpsCfg = resolveServerConfig('', { protocol: 'https:', host: 'ke-batpar.pages.dev' });
  assert.equal(httpsCfg.apiBaseUrl, '');
  assert.equal(httpsCfg.wsUrl, 'wss://ke-batpar.pages.dev/ws');

  const httpCfg = resolveServerConfig(undefined, { protocol: 'http:', host: 'localhost:3000' });
  assert.equal(httpCfg.apiBaseUrl, '');
  assert.equal(httpCfg.wsUrl, 'ws://localhost:3000/ws');
});

test('converts external HTTPS backend URL (with trailing slash) to wss://.../ws for Cloudflare Pages splits', () => {
  const cfg = resolveServerConfig('https://ke-batpar-server.onrender.com///', {
    protocol: 'https:',
    host: 'ke-batpar.pages.dev',
  });
  assert.equal(cfg.apiBaseUrl, 'https://ke-batpar-server.onrender.com');
  assert.equal(cfg.wsUrl, 'wss://ke-batpar-server.onrender.com/ws');
});

test('supports bare hostname and http local dev backend URLs', () => {
  const bare = resolveServerConfig('game-api.example.workers.dev');
  assert.equal(bare.apiBaseUrl, 'https://game-api.example.workers.dev');
  assert.equal(bare.wsUrl, 'wss://game-api.example.workers.dev/ws');

  const local = resolveServerConfig('http://192.168.1.25:3000/');
  assert.equal(local.apiBaseUrl, 'http://192.168.1.25:3000');
  assert.equal(local.wsUrl, 'ws://192.168.1.25:3000/ws');
});
