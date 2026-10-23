import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Asterisk,
  BookOpen,
  CaretDown,
  Check,
  Circle,
  GearSix,
  Info,
  ListBullets,
  MagnifyingGlass,
  SignOut,
  SpeakerHigh,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { api, ApiError } from "./api";
import { demoBooks, demoContent, demoReview, demoWord } from "./demoData";

const STATUS_META = {
  mastered: { label: "已学会", icon: Check },
  learning: { label: "学习中", icon: Circle },
  unlearned: { label: "未学习", icon: X },
};

function normalizeWord(word) {
  if (!word) return demoWord;
  return { ...word, aiContent: word.aiContent || null };
}

function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) });
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand"><Asterisk weight="light" /><span>Elio 英语</span></div>
      <form className="login-form" onSubmit={submit}>
        <p className="eyebrow">PRIVATE READING ROOM</p>
        <h1>继续你的<br />词汇旅程。</h1>
        <p className="login-copy">输入访问密码，我们会从你上次停下的地方继续。</p>
        <label htmlFor="password">访问密码</label>
        <div className="password-row">
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required />
          <button type="submit" disabled={submitting || !password} aria-label="进入学习空间">
            {submitting ? <SpinnerGap className="spin" /> : <ArrowRight />}
          </button>
        </div>
        {error && <p className="form-error"><WarningCircle />{error}</p>}
      </form>
      <p className="login-footnote">仅供个人使用 · 学习进度安全保存在 Cloudflare D1</p>
    </main>
  );
}

function SetupUnavailable() {
  return (
    <main className="login-page">
      <div className="login-brand"><Asterisk weight="light" /><span>Elio 英语</span></div>
      <div className="login-form">
        <p className="eyebrow">DEPLOYMENT READY</p>
        <h1>站点已部署，<br />等待安全配置。</h1>
        <p className="login-copy">管理员完成访问密码与会话密钥配置后，这里会自动开放登录。</p>
      </div>
      <p className="login-footnote">安全配置未完成 · 当前不会展示学习数据</p>
    </main>
  );
}

function StatusSelector({ value, onChange, disabled = false }) {
  return (
    <div className="status-wrap">
      <div className="status-selector" aria-label="掌握程度">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <button key={status} type="button" aria-pressed={value === status} className={`status-option ${status} ${value === status ? "active" : ""}`} onClick={() => onChange(status)} disabled={disabled}>
            {meta.label}
          </button>
        ))}
      </div>
      <p>标记掌握程度，按自己的节奏学习</p>
    </div>
  );
}

function AppHeader({ books, currentBook, onBookChange, word, search, setSearch, searchResults, onSearchPick, onSettings }) {
  const progress = Math.max(1, word?.position || 1);
  const total = word?.book?.wordCount || currentBook?.word_count || 1;
  const percentage = Math.min(100, (progress / total) * 100);
  return (
    <header className="app-header">
      <div className="wordmark"><BookOpen weight="regular" /><span>Elio<span className="wordmark-secondary">英语</span></span><small>ENGLISH, EVERY DAY</small></div>
      <label className="book-picker">
        <BookOpen weight="light" />
        <span>当前词书：</span>
        <select value={currentBook?.slug || ""} onChange={(event) => onBookChange(event.target.value)}>
          {books.map((book) => <option key={book.slug} value={book.slug}>{book.title}</option>)}
        </select>
        <CaretDown />
      </label>
      <div className="header-progress">
        <span><strong>{progress.toLocaleString()}</strong> / {total.toLocaleString()}</span>
        <div><i style={{ width: `${percentage}%` }} /></div>
      </div>
      <div className="header-actions">
        <div className="search-shell">
          <MagnifyingGlass />
          <input aria-label="搜索单词或释义" placeholder="搜索单词或释义" value={search} onChange={(event) => setSearch(event.target.value)} />
          <kbd>⌘ K</kbd>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <button key={result.id} type="button" onClick={() => onSearchPick(result)}>
                  <span>{result.headword}</span><small>{result.source_meaning || "查看单词"}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="icon-button" type="button" onClick={onSettings} aria-label="打开设置"><GearSix /></button>
      </div>
    </header>
  );
}

