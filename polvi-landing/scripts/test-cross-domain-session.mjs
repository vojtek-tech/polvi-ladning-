/**
 * Tests for src/lib/crossDomainSession.ts — the cookie reader/writer.
 *
 * Runs under plain `node --test`, with document/window stubbed. No test runner
 * dependency, and no browser needed: the module only touches document.cookie and
 * window.location.hostname.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Compile the TS module to a temp ESM file so the test exercises the real source.
const outfile = resolve(mkdtempSync(resolve(tmpdir(), 'polvi-cds-')), 'crossDomainSession.mjs');
await esbuild.build({
  entryPoints: [resolve(ROOT, 'src/lib/crossDomainSession.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2019',
  logLevel: 'warning',
});

const { readCrossDomainSession, writeCrossDomainSession, canUseCrossDomainCookie, SESSION_COOKIE_NAME } =
  await import(outfile);

const ACCESS = 'access-token-that-is-long-enough';
const REFRESH = 'refresh-token-that-is-long-enough';

/** Minimal document.cookie stub: reads back a jar, records raw writes. */
function stubBrowser({ hostname = 'polvi.ai', jar = {} } = {}) {
  const writes = [];
  globalThis.window = { location: { hostname } };
  globalThis.document = {
    get cookie() {
      return Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    },
    set cookie(value) {
      writes.push(value);
      const [pair] = value.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      if (/Max-Age=0(?:;|$)/.test(value)) delete jar[name];
      else jar[name] = pair.slice(eq + 1).trim();
    },
  };
  return { writes, jar };
}

function encode(value) {
  return encodeURIComponent(JSON.stringify(value));
}

test('reads a well-formed cookie', () => {
  stubBrowser({ jar: { [SESSION_COOKIE_NAME]: encode({ access_token: ACCESS, refresh_token: REFRESH }) } });
  assert.deepEqual(readCrossDomainSession(), { access_token: ACCESS, refresh_token: REFRESH });
});

test('returns null when the cookie is absent', () => {
  stubBrowser({ jar: { other: 'x' } });
  assert.equal(readCrossDomainSession(), null);
});

test('finds the cookie among others, and tolerates "=" in the value', () => {
  const value = encode({ access_token: `${ACCESS}==`, refresh_token: REFRESH });
  stubBrowser({ jar: { first: 'a', [SESSION_COOKIE_NAME]: value, last: 'b=c' } });
  assert.deepEqual(readCrossDomainSession(), { access_token: `${ACCESS}==`, refresh_token: REFRESH });
});

test('returns null for malformed JSON rather than throwing', () => {
  stubBrowser({ jar: { [SESSION_COOKIE_NAME]: encodeURIComponent('{"access_token":') } });
  assert.equal(readCrossDomainSession(), null);
});

test('rejects tokens of 10 chars or fewer', () => {
  stubBrowser({ jar: { [SESSION_COOKIE_NAME]: encode({ access_token: 'abc', refresh_token: REFRESH }) } });
  assert.equal(readCrossDomainSession(), null);

  stubBrowser({ jar: { [SESSION_COOKIE_NAME]: encode({ access_token: ACCESS, refresh_token: '0123456789' }) } });
  assert.equal(readCrossDomainSession(), null);
});

test('rejects non-string and missing tokens', () => {
  for (const payload of [
    { access_token: 12345678901234, refresh_token: REFRESH },
    { access_token: ACCESS },
    { access_token: null, refresh_token: REFRESH },
    'not-an-object',
    null,
  ]) {
    stubBrowser({ jar: { [SESSION_COOKIE_NAME]: encode(payload) } });
    assert.equal(readCrossDomainSession(), null, `should reject ${JSON.stringify(payload)}`);
  }
});

test('writes the cookie with the shared-domain attributes', () => {
  const { writes } = stubBrowser({ hostname: 'polvi.ai' });
  assert.equal(writeCrossDomainSession({ access_token: ACCESS, refresh_token: REFRESH }), true);
  assert.equal(writes.length, 1);
  const written = writes[0];
  assert.match(written, /^polvi-session=/);
  assert.match(written, /Domain=\.polvi\.ai/);
  assert.match(written, /Path=\//);
  assert.match(written, /Max-Age=604800/);
  assert.match(written, /SameSite=Lax/);
  assert.match(written, /Secure/);
  assert.doesNotMatch(written, /HttpOnly/i);
});

test('round-trips through its own reader', () => {
  stubBrowser({ hostname: 'polvi.ai' });
  writeCrossDomainSession({ access_token: ACCESS, refresh_token: REFRESH });
  assert.deepEqual(readCrossDomainSession(), { access_token: ACCESS, refresh_token: REFRESH });
});

test('persists only the two tokens, dropping any extra fields', () => {
  const { jar } = stubBrowser({ hostname: 'polvi.ai' });
  writeCrossDomainSession({ access_token: ACCESS, refresh_token: REFRESH, user: { id: 'x' } });
  assert.deepEqual(Object.keys(JSON.parse(decodeURIComponent(jar[SESSION_COOKIE_NAME]))), [
    'access_token',
    'refresh_token',
  ]);
});

test('clears the cookie when passed null', () => {
  const { writes, jar } = stubBrowser({ hostname: 'polvi.ai' });
  writeCrossDomainSession({ access_token: ACCESS, refresh_token: REFRESH });
  assert.equal(writeCrossDomainSession(null), true);
  assert.match(writes.at(-1), /Max-Age=0/);
  assert.match(writes.at(-1), /Domain=\.polvi\.ai/);
  assert.equal(SESSION_COOKIE_NAME in jar, false);
  assert.equal(readCrossDomainSession(), null);
});

test('writes from any polvi.ai subdomain', () => {
  for (const hostname of ['polvi.ai', 'www.polvi.ai', 'app.polvi.ai', 'deep.nested.polvi.ai']) {
    const { writes } = stubBrowser({ hostname });
    assert.equal(canUseCrossDomainCookie(), true, hostname);
    assert.equal(writeCrossDomainSession({ access_token: ACCESS, refresh_token: REFRESH }), true, hostname);
    assert.equal(writes.length, 1, hostname);
  }
});

test('never writes from a non-polvi.ai host', () => {
  for (const hostname of ['localhost', 'polvi.ai.evil.com', 'notpolvi.ai', 'example.com', '127.0.0.1']) {
    const { writes } = stubBrowser({ hostname });
    assert.equal(canUseCrossDomainCookie(), false, hostname);
    assert.equal(writeCrossDomainSession({ access_token: ACCESS, refresh_token: REFRESH }), false, hostname);
    assert.equal(writeCrossDomainSession(null), false, hostname);
    assert.equal(writes.length, 0, `${hostname} must not touch document.cookie`);
  }
});

test('refuses to overwrite a good cookie with invalid tokens', () => {
  const { writes, jar } = stubBrowser({ hostname: 'polvi.ai' });
  writeCrossDomainSession({ access_token: ACCESS, refresh_token: REFRESH });
  assert.equal(writeCrossDomainSession({ access_token: 'short', refresh_token: REFRESH }), false);
  assert.equal(writes.length, 1);
  assert.deepEqual(readCrossDomainSession(), { access_token: ACCESS, refresh_token: REFRESH });
  assert.ok(SESSION_COOKIE_NAME in jar);
});
