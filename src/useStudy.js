import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { demoBooks, demoReview, demoWord } from "./demoData";

const emptyDashboard = { counts: { mastered: 0, learning: 0, unlearned: 0 }, today: 0, dailyGoal: 20 };
function savedCursor() {
  try { return JSON.parse(localStorage.getItem("elio-cursor")) || {}; } catch { return {}; }
}

export function useStudy(demoMode, onUnauthorized) {
  const [books, setBooks] = useState(demoMode ? demoBooks : []);
  const [word, setWord] = useState(demoMode ? demoWord : null);
  const [selectedBookSlug, setSelectedBookSlug] = useState(demoMode ? "high-school" : "foundation");
  const [dashboard, setDashboard] = useState(demoMode ? { ...emptyDashboard, counts: { mastered: 57, learning: 23, unlearned: 2260 }, today: 12 } : emptyDashboard);
  const [review, setReview] = useState(demoMode ? demoReview : []);
  const [moving, setMoving] = useState(!demoMode);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [history, setHistory] = useState([]);
  const active = useRef(null);
  const navigation = useRef(0);
  const saving = useRef(false);
  const current = useRef(word);
  const panelVersion = useRef(0);

  function report(caught) {
    if (caught instanceof ApiError && caught.status === 401) onUnauthorized();
    else setError(caught.message || "加载失败，请重试");
  }

  async function refreshPanels() {
    if (demoMode) return;
    const version = ++panelVersion.current;
    try {
      const [bookData, dashboardData, reviewData] = await Promise.all([api("/api/books"), api("/api/dashboard"), api("/api/review?limit=10")]);
      if (version !== panelVersion.current) return;
      setBooks(bookData.books);
      setDashboard(dashboardData);
      setReview(reviewData.words);
    } catch (caught) { if (version === panelVersion.current) report(caught); }
  }

  async function generateContent(nextWord, token = navigation.current, force = false) {
    if (demoMode || (nextWord.aiContent && !force)) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setContentLoading(true);
    setContentError("");
    try {
      const generated = await api(`/api/words/${nextWord.id}/generate`, {
        method: "POST", body: JSON.stringify({ force }), timeout: 55000, signal: controller.signal,
      });
      if (token !== navigation.current) return;
      const updated = { ...current.current, aiContent: generated.content, aiModel: generated.model };
      current.current = updated;
      setWord(updated);
    } catch (caught) {
      if (controller.signal.aborted || token !== navigation.current) return;
      if (caught.status === 401) onUnauthorized();
      else setContentError(caught.message);
    } finally {
      if (token === navigation.current && active.current === controller) setContentLoading(false);
    }
  }

  async function loadWord({ bookSlug = selectedBookSlug, after = 0, id = 0, back = false } = {}) {
    if (saving.current) return;
    const token = ++navigation.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setMoving(true);
    setContentLoading(false);
    setContentError("");
    setError("");
    try {
      let nextWord;
      if (demoMode) {
        nextWord = { ...demoWord, book: { slug: bookSlug, title: demoBooks.find((b) => b.slug === bookSlug)?.title, wordCount: demoBooks.find((b) => b.slug === bookSlug)?.word_count } };
      } else {
        const params = new URLSearchParams({ book: bookSlug });
        if (after) params.set("after", String(after));
        if (id) params.set("id", String(id));
        nextWord = (await api(`/api/study/next?${params}`, { signal: controller.signal })).word;
      }
      if (token !== navigation.current) return;
      const previous = current.current;
      if (back) setHistory((items) => items.slice(0, -1));
      else if (previous && (previous.id !== nextWord.id || previous.book.slug !== nextWord.book.slug)) {
        setHistory((items) => [...items, { id: previous.id, bookSlug: previous.book.slug }].slice(-100));
      }
      current.current = nextWord;
      setWord(nextWord);
      setSelectedBookSlug(bookSlug);
      setCompleted(false);
      try { if (!demoMode) localStorage.setItem("elio-cursor", JSON.stringify({ bookSlug, id: nextWord.id })); } catch { /* Storage may be disabled. */ }
      // Navigation is finished as soon as the word arrives. AI must never lock study controls.
      void generateContent(nextWord, token);
    } catch (caught) {
      if (controller.signal.aborted || token !== navigation.current) return;
      if (caught.status === 404 && !id) {
        setSelectedBookSlug(bookSlug);
        setCompleted(true);
      } else report(caught);
    } finally { if (token === navigation.current) setMoving(false); }
  }

  async function markStatus(status) {
    if (saving.current || moving || !current.current) return;
    if (current.current.status === status) {
      if (status === "unlearned") await loadWord({ after: current.current.id });
      return;
    }
    saving.current = true;
    setMoving(true);
    setError("");
    const previous = current.current;
    let navigating = false;
    try {
      if (!demoMode) await api("/api/progress", { method: "POST", body: JSON.stringify({ wordId: previous.id, status }) });
      const updated = { ...current.current, status };
      current.current = updated;
      setWord(updated);
      if (demoMode) {
        setReview((items) => status === "learning" ? [updated, ...items.filter((item) => item.id !== updated.id)] : items.filter((item) => item.id !== updated.id));
        setDashboard((data) => ({ ...data, counts: { ...data.counts, [previous.status]: data.counts[previous.status] - 1, [status]: data.counts[status] + 1 } }));
      } else {
        saving.current = false;
        navigating = true;
        void refreshPanels();
        await loadWord({ bookSlug: previous.book.slug, after: previous.id });
      }
    } catch (caught) { report(caught); }
    finally { saving.current = false; if (!navigating) setMoving(false); }
  }

  useEffect(() => {
    if (!demoMode) {
      void refreshPanels();
      const cursor = savedCursor();
      void loadWord({ bookSlug: typeof cursor.bookSlug === "string" ? cursor.bookSlug : "foundation", id: Number.isSafeInteger(cursor.id) ? cursor.id : 0 });
    }
    return () => { navigation.current++; panelVersion.current++; active.current?.abort(); };
  }, [demoMode]);

  return { books, word, selectedBookSlug, dashboard, review, moving, contentLoading, contentError, error, completed, history,
    loadWord, markStatus, setError, retryContent: () => word && generateContent(word, navigation.current, true) };
}
