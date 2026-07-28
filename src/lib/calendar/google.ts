"use client";
/* ─── المرحلة 2: ربط Google Calendar مباشرة (OAuth عبر Google Identity Services) ───
   نستخدم نموذج التوكن من GIS (مستقل عن جلسة Firebase فلا يُبدّل المستخدم الحالي).
   نطلب صلاحية calendar.events فقط، ثم نُنشئ كل جلسة كحدث مستقل عبر Calendar API.

   إعداد مطلوب لمرة واحدة:
   - فعّل Google Calendar API في Google Cloud Console للمشروع.
   - أضِف صلاحية .../auth/calendar.events لشاشة موافقة OAuth.
   - ضع معرّف عميل الويب في NEXT_PUBLIC_GOOGLE_CLIENT_ID. */
import type { CalEvent } from "./types";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GIS_SRC = "https://accounts.google.com/gsi/client";

/* أنواع مختصرة لـ GIS (لا تأتي مع تعريفات npm) */
interface TokenResponse { access_token?: string; error?: string; }
interface TokenClient { requestAccessToken: (o?: { prompt?: string }) => void; }
interface GoogleOAuth2 {
  initTokenClient: (cfg: {
    client_id: string; scope: string;
    callback: (resp: TokenResponse) => void;
  }) => TokenClient;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

export function googleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

export function isGoogleCalendarConfigured(): boolean {
  return googleClientId().length > 0;
}

/* حمّل سكربت GIS مرة واحدة */
function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gis")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gis"));
    document.head.appendChild(s);
  });
}

/* اطلب توكن وصول لصلاحية التقويم (يفتح موافقة Google عند أول مرة) */
export async function requestGoogleToken(): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) throw new Error("config");
  await loadGIS();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("gis");
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp.error || "denied"));
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

/* CalEvent → جسم حدث Calendar API */
function toGoogleEvent(e: CalEvent) {
  return {
    summary: e.title,
    description: e.description,
    start: { dateTime: e.start.toISOString() },
    end: { dateTime: e.end.toISOString() },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] },
  };
}

export interface PushResult { ok: number; fail: number }

/* أضِف كل حدث مستقلاً إلى التقويم الرئيسي للمستخدم */
export async function pushEventsToGoogle(token: string, events: CalEvent[]): Promise<PushResult> {
  let ok = 0, fail = 0;
  for (const ev of events) {
    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(toGoogleEvent(ev)),
        },
      );
      if (res.ok) ok++; else fail++;
    } catch { fail++; }
  }
  return { ok, fail };
}

/* المسار الكامل: توكن ثم دفع — يُعيد ملخص النتيجة */
export async function addToGoogleCalendar(events: CalEvent[]): Promise<PushResult> {
  const token = await requestGoogleToken();
  return pushEventsToGoogle(token, events);
}
