import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/cloudflare.ts';
import { demoContent } from '../src/demoData.js';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  sqlite.exec(`INSERT INTO books (id,slug,title,description,difficulty,word_count,source_id) VALUES (1,'foundation','基础','基础',1,3,'test');
    INSERT INTO words (id,headword,normalized,source_meaning) VALUES (1,'apple','apple','苹果'),(2,'book','book','书'),(3,'cat','cat','猫');
    INSERT INTO book_words (book_id,word_id,position) VALUES (1,1,1),(1,2,2),(1,3,3);`);
  function prepare(sql) {
    let values = [];
    return {
      bind(...next) { values = next; return this; },
      async first(column) { const row = sqlite.prepare(sql).get(...values); return row ? column ? row[column] : row : null; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async run() { return sqlite.prepare(sql).run(...values); },
    };
  }
  const env = {
    APP_PASSWORD: 'test-password', SESSION_SECRET: 'test-session-secret-with-at-least-32-characters',
    DASHSCOPE_API_KEY: 'test-key', QWEN_MODEL: 'qwen3.8-flash',
    DASHSCOPE_BASE_URL: 'https://example.test/v1', DAILY_GOAL: '20',
    DB: { prepare, async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = await Promise.all(statements.map((s) => s.run())); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    } },
  };
  let cookie = '';
  async function request(path, body, headers = {}) {
    return worker.fetch(new Request(`https://english.test${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { cookie, 'content-type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
  }
  async function login() {
    const response = await request('/api/auth/login', { password: 'test-password' });
    assert.equal(response.status, 200);
    cookie = response.headers.get('set-cookie').split(';')[0];
  }
  return { sqlite, env, request, login };
}

test('auth denies unauthenticated, cross-origin, and tampered sessions; rate limits failures', async () => {
  const f = fixture();
  assert.equal((await f.request('/api/books')).status, 401);
  assert.equal((await f.request('/api/auth/login', { password: 'test-password' }, { origin: 'https://evil.test' })).status, 403);
  await f.login();
  assert.equal((await f.request('/api/books')).status, 200);
  assert.equal((await f.request('/api/books', undefined, { cookie: '__Host-xiaolin_session=invalid.token' })).status, 401);
  assert.equal((await f.request('/api/progress', { wordId: 1, status: 'mastered' }, { origin: 'https://evil.test' })).status, 403);
  for (let i = 0; i < 8; i++) assert.equal((await f.request('/api/auth/login', { password: 'wrong' })).status, 401);
  assert.equal((await f.request('/api/auth/login', { password: 'test-password' })).status, 429);
  f.sqlite.close();
});

test('status transitions preserve counts including explicitly unlearned words; next wraps and completes', async () => {
  const f = fixture(); await f.login();
  for (const [wordId, status] of [[1,'mastered'], [2,'learning'], [3,'unlearned']]) {
    assert.equal((await f.request('/api/progress', { wordId, status })).status, 200);
  }
  const dashboard = await (await f.request('/api/dashboard')).json();
  assert.deepEqual(dashboard.counts, { mastered: 1, learning: 1, unlearned: 1 });
  assert.equal(dashboard.today, 2);
  assert.equal((await (await f.request('/api/study/next?after=3')).json()).word.id, 3);
  await f.request('/api/progress', { wordId: 3, status: 'mastered' });
  assert.equal((await f.request('/api/study/next')).status, 404);
  assert.equal((await (await f.request('/api/study/next?id=1')).json()).word.status, 'mastered');
  assert.equal((await f.request('/api/progress', { wordId: 1.5, status: 'learning' })).status, 400);
  f.sqlite.close();
});

test('review pagination and English/Chinese searches return real matches and escape wildcards', async () => {
  const f = fixture(); await f.login();
  await f.request('/api/progress', { wordId: 1, status: 'learning' });
  await f.request('/api/progress', { wordId: 2, status: 'learning' });
  const review = await (await f.request('/api/review?limit=1&offset=1')).json();
  assert.equal(review.total, 2); assert.equal(review.words.length, 1); assert.equal(review.words[0].id, 2);
  for (const q of ['app', '苹果']) assert.equal((await (await f.request(`/api/search?q=${encodeURIComponent(q)}`)).json()).words[0].id, 1);
  for (const q of ['%', '_', '\\']) assert.equal((await (await f.request(`/api/search?q=${encodeURIComponent(q)}`)).json()).words.length, 0);
  assert.equal((await f.request('/api/review?limit=NaN&offset=-5')).status, 200);
  f.sqlite.close();
});

test('AI uses flash without thinking, caches valid output, rejects corrupt output, and handles upstream timeout', async (t) => {
  const f = fixture(); await f.login();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'qwen3.8-flash'); assert.equal(body.enable_thinking, false); assert.ok(options.signal);
    return Response.json({ choices: [{ message: { content: JSON.stringify(demoContent) } }] });
  });
  assert.equal((await f.request('/api/words/1/generate', {})).status, 200);
  assert.equal((await (await f.request('/api/words/1/generate', {})).json()).cached, true);
  assert.equal(calls, 1);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: JSON.stringify({ ...demoContent, examples: [null] }) } }] }));
  assert.equal((await f.request('/api/words/2/generate', {})).status, 502);
  assert.equal(f.sqlite.prepare('SELECT ai_content FROM words WHERE id=2').get().ai_content, null);
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Timeout', 'TimeoutError'); });
  assert.equal((await f.request('/api/words/2/generate', {})).status, 504);
  assert.equal((await f.request('/api/words/1/generate', { force: true })).status, 504);
  assert.equal((await f.request('/api/words/1/generate', 'invalid')).status, 400);
  f.sqlite.close();
});

test('request size limit applies even without Content-Length', async () => {
  const f = fixture();
  assert.equal((await f.request('/api/auth/login', { password: 'x'.repeat(33000) })).status, 400);
  f.sqlite.close();
});
