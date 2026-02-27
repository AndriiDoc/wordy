import { useState, useRef, useEffect } from "react";
import { auth, googleProvider, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword, updateProfile, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc, setDoc } from "firebase/firestore";

const LANGUAGES = { en: "English", es: "Español", pt: "Português", de: "Deutsch", ru: "Русский", fr: "Français", uk: "Українська" };


const I18N = {
  en: {
    learnLang: "What language\nare you learning?",
    learnSub: "Choose the language you want to learn",
    nativeLang: "What's your\nnative language?",
    nativeSub: "Choose your native language",
    translate: "Translate",
    saved: "Saved",
    history: "History",
    placeholder: {t.placeholder},
    translations: {t.translations2},
    meanings: "Meanings",
    conjugation: "Conjugation",
    saveWord: "Save word",
    change: "Change",
    loading: "Loading...",
    noSaved: "{t.noSaved}",
    noHistory: "No translations yet",
    settings: "{t.settings}",
    signOut: "Sign out",
    learningLang: "{t.learningLang}",
    subscription: {t.subscription},
    freePlan: {t.freePlan},
    freeDesc: {t.freeDesc},
    statistics: {t.statistics},
    savedWords: {t.savedWords},
    translations2: "Translations",
    account: {t.account},
    changePassword: {t.changePassword},
    deleteAccount: {t.deleteAccount},
    back: "{t.back}",
    currentPass: "Current password",
    newPass: "New password (min. 6 characters)",
    changePassTitle: {t.changePassword},
    changePassSub: "{t.changePassSub}",
    deleteTitle: "Delete account",
    deleteSub: "{t.deleteSub}",
    confirmPass: "Enter password to confirm",
    deleteBtn: "{t.deleteBtn}",
    tenses: "Tenses",
  },
  uk: {
    learnLang: "Яку мову\nвивчаєш?",
    learnSub: "Вибери мову для вивчення",
    nativeLang: "Яка твоя\nрідна мова?",
    nativeSub: "Вибери свою рідну мову",
    translate: "Переклад",
    saved: "Збережені",
    history: "Історія",
    placeholder: "Введи слово або фразу...",
    translations: "Переклади",
    meanings: "Значення",
    conjugation: "Відміна",
    saveWord: "{t.saveWord}",
    change: "Змінити",
    loading: "Завантаження...",
    noSaved: "Ще немає збережених слів",
    noHistory: "Ще немає перекладів",
    settings: "⚙️ Налаштування",
    signOut: "Вийти",
    learningLang: "Мова навчання",
    subscription: "Підписка",
    freePlan: "Безкоштовний план",
    freeDesc: "30 перекладів/день · 20 збережених слів",
    statistics: "Статистика",
    savedWords: "Збережено слів",
    translations2: "Перекладів",
    account: "Акаунт",
    changePassword: "Змінити пароль",
    deleteAccount: "Видалити акаунт",
    back: "← Назад",
    currentPass: "Поточний пароль",
    newPass: "Новий пароль (мін. 6 символів)",
    changePassTitle: "Змінити пароль",
    changePassSub: "Введи поточний і новий пароль",
    deleteTitle: "Видалити акаунт",
    deleteSub: "Це незворотня дія. Всі твої дані будуть видалені.",
    confirmPass: "Введи пароль для підтвердження",
    deleteBtn: "Видалити акаунт назавжди",
    tenses: "Часи",
  },
  es: {
    learnLang: "¿Qué idioma\naprendes?",
    learnSub: "Elige el idioma que quieres aprender",
    nativeLang: "¿Cuál es tu\nidioma nativo?",
    nativeSub: "Elige tu idioma nativo",
    translate: "Traducir",
    saved: "Guardados",
    history: "Historial",
    placeholder: "Escribe una palabra o frase...",
    translations: "Traducciones",
    meanings: "Significados",
    conjugation: "Conjugación",
    saveWord: "Guardar palabra",
    change: "Cambiar",
    loading: "Cargando...",
    noSaved: "No hay palabras guardadas",
    noHistory: "No hay traducciones aún",
    settings: "⚙️ Ajustes",
    signOut: "Salir",
    learningLang: "Idioma de aprendizaje",
    subscription: "Suscripción",
    freePlan: "Plan gratuito",
    freeDesc: "30 traducciones/día · 20 palabras guardadas",
    statistics: "Estadísticas",
    savedWords: "Palabras guardadas",
    translations2: "Traducciones",
    account: "Cuenta",
    changePassword: "Cambiar contraseña",
    deleteAccount: "Eliminar cuenta",
    back: "← Atrás",
    currentPass: "Contraseña actual",
    newPass: "Nueva contraseña (mín. 6 caracteres)",
    changePassTitle: "Cambiar contraseña",
    changePassSub: "Introduce tu contraseña actual y la nueva",
    deleteTitle: "Eliminar cuenta",
    deleteSub: "Esta acción es irreversible. Todos tus datos serán eliminados.",
    confirmPass: "Introduce la contraseña para confirmar",
    deleteBtn: "Eliminar cuenta permanentemente",
    tenses: "Tiempos",
  },
};
// Fallback to English for missing langs
["pt","de","fr","ru"].forEach(l => { I18N[l] = I18N.en; });

const UI_LANGS = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

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

