import { useState, useEffect, useRef, useCallback } from "react";
import { auth, googleProvider, db } from "./firebase";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, sendPasswordResetEmail,
  updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential,
} from "firebase/auth";
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp, setDoc, getDoc, writeBatch,
} from "firebase/firestore";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const LANGUAGES = {
  en: { name: "English", flag: "🇬🇧" },
  es: { name: "Spanish", flag: "🇪🇸" },
  pt: { name: "Portuguese", flag: "🇧🇷" },
  de: { name: "German", flag: "🇩🇪" },
  fr: { name: "French", flag: "🇫🇷" },
  uk: { name: "Ukrainian", flag: "🇺🇦" },
  ru: { name: "Russian", flag: "🇷🇺" },
};

const C = {
  bg: "#1A1A1A", surface: "#242424", surface2: "#2E2E2E", surface3: "#383838",
  gold: "#F7C772", blue: "#B5D3DD", green: "#6EE7B7", purple: "#9B8EF7",
  text: "#F0F0F0", text2: "#A0A0A0", text3: "#606060",
  error: "#F87171", border: "#333333", borderLight: "#444444",
};

const T = {
  display: { fontSize: 28, fontWeight: 800, lineHeight: 1.2 },
  h1: { fontSize: 22, fontWeight: 700, lineHeight: 1.3 },
  h2: { fontSize: 18, fontWeight: 700, lineHeight: 1.3 },
  h3: { fontSize: 16, fontWeight: 600, lineHeight: 1.4 },
  bodyL: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  bodyM: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: 11, fontWeight: 500, lineHeight: 1.4 },
  overline: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" },
};

const CACHE_PREFIX = "wordy_";
const getCache = (key) => { try { const v = localStorage.getItem(CACHE_PREFIX + key); return v ? JSON.parse(v) : null; } catch { return null; } };
const setCache = (key, val) => { try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(val)); } catch {} };

// ─── ICONS ──────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 22, color = "currentColor", stroke = 1.75, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const Icons = {
  Translate: () => <Icon d={["M12 20h9", "M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"]} />,
  Bookmark: ({ filled }) => <Icon d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" fill={filled ? C.gold : "none"} color={filled ? C.gold : "currentColor"} />,
  History: () => <Icon d={["M3 12a9 9 0 105.63-8.36", "M3 3v5h5", "M12 7v5l3 3"]} />,
  Settings: () => <Icon d={["M12 15a3 3 0 100-6 3 3 0 000 6z", "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"]} />,
  Speaker: ({ active }) => <Icon d={["M11 5L6 9H2v6h4l5 4V5z", active ? "M19.07 4.93a10 10 0 010 14.14" : "M15.54 8.46a5 5 0 010 7.07"]} color={active ? C.gold : "currentColor"} />,
  Search: () => <Icon d={["M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"]} />,
  Close: () => <Icon d="M18 6L6 18M6 6l12 12" />,
  Delete: () => <Icon d={["M3 6h18", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]} />,
  Save: () => <Icon d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8" />,
  Swap: () => <Icon d={["M7 16V4m0 0L3 8m4-4l4 4", "M17 8v12m0 0l4-4m-4 4l-4-4"]} />,
  Arrow: () => <Icon d="M5 12h14M12 5l7 7-7 7" />,
  ChevronDown: () => <Icon d="M6 9l6 6 6-6" />,
  ChevronRight: () => <Icon d="M9 18l6-6-6-6" />,
  Google: () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  Logo: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <text x="4" y="22" fontSize="22" fontWeight="800" fill="#181818" fontFamily="Plus Jakarta Sans, sans-serif">W</text>
    </svg>
  ),
  Eye: ({ open }) => <Icon d={open ? ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 9a3 3 0 100 6 3 3 0 000-6z"] : ["M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24", "M1 1l22 22"]} />,
  Lock: () => <Icon d={["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z", "M7 11V7a5 5 0 0110 0v4"]} />,
  Mail: () => <Icon d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"]} />,
  Crown: () => <Icon d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14" color={C.gold} />,
  Shield: () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  Info: () => <Icon d={["M12 22a10 10 0 100-20 10 10 0 000 20z", "M12 8v4", "M12 16h.01"]} />,
  Clear: () => <Icon d="M18 6L6 18M6 6l12 12" size={16} />,
};

// ─── SPINNER ─────────────────────────────────────────────────────────────────
const Spinner = ({ size = 20, color = C.gold }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" opacity="0.2" />
    <path d="M12 2a10 10 0 0110 10" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite" />
    </path>
  </svg>
);

