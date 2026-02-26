import { useState, useRef, useEffect } from "react";
import { auth, googleProvider, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";

const LANGUAGES = { en: "English", es: "Español", pt: "Português", de: "Deutsch", ru: "Русский", fr: "Français", uk: "Українська" };

const PRONOUNS = {
  es: ["yo", "tú", "él / ella", "nosotros", "vosotros", "ellos / ellas"],
  pt: ["eu", "tu", "ele / ela", "nós", "vós", "eles / elas"],
  de: ["ich", "du", "er / sie", "wir", "ihr", "sie / Sie"],
  fr: ["je", "tu", "il / elle", "nous", "vous", "ils / elles"],
  ru: ["я", "ты", "он / она", "мы", "вы", "они"],
  uk: ["я", "ти", "він / вона", "ми", "ви", "вони"],
  en: ["I", "you", "he / she", "we", "you (pl)", "they"],
};

const MEANING_COLORS = ["#F7C772", "#B5D3DD", "#9B8EF7", "#6EE7B7", "#F87171"];

const s = {
  container: { maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#1E1E1E" },
  title: { fontSize: 32, textAlign: "center", marginBottom: 4, color: "#F0F0F0", fontFamily: "'DM Serif Display', serif" },
  subtitle: { fontSize: 20, textAlign: "center", marginBottom: 24, color: "#888" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  langBtn: { padding: "14px 0", fontSize: 16, borderRadius: 12, border: "none", background: "#2A2A2A", color: "#F0F0F0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  langs: { textAlign: "center", color: "#888", marginBottom: 16 },
  inputWrapper: { position: "relative", marginBottom: 16 },
  inputRow: { display: "flex", gap: 8 },
  input: { flex: 1, padding: 14, fontSize: 18, borderRadius: 12, border: "1.5px solid #333", boxSizing: "border-box", background: "#2A2A2A", color: "#F0F0F0", fontFamily: "'DM Sans', sans-serif" },
  btn: { padding: "14px 20px", fontSize: 20, borderRadius: 12, border: "none", background: "#F7C772", color: "#181818", cursor: "pointer", fontWeight: 600 },
  card: { background: "#2A2A2A", borderRadius: 16, padding: 20, marginBottom: 16 },
  wordTitle: { fontSize: 28, margin: "0 0 4px 0", color: "#F0F0F0", fontFamily: "'DM Serif Display', serif" },
  wordSub: { fontSize: 14, color: "#888", marginBottom: 16 },
  section: { marginBottom: 20 },
  label: { fontSize: 11, color: "#888", textTransform: "uppercase", margin: "0 0 10px 0", letterSpacing: "0.08em", fontWeight: 700 },
  tags: { display: "flex", flexWrap: "wrap", gap: 8 },
  tag: { background: "#2E3E44", color: "#B5D3DD", padding: "6px 12px", borderRadius: 20, fontSize: 14 },
  meaningCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderLeft: "3px solid #F7C772" },
  meaningTrans: { fontSize: 17, fontWeight: 700, marginBottom: 4 },
  meaningText: { fontSize: 13, color: "#CCC", marginBottom: 6 },
  meaningExample: { fontSize: 12, color: "#888", fontStyle: "italic" },
  tenseTabs: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12 },
  tenseTab: { background: "#2A2A2A", color: "#888", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", whiteSpace: "nowrap" },
  tenseTabActive: { background: "#F7C772", color: "#181818" },
  conjCard: { background: "#2A2A2A", borderRadius: 12, overflow: "hidden" },
  conjRow: { display: "flex", padding: "10px 14px", borderBottom: "1px solid #252525" },
  pronounCol: { color: "#888", fontWeight: 500, width: "45%", fontSize: 14 },
  formCol: { color: "#F0F0F0", fontWeight: 600, fontSize: 14 },
  saveBtn: { width: "100%", padding: 14, borderRadius: 12, border: "none", background: "#F7C772", color: "#181818", fontSize: 15, cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", marginTop: 8 },
  savedBox: { background: "#2A2A2A", borderRadius: 16, padding: 16, marginBottom: 16 },
  savedTitle: { margin: "0 0 12px 0", fontSize: 16, color: "#F0F0F0" },
  savedItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #333", flexDirection: "column", gap: 8 },
  savedWord: { fontWeight: "bold", color: "#F0F0F0" },
  savedTrans: { color: "#B5D3DD" },
  backBtn: { background: "none", border: "none", color: "#B5D3DD", cursor: "pointer", fontSize: 14 },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 60, background: "#2A2A2A", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 100, overflow: "hidden", marginTop: 4 },
  suggestionItem: { padding: "12px 16px", fontSize: 16, cursor: "pointer", borderBottom: "1px solid #333", color: "#F0F0F0" },
  authContainer: { maxWidth: 400, margin: "0 auto", padding: 24, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#1E1E1E", display: "flex", flexDirection: "column", justifyContent: "center" },
  authTitle: { fontSize: 28, color: "#F0F0F0", fontFamily: "'DM Serif Display', serif", marginBottom: 8 },
  authSub: { fontSize: 14, color: "#888", marginBottom: 32 },
  authInput: { width: "100%", padding: 14, fontSize: 16, borderRadius: 12, border: "1.5px solid #333", background: "#2A2A2A", color: "#F0F0F0", fontFamily: "'DM Sans', sans-serif", marginBottom: 12, boxSizing: "border-box" },
  authBtn: { width: "100%", padding: 14, fontSize: 16, borderRadius: 12, border: "none", background: "#F7C772", color: "#181818", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", marginBottom: 12 },
  authBtnOutline: { width: "100%", padding: 14, fontSize: 14, borderRadius: 12, border: "1.5px solid #333", background: "#2A2A2A", color: "#F0F0F0", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  authSwitch: { textAlign: "center", color: "#888", fontSize: 14, marginTop: 8 },
  authLink: { color: "#B5D3DD", cursor: "pointer", background: "none", border: "none", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
  errorMsg: { color: "#ff6b6b", fontSize: 13, marginBottom: 12, textAlign: "center" },
  userBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "10px 16px", background: "#2A2A2A", borderRadius: 12 },
  userEmail: { color: "#888", fontSize: 13 },
  logoutBtn: { background: "none", border: "none", color: "#B5D3DD", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  tabs: { display: "flex", background: "#252525", borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 },
  tab: { flex: 1, padding: "10px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", textAlign: "center" },
  tabActive: { background: "#2A2A2A", color: "#F0F0F0" },
  tabInactive: { background: "none", color: "#888" },
  deleteBtn: { background: "none", border: "none", color: "#ff6b6b", fontSize: 18, cursor: "pointer", padding: "0 4px" },
  historyDate: { fontSize: 11, color: "#555", marginTop: 2 },
  emptyState: { textAlign: "center", color: "#555", padding: "40px 0", fontSize: 15 },
  tensesModal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "flex-end" },
  tensesSheet: { background: "#1E1E1E", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxHeight: "80vh", overflowY: "auto" },
  tensesBtn: { background: "#2E3E44", border: "none", color: "#B5D3DD", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  closeBtn: { background: "none", border: "none", color: "#888", fontSize: 24, cursor: "pointer", float: "right" },
};

// Conjugation table component
function ConjugationTable({ forms, targetLang }) {
  const pronouns = PRONOUNS[targetLang] || PRONOUNS.en;
  const tenseNames = forms ? Object.keys(forms).filter(t => forms[t] && forms[t] !== "-") : [];
  const [activeTense, setActiveTense] = useState(tenseNames[0] || "");

  if (!forms || tenseNames.length === 0) return null;

  const currentForms = forms[activeTense];
  // Try to parse conjugation: could be "recibo / recibes / recibe / recibimos / recibís / reciben"
  let conjugations = [];
  if (typeof currentForms === "string") {
    conjugations = currentForms.split(/\s*[\/,]\s*/).map(f => f.trim());
  } else if (Array.isArray(currentForms)) {
    conjugations = currentForms;
  }

  return (
    <div style={s.section}>
      <div style={s.label}>Відміна по особах</div>
      <div style={{...s.tenseTabs, scrollbarWidth: "none"}}>
        {tenseNames.map(t => (
          <button key={t} style={{...s.tenseTab, ...(activeTense === t ? s.tenseTabActive : {})}} onClick={() => setActiveTense(t)}>{t}</button>
        ))}
      </div>
      <div style={s.conjCard}>
        {conjugations.length >= 6 ? (
          pronouns.map((pronoun, i) => (
            <div key={i} style={{...s.conjRow, borderBottom: i < 5 ? "1px solid #252525" : "none"}}>
              <span style={s.pronounCol}>{pronoun}</span>
              <span style={s.formCol}>{conjugations[i] || "-"}</span>
            </div>
          ))
        ) : (
          <div style={{...s.conjRow, borderBottom: "none"}}>
            <span style={{...s.formCol, width: "100%"}}>{currentForms}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [step, setStep] = useState("target");
  const [targetLang, setTargetLang] = useState("");
  const [nativeLang, setNativeLang] = useState("");
  const [word, setWord] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState("translate");
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [tensesItem, setTensesItem] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); if (u) loadData(u.uid); });
    return unsub;
  }, []);

  const loadData = async (uid) => {
    setLoadingSaved(true);
    try {
      const savedSnap = await getDocs(query(collection(db, "users", uid, "saved"), orderBy("createdAt", "desc")));
      setSaved(savedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const historySnap = await getDocs(query(collection(db, "users", uid, "history"), orderBy("createdAt", "desc")));
      setHistory(historySnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoadingSaved(false);
  };

  const handleRegister = async () => {
    setAuthError(""); setAuthLoading(true);
    try { await createUserWithEmailAndPassword(auth, email, password); }
    catch (e) { setAuthError(e.message.includes("email") ? "Невірний email" : "Пароль мінімум 6 символів"); }
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setAuthError(""); setAuthLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (e) { setAuthError("Невірний email або пароль"); }
    setAuthLoading(false);
  };

  const handleGoogle = async () => {
    setAuthError("");
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setAuthError("Помилка входу через Google"); }
  };

  const handleLogout = async () => {
    await signOut(auth); setStep("target"); setSaved([]); setHistory([]);
  };

  const handleInput = (value) => {
    setWord(value);
    if (value.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: `Give exactly 7 words or phrases in ${LANGUAGES[nativeLang]} and ${LANGUAGES[targetLang]} that start with the input. Mix both languages. Return only a JSON array. Nothing else.` }, { role: "user", content: value }], max_tokens: 150 }),
        });
        const data = await response.json();
        setSuggestions(JSON.parse(data.choices[0].message.content));
      } catch { setSuggestions([]); }
    }, 100);
  };

  const handleTranslate = async () => {
    if (!word.trim()) return;
    setSuggestions([]); setLoading(true); setResult(null);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: `You are a professional translator. The user speaks ${LANGUAGES[nativeLang]} and is learning ${LANGUAGES[targetLang]}.

Translate the given word from ${LANGUAGES[nativeLang]} to ${LANGUAGES[targetLang]}.

Rules:
1. "word" = original word as given
2. "translations" = 3-5 translations in ${LANGUAGES[targetLang]} ONLY
3. "meanings" = array of all different meanings (min 2-3). Each has:
   - "meaning": explanation in ${LANGUAGES[nativeLang]}
   - "translation": specific ${LANGUAGES[targetLang]} word for this meaning
   - "example": example sentence in ${LANGUAGES[targetLang]}
4. "forms" = verb conjugations in ${LANGUAGES[targetLang]} using NATIVE tense names. For each tense provide all 6 conjugations separated by " / " in order: yo/ich/je/я/я/I, tú/du/tu/ты/ти/you, él/er/il/он/він/he, nosotros/wir/nous/мы/ми/we, vosotros/ihr/vous/вы/ви/you(pl), ellos/sie/ils/они/вони/they.
   Use native tense names:
   - Spanish: Presente, Pretérito Indefinido, Pretérito Imperfecto, Pretérito Perfecto, Futuro Simple, Condicional, Imperativo
   - Portuguese: Presente, Pretérito Perfeito, Pretérito Imperfeito, Futuro, Condicional
   - German: Präsens, Präteritum, Perfekt, Futur I, Konjunktiv II
   - French: Présent, Passé Composé, Imparfait, Futur Simple, Conditionnel
   - Russian: Настоящее, Прошедшее, Будущее, Повелительное
   - Ukrainian: Теперішній, Минулий, Майбутній, Наказовий
   - English: Present Simple, Past Simple, Future Simple, Present Continuous, Present Perfect
   Use "-" if not a verb.

Respond ONLY with valid JSON: {"word":"...","translations":["..."],"meanings":[{"meaning":"...","translation":"...","example":"..."}],"forms":{"[tense]":"conj1 / conj2 / conj3 / conj4 / conj5 / conj6"}}` }, { role: "user", content: word }] }),
      });
      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      setResult(parsed);
      if (user && !parsed.error) {
        const item = { word, translation: parsed.translations?.[0] || "", fromLang: nativeLang, toLang: targetLang, createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "users", user.uid, "history"), item);
        setHistory(prev => [{ id: docRef.id, ...item, createdAt: new Date() }, ...prev]);
      }
    } catch { setResult({ error: "Помилка. Спробуй ще раз." }); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!word || !result || result.error || !user) return;
    const item = { word, translation: result.translations?.[0] || "", fromLang: nativeLang, toLang: targetLang, result, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "users", user.uid, "saved"), item);
    setSaved(prev => [{ id: docRef.id, ...item, createdAt: new Date() }, ...prev]);
    setWord(""); setResult(null);
  };

  const handleDeleteSaved = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "saved", id));
    setSaved(prev => prev.filter(i => i.id !== id));
  };

  const handleDeleteHistory = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "history", id));
    setHistory(prev => prev.filter(i => i.id !== id));
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (!user) {
    return (
      <div style={s.authContainer}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: "#F7C772", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none"><path d="M6 12L13 36L20 22L27 36L34 12" stroke="#181818" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="40" cy="14" r="4" fill="#181818"/><circle cx="40" cy="26" r="2.5" fill="#181818" opacity="0.5"/><circle cx="40" cy="35" r="1.5" fill="#181818" opacity="0.3"/></svg>
          </div>
          <div style={s.authTitle}>{authMode === "login" ? "Вітаємо назад 👋" : "Створи акаунт"}</div>
          <div style={s.authSub}>{authMode === "login" ? "Увійди щоб продовжити" : "Безкоштовно і швидко"}</div>
        </div>
        {authError && <div style={s.errorMsg}>{authError}</div>}
        <input style={s.authInput} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <input style={s.authInput} placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} type="password" onKeyDown={(e) => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} />
        <button style={s.authBtn} onClick={authMode === "login" ? handleLogin : handleRegister} disabled={authLoading}>{authLoading ? "⏳" : authMode === "login" ? "Увійти" : "Зареєструватись"}</button>
        <div style={{ textAlign: "center", color: "#555", fontSize: 13, margin: "4px 0 12px" }}>або</div>
        <button style={s.authBtnOutline} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Продовжити з Google
        </button>
        <div style={s.authSwitch}>
          {authMode === "login" ? "Немає акаунту? " : "Вже є акаунт? "}
          <button style={s.authLink} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Зареєструватись" : "Увійти"}</button>
        </div>
      </div>
    );
  }

  if (step === "target") {
    return (
      <div style={s.container}>
        <div style={s.userBar}><span style={s.userEmail}>👤 {user.email || user.displayName}</span><button style={s.logoutBtn} onClick={handleLogout}>Вийти</button></div>
        <h1 style={s.title}>Wordy 🌍</h1>
        <h2 style={s.subtitle}>Яку мову вивчаєш?</h2>
        <div style={s.grid}>{Object.entries(LANGUAGES).map(([code, name]) => (<button key={code} style={s.langBtn} onClick={() => { setTargetLang(code); setStep("native"); }}>{name}</button>))}</div>
      </div>
    );
  }

  if (step === "native") {
    return (
      <div style={s.container}>
        <h1 style={s.title}>Wordy 🌍</h1>
        <h2 style={s.subtitle}>Яка твоя мова?</h2>
        <div style={s.grid}>{Object.entries(LANGUAGES).map(([code, name]) => (<button key={code} style={s.langBtn} onClick={() => { setNativeLang(code); setStep("main"); }}>{name}</button>))}</div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.userBar}><span style={s.userEmail}>👤 {user.email || user.displayName}</span><button style={s.logoutBtn} onClick={handleLogout}>Вийти</button></div>
      <h1 style={s.title}>Wordy 🌍</h1>
      <p style={s.langs}>{LANGUAGES[nativeLang]} → {LANGUAGES[targetLang]}</p>

      <div style={s.tabs}>
        <button style={{...s.tab, ...(activeTab === "translate" ? s.tabActive : s.tabInactive)}} onClick={() => setActiveTab("translate")}>🔤 Переклад</button>
        <button style={{...s.tab, ...(activeTab === "saved" ? s.tabActive : s.tabInactive)}} onClick={() => setActiveTab("saved")}>🔖 Збережені {saved.length > 0 && `(${saved.length})`}</button>
        <button style={{...s.tab, ...(activeTab === "history" ? s.tabActive : s.tabInactive)}} onClick={() => setActiveTab("history")}>🕐 Історія</button>
      </div>

      {activeTab === "translate" && (
        <>
          <div style={s.inputWrapper}>
            <div style={s.inputRow}>
              <input style={s.input} placeholder="Введи слово або фразу..." value={word} onChange={(e) => handleInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTranslate()} />
              <button style={s.btn} onClick={handleTranslate} disabled={loading}>{loading ? "⏳" : "→"}</button>
            </div>
            {suggestions.length > 0 && (
              <div style={s.dropdown}>
                {suggestions.map((item, i) => (<div key={i} style={s.suggestionItem} onClick={() => { setWord(item); setSuggestions([]); }}>{item}</div>))}
              </div>
            )}
          </div>

          {result && !result.error && (
            <div style={s.card}>
              <div style={s.wordTitle}>{result.word}</div>
              <div style={s.wordSub}>{LANGUAGES[nativeLang]} → {LANGUAGES[targetLang]}</div>

              <div style={s.section}>
                <div style={s.label}>Переклади</div>
                <div style={s.tags}>{result.translations?.map((t, i) => <span key={i} style={s.tag}>{t}</span>)}</div>
              </div>

              {result.meanings?.length > 0 && (
                <div style={s.section}>
                  <div style={s.label}>Значення</div>
                  {result.meanings.map((m, i) => (
                    <div key={i} style={{...s.meaningCard, background: "#252525", borderLeftColor: MEANING_COLORS[i % MEANING_COLORS.length]}}>
                      <div style={{...s.meaningTrans, color: MEANING_COLORS[i % MEANING_COLORS.length]}}>{m.translation}</div>
                      <div style={s.meaningText}>{m.meaning}</div>
                      <div style={s.meaningExample}>"{m.example}"</div>
                    </div>
                  ))}
                </div>
              )}

              <ConjugationTable forms={result.forms} targetLang={targetLang} />

              <button style={s.saveBtn} onClick={handleSave}>💾 Зберегти слово</button>
            </div>
          )}
          {result?.error && <p style={{ color: "#ff6b6b", textAlign: "center" }}>{result.error}</p>}
        </>
      )}

      {activeTab === "saved" && (
        <div style={s.savedBox}>
          <p style={s.savedTitle}>Збережені слова ({saved.length})</p>
          {loadingSaved && <p style={s.emptyState}>Завантаження...</p>}
          {!loadingSaved && saved.length === 0 && <p style={s.emptyState}>Ще немає збережених слів</p>}
          {saved.map((item) => (
            <div key={item.id} style={s.savedItem}>
              <div style={{display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center"}}>
                <div>
                  <span style={s.savedWord}>{item.word}</span>
                  <span style={{color: "#B5D3DD", marginLeft: 8, fontSize: 15}}>{item.translation}</span>
                </div>
                <button style={s.deleteBtn} onClick={() => handleDeleteSaved(item.id)}>×</button>
              </div>
              <div style={{display: "flex", gap: 8, alignItems: "center"}}>
                <span style={s.historyDate}>{LANGUAGES[item.fromLang]} → {LANGUAGES[item.toLang]}</span>
                {item.result?.forms && <button style={s.tensesBtn} onClick={() => setTensesItem(item)}>📋 Часи</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <div style={s.savedBox}>
          <p style={s.savedTitle}>Історія перекладів ({history.length})</p>
          {loadingSaved && <p style={s.emptyState}>Завантаження...</p>}
          {!loadingSaved && history.length === 0 && <p style={s.emptyState}>Ще немає перекладів</p>}
          {history.map((item) => (
            <div key={item.id} style={{...s.savedItem, flexDirection: "row", alignItems: "center"}}>
              <div><span style={s.savedWord}>{item.word}</span><div style={s.historyDate}>{formatDate(item.createdAt)} • {LANGUAGES[item.fromLang]} → {LANGUAGES[item.toLang]}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={s.savedTrans}>{item.translation}</span><button style={s.deleteBtn} onClick={() => handleDeleteHistory(item.id)}>×</button></div>
            </div>
          ))}
        </div>
      )}

      {tensesItem && (
        <div style={s.tensesModal} onClick={() => setTensesItem(null)}>
          <div style={s.tensesSheet} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setTensesItem(null)}>×</button>
            <div style={{...s.wordTitle, fontSize: 22}}>{tensesItem.word}</div>
            <div style={{fontSize: 13, color: "#888", marginBottom: 16}}>{tensesItem.translation} • {LANGUAGES[tensesItem.fromLang]} → {LANGUAGES[tensesItem.toLang]}</div>
            {tensesItem.result?.translations && <div style={{...s.tags, marginBottom: 16}}>{tensesItem.result.translations.map((t, i) => <span key={i} style={s.tag}>{t}</span>)}</div>}
            <ConjugationTable forms={tensesItem.result?.forms} targetLang={tensesItem.toLang} />
          </div>
        </div>
      )}

      <button style={s.backBtn} onClick={() => setStep("target")}>← Змінити мову</button>
    </div>
  );
}