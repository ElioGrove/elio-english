const SESSION_COOKIE = "__Host-xiaolin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin",
} as const;

type StudyStatus = "mastered" | "learning" | "unlearned";

type BookStatsRow = {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: number;
  word_count: number;
  mastered_count: number;
  learning_count: number;
};

type WordRow = {
  id: number;
  headword: string;
  source_phonetic: string | null;
  source_pos: string | null;
  source_meaning: string | null;
  ai_content: string | null;
  ai_model: string | null;
  generated_at: string | null;
  status: StudyStatus;
  position: number;
  book_slug: string;
  book_title: string;
  word_count: number;
};

type ReviewRow = {
  id: number;
  headword: string;
  source_phonetic: string | null;
  source_pos: string | null;
  source_meaning: string | null;
  last_studied_at: string;
  review_count: number;
  book_slug: string;
};

type AuthAttemptRow = {
  failed_count: number;
  window_started_at: number;
  blocked_until: number;
};

type QwenResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...init.headers },
  });
}

function apiError(message: string, status = 400): Response {
  return json({ error: message }, { status });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStatus(value: unknown): StudyStatus | null {
  return value === "mastered" || value === "learning" || value === "unlearned" ? value : null;
}

async function readBoundedJson(stream: ReadableStream<Uint8Array> | null, maximum: number): Promise<unknown> {
  if (!stream) throw new Error("invalid_json");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error("request_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const value = await readBoundedJson(request.body, 32_768);
  if (!isObject(value)) throw new Error("invalid_json");
  return value;
}

function positiveInteger(value: string | null, fallback = 0): number {
  if (value === null) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const chunk of (request.headers.get("cookie") || "").split(";")) {
    const separator = chunk.indexOf("=");
    if (separator < 1) continue;
    cookies.set(chunk.slice(0, separator).trim(), chunk.slice(separator + 1).trim());
  }
  return cookies;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSession(secret: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ sub: "owner", exp: expiresAt, nonce })));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await importHmacKey(secret), new TextEncoder().encode(payload)));
  return `${payload}.${bytesToBase64Url(signature)}`;
}

async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await importHmacKey(secret),
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload),
    );
    if (!valid) return false;
    const decoded: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    return isObject(decoded)
      && decoded.sub === "owner"
      && typeof decoded.exp === "number"
      && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function constantTimeStringEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

async function clientKey(request: Request): Promise<string> {
  const address = request.headers.get("cf-connecting-ip") || "local";
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address)));
  return bytesToBase64Url(hash);
}

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function authSecretsConfigured(env: Cloudflare.Env): boolean {
  return typeof env.APP_PASSWORD === "string"
    && env.APP_PASSWORD.length > 0
    && typeof env.SESSION_SECRET === "string"
    && env.SESSION_SECRET.length >= 32;
}

function qwenSecretConfigured(env: Cloudflare.Env): boolean {
  return typeof env.DASHSCOPE_API_KEY === "string" && env.DASHSCOPE_API_KEY.length > 0;
}