// ─── SKELETON ────────────────────────────────────────────────────────────────
const Skeleton = ({ h = 16, w = "100%", mb = 10, radius = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: radius, marginBottom: mb, background: `linear-gradient(90deg, ${C.surface2} 25%, ${C.surface3} 50%, ${C.surface2} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.2s infinite" }} />
);

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body, #root { height: 100%; background: ${C.bg}; font-family: 'Plus Jakarta Sans', sans-serif; color: ${C.text}; }
    body { overscroll-behavior: none; }
    input, button, textarea { font-family: 'Plus Jakarta Sans', sans-serif; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
    @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .fade-in { animation: fadeIn 0.25s ease forwards; }
    .slide-up { animation: slideUp 0.3s ease forwards; }
    .shake { animation: shake 0.4s ease; }
  `}</style>
);

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [uiLang, setUiLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    getRedirectResult(auth)
      .then(r => { if (r?.user) onAuth(r.user, uiLang); })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || (!password && mode !== "forgot")) return;
    setError(""); setLoading(true);
    try {
      if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      } else if (mode === "login") {
        const r = await signInWithEmailAndPassword(auth, email, password);
        onAuth(r.user, uiLang);
      } else {
        const r = await createUserWithEmailAndPassword(auth, email, password);
        onAuth(r.user, uiLang);
      }
    } catch (e) {
      const msgs = {
        "auth/user-not-found": "No account with this email",
        "auth/wrong-password": "Incorrect password",
        "auth/email-already-in-use": "Email already registered",
        "auth/weak-password": "Password must be at least 6 characters",
        "auth/invalid-email": "Invalid email address",
        "auth/invalid-credential": "Invalid email or password",
        "auth/too-many-requests": "Too many attempts. Try again later",
      };
      setError(msgs[e.code] || "Something went wrong");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        localStorage.setItem("wordy_google_redirect", "1");
        await signInWithRedirect(auth, googleProvider);
      } else {
        const r = await signInWithPopup(auth, googleProvider);
        onAuth(r.user, uiLang);
      }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") setError("Google sign-in failed: " + e.code);
    }
  };

  const s = {
    page: { minHeight: "100vh", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", position: "relative" },
    card: { width: "100%", maxWidth: 380 },
    input: { width: "100%", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", color: C.text, fontSize: 15, outline: "none", marginBottom: 10, transition: "border-color 0.15s" },
    btn: { width: "100%", padding: "15px", background: C.gold, border: "none", borderRadius: 14, color: "#181818", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10, transition: "opacity 0.15s", fontFamily: "inherit" },
    btnOutline: { width: "100%", padding: "13px 15px", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", transition: "border-color 0.15s" },
    link: { background: "none", border: "none", color: C.blue, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" },
    error: { background: "rgba(248,113,113,0.1)", border: `1px solid ${C.error}`, borderRadius: 10, padding: "10px 14px", color: C.error, fontSize: 13, marginBottom: 12 },
    divider: { display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px", color: C.text3, fontSize: 12 },
    langBtn: { position: "fixed", top: 16, right: 16, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "6px 12px", color: C.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", zIndex: 100 },
  };

  return (
    <div style={s.page}>
      <GlobalStyles />

      {/* Language picker */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <button style={s.langBtn} onClick={() => setShowLangPicker(!showLangPicker)}>
          <span>{LANGUAGES[uiLang].flag}</span>
          <span>{LANGUAGES[uiLang].name}</span>
          <Icons.ChevronDown />
        </button>
        {showLangPicker && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.surface2, borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.5)", minWidth: 160, zIndex: 200, animation: "fadeIn 0.15s ease" }}>
            {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
              <button key={code} onClick={() => { setUiLang(code); setShowLangPicker(false); }} style={{ width: "100%", padding: "11px 16px", background: uiLang === code ? C.surface3 : "none", border: "none", color: C.text, fontSize: 14, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 18 }}>{flag}</span>{name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={s.card} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: C.gold, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Icons.Logo />
          </div>
          <div style={{ ...T.display, color: C.text, marginBottom: 6 }}>Wordy</div>
          <div style={{ ...T.bodyM, color: C.text2 }}>
            {mode === "login" ? "Welcome back 👋" : mode === "register" ? "Create your free account" : "Reset your password"}
          </div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {mode === "forgot" ? (
          resetSent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <div style={{ ...T.h2, color: C.text, marginBottom: 8 }}>Check your inbox!</div>
              <div style={{ ...T.bodyM, color: C.text2, marginBottom: 24 }}>We sent a password reset link to <strong>{email}</strong>. Check your spam folder too.</div>
              <button style={s.btn} onClick={() => { setMode("login"); setResetSent(false); }}>← Back to Sign In</button>
            </div>
          ) : (
            <>
              <div style={{ ...T.bodyM, color: C.text2, marginBottom: 16 }}>Enter your email and we'll send you a reset link.</div>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input style={{ ...s.input, marginBottom: 0, paddingLeft: 44 }} placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} type="email" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.text3 }}><Icons.Mail /></div>
              </div>
              <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
                {loading ? <Spinner size={18} color="#181818" /> : "Send Reset Link"}
              </button>
              <button style={s.btnOutline} onClick={() => { setMode("login"); setError(""); }}>← Back to Sign In</button>
            </>
          )
        ) : (
          <>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input style={{ ...s.input, marginBottom: 0, paddingLeft: 44 }} placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} type="email" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.text3 }}><Icons.Mail /></div>
            </div>
            <div style={{ position: "relative", marginBottom: mode === "login" ? 4 : 10 }}>
              <input style={{ ...s.input, marginBottom: 0, paddingLeft: 44, paddingRight: 48 }} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type={showPass ? "text" : "password"} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.text3 }}><Icons.Lock /></div>
              <button style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.text3, cursor: "pointer" }} onClick={() => setShowPass(!showPass)}>
                <Icons.Eye open={showPass} />
              </button>
            </div>
            {mode === "login" && (
              <div style={{ textAlign: "right", marginBottom: 14 }}>
                <button style={s.link} onClick={() => { setMode("forgot"); setError(""); }}>Forgot password?</button>
              </div>
            )}
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? <Spinner size={18} color="#181818" /> : mode === "login" ? "Sign In" : "Create Account"}
            </button>
            <div style={s.divider}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              or
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <button style={s.btnOutline} onClick={handleGoogle}>
              <Icons.Google />Continue with Google
            </button>
            <div style={{ textAlign: "center", ...T.bodyM, color: C.text2, marginTop: 8 }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button style={s.link} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LANG SELECT SCREEN ──────────────────────────────────────────────────────
function LangSelectScreen({ onSelect, nativeLang }) {
  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
      <GlobalStyles />
      <div style={{ marginBottom: 32 }} className="fade-in">
        <div style={{ ...T.display, color: C.text, marginBottom: 8, whiteSpace: "pre-line" }}>What language{"\n"}are you learning?</div>
        <div style={{ ...T.bodyM, color: C.text2 }}>Choose a language to get started</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="slide-up">
        {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
          <button key={code} style={{ padding: "18px 16px", borderRadius: 16, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}
            onClick={() => onSelect(code)}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <span style={{ fontSize: 28 }}>{flag}</span>
            <div>
              <div style={{ ...T.h3, color: C.text }}>{name}</div>
              <div style={{ ...T.caption, color: C.text3, marginTop: 2 }}>{code.toUpperCase()}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CONJUGATION TABLE ───────────────────────────────────────────────────────
function ConjugationTable({ grammar, targetLang }) {
  const [activeTense, setActiveTense] = useState(0);
  const [expandedCell, setExpandedCell] = useState(null);
  const [grammarLoading, setGrammarLoading] = useState(false);

  if (!grammar) return null;
  if (!grammar.isVerb) return (
    <div style={{ padding: "16px", background: C.surface2, borderRadius: 12, textAlign: "center" }}>
      <div style={{ ...T.bodyM, color: C.text3 }}>Conjugation not available for this word type</div>
    </div>
  );

  const tenses = grammar.tenses || [];
  const pronouns = grammar.pronouns || [];
  const table = grammar.table || {};
  const usage = grammar.usage || {};
  const currentTense = tenses[activeTense];
  const currentTable = table[currentTense] || {};
  const currentUsage = usage[currentTense] || {};

  return (
    <div style={{ marginTop: 8 }}>
      {/* Tense tabs */}
      <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
        {tenses.map((tense, i) => (
          <button key={i} onClick={() => { setActiveTense(i); setExpandedCell(null); }} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: "none", background: activeTense === i ? C.gold : C.surface2, color: activeTense === i ? "#181818" : C.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {tense}
          </button>
        ))}
      </div>

      {/* Conjugation grid */}
      <div style={{ background: C.surface2, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        {pronouns.map((pronoun, i) => {
          const form = currentTable[pronoun] || "—";
          const isExpanded = expandedCell === i;
          return (
            <div key={i}>
              <div onClick={() => setExpandedCell(isExpanded ? null : i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < pronouns.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", transition: "background 0.1s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ ...T.caption, color: C.text3, minWidth: 70 }}>{pronoun}</span>
                  <span style={{ ...T.h3, color: C.gold }}>{form}</span>
                </div>
                <div style={{ color: C.text3, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><Icons.ChevronRight /></div>
              </div>
              {isExpanded && currentUsage.examples && (
                <div style={{ padding: "12px 16px", background: C.surface3, borderBottom: i < pronouns.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  {currentUsage.examples.map((ex, j) => (
                    <div key={j} style={{ marginBottom: j < currentUsage.examples.length - 1 ? 8 : 0 }}>
                      <div style={{ ...T.bodyM, color: C.text, marginBottom: 2 }}>"{ex.sentence}"</div>
                      <div style={{ ...T.caption, color: C.text2 }}>{ex.translation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Usage rules */}
      {currentUsage.rules && currentUsage.rules.length > 0 && (
        <div style={{ background: C.surface2, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ ...T.overline, color: C.text3, marginBottom: 10 }}>How to use · {currentTense}</div>
          {currentUsage.rules.map((rule, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: C.gold, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>·</span>
              <span style={{ ...T.bodyM, color: C.text2 }}>{rule}</span>
            </div>
          ))}
          {currentUsage.examples?.map((ex, i) => (
            <div key={i} style={{ marginTop: 10, padding: "10px 12px", background: C.surface3, borderRadius: 10, borderLeft: `3px solid ${C.blue}` }}>
              <div style={{ ...T.bodyM, color: C.text, marginBottom: 2 }}>{ex.sentence}</div>
              <div style={{ ...T.caption, color: C.text2 }}>{ex.translation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RESULT CARD ─────────────────────────────────────────────────────────────
function ResultCard({ result, grammar, grammarLoading, toLang, onSave, onClose, onSpeak, speakingWord, onLoadGrammar, saved }) {
  const [showGrammar, setShowGrammar] = useState(false);
  const isSaved = saved?.some(s => s.word === result.word && s.toLang === toLang);

  return (
    <div className="slide-up" style={{ background: C.surface, borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}` }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...T.display, color: C.text, marginBottom: 4 }}>{result.main}</div>
            {result.phonetic && <div style={{ ...T.bodyM, color: C.text3, marginBottom: 4 }}>[{result.phonetic}]</div>}
            {result.partOfSpeech && (
              <span style={{ ...T.caption, background: C.surface2, color: C.blue, padding: "3px 8px", borderRadius: 6 }}>{result.partOfSpeech}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => onSpeak(result.main, toLang)} style={{ background: speakingWord === result.main ? "rgba(247,199,114,0.15)" : C.surface2, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: speakingWord === result.main ? C.gold : C.text2, transition: "all 0.15s" }}>
              <Icons.Speaker active={speakingWord === result.main} />
            </button>
            <button onClick={onClose} style={{ background: C.surface2, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: C.text3 }}>
              <Icons.Close />
            </button>
          </div>
        </div>

        {/* Alternatives */}
        {result.alternatives?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {result.alternatives.map((alt, i) => (
              <span key={i} style={{ ...T.bodyM, background: C.surface2, color: C.text2, padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.border}` }}>{alt}</span>
            ))}
          </div>
        )}
      </div>

      {/* Meanings */}
      {result.meanings?.length > 0 && (
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ ...T.overline, color: C.text3, marginBottom: 12 }}>Meanings & Examples</div>
          {result.meanings.map((m, i) => (
            <div key={i} style={{ marginBottom: i < result.meanings.length - 1 ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ ...T.h3, color: C.text }}>{m.translation}</span>
                <span style={{ ...T.caption, color: C.text3 }}>— {m.meaning}</span>
              </div>
              {m.example && (
                <div style={{ ...T.bodyM, color: C.text2, padding: "8px 12px", background: C.surface2, borderRadius: 10, borderLeft: `3px solid ${C.gold}` }}>
                  <div>{m.example}</div>
                  {m.exampleTranslation && <div style={{ color: C.text3, marginTop: 2, fontSize: 12 }}>{m.exampleTranslation}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
        <button onClick={onSave} style={{ flex: 1, padding: "12px", background: isSaved ? "rgba(247,199,114,0.1)" : C.surface2, border: `1.5px solid ${isSaved ? C.gold : C.border}`, borderRadius: 12, color: isSaved ? C.gold : C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
          <Icons.Bookmark filled={isSaved} />{isSaved ? "Saved" : "Save word"}
        </button>
        <button onClick={() => { setShowGrammar(!showGrammar); if (!grammar && !grammarLoading) onLoadGrammar(); }} style={{ flex: 1, padding: "12px", background: showGrammar ? "rgba(181,211,221,0.1)" : C.surface2, border: `1.5px solid ${showGrammar ? C.blue : C.border}`, borderRadius: 12, color: showGrammar ? C.blue : C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
          {grammarLoading ? <Spinner size={16} color={C.blue} /> : "📚"} Tenses
        </button>
      </div>

      {/* Grammar */}
      {showGrammar && (
        <div style={{ padding: "4px 20px 20px" }}>
          {grammarLoading ? (
            <div style={{ padding: "20px 0" }}>
              <Skeleton h={36} mb={8} /><Skeleton h={48} mb={6} /><Skeleton h={48} mb={6} /><Skeleton h={48} />
            </div>
          ) : grammar ? (
            <ConjugationTable grammar={grammar} targetLang={toLang} />
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── WORD DETAIL MODAL ───────────────────────────────────────────────────────
function WordDetailModal({ item, onClose, onDelete, onSpeak, speakingWord }) {
  const [grammar, setGrammar] = useState(null);
  const [grammarLoading, setGrammarLoading] = useState(false);

  const loadGrammar = async () => {
    const cacheKey = `grammar_${item.word}_${item.toLang}`;
    const cached = getCache(cacheKey);
    if (cached) { setGrammar(cached); return; }
    setGrammarLoading(true);
    try {
      const r = await fetch("/api/grammar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: item.word, translation: item.translation, toLang: item.toLang }) });
      const d = await r.json();
      setGrammar(d); setCache(cacheKey, d);
    } catch {} finally { setGrammarLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, overflowY: "auto", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", background: C.bg, borderRadius: "24px 24px 0 0", padding: "8px 20px 40px", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()} className="slide-up">
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "12px auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ ...T.h1, color: C.text }}>{item.word}</div>
            <div style={{ ...T.bodyM, color: C.text3 }}>{LANGUAGES[item.fromLang]?.flag} {LANGUAGES[item.fromLang]?.name} → {LANGUAGES[item.toLang]?.flag} {LANGUAGES[item.toLang]?.name}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onSpeak(item.translation || item.word, item.toLang)} style={{ background: C.surface, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: speakingWord === (item.translation || item.word) ? C.gold : C.text2 }}>
              <Icons.Speaker active={speakingWord === (item.translation || item.word)} />
            </button>
            {onDelete && <button onClick={() => { onDelete(item.id); onClose(); }} style={{ background: "rgba(248,113,113,0.1)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: C.error }}>
              <Icons.Delete />
            </button>}
            <button onClick={onClose} style={{ background: C.surface, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: C.text3 }}>
              <Icons.Close />
            </button>
          </div>
        </div>

        {item.result && (
          <>
            <div style={{ ...T.h2, color: C.gold, marginBottom: 12 }}>{item.result.main || item.translation}</div>
            {item.result.alternatives?.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {item.result.alternatives.map((alt, i) => <span key={i} style={{ ...T.bodyM, background: C.surface, color: C.text2, padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.border}` }}>{alt}</span>)}
              </div>
            )}
            {item.result.meanings?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...T.overline, color: C.text3, marginBottom: 10 }}>Meanings</div>
                {item.result.meanings.map((m, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ ...T.h3, color: C.text, marginBottom: 4 }}>{m.translation} <span style={{ ...T.bodyM, color: C.text3 }}>— {m.meaning}</span></div>
                    {m.example && <div style={{ ...T.bodyM, color: C.text2, padding: "8px 12px", background: C.surface, borderRadius: 10, borderLeft: `3px solid ${C.gold}` }}>{m.example}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button onClick={() => { if (!grammar && !grammarLoading) loadGrammar(); }} style={{ width: "100%", padding: 14, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, color: C.blue, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          {grammarLoading ? <Spinner size={16} color={C.blue} /> : "📚"} {grammar ? "Tenses loaded" : "Load Tenses & Conjugation"}
        </button>

        {grammar && <ConjugationTable grammar={grammar} targetLang={item.toLang} />}
      </div>
    </div>
  );
}

// ─── SETTINGS SCREEN ─────────────────────────────────────────────────────────
function SettingsScreen({ user, onClose, onLogout, onDeleteAccount, saved, history, nativeLang, targetLang, onChangeLang }) {
  const [section, setSection] = useState("main");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPass || !newPass) return;
    setLoading(true); setMsg("");
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      setMsg("✅ Password changed successfully!");
      setCurrentPass(""); setNewPass("");
    } catch { setMsg("❌ Incorrect current password"); }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!currentPass) return;
    setLoading(true); setMsg("");
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, cred);
      await deleteUser(user);
      onDeleteAccount();
    } catch { setMsg("❌ Incorrect password"); }
    setLoading(false);
  };

  const s = {
    page: { position: "fixed", inset: 0, background: C.bg, zIndex: 300, overflowY: "auto", fontFamily: "inherit" },
    section: { background: C.surface, borderRadius: 16, marginBottom: 12, overflow: "hidden" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" },
    input: { width: "100%", background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none", marginBottom: 10, fontFamily: "inherit" },
    btn: { width: "100%", padding: 13, background: C.gold, border: "none", borderRadius: 12, color: "#181818", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 },
  };

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px" }}>
          <button style={{ background: "none", border: "none", color: C.text2, cursor: "pointer" }} onClick={onClose}><Icons.Close /></button>
          <div style={{ ...T.h1, color: C.text }}>{section === "main" ? "Settings" : section === "password" ? "Change Password" : "Delete Account"}</div>
        </div>

        {section === "main" ? (
          <>
            {/* Profile */}
            <div style={s.section}>
              <div style={{ ...T.overline, color: C.text3, padding: "12px 16px 8px" }}>Profile</div>
              <div style={{ padding: "12px 16px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, background: C.gold, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", ...T.h1, color: "#181818" }}>
                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ ...T.h3, color: C.text }}>{user.displayName || "User"}</div>
                  <div style={{ ...T.bodyM, color: C.text2 }}>{user.email}</div>
                </div>
              </div>
            </div>

            {/* Learning lang */}
            <div style={s.section}>
              <div style={{ ...T.overline, color: C.text3, padding: "12px 16px 8px" }}>Learning</div>
              <div style={{ ...s.row, cursor: "default", borderBottom: "none" }}>
                <div>
                  <div style={{ ...T.bodyL, color: C.text }}>Language pair</div>
                  <div style={{ ...T.bodyM, color: C.text2 }}>{LANGUAGES[nativeLang]?.flag} {LANGUAGES[nativeLang]?.name} → {LANGUAGES[targetLang]?.flag} {LANGUAGES[targetLang]?.name}</div>
                </div>
                <button onClick={() => { onClose(); onChangeLang(); }} style={{ background: "none", border: "none", color: C.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Change</button>
              </div>
            </div>

            {/* Stats */}
            <div style={s.section}>
              <div style={{ ...T.overline, color: C.text3, padding: "12px 16px 8px" }}>Statistics</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "8px 16px 16px" }}>
                {[{ label: "Saved words", value: saved, color: C.gold }, { label: "Translated", value: history, color: C.blue }].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.surface2, borderRadius: 12, padding: 14, textAlign: "center" }}>
                    <div style={{ ...T.h1, color }}>{value}</div>
                    <div style={{ ...T.caption, color: C.text3, marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PRO */}
            <div style={{ background: "linear-gradient(135deg, #2A2010, #1E1A0A)", border: `1px solid #3A2E10`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ ...T.h3, color: C.gold }}>⭐ Free Plan</div>
                  <div style={{ ...T.caption, color: C.text3, marginTop: 4 }}>Upgrade for unlimited access</div>
                </div>
                <button style={{ background: C.gold, border: "none", borderRadius: 10, padding: "8px 16px", color: "#181818", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>PRO →</button>
              </div>
            </div>

            {/* Account */}
            <div style={s.section}>
              <div style={{ ...T.overline, color: C.text3, padding: "12px 16px 8px" }}>Account</div>
              <button style={{ ...s.row, width: "100%", background: "none", border: "none", color: C.text, fontFamily: "inherit", fontSize: 15, textAlign: "left" }} onClick={() => setSection("password")}>
                Change password<Icons.ChevronRight />
              </button>
              <button style={{ ...s.row, width: "100%", background: "none", border: "none", color: C.error, fontFamily: "inherit", fontSize: 15, textAlign: "left", borderBottom: "none" }} onClick={() => setSection("deleteAccount")}>
                Delete account
              </button>
            </div>

            {/* Docs */}
            <div style={s.section}>
              <div style={{ ...T.overline, color: C.text3, padding: "12px 16px 8px" }}>Documentation</div>
              <div style={{ ...s.row }}>
                <span style={{ ...T.bodyL, color: C.text }}>Terms of Service</span><Icons.ChevronRight />
              </div>
              <div style={{ ...s.row, borderBottom: "none" }}>
                <span style={{ ...T.bodyL, color: C.text }}>Privacy Policy</span><Icons.ChevronRight />
              </div>
            </div>

            <button onClick={onLogout} style={{ width: "100%", padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text2, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
          </>
        ) : section === "password" ? (
          <div style={s.section}>
            <div style={{ padding: 16 }}>
              <div style={{ ...T.bodyM, color: C.text2, marginBottom: 16 }}>Enter your current and new password</div>
              {msg && <div style={{ padding: "10px 14px", borderRadius: 10, background: msg.includes("✅") ? "rgba(110,231,183,0.1)" : "rgba(248,113,113,0.1)", color: msg.includes("✅") ? C.green : C.error, fontSize: 13, marginBottom: 12 }}>{msg}</div>}
              <input style={s.input} type="password" placeholder="Current password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
              <input style={s.input} type="password" placeholder="New password (min. 6 chars)" value={newPass} onChange={e => setNewPass(e.target.value)} />
              <button style={s.btn} onClick={handleChangePassword} disabled={loading}>{loading ? <Spinner size={16} color="#181818" /> : "Change Password"}</button>
              <button style={{ ...s.btn, background: C.surface2, color: C.text, marginTop: 8 }} onClick={() => setSection("main")}>← Back</button>
            </div>
          </div>
        ) : (
          <div style={s.section}>
            <div style={{ padding: 16 }}>
              <div style={{ ...T.bodyM, color: C.error, marginBottom: 16 }}>⚠️ This is permanent. All your data will be deleted.</div>
              {msg && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", color: C.error, fontSize: 13, marginBottom: 12 }}>{msg}</div>}
              <input style={s.input} type="password" placeholder="Enter password to confirm" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
              <button style={{ ...s.btn, background: C.error, color: "#fff" }} onClick={handleDelete} disabled={loading}>{loading ? <Spinner size={16} color="#fff" /> : "Delete Account Permanently"}</button>
              <button style={{ ...s.btn, background: C.surface2, color: C.text, marginTop: 8 }} onClick={() => setSection("main")}>← Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("loading"); // loading | auth | langSelect | main
  const [nativeLang, setNativeLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("translate");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Translate tab state
  const [word, setWord] = useState("");
  const [result, setResult] = useState(null);
  const [grammar, setGrammar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [speakingWord, setSpeakingWord] = useState("");
  const [searchSaved, setSearchSaved] = useState("");
  const [searchHistory, setSearchHistory] = useState("");
  const [inputShake, setInputShake] = useState(false);
  const audioRef = useRef(null);
  const sugDebounce = useRef(null);
  const inputRef = useRef(null);

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        await loadUserData(u.uid);
      } else {
        setStep("auth");
      }
    });
    if (localStorage.getItem("wordy_google_redirect")) {
      localStorage.removeItem("wordy_google_redirect");
      getRedirectResult(auth).catch(() => {});
    }
    return unsub;
  }, []);

  const loadUserData = async (uid) => {
    try {
      const cached = localStorage.getItem(`wordy_langs_${uid}`);
      if (cached) {
        const { native, target } = JSON.parse(cached);
        if (native && target) { setNativeLang(native); setTargetLang(target); setStep("main"); }
        else setStep("langSelect");
      }
      const prefDoc = await getDoc(doc(db, "users", uid, "settings", "langs"));
      if (prefDoc.exists()) {
        const { native, target } = prefDoc.data();
        setNativeLang(native); setTargetLang(target); setStep("main");
        localStorage.setItem(`wordy_langs_${uid}`, JSON.stringify({ native, target }));
      } else if (!cached) {
        setStep("langSelect");
      }
      const [savedSnap, histSnap] = await Promise.all([
        getDocs(query(collection(db, "users", uid, "saved"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "users", uid, "history"), orderBy("createdAt", "desc"))),
      ]);
      setSaved(savedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHistory(histSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); setStep("langSelect"); }
  };

  const handleAuth = async (u, uiLang) => {
    setUser(u);
    setNativeLang(uiLang || "en");
    await loadUserData(u.uid);
  };

  const handleLangSelect = async (targetCode) => {
    setTargetLang(targetCode);
    setStep("main");
    if (user) {
      const data = { native: nativeLang, target: targetCode };
      await setDoc(doc(db, "users", user.uid, "settings", "langs"), data);
      localStorage.setItem(`wordy_langs_${user.uid}`, JSON.stringify(data));
    }
  };

  const handleSwapLangs = () => {
    setNativeLang(targetLang);
    setTargetLang(nativeLang);
    setResult(null); setGrammar(null);
  };

  // Suggestions
  const fetchSuggestions = useCallback(async (text) => {
    if (text.length < 2) { setSuggestions([]); return; }
    setSugLoading(true);
    try {
      const r = await fetch("/api/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix: text, lang: nativeLang }) });
      const d = await r.json();
      setSuggestions(d.suggestions || []);
    } catch { setSuggestions([]); }
    setSugLoading(false);
  }, [nativeLang]);

  const handleInput = (val) => {
    setWord(val);
    clearTimeout(sugDebounce.current);
    sugDebounce.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  // Translate
  const handleTranslate = async (w = word) => {
    if (!w.trim()) { setInputShake(true); setTimeout(() => setInputShake(false), 400); return; }
    setSuggestions([]);
    const cacheKey = `tr_${w.trim()}_${nativeLang}_${targetLang}`;
    const cached = getCache(cacheKey);
    if (cached) { setResult(cached); setGrammar(null); return; }
    setLoading(true); setResult(null); setGrammar(null);
    try {
      const r = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: w.trim(), fromLang: nativeLang, toLang: targetLang }) });
      const d = await r.json();
      if (d.error) { setResult({ error: d.error }); } else {
        setResult(d); setCache(cacheKey, d);
        // Save to history
        if (user) {
          const item = { word: w.trim(), translation: d.main, fromLang: nativeLang, toLang: targetLang, result: d, createdAt: serverTimestamp() };
          const ref = await addDoc(collection(db, "users", user.uid, "history"), item);
          setHistory(prev => {
            const updated = [{ id: ref.id, ...item, createdAt: new Date() }, ...prev];
            if (updated.length > 100) {
              const toDelete = updated.slice(100);
              toDelete.forEach(i => deleteDoc(doc(db, "users", user.uid, "history", i.id)));
              return updated.slice(0, 100);
            }
            return updated;
          });
        }
      }
    } catch { setResult({ error: "Network error. Please try again." }); }
    setLoading(false);
  };

  // Grammar
  const loadGrammar = async () => {
    if (!result || !result.main) return;
    const cacheKey = `grammar_${word}_${targetLang}`;
    const cached = getCache(cacheKey);
    if (cached) { setGrammar(cached); return; }
    setGrammarLoading(true);
    try {
      const r = await fetch("/api/grammar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word, translation: result.main, toLang: targetLang }) });
      const d = await r.json();
      setGrammar(d); setCache(cacheKey, d);
    } catch {} finally { setGrammarLoading(false); }
  };

  // Save word
  const handleSave = async () => {
    if (!result || !user) return;
    const already = saved.find(s => s.word === word && s.toLang === targetLang);
    if (already) {
      await deleteDoc(doc(db, "users", user.uid, "saved", already.id));
      setSaved(prev => prev.filter(s => s.id !== already.id));
      return;
    }
    const item = { word, translation: result.main, fromLang: nativeLang, toLang: targetLang, result, createdAt: serverTimestamp() };
    const ref = await addDoc(collection(db, "users", user.uid, "saved"), item);
    setSaved(prev => [{ id: ref.id, ...item, createdAt: new Date() }, ...prev]);
  };

  // TTS
  const speak = async (text, lang) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    if (speakingWord === text) { setSpeakingWord(""); return; }
    setSpeakingWord(text);
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
      if (!r.ok) throw new Error("TTS failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeakingWord(""); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setSpeakingWord(""); audioRef.current = null; };
      audio.play();
    } catch {
      // Fallback
      const langMap = { en: "en-US", es: "es-ES", pt: "pt-PT", de: "de-DE", fr: "fr-FR", uk: "uk-UA", ru: "ru-RU" };
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = langMap[lang] || "en-US"; utt.rate = 0.9;
      utt.onend = () => setSpeakingWord(""); utt.onerror = () => setSpeakingWord("");
      window.speechSynthesis?.speak(utt);
    }
  };

  // Delete saved/history
  const deleteSaved = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "saved", id));
    setSaved(prev => prev.filter(i => i.id !== id));
  };
  const deleteHistory = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "history", id));
    setHistory(prev => prev.filter(i => i.id !== id));
  };
  const clearHistory = async () => {
    const batch = writeBatch(db);
    history.forEach(i => batch.delete(doc(db, "users", user.uid, "history", i.id)));
    await batch.commit();
    setHistory([]);
  };
  const handleLogout = async () => {
    if (user) localStorage.removeItem(`wordy_langs_${user.uid}`);
    setSaved([]); setHistory([]); setResult(null);
    await signOut(auth);
    setUser(null); setStep("auth");
  };

  const formatDate = (d) => {
    if (!d) return "";
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // ── RENDER STEPS ──
  if (step === "loading") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlobalStyles />
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 64, height: 64, background: C.gold, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Icons.Logo /></div>
        <Spinner size={32} />
      </div>
    </div>
  );

  if (step === "auth") return <AuthScreen onAuth={handleAuth} />;
  if (step === "langSelect") return <LangSelectScreen onSelect={handleLangSelect} nativeLang={nativeLang} />;

  // ── MAIN APP ──
  const filteredSaved = saved.filter(i => i.word?.toLowerCase().includes(searchSaved.toLowerCase()) || i.translation?.toLowerCase().includes(searchSaved.toLowerCase()));
  const filteredHistory = history.filter(i => i.word?.toLowerCase().includes(searchHistory.toLowerCase()) || i.translation?.toLowerCase().includes(searchHistory.toLowerCase()));

  return (
    <div style={{ height: "100vh", height: "100dvh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "inherit", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <GlobalStyles />

      {/* Header */}
      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, background: C.gold, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Logo /></div>
          <span style={{ ...T.h2, color: C.text }}>Wordy</span>
        </div>
        <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", padding: 6 }}><Icons.Settings /></button>
      </div>

      {/* Language bar */}
      <div style={{ padding: "12px 16px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 14, padding: "10px 14px" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ ...T.caption, color: C.text3, marginBottom: 2 }}>From</div>
            <div style={{ ...T.h3, color: C.text }}>{LANGUAGES[nativeLang]?.flag} {LANGUAGES[nativeLang]?.name}</div>
          </div>
          <button onClick={handleSwapLangs} style={{ background: C.surface2, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: C.gold, transition: "transform 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "rotate(180deg)"}
            onMouseLeave={e => e.currentTarget.style.transform = "rotate(0deg)"}
          ><Icons.Swap /></button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ ...T.caption, color: C.text3, marginBottom: 2 }}>To</div>
            <div style={{ ...T.h3, color: C.text }}>{LANGUAGES[targetLang]?.flag} {LANGUAGES[targetLang]?.name}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>

        {/* ── TRANSLATE TAB ── */}
        {activeTab === "translate" && (
          <div>
            {/* Input */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input ref={inputRef} style={{ width: "100%", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 44px 14px 16px", color: C.text, fontSize: 16, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }}
                    className={inputShake ? "shake" : ""}
                    placeholder="Enter a word or phrase..."
                    value={word}
                    onChange={e => handleInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleTranslate()}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                  {word && <button onClick={() => { setWord(""); setSuggestions([]); setResult(null); setGrammar(null); inputRef.current?.focus(); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.text3, cursor: "pointer" }}><Icons.Clear /></button>}
                </div>
                <button onClick={() => handleTranslate()} disabled={loading} style={{ width: 52, height: 52, background: loading ? C.surface2 : C.gold, border: "none", borderRadius: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                  {loading ? <Spinner size={20} color={C.text3} /> : <div style={{ color: "#181818" }}><Icons.Arrow /></div>}
                </button>
              </div>

              {/* Suggestions dropdown */}
              {(suggestions.length > 0 || sugLoading) && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 60, background: C.surface2, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50, border: `1px solid ${C.border}` }} className="fade-in">
                  {sugLoading && <div style={{ padding: "12px 16px", display: "flex", gap: 8, alignItems: "center", color: C.text3 }}><Spinner size={14} color={C.text3} /><span style={{ fontSize: 13 }}>Finding words...</span></div>}
                  {suggestions.map((s, i) => (
                    <div key={i} onClick={() => { setWord(s); setSuggestions([]); handleTranslate(s); }} style={{ padding: "12px 16px", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 14, color: C.text, transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface3}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >{s}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div style={{ background: C.surface, borderRadius: 20, padding: 20, border: `1px solid ${C.border}` }}>
                <Skeleton h={32} w="60%" mb={12} /><Skeleton h={16} w="40%" mb={16} />
                <Skeleton h={14} w="80%" mb={8} /><Skeleton h={14} w="70%" mb={8} /><Skeleton h={14} w="75%" />
              </div>
            )}

            {/* Error */}
            {result?.error && (
              <div style={{ background: "rgba(248,113,113,0.1)", border: `1px solid ${C.error}`, borderRadius: 16, padding: 16, color: C.error, fontSize: 14 }}>
                {result.error}
                <button onClick={() => handleTranslate()} style={{ display: "block", marginTop: 8, background: "none", border: "none", color: C.blue, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Try again →</button>
              </div>
            )}

            {/* Result */}
            {result && !result.error && !loading && (
              <ResultCard result={result} grammar={grammar} grammarLoading={grammarLoading} toLang={targetLang} onSave={handleSave} onClose={() => { setResult(null); setGrammar(null); }} onSpeak={speak} speakingWord={speakingWord} onLoadGrammar={loadGrammar} saved={saved} />
            )}
          </div>
        )}

        {/* ── SAVED TAB ── */}
        {activeTab === "saved" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 14, padding: "10px 14px", marginBottom: 12 }}>
              <Icons.Search /><input style={{ flex: 1, background: "none", border: "none", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} placeholder="Search saved words..." value={searchSaved} onChange={e => setSearchSaved(e.target.value)} />
              {searchSaved && <button onClick={() => setSearchSaved("")} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer" }}><Icons.Clear /></button>}
            </div>

            {filteredSaved.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔖</div>
                <div style={{ ...T.h3, color: C.text2, marginBottom: 6 }}>{searchSaved ? "No results" : "No saved words yet"}</div>
                <div style={{ ...T.bodyM, color: C.text3 }}>{searchSaved ? "Try a different search" : "Save words from the Translate tab"}</div>
              </div>
            ) : (
              <div style={{ background: C.surface, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ ...T.overline, color: C.text3 }}>Saved words ({filteredSaved.length})</span>
                </div>
                {filteredSaved.map((item, i) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: i < filteredSaved.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
                    onClick={() => setSelectedItem({ ...item, type: "saved" })}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ ...T.h3, color: C.text }}>{item.word}</span>
                        <span style={{ ...T.bodyM, color: C.gold }}>→ {item.translation}</span>
                      </div>
                      <span style={{ ...T.caption, color: C.text3 }}>{LANGUAGES[item.fromLang]?.flag} → {LANGUAGES[item.toLang]?.flag} · {formatDate(item.createdAt)}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteSaved(item.id); }} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 6 }}><Icons.Delete /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 14, padding: "10px 14px" }}>
                <Icons.Search /><input style={{ flex: 1, background: "none", border: "none", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} placeholder="Search history..." value={searchHistory} onChange={e => setSearchHistory(e.target.value)} />
                {searchHistory && <button onClick={() => setSearchHistory("")} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer" }}><Icons.Clear /></button>}
              </div>
              {history.length > 0 && <button onClick={clearHistory} style={{ padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "none", borderRadius: 14, color: C.error, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Clear all</button>}
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
                <div style={{ ...T.h3, color: C.text2, marginBottom: 6 }}>{searchHistory ? "No results" : "No history yet"}</div>
                <div style={{ ...T.bodyM, color: C.text3 }}>{searchHistory ? "Try a different search" : "Translated words appear here"}</div>
              </div>
            ) : (
              <div style={{ background: C.surface, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ ...T.overline, color: C.text3 }}>History ({filteredHistory.length})</span>
                </div>
                {filteredHistory.map((item, i) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: i < filteredHistory.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
                    onClick={() => setSelectedItem({ ...item, type: "history" })}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ ...T.h3, color: C.text }}>{item.word}</span>
                        <span style={{ ...T.bodyM, color: C.blue }}>→ {item.translation}</span>
                      </div>
                      <span style={{ ...T.caption, color: C.text3 }}>{LANGUAGES[item.fromLang]?.flag} → {LANGUAGES[item.toLang]?.flag} · {formatDate(item.createdAt)}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteHistory(item.id); }} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 6 }}><Icons.Delete /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>

      {/* Bottom Nav */}
      <div style={{ flexShrink: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[
          { id: "translate", label: "Translate", icon: <Icons.Translate /> },
          { id: "saved", label: `Saved${saved.length > 0 ? ` (${saved.length})` : ""}`, icon: <Icons.Bookmark filled={activeTab === "saved"} /> },
          { id: "history", label: "History", icon: <Icons.History /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "12px 4px 10px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeTab === tab.id ? C.gold : C.text3, transition: "color 0.15s", fontFamily: "inherit" }}>
            {tab.icon}
            <span style={{ ...T.caption }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Settings */}
      {showSettings && (
        <SettingsScreen user={user} onClose={() => setShowSettings(false)} onLogout={handleLogout} onDeleteAccount={() => { setUser(null); setStep("auth"); }} saved={saved.length} history={history.length} nativeLang={nativeLang} targetLang={targetLang} onChangeLang={() => setStep("langSelect")} />
      )}

      {/* Word detail modal */}
      {selectedItem && (
        <WordDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onDelete={selectedItem.type === "saved" ? deleteSaved : deleteHistory} onSpeak={speak} speakingWord={speakingWord} />
      )}
    </div>
  );
}