function StudyContent({ word, content, contentLoading, onSpeak }) {
  const safe = content || {
    phonetic: word.phonetic || "音标生成中",
    partOfSpeech: word.partOfSpeech || "",
    coreMeaning: word.meaning || "AI 正在整理这个单词的核心含义",
    scenarios: [],
    frequency: { level: "生成中", note: "千问正在分析常见使用场景" },
    examples: [],
    bestPractices: [],
    roots: { breakdown: "正在分析词源与构词", meaning: "生成完成后显示" },
    wordFamily: [],
    collocations: [],
    memoryTips: ["正在为这个单词准备有针对性的记忆联想。"],
  };
  return (
    <>
      <section className="word-card">
      <div className="word-kicker">单词精读 <span>第 {word.position || 1} 个单词</span></div>
      <div className="word-title-row">
        <div>
          <h1>{word.headword}</h1>
          <div className="pronunciation">
            <span>{safe.phonetic}</span>
            <button type="button" onClick={onSpeak} aria-label={`朗读 ${word.headword}`}><SpeakerHigh /></button>
            <span>{safe.partOfSpeech}</span>
          </div>
        </div>
      </div>
      <p className="core-meaning">{safe.coreMeaning}</p>
      <div className="word-meta">
        <span className="frequency-tag">{safe.frequency?.level || "生成中"}词</span>
        {(safe.scenarios || []).map((scenario) => <span key={scenario}>{scenario}</span>)}
        <span className="meta-divider" />
        <span>使用场景：{safe.frequency?.note || "正在分析"}</span>
        {contentLoading && <span className="generating"><SpinnerGap className="spin" /> 千问正在生成</span>}
      </div>
      </section>

      <section className="content-section examples-section">
        <h2>例句</h2>
        <ol className="example-list">
          {(safe.examples || []).slice(0, 2).map((example, index) => (
            <li key={`${example.en}-${index}`}>
              <span className="example-dot" />
              <div><p>{example.en}</p><p className="translation">{example.zh}</p></div>
              <button type="button" onClick={() => onSpeak(example.en)} aria-label="朗读例句"><SpeakerHigh /></button>
            </li>
          ))}
        </ol>
      </section>

      <section className="content-section context-section">
        <h2>真实语境</h2>
        {(safe.bestPractices || []).slice(0, 1).map((practice) => (
          <div key={practice.en}>
            <span className="context-type">{practice.type}</span>
            <p className="english-paragraph">{practice.en}</p>
            <p className="translation">{practice.zh}</p>
          </div>
        ))}
      </section>

      <section className="learning-grid content-section">
        <div>
          <h2>词根词缀</h2>
          <p>{safe.roots?.breakdown}</p>
          <p className="translation">字面：{safe.roots?.meaning}</p>
          <div className="word-family">
            {(safe.wordFamily || []).slice(0, 3).map((item) => <span key={item.word}><strong>{item.word}</strong> {item.zh}</span>)}
          </div>
        </div>
        <div>
          <h2>搭配与常见用法</h2>
          <ul className="collocation-list">
            {(safe.collocations || []).slice(0, 3).map((item) => <li key={item.phrase}><strong>{item.phrase}</strong><span>{item.zh}</span></li>)}
          </ul>
        </div>
        <div className="memory-panel">
          <h2>记忆提示</h2>
          <p>{safe.memoryTips?.[0]}</p>
        </div>
      </section>
    </>
  );
}

