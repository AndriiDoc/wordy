import { useState, useRef, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const LANGUAGES = {
  en: "English",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  ru: "Русский",
  fr: "Français",
  uk: "Українська",
};

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
  wordTitle: { fontSize: 28, margin: "0 0 16px 0", color: "#F0F0F0" },
  section: { marginBottom: 16 },
  label: { fontSize: 12, color: "#888", textTransform: "uppercase", margin: "0 0 8px 0", letterSpacing: "0.06em" },
  tags: { display: "flex", flexWrap: "wrap", gap: 8 },
  tag: { background: "#2E3E44", color: "#B5D3DD", padding: "6px 12px", borderRadius: 20, fontSize: 16 },
  meaning: { fontSize: 16, color: "#CCC", margin: "0 0 4px 0" },
  example: { fontSize: 14, color: "#888", fontStyle: "italic", margin: 0 },
  forms: { display: "flex", flexDirection: "column", gap: 6 },
  formRow: { display: "flex", gap: 12, alignItems: "flex-start" },
  tense: { color: "#888", fontSize: 13, minWidth: 140 },
  form: { color: "#F0F0F0", fontSize: 14 },
  saveBtn: { width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#F7C772", color: "#181818", fontSize: 16, cursor: "pointer", marginTop: 8, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" },
  savedBox: { background: "#2A2A2A", borderRadius: 16, padding: 16, marginBottom: 16 },
  savedTitle: { margin: "0 0 12px 0", fontSize: 16, color: "#F0F0F0" },
  savedItem: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #333" },
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
};

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
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const handleRegister = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setAuthError(e.message.includes("email") ? "Невірний email" : e.message.includes("password") ? "Пароль мінімум 6 символів" : "Помилка реєстрації");
    }
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setAuthError("Невірний email або пароль");
    }
    setAuthLoading(false);
  };

  const handleGoogle = async () => {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setAuthError("Помилка входу через Google");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setStep("target");
    setSaved([]);
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
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `Give exactly 7 words or phrases in ${LANGUAGES[nativeLang]} and ${LANGUAGES[targetLang]} that start with the input. Mix both languages. Return only a JSON array like: ["word1","word2","word3","word4","word5","word6","word7"]. Nothing else.` },
              { role: "user", content: value },
            ],
            max_tokens: 150,
          }),
        });
        const data = await response.json();
        setSuggestions(JSON.parse(data.choices[0].message.content));
      } catch { setSuggestions([]); }
    }, 100);
  };

  const handleTranslate = async () => {
    if (!word.trim()) return;
    setSuggestions([]);
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a dictionary. The user speaks ${LANGUAGES[nativeLang]} and is learning ${LANGUAGES[targetLang]}. 
When given a word or phrase, respond in JSON format:
{
  "word": "original word",
  "translations": ["translation1","translation2","translation3"],
  "meanings": [{"meaning": "explanation in ${LANGUAGES[nativeLang]}","example": "example in ${LANGUAGES[targetLang]}"}],
  "forms": {"present simple":"...","present continuous":"...","present perfect":"...","past simple":"...","past continuous":"...","past perfect":"...","future simple":"...","future continuous":"...","future perfect":"..."}
}
Only valid JSON. If a form doesn't exist set its value to "-".`,
            },
            { role: "user", content: word },
          ],
        }),
      });
      const data = await response.json();
      setResult(JSON.parse(data.choices[0].message.content));
    } catch { setResult({ error: "Помилка. Спробуй ще раз." }); }
    setLoading(false);
  };

  const handleSave = () => {
    if (word && result && !result.error) {
      setSaved([...saved, { word, result }]);
      setWord("");
      setResult(null);
    }
  };

  // AUTH SCREEN
  if (!user) {
    return (
      <div style={s.authContainer}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: "#F7C772", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
              <path d="M6 12L13 36L20 22L27 36L34 12" stroke="#181818" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="40" cy="14" r="4" fill="#181818"/>
              <circle cx="40" cy="26" r="2.5" fill="#181818" opacity="0.5"/>
              <circle cx="40" cy="35" r="1.5" fill="#181818" opacity="0.3"/>
            </svg>
          </div>
          <div style={s.authTitle}>{authMode === "login" ? "Вітаємо назад 👋" : "Створи акаунт"}</div>
          <div style={s.authSub}>{authMode === "login" ? "Увійди щоб продовжити" : "Безкоштовно і швидко"}</div>
        </div>

        {authError && <div style={s.errorMsg}>{authError}</div>}

        <input style={s.authInput} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <input style={s.authInput} placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} type="password" onKeyDown={(e) => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} />

        <button style={s.authBtn} onClick={authMode === "login" ? handleLogin : handleRegister} disabled={authLoading}>
          {authLoading ? "⏳" : authMode === "login" ? "Увійти" : "Зареєструватись"}
        </button>

        <div style={{ textAlign: "center", color: "#555", fontSize: 13, margin: "4px 0 12px" }}>або</div>

        <button style={s.authBtnOutline} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Продовжити з Google
        </button>

        <div style={s.authSwitch}>
          {authMode === "login" ? "Немає акаунту? " : "Вже є акаунт? "}
          <button style={s.authLink} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>
            {authMode === "login" ? "Зареєструватись" : "Увійти"}
          </button>
        </div>
      </div>
    );
  }

  // LANGUAGE SELECT
  if (step === "target") {
    return (
      <div style={s.container}>
        <div style={s.userBar}>
          <span style={s.userEmail}>👤 {user.email || user.displayName}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Вийти</button>
        </div>
        <h1 style={s.title}>Wordy 🌍</h1>
        <h2 style={s.subtitle}>Яку мову вивчаєш?</h2>
        <div style={s.grid}>
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <button key={code} style={s.langBtn} onClick={() => { setTargetLang(code); setStep("native"); }}>{name}</button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "native") {
    return (
      <div style={s.container}>
        <h1 style={s.title}>Wordy 🌍</h1>
        <h2 style={s.subtitle}>Яка твоя мова?</h2>
        <div style={s.grid}>
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <button key={code} style={s.langBtn} onClick={() => { setNativeLang(code); setStep("main"); }}>{name}</button>
          ))}
        </div>
      </div>
    );
  }

  // MAIN TRANSLATE
  return (
    <div style={s.container}>
      <div style={s.userBar}>
        <span style={s.userEmail}>👤 {user.email || user.displayName}</span>
        <button style={s.logoutBtn} onClick={handleLogout}>Вийти</button>
      </div>
      <h1 style={s.title}>Wordy 🌍</h1>
      <p style={s.langs}>{LANGUAGES[nativeLang]} → {LANGUAGES[targetLang]}</p>

      <div style={s.inputWrapper}>
        <div style={s.inputRow}>
          <input ref={inputRef} style={s.input} placeholder="Введи слово або фразу..." value={word} onChange={(e) => handleInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTranslate()} />
          <button style={s.btn} onClick={handleTranslate} disabled={loading}>{loading ? "⏳" : "→"}</button>
        </div>
        {suggestions.length > 0 && (
          <div style={s.dropdown}>
            {suggestions.map((item, i) => (
              <div key={i} style={s.suggestionItem} onClick={() => { setWord(item); setSuggestions([]); }}>{item}</div>
            ))}
          </div>
        )}
      </div>

      {result && !result.error && (
        <div style={s.card}>
          <h2 style={s.wordTitle}>{result.word}</h2>
          <div style={s.section}>
            <p style={s.label}>Переклади:</p>
            <div style={s.tags}>{result.translations?.map((t, i) => <span key={i} style={s.tag}>{t}</span>)}</div>
          </div>
          {result.meanings?.map((m, i) => (
            <div key={i} style={s.section}>
              <p style={s.label}>Значення {i + 1}:</p>
              <p style={s.meaning}>{m.meaning}</p>
              <p style={s.example}>"{m.example}"</p>
            </div>
          ))}
          {result.forms && (
            <div style={s.section}>
              <p style={s.label}>Часи:</p>
              <div style={s.forms}>
                {Object.entries(result.forms).map(([tense, form]) => form !== "-" && (
                  <div key={tense} style={s.formRow}>
                    <span style={s.tense}>{tense}:</span>
                    <span style={s.form}>{form}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button style={s.saveBtn} onClick={handleSave}>💾 Зберегти слово</button>
        </div>
      )}

      {result?.error && <p style={{ color: "#ff6b6b", textAlign: "center" }}>{result.error}</p>}

      {saved.length > 0 && (
        <div style={s.savedBox}>
          <h3 style={s.savedTitle}>Збережені слова ({saved.length})</h3>
          {saved.map((item, i) => (
            <div key={i} style={s.savedItem}>
              <span style={s.savedWord}>{item.word}</span>
              <span style={s.savedTrans}>{item.result.translations?.[0]}</span>
            </div>
          ))}
        </div>
      )}

      <button style={s.backBtn} onClick={() => setStep("target")}>← Змінити мову</button>
    </div>
  );
}
