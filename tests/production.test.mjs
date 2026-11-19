import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('Serveur de production, HTTPS, fichiers privés et en-têtes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sprintly-production-'));
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist/index.html'), '<html>Fixture Sprintly</html>');
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, [resolve('dist-server/server/start.js')], {
    cwd: root, env: { ...process.env, APP_ORIGIN: 'https://sprintly.example.test', TRUST_PROXY: '1', PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Démarrage trop long')), 10000);
      child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
      child.once('exit', code => { clearTimeout(timer); reject(Error('Arrêt prématuré ' + code)); });
    });
    const request = (path, headers = {}, body) => new Promise((resolve, reject) => {
      const outgoing = httpRequest({ hostname: '127.0.0.1', port, path, method: body === undefined ? 'GET' : 'POST',
        headers: { host: 'sprintly.example.test', 'x-forwarded-proto': 'https', ...headers },
      }, response => {
        response.resume();
        response.on('end', () => resolve({ status: response.statusCode, headers: new Headers(Object.entries(response.headers).map(([key, value]) => [key, String(value)])) }));
      });
      outgoing.on('error', reject);
      outgoing.end(body);
    });
    const page = await request('/');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.match(page.headers.get('strict-transport-security'), /max-age/);
    assert.equal((await request('/', { 'x-forwarded-proto': 'http' })).status, 400);
    assert.equal((await request('/', { host: 'other.example.test' })).status, 400);
    assert.equal((await request('/.data/accounts.json')).status, 404);
    assert.equal((await request('/.env')).status, 404);
    assert.equal((await request('/server/authApi.ts')).status, 404);
    assert.equal((await request('/api/unknown')).status, 404);
    assert.equal((await request('/api/projects')).status, 401);
    const logout = await request('/api/auth/logout', { origin: 'https://sprintly.example.test', 'content-type': 'application/json' }, '{}');
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /Secure/);
  } finally {
    const ended = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await ended;
    await rm(root, { recursive: true, force: true });
  }
});
