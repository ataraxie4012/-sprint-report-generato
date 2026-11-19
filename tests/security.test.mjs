import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { scryptSync, randomBytes } from 'node:crypto';
import { createAuthHandler } from '../dist-server/server/authApi.js';
import { createMinutesHandler } from '../dist-server/server/minutesApi.js';
import { withAccountLock } from '../dist-server/server/accountLock.js';
import { securityStore } from '../dist-server/server/security.js';

const owner = 'manon.fargues@webwag.com';
const other = 'denisb@webwag.com';
const expiredEmail = 'mathieu.lauga@webwag.com';
const password = 'temporary-fixture-password';
const nativeFetch = globalThis.fetch;

test('Sécurité des API sur données fictives', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sprintly-security-'));
  await mkdir(join(root, '.data'));
  const account = (temporary = true) => {
    const salt = randomBytes(16).toString('hex');
    return { salt, hash: scryptSync(password, salt, 64).toString('hex'), mustChangePassword: temporary };
  };
  await writeFile(join(root, '.data/accounts.json'), JSON.stringify({
    [owner]: account(), [other]: account(false),
    [expiredEmail]: { ...account(), temporaryExpiresAt: Date.now() - 1 },
  }), { mode: 0o600 });
  let aiCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url) !== 'https://api.openai.com/v1/responses') return nativeFetch(url, options);
    aiCalls++;
    const fields = ['Synthèse', 'Participants', 'Sujets abordés', 'Décisions prises', 'Actions et responsables', 'Points à confirmer'];
    return new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(Object.fromEntries(fields.map(key => [key, 'Test']))) }] }] }), { status: 200 });
  };
  const servers = [];
  const start = async () => {
    const auth = createAuthHandler(root);
    const minutes = createMinutesHandler('fake-test-key', 'test-model');
    const server = createServer((req, res) => { void auth(req, res, () => { void minutes(req, res, () => { res.writeHead(404); res.end(); }); }); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    servers.push(server);
    const origin = 'http://127.0.0.1:' + server.address().port;
    return async (path, { body, cookie = '', headers = {} } = {}) => {
      const response = await nativeFetch(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { origin, 'content-type': 'application/json', cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json(), headers: response.headers, cookie: response.headers.get('set-cookie')?.split(';')[0] };
    };
  };
  try {
    const request = await start();
    let cookie, secondCookie;
    await t.test('Accès anonyme refusé et origine obligatoire', async () => {
      assert.equal((await request('/api/projects')).status, 401);
      assert.equal((await request('/api/auth/login', { body: {}, headers: { origin: 'https://evil.example' } })).status, 403);
      assert.equal((await request('/api/auth/login', { body: {}, headers: { 'content-type': 'text/plain' } })).status, 415);
    });
    await t.test('Expiration et changement obligatoire du temporaire', async () => {
      assert.equal((await request('/api/auth/login', { body: { email: expiredEmail, password } })).status, 401);
      const response = await request('/api/auth/login', { body: { email: owner, password } });
      assert.equal(response.status, 200);
      assert.equal(response.body.user.mustChangePassword, true);
      assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
      cookie = response.cookie;
      assert.equal((await request('/api/projects', { cookie })).status, 403);
      assert.equal((await request('/api/auth/password', { cookie, body: { currentPassword: password, password } })).status, 400);
      assert.equal((await request('/api/auth/password', { cookie, body: { currentPassword: password, password: 'personal-fixture-password' } })).status, 200);
      assert.equal((await request('/api/projects', { cookie })).status, 200);
      assert.equal((await request('/api/auth/login', { body: { email: owner, password } })).status, 401);
      const records = JSON.parse(await readFile(join(root, '.data/accounts.json'), 'utf8'));
      assert.equal(records[owner].algorithm, 'scrypt-v2');
      assert.equal(records[owner].mustChangePassword, false);
    });
    const request2 = await start();
    await t.test('Sessions et limite de connexion partagées entre instances', async () => {
      assert.equal((await request2('/api/auth/session', { cookie })).body.user.email, owner);
      const burst = await Promise.all(Array.from({ length: 12 }, () => request('/api/auth/login', { body: { email: 'unknown@webwag.com', password: 'wrong' } })));
      assert.ok(burst.every(result => [401, 429].includes(result.status)));
      assert.ok(burst.filter(result => result.status === 401).length <= 10);
      assert.ok(burst.filter(result => result.status === 429).length >= 2);
      const counters = await Promise.allSettled(Array.from({ length: 12 }, () => securityStore(root).rate([{ key: 'atomic-probe', max: 10, duration: 60000 }])));
      assert.equal(counters.filter(result => result.status === 'fulfilled').length, 10);
      assert.equal(counters.filter(result => result.status === 'rejected' && result.reason.status === 429).length, 2);
      assert.equal((await request2('/api/auth/login', { body: { email: 'unknown@webwag.com', password: 'wrong' } })).status, 429);
      secondCookie = (await request2('/api/auth/login', { body: { email: other, password } })).cookie;
    });
    await t.test('Créations concurrentes conservées et suppression réservée au créateur', async () => {
      const results = await Promise.all([
        request('/api/projects', { cookie, body: { name: 'Projet A' } }),
        request2('/api/projects', { cookie: secondCookie, body: { name: 'Projet B' } }),
      ]);
      assert.deepEqual(results.map(result => result.status), [200, 200]);
      assert.equal((await request('/api/projects', { cookie })).body.projects.length, 2);
      const id = results[0].body.project.id;
      assert.equal((await request('/api/projects/' + id + '/documents', { cookie: secondCookie })).status, 403);
      assert.equal((await request('/api/projects/' + id + '/delete', { cookie: secondCookie, body: {} })).status, 403);
      assert.equal((await request('/api/projects/' + id + '/delete', { cookie, body: {} })).status, 200);
    });
    await t.test('Sprints isolés par utilisateur, conflits et entrées invalides refusés', async () => {
      const snapshot = { data: { sprint: { name: 'Privé' } }, history: [], revision: 0 };
      assert.equal((await request('/api/sprints', { cookie, body: snapshot })).status, 200);
      assert.equal((await request('/api/sprints', { cookie: secondCookie })).body.data.sprint, undefined);
      assert.equal((await request('/api/sprints', { cookie, body: snapshot })).status, 409);
      assert.equal((await request('/api/sprints', { cookie, body: { ...snapshot, data: { sprint: { plannedVelocity: '<script>' } }, revision: 1 } })).status, 400);
    });
    await t.test('IA protégée contre origine et type invalides, quota utilisateur effectif', async () => {
      assert.equal((await request('/api/generate-minutes', { cookie, body: { notes: 'test' }, headers: { origin: 'https://evil.example' } })).status, 403);
      assert.equal((await request('/api/generate-minutes', { cookie, body: { notes: 'test' }, headers: { 'content-type': 'text/plain' } })).status, 415);
      assert.equal(aiCalls, 0);
      for (let i = 0; i < 20; i++) assert.equal((await request('/api/generate-minutes', { cookie, body: { notes: 'test' } })).status, 200);
      assert.equal((await request2('/api/generate-minutes', { cookie, body: { notes: 'test' } })).status, 429);
      assert.equal(aiCalls, 20);
    });
    await t.test('Limite de changement du mot de passe et révocation', async () => {
      for (let i = 0; i < 10; i++) assert.equal((await request('/api/auth/password', { cookie: secondCookie, body: { currentPassword: 'wrong', password: 'another-fixture-password' } })).status, 403);
      assert.equal((await request2('/api/auth/password', { cookie: secondCookie, body: { currentPassword: 'wrong', password: 'another-fixture-password' } })).status, 429);
      assert.equal((await request('/api/auth/logout', { cookie, body: {} })).status, 200);
      assert.equal((await request2('/api/projects', { cookie })).status, 401);
    });
    await t.test('Récupération du verrou abandonné et limite globale de concurrence', async () => {
      const lock = join(root, '.data/accounts.lock');
      await mkdir(lock);
      const old = new Date(Date.now() - 60000);
      await utimes(lock, old, old);
      let ran = false;
      await withAccountLock(root, () => { ran = true; });
      assert.equal(ran, true);
      const store = securityStore(root);
      const release = await store.lease('test-limit', 1);
      await assert.rejects(() => securityStore(root).lease('test-limit', 1), error => error.status === 429);
      await release();
      await (await store.lease('test-limit', 1))();
    });
  } finally {
    globalThis.fetch = nativeFetch;
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    await rm(root, { recursive: true, force: true });
  }
});
