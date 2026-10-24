import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError } from '../src/api.js';
import { speakEnglish } from '../src/speech.js';

test('speech uses the word as text and selects English over a Chinese default voice', () => {
  let spoken;
  const scope = {
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: { cancel() {}, getVoices: () => [{ lang: 'zh-CN' }, { lang: 'en-GB' }, { lang: 'en-US' }], speak: (value) => { spoken = value; } },
  };
  speakEnglish('apple', assert.fail, scope);
  assert.equal(spoken.text, 'apple'); assert.equal(spoken.voice.lang, 'en-US');
  speakEnglish({ type: 'click' }, assert.fail, scope);
  assert.equal(spoken.text, 'apple');
});

test('speech reports missing support and audible failures', () => {
  let message;
  speakEnglish('apple', (value) => { message = value; }, {});
  assert.match(message, /不支持/);
});

test('API timeout exits instead of hanging; cancellation stays distinguishable', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  await assert.rejects(api('/slow', { timeout: 10 }), (error) => error instanceof ApiError && error.status === 408);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(api('/cancel', { signal: controller.signal }), (error) => error.name === 'AbortError');
});

test('API preserves server messages and handles unexpected HTML', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: '请先输入访问密码' }, { status: 401 }));
  await assert.rejects(api('/private'), (error) => error.status === 401 && /访问密码/.test(error.message));
  t.mock.method(globalThis, 'fetch', async () => new Response('<html/>', { headers: { 'content-type': 'text/html' } }));
  await assert.rejects(api('/offline'), /服务暂时不可用/);
});
