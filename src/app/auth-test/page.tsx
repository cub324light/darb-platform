"use client";
/* ─── صفحة تشخيص الدخول ───
   تفتحها على جهازك: darb-platform.vercel.app/auth-test
   تكشف بالضبط أين يفشل تسجيل الدخول بالإيميل على جهازك أنت. */
import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  signOut,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";

type Row = { label: string; ok: boolean | null; detail?: string };

export default function AuthTestPage() {
  const [env, setEnv] = useState<Row[]>([]);
  const [authEvents, setAuthEvents] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const startRef = useRef(Date.now());

  const addLog = (s: string) => {
    const t = ((Date.now() - startRef.current) / 1000).toFixed(1);
    setLog((l) => [...l, `[${t}ث] ${s}`]);
  };

  /* فحوصات البيئة عند الفتح */
  useEffect(() => {
    const rows: Row[] = [];

    // 1) localStorage
    try {
      localStorage.setItem("__t", "1");
      localStorage.removeItem("__t");
      rows.push({ label: "localStorage يعمل", ok: true });
    } catch (e) {
      rows.push({ label: "localStorage", ok: false, detail: String(e) });
    }

    // 2) IndexedDB
    try {
      const req = indexedDB.open("__darb_test");
      req.onsuccess = () => {
        try { req.result.close(); indexedDB.deleteDatabase("__darb_test"); } catch {}
        setEnv((cur) => cur.map((r) => r.label === "IndexedDB يعمل" ? { ...r, ok: true } : r));
      };
      req.onerror = () => {
        setEnv((cur) => cur.map((r) => r.label === "IndexedDB يعمل" ? { ...r, ok: false, detail: "blocked/error" } : r));
      };
      rows.push({ label: "IndexedDB يعمل", ok: null, detail: "جارٍ الفحص..." });
    } catch (e) {
      rows.push({ label: "IndexedDB يعمل", ok: false, detail: String(e) });
    }

    // 3) cookies
    rows.push({ label: "الكوكيز مفعّلة", ok: navigator.cookieEnabled });

    // 4) standalone (PWA على الشاشة الرئيسية؟)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    rows.push({ label: "وضع PWA (شاشة رئيسية)", ok: !standalone, detail: standalone ? "نعم — مفتوح كتطبيق" : "لا — متصفح عادي" });

    // 5) online
    rows.push({ label: "متصل بالإنترنت", ok: navigator.onLine });

    // 6) النطاق الحالي
    rows.push({ label: "النطاق", ok: true, detail: location.hostname });

    // 7) المتصفح
    rows.push({ label: "المتصفح", ok: true, detail: navigator.userAgent.slice(0, 60) });

    setEnv(rows);
    addLog("بدأ الفحص");

    // راقب حالة المصادقة
    const unsub = onAuthStateChanged(auth, (u) => {
      const t = ((Date.now() - startRef.current) / 1000).toFixed(1);
      setAuthEvents((e) => [...e, `[${t}ث] onAuthStateChanged → ${u ? `مستخدم: ${u.email ?? u.uid}` : "لا أحد (null)"}`]);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* اختبار تثبيت كل أنواع الجلسة */
  const testPersistence = async () => {
    const list: [string, Parameters<typeof setPersistence>[1]][] = [
      ["IndexedDB", indexedDBLocalPersistence],
      ["localStorage", browserLocalPersistence],
      ["sessionStorage", browserSessionPersistence],
      ["الذاكرة فقط", inMemoryPersistence],
    ];
    for (const [name, p] of list) {
      try {
        await setPersistence(auth, p);
        addLog(`✅ تثبيت الجلسة عبر ${name}: نجح`);
      } catch (e) {
        addLog(`❌ تثبيت الجلسة عبر ${name}: فشل — ${(e as FirebaseError)?.code ?? e}`);
      }
    }
  };

  /* اختبار حقيقي: إنشاء حساب عشوائي */
  const testSignup = async () => {
    setBusy(true);
    const e = `darbtest_${Date.now()}@gmail.com`;
    const p = "test123456";
    addLog(`جارٍ إنشاء حساب تجريبي: ${e}`);
    try {
      const cred = await createUserWithEmailAndPassword(auth, e, p);
      addLog(`✅ نجح الإنشاء — uid: ${cred.user.uid.slice(0, 8)}...`);
      setTimeout(() => {
        addLog(auth.currentUser
          ? `✅ بعد ثانية: auth.currentUser موجود (${auth.currentUser.uid.slice(0, 8)}...)`
          : `❌ بعد ثانية: auth.currentUser = null! (الجلسة لم تثبت)`);
      }, 1200);
    } catch (err) {
      const code = (err as FirebaseError)?.code ?? "";
      addLog(`❌ فشل الإنشاء — الكود: ${code || "?"} — ${(err as FirebaseError)?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };

  /* اختبار الدخول بإيميلك أنت */
  const testSignin = async () => {
    if (!email.trim() || pass.length < 6) {
      addLog("اكتب إيميلك وكلمة مرور ٦ أحرف فأكثر للاختبار");
      return;
    }
    setBusy(true);
    addLog(`جارٍ الدخول بـ ${email.trim()}`);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      addLog(`✅ نجح الدخول — uid: ${cred.user.uid.slice(0, 8)}...`);
    } catch (err) {
      const code = (err as FirebaseError)?.code ?? "";
      addLog(`❌ فشل الدخول — الكود: ${code || "?"} — ${(err as FirebaseError)?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    try { await signOut(auth); addLog("تم تسجيل الخروج"); } catch (e) { addLog(`خطأ خروج: ${e}`); }
  };

  return (
    <div dir="rtl" style={{ minHeight: "100dvh", background: "#07070D", color: "#fff", padding: "20px 16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>تشخيص الدخول 🔍</h1>
        <p style={{ fontSize: 13, color: "#9aa", marginBottom: 20 }}>
          هذه الصفحة تفحص جهازك مباشرة. صوّر النتيجة وأرسلها.
        </p>

        {/* البيئة */}
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>بيئة جهازك</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {env.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#12121c", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
              <span>{r.label}</span>
              <span style={{ color: r.ok === null ? "#fb0" : r.ok ? "#3c8" : "#f55", fontWeight: 700, textAlign: "left", maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.detail ?? (r.ok ? "✅" : "❌")}
              </span>
            </div>
          ))}
        </div>

        {/* أزرار الاختبار */}
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: "20px 0 8px" }}>اختبارات</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={testPersistence} disabled={busy} style={btn}>١) افحص تثبيت الجلسة</button>
          <button onClick={testSignup} disabled={busy} style={btn}>٢) أنشئ حساباً تجريبياً (تلقائي)</button>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="إيميلك (للاختبار ٣)" type="email" inputMode="email" style={inp} />
            <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="كلمة المرور" type="password" style={inp} />
            <button onClick={testSignin} disabled={busy} style={btn}>٣) جرّب الدخول بإيميلك</button>
          </div>

          <button onClick={doSignOut} style={{ ...btn, background: "#2a1518", border: "1px solid #f55" }}>تسجيل خروج (تنظيف)</button>
        </div>

        {/* أحداث المصادقة */}
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: "20px 0 8px" }}>أحداث المصادقة (مباشر)</h2>
        <div style={{ background: "#0c0c14", borderRadius: 10, padding: 12, fontSize: 12, minHeight: 40, fontFamily: "monospace" }}>
          {authEvents.length === 0 ? <span style={{ color: "#778" }}>لا شيء بعد...</span> : authEvents.map((e, i) => <div key={i} style={{ marginBottom: 4, color: "#8cf" }}>{e}</div>)}
        </div>

        {/* السجل */}
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: "20px 0 8px" }}>السجل التفصيلي</h2>
        <div style={{ background: "#0c0c14", borderRadius: 10, padding: 12, fontSize: 12, minHeight: 60, fontFamily: "monospace", lineHeight: 1.7 }}>
          {log.length === 0 ? <span style={{ color: "#778" }}>اضغط أحد الأزرار فوق...</span> : log.map((l, i) => (
            <div key={i} style={{ marginBottom: 4, color: l.includes("❌") ? "#f77" : l.includes("✅") ? "#7d9" : "#bcd", wordBreak: "break-word" }}>{l}</div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "#667", marginTop: 20, textAlign: "center" }}>
          الحالة الآن: {auth.currentUser ? `مسجّل دخول (${auth.currentUser.email ?? auth.currentUser.uid.slice(0, 8)})` : "غير مسجّل"}
        </p>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "#1b2b4d", border: "1px solid #2563EB", color: "#fff",
  borderRadius: 12, padding: "13px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%",
};
const inp: React.CSSProperties = {
  background: "#12121c", border: "1px solid #2a2a3a", color: "#fff",
  borderRadius: 10, padding: "12px 14px", fontSize: 15, width: "100%", outline: "none",
};