// ---- ICONS ----
const Icons = {
  Translate: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8l6 6"/><path d="M4 6h7M7 4v2"/><path d="M2 16s2-2 6-2 8 4 8 4"/>
      <path d="M22 12h-4l-2 8"/><path d="M16 12l2-6 2 6"/><line x1="17" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  Bookmark: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  History: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Settings: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Crown: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M5 20V10l7-6 7 6v10"/>
      <path d="M9 20v-5h6v5"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Arrow: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Delete: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Save: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  Table: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  ),
  Google: () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  Speaker: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#F7C772" : "currentColor"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  ),
  Logo: () => (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
      <path d="M6 12L13 36L20 22L27 36L34 12" stroke="#181818" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="40" cy="14" r="4" fill="#181818"/>
      <circle cx="40" cy="26" r="2.5" fill="#181818" opacity="0.5"/>
      <circle cx="40" cy="35" r="1.5" fill="#181818" opacity="0.3"/>
    </svg>
  ),
};

// ---- TYPOGRAPHY TOKENS ----
const T = {
  display: { fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  h1: { fontSize: 24, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  h2: { fontSize: 20, fontWeight: 600, lineHeight: 1.3, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  h3: { fontSize: 18, fontWeight: 600, lineHeight: 1.35, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  bodyL: { fontSize: 16, fontWeight: 400, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  bodyM: { fontSize: 14, fontWeight: 400, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  bodyMedium: { fontSize: 14, fontWeight: 500, lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.4, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  overline: { fontSize: 11, fontWeight: 700, lineHeight: 1.4, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', sans-serif" },
};

// ---- DESIGN TOKENS ----
const C = {
  bg: "#1A1A1A",
  surface: "#242424",
  surface2: "#2E2E2E",
  border: "#333",
  border2: "#3A3A3A",
  text: "#F0F0F0",
  text2: "#A0A0A0",
  text3: "#606060",
  gold: "#F7C772",
  blue: "#B5D3DD",
  error: "#F87171",
};

const s = {
  page: { background: C.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  container: { maxWidth: 480, margin: "0 auto", padding: "0 20px 100px", paddingTop: 16 },

  // Auth
  authPage: { background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", maxWidth: 400, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  authLogoWrap: { width: 64, height: 64, background: C.gold, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  authTitle: { ...T.display, color: C.text, textAlign: "center", marginBottom: 6 },
  authSub: { ...T.bodyM, color: C.text2, textAlign: "center", marginBottom: 36 },
  authInput: { width: "100%", padding: "14px 16px", ...T.bodyL, borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 10, boxSizing: "border-box", outline: "none" },
  authBtn: { width: "100%", padding: "15px", ...T.bodyL, fontWeight: 700, borderRadius: 14, border: "none", background: C.gold, color: "#181818", fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", marginBottom: 10 },
  authBtnOutline: { width: "100%", padding: "14px", ...T.bodyM, borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  authDivider: { display: "flex", alignItems: "center", gap: 12, margin: "6px 0 12px", ...T.caption, color: C.text3 },
  authSwitch: { ...T.bodyM, color: C.text2, textAlign: "center", marginTop: 16 },
  authLink: { color: C.blue, background: "none", border: "none", ...T.bodyM, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer" },
  errorMsg: { ...T.caption, color: C.error, textAlign: "center", marginBottom: 10, padding: "10px", background: "rgba(248,113,113,0.1)", borderRadius: 10 },

  // Header
  header: { padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerLogo: { ...T.h2, color: C.text },
  headerUser: { ...T.caption, color: C.text2, display: "flex", alignItems: "center", gap: 8 },
  logoutBtn: { background: "none", border: "none", color: C.blue, ...T.caption, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer" },

  // Lang select
  langGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 },
  langBtn: { padding: "16px", ...T.bodyM, fontWeight: 600, borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "left", transition: "all 0.15s" },

  // Lang bar
  langBar: { display: "flex", alignItems: "center", background: C.surface, borderRadius: 12, padding: "10px 14px", marginBottom: 16, gap: 8 },
  langBarText: { ...T.bodyM, color: C.text2, flex: 1 },

  // Tabs
  tabs: { display: "flex", background: C.surface, borderRadius: 14, padding: 4, gap: 3, marginBottom: 16 },
  tab: { flex: 1, padding: "10px 6px", borderRadius: 11, border: "none", ...T.caption, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" },
  tabActive: { background: C.surface2, color: C.text, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  tabInactive: { background: "none", color: C.text3 },

  // Input
  inputWrapper: { position: "relative", marginBottom: 14 },
  inputRow: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "14px 16px", ...T.h3, borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none" },
  inputBtn: { width: 52, height: 52, borderRadius: 14, border: "none", background: C.gold, color: "#181818", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  dropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 60, background: C.surface2, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 100, overflow: "hidden" },
  suggestionItem: { padding: "12px 16px", ...T.bodyL, cursor: "pointer", borderBottom: `1px solid ${C.border}`, color: C.text },

  // Result card
  resultCard: { background: C.surface, borderRadius: 16, padding: 20, marginBottom: 14 },
  wordTitle: { ...T.h1, color: C.text, marginBottom: 2 },
  wordSub: { ...T.caption, color: C.text2, marginBottom: 16 },
  sectionLabel: { ...T.overline, color: C.text3, marginBottom: 10 },
  tags: { display: "flex", flexWrap: "wrap", gap: 7 },
  tag: { background: "#1E3040", color: C.blue, padding: "5px 12px", borderRadius: 20, ...T.bodyM, fontWeight: 500 },

  // Meaning card
  meaningCard: { background: C.surface2, borderRadius: 12, padding: 14, marginBottom: 8, borderLeft: "3px solid" },
  meaningTrans: { ...T.h3, marginBottom: 4 },
  meaningText: { ...T.bodyM, color: "#CCC", marginBottom: 6 },
  meaningExample: { ...T.caption, color: C.text2, fontStyle: "italic" },

  // Conjugation
  tenseTabs: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 10, scrollbarWidth: "none" },
  tenseTab: { background: C.surface2, color: C.text2, border: "none", borderRadius: 20, padding: "7px 14px", ...T.caption, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" },
  tenseTabActive: { background: C.gold, color: "#181818" },
  conjCard: { background: C.surface2, borderRadius: 12, overflow: "hidden" },
  conjRow: { display: "flex", padding: "11px 14px", borderBottom: `1px solid ${C.border}` },
  pronounCol: { color: C.text2, fontWeight: 500, width: "42%", ...T.bodyM },
  formCol: { color: C.text, fontWeight: 600, ...T.bodyM },

  // Save button
  saveBtn: { width: "100%", padding: "14px", borderRadius: 14, border: "none", background: C.gold, color: "#181818", ...T.bodyL, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },

  // Saved/History list
  listBox: { background: C.surface, borderRadius: 16, padding: 16, marginBottom: 14 },
  listTitle: { ...T.h3, color: C.text, marginBottom: 14 },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` },
  listWord: { ...T.bodyL, fontWeight: 600, color: C.text },
  listTrans: { ...T.bodyM, color: C.blue, marginTop: 2 },
  listMeta: { ...T.caption, color: C.text3, marginTop: 3 },
  deleteBtn: { background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" },
  tensesBtn: { background: C.surface2, border: "none", color: C.blue, ...T.caption, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 },
  emptyState: { textAlign: "center", color: C.text3, padding: "40px 0", ...T.bodyM },

  // Tenses modal
  tensesModal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end" },
  tensesSheet: { background: C.bg, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxHeight: "82vh", overflowY: "auto" },

  // Section
  section: { marginBottom: 18 },

  // Bottom nav
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0 20px", zIndex: 50 },
  navItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  navLabel: { ...T.caption, fontWeight: 600 },
  navDot: { width: 4, height: 4, borderRadius: 2, background: C.gold },
};

// Conjugation table
function ConjugationTable({ forms, targetLang, word }) {
  const pronouns = PRONOUNS[targetLang] || PRONOUNS.en;
  const tenseNames = forms ? Object.keys(forms).filter(t => forms[t] && forms[t] !== "-") : [];
  const [activeTense, setActiveTense] = useState(tenseNames[0] || "");
  if (!forms || tenseNames.length === 0) return null;
  const currentForms = forms[activeTense];
  let conjugations = [];
  if (typeof currentForms === "string") conjugations = currentForms.split(/\s*\/\s*/).map(f => f.trim());
  else if (Array.isArray(currentForms)) conjugations = currentForms;

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>
        {t.conjugation} — <span style={{ color: C.gold, textTransform: "none", fontStyle: "italic", fontWeight: 600 }}>{word}</span>
      </div>
      <div style={s.tenseTabs}>
        {tenseNames.map(t => (
          <button key={t} style={{ ...s.tenseTab, ...(activeTense === t ? s.tenseTabActive : {}) }} onClick={() => setActiveTense(t)}>{t}</button>
        ))}
      </div>
      <div style={s.conjCard}>
        {conjugations.length >= 6 ? (
          pronouns.map((pronoun, i) => (
            <div key={i} style={{ ...s.conjRow, borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
              <span style={s.pronounCol}>{pronoun}</span>
              <span style={s.formCol}>{conjugations[i] || "—"}</span>
            </div>
          ))
        ) : (
          <div style={{ ...s.conjRow, borderBottom: "none" }}>
            <span style={{ ...s.formCol, width: "100%" }}>{currentForms}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // login | register | forgot
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [step, setStep] = useState("target");
  const [targetLang, setTargetLang] = useState("");
  const [nativeLang, setNativeLang] = useState("");
  const [uiLang, setUiLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const t = I18N[uiLang] || I18N.en;
  const [word, setWord] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState("translate");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState("main"); // main | password | deleteAccount
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [tensesItem, setTensesItem] = useState(null);
  const [speakingWord, setSpeakingWord] = useState("");
  const debounceRef = useRef(null);

  const audioRef = useRef(null);

  const speak = async (text, lang) => {
    // Stop current audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    if (speakingWord === text) { setSpeakingWord(""); return; }
    setSpeakingWord(text);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang })
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeakingWord(""); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setSpeakingWord(""); audioRef.current = null; };
      audio.play();
    } catch {
      const langMap = { en: "en-US", es: "es-ES", pt: "pt-PT", de: "de-DE", fr: "fr-FR", ru: "ru-RU", uk: "uk-UA" };
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = langMap[lang] || "en-US";
      utt.rate = 0.9;
      utt.onend = () => setSpeakingWord("");
      utt.onerror = () => setSpeakingWord("");
      window.speechSynthesis.speak(utt);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { 
      if (u) { setUser(u); loadData(u.uid); }
    });
    // Handle Google redirect result on mobile
    if (localStorage.getItem('wordy_google_redirect')) {
      localStorage.removeItem('wordy_google_redirect');
      getRedirectResult(auth)
        .then((result) => { 
          if (result?.user) { setUser(result.user); loadData(result.user.uid); }
        })
        .catch((e) => { 
          if (e.code !== 'auth/no-auth-event') setAuthError("Google error: " + e.code); 
        });
    }
    return unsub;
  }, []);

  const loadData = async (uid) => {
    setLoadingSaved(true);
    try {
      // Load language preferences (fast from cache)
      const cached = localStorage.getItem(`wordy_langs_${uid}`);
      if (cached) {
        const { native, target } = JSON.parse(cached);
        if (native && target) { setNativeLang(native); setTargetLang(target); setStep("main"); }
        else { setNativeLang(uiLang || "en"); setStep("target"); }
      }
      const prefDoc = await getDoc(doc(db, "users", uid, "settings", "langs"));
      if (prefDoc.exists()) {
        const { native, target } = prefDoc.data();
        setNativeLang(native); setTargetLang(target); setStep("main");
        localStorage.setItem(`wordy_langs_${uid}`, JSON.stringify({ native, target }));
      } else if (!cached) {
        // New user — use uiLang as native, ask only for target lang
        setNativeLang(uiLang || "en");
        setStep("target");
      }
      // Load saved and history in parallel
      const [savedSnap, historySnap] = await Promise.all([
        getDocs(query(collection(db, "users", uid, "saved"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "users", uid, "history"), orderBy("createdAt", "desc"))),
      ]);
      setSaved(savedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHistory(historySnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoadingSaved(false);
  };

  const handleRegister = async () => {
    setAuthError(""); setAuthLoading(true);
    try { await createUserWithEmailAndPassword(auth, email, password); if (uiLang) setNativeLang(uiLang); }
    catch (e) { setAuthError(e.message.includes("email") ? "Invalid email" : "Password must be at least 6 characters"); }
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setAuthError(""); setAuthLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); if (uiLang) setNativeLang(uiLang); }
    catch (e) { setAuthError("Invalid email or password"); }
    setAuthLoading(false);
  };

  const handleGoogle = async () => {
    setAuthError("");
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        localStorage.setItem('wordy_google_redirect', '1');
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        if (result?.user) { setUser(result.user); loadData(result.user.uid); }
      }
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setAuthError("Google sign-in error: " + e.code);
      }
    }
  };

  const handleLogout = async () => {
    if (user) localStorage.removeItem(`wordy_langs_${user.uid}`);
    setSaved([]); setHistory([]); setStep("target");
    await signOut(auth);
  };

  const handleInput = (value) => {
    setWord(value);
    if (value.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
          body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: `Give exactly 7 words or phrases in ${LANGUAGES[nativeLang]} and ${LANGUAGES[targetLang]} that start with the input. Mix both languages. Return only a JSON array. Nothing else.` }, { role: "user", content: value }], max_tokens: 150 }),
        });
        const d = await r.json();
        setSuggestions(JSON.parse(d.choices[0].message.content));
      } catch { setSuggestions([]); }
    }, 100);
  };

  const handleTranslate = async () => {
    if (!word.trim()) return;
    setSuggestions([]); setLoading(true); setResult(null);
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: `You are a professional linguist and translator. The user speaks ${LANGUAGES[nativeLang]} and is learning ${LANGUAGES[targetLang]}.

Translate the given word from ${LANGUAGES[nativeLang]} to ${LANGUAGES[targetLang]}.

Rules:
1. "word" = original word
2. "translations" = 3-5 most accurate translations in ${LANGUAGES[targetLang]} ONLY
3. "meanings" = array of ALL different meanings (min 2-3). Each has:
   - "meaning": clear explanation in ${LANGUAGES[nativeLang]}
   - "translation": specific ${LANGUAGES[targetLang]} word for this meaning
   - "example": natural example sentence in ${LANGUAGES[targetLang]}
4. "forms" = ALL verb tenses that exist in ${LANGUAGES[targetLang]}. For each tense provide ALL 6 conjugations separated by " / " in order: 1sg / 2sg / 3sg / 1pl / 2pl / 3pl.
   Include EVERY tense:
   - Spanish: Presente, Pretérito Indefinido, Pretérito Imperfecto, Pretérito Perfecto Compuesto, Pretérito Pluscuamperfecto, Futuro Simple, Futuro Perfecto, Condicional Simple, Condicional Compuesto, Presente de Subjuntivo, Imperfecto de Subjuntivo, Imperativo
   - Portuguese: Presente, Pretérito Perfeito, Pretérito Imperfeito, Pretérito Mais-que-perfeito, Futuro do Presente, Futuro do Pretérito, Presente do Subjuntivo, Pretérito Imperfeito do Subjuntivo, Futuro do Subjuntivo, Imperativo
   - German: Präsens, Präteritum, Perfekt, Plusquamperfekt, Futur I, Futur II, Konjunktiv I, Konjunktiv II, Imperativ
   - French: Présent, Imparfait, Passé Composé, Plus-que-parfait, Passé Simple, Futur Simple, Futur Antérieur, Conditionnel Présent, Conditionnel Passé, Subjonctif Présent, Subjonctif Passé, Impératif
   - Russian: Настоящее, Прошедшее несовершенное, Прошедшее совершенное, Будущее несовершенное, Будущее совершенное, Повелительное наклонение
   - Ukrainian: Теперішній час, Минулий час недоконаний, Минулий час доконаний, Майбутній час недоконаний, Майбутній час доконаний, Наказовий спосіб
   - English: Present Simple, Present Continuous, Present Perfect, Present Perfect Continuous, Past Simple, Past Continuous, Past Perfect, Past Perfect Continuous, Future Simple, Future Continuous, Future Perfect, Future Perfect Continuous
   Use "-" if not a verb or form does not exist.

Respond ONLY valid JSON: {"word":"...","translations":["..."],"meanings":[{"meaning":"...","translation":"...","example":"..."}],"forms":{"[tense]":"f1 / f2 / f3 / f4 / f5 / f6"}}` }, { role: "user", content: word }] }),
      });
      const d = await r.json();
      const parsed = JSON.parse(d.choices[0].message.content);
      setResult(parsed);
      if (user && !parsed.error) {
        const item = { word, translation: parsed.translations?.[0] || "", fromLang: nativeLang, toLang: targetLang, createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "users", user.uid, "history"), item);
        setHistory(prev => {
          const updated = [{ id: docRef.id, ...item, createdAt: new Date() }, ...prev];
          // Keep max 50
          if (updated.length > 50) {
            const toDelete = updated.slice(50);
            toDelete.forEach(old => deleteDoc(doc(db, "users", user.uid, "history", old.id)));
            return updated.slice(0, 50);
          }
          return updated;
        });
      }
    } catch { setResult({ error: "Error. Please try again." }); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!word || !result || result.error || !user) return;
    const item = { word, translation: result.translations?.[0] || "", fromLang: nativeLang, toLang: targetLang, result, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "users", user.uid, "saved"), item);
    setSaved(prev => [{ id: docRef.id, ...item, createdAt: new Date() }, ...prev]);
    setWord(""); setResult(null);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) return;
    try {
      // Send via Firebase (triggers password reset link)
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (e) {
      // Also try sending via our Resend API
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: resetEmail, type: 'reset' })
        });
        setResetSent(true);
      } catch { setAuthError("Email not found"); }
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSettingsMsg("");
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSettingsMsg("✅ Password changed!");
      setCurrentPassword(""); setNewPassword("");
    } catch (e) { setSettingsMsg("❌ Incorrect current password"); }
  };

  const handleDeleteAccount = async () => {
    if (!currentPassword) return;
    setSettingsMsg("");
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      setStep("target"); setSaved([]); setHistory([]);
    } catch (e) { setSettingsMsg("❌ Incorrect password"); }
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

  // AUTH
  if (!user) {
    return (
      <div style={s.authPage}>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Language selector */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setShowLangPicker(!showLangPicker)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", color: C.text, ...T.bodyM, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              {UI_LANGS.find(l => l.code === uiLang)?.flag} {UI_LANGS.find(l => l.code === uiLang)?.name}
              <span style={{ fontSize: 10, color: C.text3 }}>▼</span>
            </button>
            {showLangPicker && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: C.surface2, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 140, zIndex: 200 }}>
                {UI_LANGS.map(l => (
                  <button key={l.code} onClick={() => { setUiLang(l.code); setNativeLang(l.code); setShowLangPicker(false); }} style={{ width: "100%", padding: "11px 14px", background: uiLang === l.code ? C.surface : "none", border: "none", color: C.text, ...T.bodyM, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span>{l.flag}</span> {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={s.authLogoWrap}><Icons.Logo /></div>
          <div style={s.authTitle}>Wordy</div>
          <div style={s.authSub}>
            {authMode === "login" ? "Welcome back 👋" : authMode === "register" ? "Create a free account" : "Reset your password"}
          </div>
        </div>
        {authError && <div style={s.errorMsg}>{authError}</div>}
        {authMode === "forgot" ? (
          resetSent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <div style={{ ...T.h3, color: C.text, marginBottom: 8 }}>Email sent!</div>
              <div style={{ ...T.bodyM, color: C.text2, marginBottom: 24 }}>Check your email and follow the link to reset your password.</div>
              <button style={s.authBtn} onClick={() => { setAuthMode("login"); setResetSent(false); setResetEmail(""); }}>← Back to login</button>
            </div>
          ) : (
            <>
              <div style={{ ...T.bodyM, color: C.text2, marginBottom: 16 }}>Enter your email and we'll send you a reset link.</div>
              <input style={s.authInput} placeholder="Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} type="email" onKeyDown={e => e.key === "Enter" && handleForgotPassword()} />
              <button style={s.authBtn} onClick={handleForgotPassword}>Send reset link</button>
              <button style={{ ...s.authBtnOutline, justifyContent: "center" }} onClick={() => { setAuthMode("login"); setAuthError(""); }}>← Back to login</button>
            </>
          )
        ) : (
          <>
            <input style={s.authInput} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" />
            <input style={s.authInput} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" onKeyDown={e => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} />
            {authMode === "login" && (
              <div style={{ textAlign: "right", marginBottom: 12, marginTop: -6 }}>
                <button style={{ ...s.authLink, fontSize: 13 }} onClick={() => { setAuthMode("forgot"); setResetEmail(email); setAuthError(""); }}>Forgot password?</button>
              </div>
            )}
            <button style={s.authBtn} onClick={authMode === "login" ? handleLogin : handleRegister} disabled={authLoading}>
              {authLoading ? "⏳" : authMode === "login" ? "Sign in" : "Sign up"}
            </button>
            <div style={s.authDivider}><div style={{ flex: 1, height: 1, background: C.border }} />або<div style={{ flex: 1, height: 1, background: C.border }} /></div>
            <button style={s.authBtnOutline} onClick={handleGoogle}><Icons.Google />Continue with Google</button>
            <div style={s.authSwitch}>
              {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button style={s.authLink} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>
                {authMode === "login" ? "Sign up" : "Sign in"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // LANG SELECT
  if (step === "target") {
    const LANG_FLAGS = { en: "🇬🇧", es: "🇪🇸", pt: "🇧🇷", de: "🇩🇪", ru: "🇷🇺", fr: "🇫🇷", uk: "🇺🇦" };
    return (
      <div style={{ ...s.page, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", padding: "0 24px" }}>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ marginBottom: 32 }}>
          <div style={{ ...T.display, color: C.text, marginBottom: 8, whiteSpace: "pre-line" }}>{t.learnLang}</div>
          <div style={{ ...T.bodyM, color: C.text2 }}>{t.learnSub}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <button key={code} style={{ padding: "18px 16px", borderRadius: 16, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12 }} onClick={() => {
              const native = nativeLang || uiLang || "en";
              setTargetLang(code);
              setNativeLang(native);
              setStep("main");
              if (user) {
                setDoc(doc(db, "users", user.uid, "settings", "langs"), { native, target: code });
                localStorage.setItem(`wordy_langs_${user.uid}`, JSON.stringify({ native, target: code }));
              }
            }}>
              <span style={{ fontSize: 28 }}>{LANG_FLAGS[code]}</span>
              <span style={{ ...T.bodyL, fontWeight: 600 }}>{name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, background: C.gold, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Logo />
          </div>
          <span style={{ ...T.h2, color: C.text }}>Wordy</span>
        </div>
        <div style={s.headerUser}>
          <span>{user.email?.split("@")[0] || user.displayName}</span>
          <button style={s.logoutBtn} onClick={() => setShowSettings(true)}>{t.settings}</button>
        </div>
      </div>

      <div style={s.container}>
        {/* LANG BAR */}
        <div style={s.langBar}>
          <span style={{ ...T.bodyM, color: C.text }}>{LANGUAGES[nativeLang]}</span>
          <span style={{ color: C.text3 }}>→</span>
          <span style={{ ...T.bodyM, fontWeight: 600, color: C.gold }}>{LANGUAGES[targetLang]}</span>
          <button style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", marginLeft: "auto", ...T.caption, fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={() => setStep("target")}>{t.change}</button>
        </div>

        {/* TABS */}
        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(activeTab === "translate" ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab("translate")}>
            <span style={{ color: activeTab === "translate" ? C.blue : C.text3 }}><Icons.Translate /></span>
            Переклад
          </button>
          <button style={{ ...s.tab, ...(activeTab === "saved" ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab("saved")}>
            <span style={{ color: activeTab === "saved" ? C.blue : C.text3 }}><Icons.Bookmark /></span>
            {t.saved} {saved.length > 0 && `(${saved.length})`}
          </button>
          <button style={{ ...s.tab, ...(activeTab === "history" ? s.tabActive : s.tabInactive) }} onClick={() => setActiveTab("history")}>
            <span style={{ color: activeTab === "history" ? C.blue : C.text3 }}><Icons.History /></span>
            Історія
          </button>
        </div>

        {/* TRANSLATE TAB */}
        {activeTab === "translate" && (
          <>
            <div style={s.inputWrapper}>
              <div style={s.inputRow}>
                <input style={s.input} placeholder={t.placeholder} value={word} onChange={e => handleInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTranslate()} />
                <button style={{ ...s.inputBtn, opacity: loading ? 0.7 : 1 }} onClick={handleTranslate} disabled={loading}>
                  {loading ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                  ) : <Icons.Arrow />}
                </button>
              </div>
              {suggestions.length > 0 && (
                <div style={s.dropdown}>
                  {suggestions.map((item, i) => (
                    <div key={i} style={{ ...s.suggestionItem, borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none" }} onClick={() => { setWord(item); setSuggestions([]); }}>{item}</div>
                  ))}
                </div>
              )}
            </div>

            {loading && (
              <div style={{ ...s.resultCard, overflow: "hidden" }}>
                <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
                {[80, 120, 60, 100, 140].map((w, i) => (
                  <div key={i} style={{ height: i === 0 ? 28 : 16, width: `${w}%`, maxWidth: w + "%", borderRadius: 8, marginBottom: 12, background: "linear-gradient(90deg, #2E2E2E 25%, #3A3A3A 50%, #2E2E2E 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.2s infinite" }} />
                ))}
              </div>
            )}

            {result && !result.error && (
              <div style={s.resultCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                  <div style={s.wordTitle}>{result.word}</div>
                  <button onClick={() => speak(result.translations?.[0] || result.word, targetLang)} style={{ background: "none", border: "none", cursor: "pointer", color: speakingWord === (result.translations?.[0] || result.word) ? C.gold : C.text3, padding: 4, display: "flex" }}>
                    <Icons.Speaker active={speakingWord === (result.translations?.[0] || result.word)} />
                  </button>
                </div>
                <div style={s.wordSub}>{LANGUAGES[nativeLang]} → {LANGUAGES[targetLang]}</div>

                <div style={s.section}>
                  <div style={s.sectionLabel}>{t.translations}</div>
                  <div style={s.tags}>{result.translations?.map((t, i) => (
                    <span key={i} style={{...s.tag, cursor: "pointer", transition: "all 0.15s"}} onClick={() => { setWord(t); setActiveTab("translate"); setTimeout(() => handleTranslate(), 100); }}>{t}</span>
                  ))}</div>
                </div>

                {result.meanings?.length > 0 && (
                  <div style={s.section}>
                    <div style={s.sectionLabel}>{t.meanings}</div>
                    {result.meanings.map((m, i) => (
                      <div key={i} style={{ ...s.meaningCard, borderLeftColor: MEANING_COLORS[i % MEANING_COLORS.length], background: C.surface2 }}>
                        <div style={{ ...s.meaningTrans, color: MEANING_COLORS[i % MEANING_COLORS.length], cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => { setWord(m.translation); setTimeout(handleTranslate, 100); }}>{m.translation} <span style={{fontSize: 12, opacity: 0.7}}>→</span></div>
                        <div style={s.meaningText}>{m.meaning}</div>
                        <div style={s.meaningExample}>"{m.example}"</div>
                      </div>
                    ))}
                  </div>
                )}

                <ConjugationTable forms={result.forms} targetLang={targetLang} word={result.translations?.[0] || result.word} />

                <button style={s.saveBtn} onClick={handleSave}><Icons.Save />{t.saveWord}</button>
              </div>
            )}
            {result?.error && <p style={{ color: C.error, textAlign: "center", ...T.bodyM }}>{result.error}</p>}
          </>
        )}

        {/* SAVED TAB */}
        {activeTab === "saved" && (
          <div style={s.listBox}>
            <div style={s.listTitle}>Збережені ({saved.length})</div>
            {loadingSaved && <div style={s.emptyState}>Завантаження...</div>}
            {!loadingSaved && saved.length === 0 && <div style={s.emptyState}>Ще немає збережених слів</div>}
            {saved.map((item, idx) => (
              <div key={item.id} style={{ ...s.listItem, borderBottom: idx < saved.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={s.listWord}>{item.word}</span>
                    <span style={{ ...T.bodyM, color: C.blue }}>{item.translation}</span>
                    <button onClick={() => speak(item.translation || item.word, item.toLang)} style={{ background: "none", border: "none", cursor: "pointer", color: speakingWord === (item.translation || item.word) ? C.gold : C.text3, padding: 0, display: "flex" }}>
                      <Icons.Speaker active={speakingWord === (item.translation || item.word)} />
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={s.listMeta}>{LANGUAGES[item.fromLang]} → {LANGUAGES[item.toLang]}</span>
                    {item.result?.forms && (
                      <button style={s.tensesBtn} onClick={() => setTensesItem(item)}>
                        <Icons.Table />{t.tenses}
                      </button>
                    )}
                  </div>
                </div>
                <button style={s.deleteBtn} onClick={() => handleDeleteSaved(item.id)}><Icons.Delete /></button>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div style={s.listBox}>
            <div style={s.listTitle}>{t.history} ({history.length})</div>
            {loadingSaved && <div style={s.emptyState}>{t.loading}</div>}
            {!loadingSaved && history.length === 0 && <div style={s.emptyState}>{t.noHistory}</div>}
            {history.map((item, idx) => (
              <div key={item.id} style={{ ...s.listItem, borderBottom: idx < history.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={async () => {
                  setWord(item.word);
                  setNativeLang(item.fromLang);
                  setTargetLang(item.toLang);
                  setResult(null);
                  setActiveTab("translate");
                  setLoading(true);
                  try {
                    const r = await fetch("https://api.openai.com/v1/chat/completions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
                      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: `You are a professional linguist and translator. The user speaks ${LANGUAGES[item.fromLang]} and is learning ${LANGUAGES[item.toLang]}. Translate the given word. Respond ONLY valid JSON: {"word":"...","translations":["..."],"meanings":[{"meaning":"...","translation":"...","example":"..."}],"forms":{"[tense]":"f1 / f2 / f3 / f4 / f5 / f6"}}` }, { role: "user", content: item.word }] }),
                    });
                    const d = await r.json();
                    setResult(JSON.parse(d.choices[0].message.content));
                  } catch { setResult({ error: "Error. Please try again." }); }
                  setLoading(false);
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ ...s.listWord, textDecoration: "none" }}>{item.word}</span>
                    <span style={{ ...T.bodyM, color: C.blue }}>{item.translation}</span>
                  </div>
                  <span style={s.listMeta}>{formatDate(item.createdAt)} · {LANGUAGES[item.fromLang]} → {LANGUAGES[item.toLang]}</span>
                </div>
                <button style={s.deleteBtn} onClick={() => handleDeleteHistory(item.id)}><Icons.Delete /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TENSES MODAL */}
      {tensesItem && (
        <div style={s.tensesModal} onClick={() => setTensesItem(null)}>
          <div style={s.tensesSheet} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ ...T.h2, color: C.text }}>{tensesItem.word}</div>
              <button style={{ background: "none", border: "none", color: C.text2, cursor: "pointer" }} onClick={() => setTensesItem(null)}><Icons.Close /></button>
            </div>
            <div style={{ ...T.bodyM, color: C.text2, marginBottom: 14 }}>{tensesItem.translation} · {LANGUAGES[tensesItem.fromLang]} → {LANGUAGES[tensesItem.toLang]}</div>
            {tensesItem.result?.translations && <div style={{ ...s.tags, marginBottom: 16 }}>{tensesItem.result.translations.map((t, i) => <span key={i} style={s.tag}>{t}</span>)}</div>}
            <ConjugationTable forms={tensesItem.result?.forms} targetLang={tensesItem.toLang} word={tensesItem.translation || tensesItem.word} />
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: C.bg, zIndex: 200, overflowY: "auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 40px" }}>

            {/* Settings header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px" }}>
              <button style={{ background: "none", border: "none", color: C.text2, cursor: "pointer" }} onClick={() => { setShowSettings(false); setSettingsSection("main"); setSettingsMsg(""); }}>
                <Icons.Close />
              </button>
              <div style={{ ...T.h2, color: C.text }}>Settings</div>
            </div>

            {settingsSection === "main" && (
              <>
                {/* Profile */}
                <div style={{ background: C.surface, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                  <div style={{ ...T.overline, color: C.text3, marginBottom: 14 }}>Profile</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", ...T.h2, color: "#181818" }}>
                      {(user.displayName || user.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ ...T.bodyL, fontWeight: 600, color: C.text }}>{user.displayName || "User"}</div>
                      <div style={{ ...T.bodyM, color: C.text2 }}>{user.email}</div>
                    </div>
                  </div>
                  <div style={{ background: C.surface2, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ ...T.bodyM, fontWeight: 600, color: C.text }}>Learning language</div>
                      <div style={{ ...T.caption, color: C.text2 }}>{LANGUAGES[nativeLang]} → {LANGUAGES[targetLang]}</div>
                    </div>
                    <button style={{ background: "none", border: "none", color: C.blue, ...T.bodyM, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer" }} onClick={() => { setShowSettings(false); setStep("target"); }}>Change</button>
                  </div>
                </div>

                {/* PRO status */}
                <div style={{ background: "linear-gradient(135deg, #2A2010, #1E1A0A)", border: "1px solid #3A2E10", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                  <div style={{ ...T.overline, color: "#8A6A20", marginBottom: 12 }}>{t.subscription}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ ...T.bodyL, fontWeight: 700, color: C.gold }}>{t.freePlan}</div>
                      <div style={{ ...T.caption, color: C.text2, marginTop: 2 }}>{t.freeDesc}</div>
                    </div>
                    <button style={{ background: C.gold, border: "none", borderRadius: 10, padding: "8px 14px", ...T.caption, fontWeight: 700, color: "#181818", fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer" }}>
                      PRO →
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ background: C.surface, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                  <div style={{ ...T.overline, color: C.text3, marginBottom: 14 }}>{t.statistics}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: C.surface2, borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ ...T.h1, color: C.gold }}>{saved.length}</div>
                      <div style={{ ...T.caption, color: C.text2, marginTop: 2 }}>Saved words</div>
                    </div>
                    <div style={{ background: C.surface2, borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ ...T.h1, color: C.blue }}>{history.length}</div>
                      <div style={{ ...T.caption, color: C.text2, marginTop: 2 }}>Translations</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ background: C.surface, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ ...T.overline, color: C.text3, padding: "14px 16px 10px" }}>Account</div>
                  {[
                    { label: "Change пароль", onClick: () => setSettingsSection("password") },
                    { label: "Delete account", onClick: () => setSettingsSection("deleteAccount"), danger: true },
                  ].map((item, i, arr) => (
                    <button key={i} style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={item.onClick}>
                      <span style={{ ...T.bodyL, color: item.danger ? C.error : C.text }}>{item.label}</span>
                      {!item.danger && <span style={{ color: C.text3 }}>›</span>}
                    </button>
                  ))}
                </div>

                <button style={{ width: "100%", padding: 14, background: C.surface, borderRadius: 14, border: "none", ...T.bodyL, color: C.text2, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer" }} onClick={handleLogout}>
                  {t.signOut}
                </button>
              </>
            )}

            {settingsSection === "password" && (
              <div style={{ background: C.surface, borderRadius: 16, padding: 20 }}>
                <button style={{ background: "none", border: "none", color: C.blue, ...T.bodyM, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", marginBottom: 16 }} onClick={() => setSettingsSection("main")}>← Back</button>
                <div style={{ ...T.h2, color: C.text, marginBottom: 4 }}>Change пароль</div>
                <div style={{ ...T.bodyM, color: C.text2, marginBottom: 20 }}>Enter your current and new password</div>
                {settingsMsg && <div style={{ ...T.caption, color: settingsMsg.includes("✅") ? "#6EE7B7" : C.error, marginBottom: 12, padding: "10px 14px", background: settingsMsg.includes("✅") ? "rgba(110,231,183,0.1)" : "rgba(248,113,113,0.1)", borderRadius: 10 }}>{settingsMsg}</div>}
                <input style={s.authInput} type="password" placeholder={t.currentPass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <input style={s.authInput} type="password" placeholder={t.newPass} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <button style={s.authBtn} onClick={handleChangePassword}>Change пароль</button>
              </div>
            )}

            {settingsSection === "deleteAccount" && (
              <div style={{ background: C.surface, borderRadius: 16, padding: 20 }}>
                <button style={{ background: "none", border: "none", color: C.blue, ...T.bodyM, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer", marginBottom: 16 }} onClick={() => setSettingsSection("main")}>← Back</button>
                <div style={{ ...T.h2, color: C.error, marginBottom: 4 }}>Delete account</div>
                <div style={{ ...T.bodyM, color: C.text2, marginBottom: 20 }}>This is irreversible. All your data will be deleted.</div>
                {settingsMsg && <div style={{ ...T.caption, color: C.error, marginBottom: 12, padding: "10px 14px", background: "rgba(248,113,113,0.1)", borderRadius: 10 }}>{settingsMsg}</div>}
                <input style={s.authInput} type="password" placeholder={t.confirmPass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <button style={{ ...s.authBtn, background: C.error }} onClick={handleDeleteAccount}>Delete account назавжди</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}