function Sidebar({ dashboard, review, onReviewPick }) {
  const counts = dashboard.counts;
  const planPercent = Math.min(100, (dashboard.today / dashboard.dailyGoal) * 100);
  return (
    <aside className="sidebar" aria-label="学习概览">
      <section>
        <div className="aside-heading"><h2>学习轨迹</h2><Info /></div>
        <div className="stat-list">
          <div><i className="dot mastered" /><span>已学会</span><strong>{counts.mastered.toLocaleString()}</strong></div>
          <div><i className="dot learning" /><span>学习中</span><strong>{counts.learning.toLocaleString()}</strong></div>
          <div><i className="dot unlearned" /><span>未学习</span><strong>{counts.unlearned.toLocaleString()}</strong></div>
        </div>
      </section>
      <section className="review-section">
        <div className="aside-heading"><h2>学习中队列 <span>({counts.learning})</span></h2><button type="button">查看全部 <ArrowRight /></button></div>
        <div className="review-list">
          {review.length === 0 ? <p className="empty-review">还没有学习中的单词</p> : review.slice(0, 5).map((item, index) => (
            <button key={item.id} type="button" onClick={() => onReviewPick(item)}>
              <span className="review-index">{index + 1}</span>
              <span className="review-word">{item.headword}</span>
              <small>{item.source_pos || ""}</small>
              <i />
              <ListBullets />
            </button>
          ))}
        </div>
      </section>
      <section className="daily-plan">
        <div className="aside-heading"><h2>今日计划</h2><span>已学 {dashboard.today} / {dashboard.dailyGoal}</span></div>
        <div className="plan-bar"><i style={{ width: `${planPercent}%` }} /></div>
        <p>{dashboard.today >= dashboard.dailyGoal ? "今日目标已完成，做得很好。" : `再学习 ${dashboard.dailyGoal - dashboard.today} 个单词即可完成目标`}</p>
      </section>
    </aside>
  );
}

function SettingsModal({ model, demoMode, onClose, onLogout }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><p className="eyebrow">PERSONAL SETTINGS</p><h2 id="settings-title">学习设置</h2></div><button type="button" onClick={onClose} aria-label="关闭设置"><X /></button></div>
        <div className="settings-row"><span>内容生成模型</span><strong>{model || "qwen3.8-max"}</strong></div>
        <div className="settings-row"><span>运行模式</span><strong>{demoMode ? "本地演示" : "Cloudflare"}</strong></div>
        <p className="settings-note">模型 API Key 与访问密码仅保存在 Cloudflare Secret，不会进入浏览器或 Git。</p>
        {!demoMode && <button className="logout-button" type="button" onClick={onLogout}><SignOut />退出登录</button>}
      </section>
    </div>
  );
}