async function handleLogin(request: Request, env: Cloudflare.Env): Promise<Response> {
  if (!checkOrigin(request)) return apiError("请求来源无效", 403);
  const key = await clientKey(request);
  const now = Math.floor(Date.now() / 1000);
  const attempt = await env.DB.prepare(
    "SELECT failed_count, window_started_at, blocked_until FROM auth_attempts WHERE client_key = ?",
  ).bind(key).first<AuthAttemptRow>();

  if (attempt && attempt.blocked_until > now) {
    return json({ error: "尝试次数过多，请稍后再试", retryAfter: attempt.blocked_until - now }, {
      status: 429,
      headers: { "retry-after": String(attempt.blocked_until - now) },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(request);
  } catch {
    return apiError("登录信息无效");
  }
  const password = typeof body.password === "string" ? body.password : "";
  const matches = await constantTimeStringEqual(password, env.APP_PASSWORD);

  if (!matches) {
    const resetWindow = !attempt || now - attempt.window_started_at > 900;
    const failedCount = resetWindow ? 1 : attempt.failed_count + 1;
    const blockedUntil = failedCount >= 8 ? now + 900 : 0;
    await env.DB.prepare(
      `INSERT INTO auth_attempts(client_key, failed_count, window_started_at, blocked_until)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(client_key) DO UPDATE SET
         failed_count = excluded.failed_count,
         window_started_at = excluded.window_started_at,
         blocked_until = excluded.blocked_until`,
    ).bind(key, failedCount, resetWindow ? now : attempt?.window_started_at ?? now, blockedUntil).run();
    return apiError("密码不正确", 401);
  }

  await env.DB.prepare("DELETE FROM auth_attempts WHERE client_key = ?").bind(key).run();
  const token = await createSession(env.SESSION_SECRET);
  return json({ authenticated: true }, {
    headers: {
      "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
    },
  });
}

function logoutResponse(request: Request): Response {
  if (!checkOrigin(request)) return apiError("请求来源无效", 403);
  return json({ authenticated: false }, {
    headers: {
      "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    },
  });
}

async function getBooks(env: Cloudflare.Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT b.id, b.slug, b.title, b.description, b.difficulty, b.word_count,
       COALESCE(SUM(CASE WHEN p.status = 'mastered' THEN 1 ELSE 0 END), 0) AS mastered_count,
       COALESCE(SUM(CASE WHEN p.status = 'learning' THEN 1 ELSE 0 END), 0) AS learning_count
     FROM books b
     LEFT JOIN book_words bw ON bw.book_id = b.id
     LEFT JOIN progress p ON p.word_id = bw.word_id
     GROUP BY b.id
     ORDER BY b.difficulty`,
  ).all<BookStatsRow>();
  return json({ books: result.results });
}

function parseAiContent(content: string | null): unknown {
  if (!content) return null;
  try {
    return validateAiContent(JSON.parse(content) as unknown);
  } catch {
    return null;
  }
}

function serializeWord(row: WordRow): Record<string, unknown> {
  return {
    id: row.id,
    headword: row.headword,
    phonetic: row.source_phonetic,
    partOfSpeech: row.source_pos,
    meaning: row.source_meaning,
    status: row.status,
    position: row.position,
    book: { slug: row.book_slug, title: row.book_title, wordCount: row.word_count },
    aiContent: parseAiContent(row.ai_content),
    aiModel: row.ai_model,
    generatedAt: row.generated_at,
  };
}

async function getStudyWord(url: URL, env: Cloudflare.Env): Promise<Response> {
  const bookSlug = (url.searchParams.get("book") || "foundation").slice(0, 64);
  const after = positiveInteger(url.searchParams.get("after"));
  const requestedId = positiveInteger(url.searchParams.get("id"));
  let row: WordRow | null = null;

  if (requestedId > 0) {
    row = await env.DB.prepare(
      `SELECT w.id, w.headword, w.source_phonetic, w.source_pos, w.source_meaning,
         w.ai_content, w.ai_model, w.generated_at,
         COALESCE(p.status, 'unlearned') AS status, bw.position,
         b.slug AS book_slug, b.title AS book_title, b.word_count
       FROM words w
       JOIN book_words bw ON bw.word_id = w.id
       JOIN books b ON b.id = bw.book_id
       LEFT JOIN progress p ON p.word_id = w.id
       WHERE w.id = ? AND b.slug = ?
       LIMIT 1`,
    ).bind(requestedId, bookSlug).first<WordRow>();
  } else {
    let afterPosition = 0;
    if (after > 0) {
      afterPosition = await env.DB.prepare(
        `SELECT bw.position FROM book_words bw JOIN books b ON b.id = bw.book_id
         WHERE bw.word_id = ? AND b.slug = ? LIMIT 1`,
      ).bind(after, bookSlug).first<number>("position") ?? 0;
    }
    row = await env.DB.prepare(
      `SELECT w.id, w.headword, w.source_phonetic, w.source_pos, w.source_meaning,
         w.ai_content, w.ai_model, w.generated_at,
         COALESCE(p.status, 'unlearned') AS status, bw.position,
         b.slug AS book_slug, b.title AS book_title, b.word_count
       FROM book_words bw
       JOIN books b ON b.id = bw.book_id
       JOIN words w ON w.id = bw.word_id
       LEFT JOIN progress p ON p.word_id = w.id
       WHERE b.slug = ? AND bw.position > ? AND COALESCE(p.status, 'unlearned') = 'unlearned'
       ORDER BY bw.position
       LIMIT 1`,
    ).bind(bookSlug, afterPosition).first<WordRow>();

    if (!row && afterPosition > 0) {
      row = await env.DB.prepare(
        `SELECT w.id, w.headword, w.source_phonetic, w.source_pos, w.source_meaning,
           w.ai_content, w.ai_model, w.generated_at,
           COALESCE(p.status, 'unlearned') AS status, bw.position,
           b.slug AS book_slug, b.title AS book_title, b.word_count
         FROM book_words bw
         JOIN books b ON b.id = bw.book_id
         JOIN words w ON w.id = bw.word_id
         LEFT JOIN progress p ON p.word_id = w.id
         WHERE b.slug = ? AND COALESCE(p.status, 'unlearned') = 'unlearned'
         ORDER BY bw.position
         LIMIT 1`,
      ).bind(bookSlug).first<WordRow>();
    }
  }

  if (!row) return apiError(requestedId > 0 ? "当前词书中没有这个单词" : "这本词书暂无未学习单词", 404);
  return json({ word: serializeWord(row) });
}

async function updateProgress(request: Request, env: Cloudflare.Env): Promise<Response> {
  if (!checkOrigin(request)) return apiError("请求来源无效", 403);
  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(request);
  } catch {
    return apiError("进度数据无效");
  }
  const wordId = typeof body.wordId === "number" && Number.isSafeInteger(body.wordId) ? body.wordId : 0;
  const status = parseStatus(body.status);
  if (wordId < 1 || !status) return apiError("进度数据无效");

  const exists = await env.DB.prepare("SELECT id FROM words WHERE id = ?").bind(wordId).first<number>("id");
  if (!exists) return apiError("单词不存在", 404);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO progress(word_id, status, first_seen_at, last_studied_at, review_count)
       VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
       ON CONFLICT(word_id) DO UPDATE SET
         status = excluded.status,
         first_seen_at = COALESCE(progress.first_seen_at, CURRENT_TIMESTAMP),
         last_studied_at = CURRENT_TIMESTAMP,
         review_count = progress.review_count + 1`,
    ).bind(wordId, status),
    env.DB.prepare("INSERT INTO study_events(word_id, status) VALUES (?, ?)").bind(wordId, status),
  ]);
  return json({ ok: true, wordId, status });
}

