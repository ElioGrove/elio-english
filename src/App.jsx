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
import { api } from "./api";
import { demoReview } from "./demoData";
import { useStudy } from "./useStudy";
import { speakEnglish } from "./speech";

const STATUS_META = {
  mastered: { label: "已学会", icon: Check },
  learning: { label: "学习中", icon: Circle },
  unlearned: { label: "未学习", icon: X },
};

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

function AppHeader({ books, currentBook, onBookChange, word, search, setSearch, searchResults, searchState, onSearchPick, onSettings }) {
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
          {search.trim() && (
            <div className="search-results">
              {searchState && <p role="status">{searchState}</p>}
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
    phonetic: word.phonetic || (contentLoading ? "音标生成中" : "暂无音标"),
    partOfSpeech: word.partOfSpeech || "",
    coreMeaning: word.meaning || "暂无基础释义",
    scenarios: [],
    frequency: { level: contentLoading ? "生成中" : "待补充", note: contentLoading ? "千问正在分析常见使用场景" : "AI 内容暂未生成，可重试" },
    examples: [],
    bestPractices: [],
    roots: { breakdown: contentLoading ? "正在分析词源与构词" : "暂无词源分析", meaning: "生成完成后显示" },
    wordFamily: [],
    collocations: [],
    memoryTips: [contentLoading ? "正在为这个单词准备有针对性的记忆联想。" : "可以先学习基础释义，稍后再生成记忆提示。"],
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
            <button type="button" onClick={() => onSpeak(word.headword)} aria-label={`朗读 ${word.headword}`}><SpeakerHigh /></button>
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

function Sidebar({ dashboard, review, onReviewPick, onReviewAll }) {
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
        <div className="aside-heading"><h2>学习中队列 <span>({counts.learning})</span></h2><button type="button" onClick={onReviewAll}>查看全部 <ArrowRight /></button></div>
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

function useModal(onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = document.querySelector('[role="dialog"]');
    dialog?.querySelector("button")?.focus();
    function keydown(event) {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);
}

function ReviewModal({ demoMode, onUnauthorized, onClose, onPick }) {
  useModal(onClose);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (demoMode ? Promise.resolve({ words: demoReview, total: demoReview.length }) : api(`/api/review?limit=20&offset=${page * 20}`, { signal: controller.signal }))
      .then((data) => { if (!controller.signal.aborted) { setItems(data.words); setTotal(data.total); } })
      .catch((caught) => { if (!controller.signal.aborted) { if (caught.status === 401) onUnauthorized(); else setError(caught.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, demoMode, attempt]);
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="settings-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-heading"><h2 id="review-title">学习中词库（{total}）</h2><button type="button" onClick={onClose} aria-label="关闭词库"><X /></button></div>
      {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>重试</button></p> : loading ? <p role="status">正在加载…</p> : <div className="review-list">{items.length ? items.map((item) => <button type="button" key={item.id} onClick={() => onPick(item)}><strong>{item.headword}</strong><span>{item.source_meaning}</span></button>) : <p>还没有学习中的单词。</p>}</div>}
      <div className="review-pagination"><button type="button" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>上一页</button><span>{page + 1} / {Math.max(1, Math.ceil(total / 20))}</span><button type="button" disabled={loading || (page + 1) * 20 >= total} onClick={() => setPage(page + 1)}>下一页</button></div>
    </section>
  </div>;
}

function SettingsModal({ model, configuredModel, demoMode, onClose, onLogout }) {
  useModal(onClose);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><p className="eyebrow">PERSONAL SETTINGS</p><h2 id="settings-title">学习设置</h2></div><button type="button" onClick={onClose} aria-label="关闭设置"><X /></button></div>
        <div className="settings-row"><span>内容生成模型</span><strong>{configuredModel}</strong></div>
        {model && model !== configuredModel && <p className="settings-note">当前卡片使用历史缓存（{model}），可在学习页重新生成。</p>}
        <div className="settings-row"><span>运行模式</span><strong>{demoMode ? "本地演示" : "Cloudflare"}</strong></div>
        <p className="settings-note">模型 API Key 与访问密码仅保存在 Cloudflare Secret，不会进入浏览器或 Git。</p>
        {!demoMode && <button className="logout-button" type="button" onClick={onLogout}><SignOut />退出登录</button>}
      </section>
    </div>
  );
}

function StudyApp({ demoMode, configuredModel, onUnauthorized }) {
  const { books, word, selectedBookSlug, dashboard, review, moving, contentLoading, contentError, error, completed, history, loadWord, markStatus, setError, retryContent } = useStudy(demoMode, onUnauthorized);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchState, setSearchState] = useState("");
  const currentBook = useMemo(() => books.find((book) => book.slug === selectedBookSlug) || books[0], [books, selectedBookSlug]);

  useEffect(() => {
    const controller = new AbortController();
    setSearchResults([]);
    setSearchState(search.trim() ? "正在搜索…" : "");
    if (!search.trim()) return;
    const timer = window.setTimeout(async () => {
      try {
        const words = demoMode ? demoReview.filter((item) => item.headword.includes(search.trim().toLowerCase()) || item.source_meaning?.includes(search.trim()))
          : (await api(`/api/search?q=${encodeURIComponent(search.trim())}`, { signal: controller.signal })).words;
        if (!controller.signal.aborted) { setSearchResults(words); setSearchState(words.length ? "" : "没有找到匹配的单词"); }
      } catch (caught) {
        if (controller.signal.aborted) return;
        if (caught.status === 401) onUnauthorized();
        else setSearchState(caught.message);
      }
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, demoMode]);

  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.querySelector('input[aria-label="搜索单词或释义"]')?.focus(); }
      if (event.key === "Escape") setSearch("");
    };
    window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("keydown", shortcut); window.speechSynthesis?.cancel(); };
  }, []);
  useEffect(() => { window.speechSynthesis?.cancel(); }, [word?.id]);

  function speak(text) { speakEnglish(text, setError); }
  async function logout() {
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }); onUnauthorized(); }
    catch (caught) { setSettingsOpen(false); setError(caught.message); }
  }

  const activeContent = word?.aiContent;
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
        searchState={searchState}
        onSearchPick={(result) => { setSearch(""); setSearchResults([]); loadWord({ bookSlug: result.book_slug || selectedBookSlug, id: result.id }); }}
        onSettings={() => setSettingsOpen(true)}
      />
      <div className="workspace">
        <main className="study-pane">
          {demoMode && <p className="notice">演示预览 · 进度不会保存到云端</p>}
          {error && <div className="notice error-notice" role="alert">{error}<button type="button" onClick={() => loadWord()}>重新加载</button></div>}
          {completed ? <section className="empty-state"><Check /><h1>本词书暂无未学习单词</h1><p>可以选择另一本词书，或回到学习中队列继续复习。</p></section> : !word ? <section className="empty-state" role="status">{moving ? "正在加载单词…" : "暂时无法加载单词，请重试"}</section> : <>
          <div className="study-top" aria-busy={moving}>
            <StudyContent word={word} content={activeContent} contentLoading={contentLoading} onSpeak={speak} />
            {contentError && <div className="notice error-notice" role="alert">{contentError}<button type="button" onClick={retryContent}>重试生成</button></div>}
            {!contentLoading && !contentError && activeContent && <button className="regenerate-button" type="button" onClick={retryContent}>重新生成学习卡片</button>}
            <div className="desktop-status"><StatusSelector value={word.status} onChange={markStatus} disabled={moving} /></div>
          </div>
          <footer className="study-footer">
            <button type="button" className="footer-button" disabled={moving || !history.length} onClick={() => loadWord({ ...history[history.length - 1], back: true })}><ArrowLeft /> 上一个</button>
            <button type="button" className="next-button" onClick={() => loadWord({ after: word.id })} disabled={moving}>{moving ? <SpinnerGap className="spin" /> : <>下一个 <ArrowRight /></>}</button>
          </footer>
          </>}
        </main>
        <Sidebar onReviewAll={() => setReviewOpen(true)} dashboard={dashboard} review={review} onReviewPick={(item) => loadWord({ bookSlug: item.book_slug || selectedBookSlug, id: item.id })} />
      </div>
      {word && !completed && <div className="mobile-status"><StatusSelector value={word.status} onChange={markStatus} disabled={moving} /></div>}
      {reviewOpen && <ReviewModal demoMode={demoMode} onUnauthorized={onUnauthorized} onClose={() => setReviewOpen(false)} onPick={(item) => { setReviewOpen(false); loadWord({ bookSlug: item.book_slug || selectedBookSlug, id: item.id }); }} />}
      {settingsOpen && <SettingsModal configuredModel={configuredModel} model={word?.aiModel} demoMode={demoMode} onClose={() => setSettingsOpen(false)} onLogout={logout} />}
    </div>
  );
}

export function App() {
  const [state, setState] = useState("loading");
  const [demoMode, setDemoMode] = useState(false);
  const [configuredModel, setConfiguredModel] = useState("qwen3.8-flash");

  async function checkSession() {
    setState("loading");
    try {
      const session = await api("/api/session");
      setConfiguredModel(session.model || "qwen3.8-flash");
      setState(session.authenticated ? "app" : "login");
    } catch (caught) {
      if (import.meta.env.DEV) {
        setDemoMode(true);
        setState("app");
      } else {
        setState(caught.status === 503 ? "setup" : "error");
      }
    }
  }

  useEffect(() => { checkSession(); }, []);

  if (state === "loading") return <div className="loading-screen"><Asterisk /><span>正在打开Elio 英语</span></div>;
  if (state === "error") return <main className="empty-state"><h1>暂时无法连接</h1><p>请检查网络后重试。</p><button type="button" onClick={checkSession}>重新连接</button></main>;
  if (state === "setup") return <SetupUnavailable />;
  if (state === "login") return <Login onSuccess={() => setState("app")} />;
  return <StudyApp configuredModel={configuredModel} demoMode={demoMode} onUnauthorized={() => setState("login")} />;
}