function StudyApp({ demoMode, onUnauthorized }) {
  const [books, setBooks] = useState(demoBooks);
  const [selectedBookSlug, setSelectedBookSlug] = useState(demoMode ? "high-school" : "foundation");
  const [word, setWord] = useState(demoWord);
  const [content, setContent] = useState(demoContent);
  const [review, setReview] = useState(demoReview);
  const [dashboard, setDashboard] = useState({ counts: { mastered: 57, learning: 23, unlearned: 2260 }, today: 12, dailyGoal: 20 });
  const [contentLoading, setContentLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const searchTimer = useRef(null);

  const currentBook = useMemo(() => books.find((book) => book.slug === selectedBookSlug) || books[0], [books, selectedBookSlug]);

  async function refreshPanels() {
    if (demoMode) return;
    try {
      const [dashboardData, reviewData] = await Promise.all([api("/api/dashboard"), api("/api/review?limit=10")]);
      setDashboard(dashboardData);
      setReview(reviewData.words);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized();
    }
  }

  async function generateContent(nextWord) {
    if (demoMode || nextWord.aiContent) return;
    setContentLoading(true);
    try {
      const generated = await api(`/api/words/${nextWord.id}/generate`, { method: "POST", body: "{}" });
      setContent(generated.content);
      setWord((current) => ({ ...current, aiContent: generated.content, aiModel: generated.model }));
    } catch (caught) {
      console.error(caught);
    } finally {
      setContentLoading(false);
    }
  }

  async function loadWord({ bookSlug = selectedBookSlug, after = 0, id = 0 } = {}) {
    if (demoMode) {
      setSelectedBookSlug(bookSlug);
      setWord(demoWord);
      setContent(demoContent);
      return;
    }
    setMoving(true);
    try {
      const params = new URLSearchParams({ book: bookSlug });
      if (after) params.set("after", String(after));
      if (id) params.set("id", String(id));
      const data = await api(`/api/study/next?${params}`);
      const nextWord = normalizeWord(data.word);
      setSelectedBookSlug(bookSlug);
      setWord(nextWord);
      setContent(nextWord.aiContent);
      await generateContent(nextWord);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized();
    } finally {
      setMoving(false);
    }
  }

  useEffect(() => {
    if (demoMode) return;
    Promise.all([api("/api/books"), api("/api/dashboard"), api("/api/review?limit=10")])
      .then(([bookData, dashboardData, reviewData]) => {
        setBooks(bookData.books);
        setDashboard(dashboardData);
        setReview(reviewData.words);
        return loadWord({ bookSlug: "foundation" });
      })
      .catch((caught) => {
        if (caught instanceof ApiError && caught.status === 401) onUnauthorized();
      });
  }, [demoMode]);

  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      if (demoMode) {
        setSearchResults(demoReview.filter((item) => item.headword.includes(search.toLowerCase())));
        return;
      }
      try {
        const data = await api(`/api/search?q=${encodeURIComponent(search.trim())}`);
        setSearchResults(data.words);
      } catch {
        setSearchResults([]);
      }
    }, 220);
    return () => window.clearTimeout(searchTimer.current);
  }, [search, demoMode]);

  async function markStatus(status) {
    if (moving) return;
    setWord((current) => ({ ...current, status }));
    if (demoMode) {
      if (status === "learning" && !review.some((item) => item.id === word.id)) setReview((current) => [word, ...current]);
      return;
    }
    setMoving(true);
    try {
      await api("/api/progress", { method: "POST", body: JSON.stringify({ wordId: word.id, status }) });
      await Promise.all([refreshPanels(), loadWord({ after: word.id })]);
    } finally {
      setMoving(false);
    }
  }

  function speak(text = word.headword) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    window.location.reload();
  }

  const activeContent = content || word.aiContent;
  return (
    <div className="app-shell">
      <AppHeader
        books={books}
        currentBook={currentBook}
        onBookChange={(slug) => loadWord({ bookSlug: slug })}
        word={word}
        search={search}
        setSearch={setSearch}
        searchResults={searchResults}
        onSearchPick={(result) => { setSearch(""); setSearchResults([]); loadWord({ bookSlug: result.book_slug || selectedBookSlug, id: result.id }); }}
        onSettings={() => setSettingsOpen(true)}
      />
      <div className="workspace">
        <main className="study-pane">
          <div className="study-top">
            <StudyContent word={word} content={activeContent} contentLoading={contentLoading} onSpeak={speak} />
            <div className="desktop-status"><StatusSelector value={word.status} onChange={markStatus} disabled={moving} /></div>
          </div>
          <footer className="study-footer">
            <button type="button" className="footer-button"><ArrowLeft /> 上一个</button>
            <button type="button" className="footer-button"><ListBullets /> 继续阅读</button>
            <button type="button" className="next-button" onClick={() => loadWord({ after: word.id })} disabled={moving}>{moving ? <SpinnerGap className="spin" /> : <>下一个 <ArrowRight /></>}</button>
          </footer>
        </main>
        <Sidebar dashboard={dashboard} review={review} onReviewPick={(item) => loadWord({ bookSlug: item.book_slug || selectedBookSlug, id: item.id })} />
      </div>
      <div className="mobile-status"><StatusSelector value={word.status} onChange={markStatus} disabled={moving} /></div>
      {settingsOpen && <SettingsModal model={word.aiModel} demoMode={demoMode} onClose={() => setSettingsOpen(false)} onLogout={logout} />}
    </div>
  );
}

export function App() {
  const [state, setState] = useState("loading");
  const [demoMode, setDemoMode] = useState(false);

  async function checkSession() {
    setState("loading");
    try {
      const session = await api("/api/session");
      setState(session.authenticated ? "app" : "login");
    } catch {
      if (import.meta.env.DEV) {
        setDemoMode(true);
        setState("app");
      } else {
        setState("setup");
      }
    }
  }

  useEffect(() => { checkSession(); }, []);

  if (state === "loading") return <div className="loading-screen"><Asterisk /><span>正在打开Elio 英语</span></div>;
  if (state === "setup") return <SetupUnavailable />;
  if (state === "login") return <Login onSuccess={() => setState("app")} />;
  return <StudyApp demoMode={demoMode} onUnauthorized={() => setState("login")} />;
}