async function getReviewQueue(env: Cloudflare.Env, limit: number, offset: number): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT w.id, w.headword, w.source_phonetic, w.source_pos, w.source_meaning,
       p.last_studied_at, p.review_count,
       (SELECT b.slug FROM book_words bw JOIN books b ON b.id = bw.book_id
        WHERE bw.word_id = w.id ORDER BY b.difficulty LIMIT 1) AS book_slug
     FROM progress p
     JOIN words w ON w.id = p.word_id
     WHERE p.status = 'learning'
     ORDER BY p.last_studied_at ASC, w.id ASC
     LIMIT ? OFFSET ?`,
  ).bind(Math.min(Math.max(limit, 1), 50), offset).all<ReviewRow>();
  const total = await env.DB.prepare("SELECT COUNT(*) AS count FROM progress WHERE status = 'learning'").first<number>("count") ?? 0;
  return json({ words: result.results, total });
}

async function getDashboard(env: Cloudflare.Env): Promise<Response> {
  const counts = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END), 0) AS mastered,
       COALESCE(SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END), 0) AS learning,
       (SELECT COUNT(*) FROM words) - COALESCE(SUM(CASE WHEN status IN ('mastered', 'learning') THEN 1 ELSE 0 END), 0) AS unlearned
     FROM progress`,
  ).first<{ mastered: number; learning: number; unlearned: number }>();
  const today = await env.DB.prepare(
    "SELECT COUNT(DISTINCT word_id) AS count FROM study_events WHERE status != 'unlearned' AND studied_at >= datetime(date('now', '+8 hours'), '-8 hours')",
  ).first<number>("count") ?? 0;
  return json({
    counts: counts ?? { mastered: 0, learning: 0, unlearned: 0 },
    today,
    dailyGoal: Math.min(1000, Math.max(1, positiveInteger(env.DAILY_GOAL, 20))),
  });
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function searchWords(url: URL, env: Cloudflare.Env): Promise<Response> {
  const query = (url.searchParams.get("q") || "").trim().toLocaleLowerCase("en-US").slice(0, 64);
  if (query.length < 1) return json({ words: [] });
  const result = await env.DB.prepare(
    `SELECT w.id, w.headword, w.source_phonetic, w.source_pos, w.source_meaning,
       COALESCE(p.status, 'unlearned') AS status,
       (SELECT b.slug FROM book_words bw JOIN books b ON b.id = bw.book_id
        WHERE bw.word_id = w.id ORDER BY b.difficulty LIMIT 1) AS book_slug
     FROM words w
     LEFT JOIN progress p ON p.word_id = w.id
     WHERE (w.normalized LIKE ? ESCAPE '\\' OR w.source_meaning LIKE ? ESCAPE '\\')
     ORDER BY CASE WHEN w.normalized = ? THEN 0 ELSE 1 END, length(w.normalized), w.normalized
     LIMIT 12`,
  ).bind(`${escapeLike(query)}%`, `%${escapeLike(query)}%`, query).all<{
    id: number;
    headword: string;
    source_phonetic: string | null;
    source_pos: string | null;
    source_meaning: string | null;
    status: StudyStatus;
    book_slug: string;
  }>();
  return json({ words: result.results });
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateAiContent(value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new Error("ai_invalid_object");
  const requiredStrings = ["phonetic", "partOfSpeech", "coreMeaning"];
  for (const key of requiredStrings) if (!isString(value[key])) throw new Error(`ai_missing_${key}`);
  const requiredArrays = ["scenarios", "examples", "bestPractices", "wordFamily", "collocations", "memoryTips"];
  for (const key of requiredArrays) if (!Array.isArray(value[key]) || value[key].length < 1) throw new Error(`ai_missing_${key}`);
  if (!isObject(value.frequency) || !isString(value.frequency.level) || !isString(value.frequency.note)) {
    throw new Error("ai_missing_frequency");
  }
  if (!isObject(value.roots) || !isString(value.roots.breakdown) || !isString(value.roots.meaning)) {
    throw new Error("ai_missing_roots");
  }
  for (const key of ["scenarios", "memoryTips"]) {
    if (!(value[key] as unknown[]).every(isString)) throw new Error(`ai_invalid_${key}`);
  }
  for (const [key, fields] of Object.entries({ examples: ["en", "zh"], bestPractices: ["type", "en", "zh"], wordFamily: ["word", "zh"], collocations: ["phrase", "zh"] })) {
    if (!(value[key] as unknown[]).every((item) => isObject(item) && fields.every((field) => isString(item[field])))) throw new Error(`ai_invalid_${key}`);
  }
  return value;
}

async function generateWordContent(wordId: number, force: boolean, env: Cloudflare.Env): Promise<Response> {
  const word = await env.DB.prepare(
    "SELECT id, headword, source_phonetic, source_pos, source_meaning, ai_content, ai_model, generated_at FROM words WHERE id = ?",
  ).bind(wordId).first<{
    id: number;
    headword: string;
    source_phonetic: string | null;
    source_pos: string | null;
    source_meaning: string | null;
    ai_content: string | null;
    ai_model: string | null;
    generated_at: string | null;
  }>();
  if (!word) return apiError("单词不存在", 404);
  const cached = parseAiContent(word.ai_content);
  if (cached && !force) {
    return json({ content: cached, model: word.ai_model, generatedAt: word.generated_at, cached: true });
  }

  const systemPrompt = `你是一位严谨、风趣、擅长为中文母语成年人建立英语词汇记忆网络的资深英语教师。
目标是帮助学习者真正掌握单词，而不是堆砌字典信息。优先选择最常见、最有用、最容易理解的例句和真实微型语境；突出高频词根词缀与词族关系；给出针对性的记忆技巧，并明确使用场景。
事实准确性高于形式完整性。词源或词根不确定时，明确写“无可靠的高频词根拆解”，不要编造。
输出必须是一个 JSON 对象，不要 Markdown，不要代码围栏。键名必须严格使用以下结构：
{
  "phonetic": "音标",
  "partOfSpeech": "词性缩写",
  "coreMeaning": "中文核心含义",
  "scenarios": ["日常常用|商务常用|考试常用|学术常用|专业领域常用"],
  "frequency": {"level": "高频|中频|低频", "note": "简短使用频率说明"},
  "examples": [{"en": "自然实用例句", "zh": "中文翻译"}],
  "bestPractices": [{"type": "新闻标题|社交媒体|邮件|对话|学术摘要等", "en": "真实有趣的微型段落", "zh": "中文翻译"}],
  "roots": {"breakdown": "词根·词缀拆解", "meaning": "核心含义"},
  "wordFamily": [{"word": "相关词", "zh": "中文"}],
  "collocations": [{"phrase": "高频搭配", "zh": "中文"}],
  "memoryTips": ["具体记忆方法", "实用联想", "易混淆点或词形变化"]
}
examples 恰好 2 条，bestPractices 恰好 2 条，wordFamily 2-5 条，collocations 恰好 3 条，memoryTips 2-4 条。所有英文必须自然地道。`;
  const userPrompt = `请为单词“${word.headword}”生成学习内容。参考信息：音标 ${word.source_phonetic || "未知"}；词性 ${word.source_pos || "未知"}；中文义 ${word.source_meaning || "未知"}。请按 json 格式输出。`;

  const endpoint = `${env.DASHSCOPE_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(endpoint, {
      signal: AbortSignal.timeout(45000),
      method: "POST",
      headers: {
        authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.QWEN_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        enable_thinking: false,
        max_completion_tokens: 4096,
        temperature: 0.25,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error(JSON.stringify({ message: "qwen request failed", status: response.status, wordId }));
      const message = response.status === 401 || response.status === 403
        ? "千问访问凭据无效或无权限，请管理员检查 API Key 与地域配置"
        : response.status === 429 ? "千问请求额度或频率受限，请稍后重试"
        : "AI 内容生成暂时失败，请稍后重试";
      return apiError(message, 502);
    }
    const length = Number(response.headers.get("content-length") || "0");
    if (length > 2_000_000) return apiError("AI 返回内容过大", 502);
    payload = await readBoundedJson(response.body, 2_000_000);
  } catch (error) {
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return apiError(timeout ? "AI 生成超时，请重试" : "AI 服务连接失败，请重试", timeout ? 504 : 502);
  }
  const qwen = isObject(payload) ? payload as QwenResponse : {};
  const rawContent = qwen.choices?.[0]?.message?.content;
  if (!isString(rawContent)) return apiError("AI 未返回有效内容", 502);

  let content: Record<string, unknown>;
  try {
    content = validateAiContent(JSON.parse(rawContent) as unknown);
  } catch (error) {
    console.error(JSON.stringify({
      message: "qwen content validation failed",
      wordId,
      error: error instanceof Error ? error.message : String(error),
    }));
    return apiError("AI 内容格式不完整，请重试", 502);
  }

  const serialized = JSON.stringify(content);
  await env.DB.prepare(
    "UPDATE words SET ai_content = ?, ai_model = ?, generated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).bind(serialized, env.QWEN_MODEL, wordId).run();
  return json({ content, model: env.QWEN_MODEL, generatedAt: new Date().toISOString(), cached: false });
}

async function handleApi(request: Request, env: Cloudflare.Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (url.pathname === "/api/health" && method === "GET") return json({ ok: true });
  if (!authSecretsConfigured(env)) return apiError("站点尚未完成安全配置", 503);
  if (url.pathname === "/api/auth/login" && method === "POST") return handleLogin(request, env);
  if (url.pathname === "/api/auth/logout" && method === "POST") return logoutResponse(request);

  const authenticated = await verifySession(parseCookies(request).get(SESSION_COOKIE), env.SESSION_SECRET);
  if (url.pathname === "/api/session" && method === "GET") return json({ authenticated, model: env.QWEN_MODEL });
  if (!authenticated) return apiError("请先输入访问密码", 401);

  if (url.pathname === "/api/books" && method === "GET") return getBooks(env);
  if (url.pathname === "/api/dashboard" && method === "GET") return getDashboard(env);
  if (url.pathname === "/api/study/next" && method === "GET") return getStudyWord(url, env);
  if (url.pathname === "/api/review" && method === "GET") return getReviewQueue(env, positiveInteger(url.searchParams.get("limit"), 10), positiveInteger(url.searchParams.get("offset")));
  if (url.pathname === "/api/search" && method === "GET") return searchWords(url, env);
  if (url.pathname === "/api/progress" && method === "POST") return updateProgress(request, env);

  const generateMatch = url.pathname.match(/^\/api\/words\/(\d+)\/generate$/);
  if (generateMatch && method === "POST") {
    if (!checkOrigin(request)) return apiError("请求来源无效", 403);
    if (!qwenSecretConfigured(env)) return apiError("千问 API 尚未配置", 503);
    let force = false;
    try {
      const body = await readJsonObject(request);
      force = body.force === true;
    } catch {
      return apiError("生成参数无效");
    }
    const wordId = Number(generateMatch[1]);
    if (!Number.isSafeInteger(wordId) || wordId < 1) return apiError("单词编号无效");
    return generateWordContent(wordId, force, env);
  }

  return apiError("接口不存在", 404);
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({
        message: "request failed",
        method: request.method,
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      }));
      return apiError("服务暂时不可用", 500);
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
