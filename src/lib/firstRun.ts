"use client";
/* ═══════════ ترتيب المقاطعات في أوّل زيارة ═══════════
   على اللوحة يتنافس مُقاطِعان: **جولة دويرب** (تعريفٌ لمرّةٍ واحدة، بطبقةٍ سوداء
   تغطّي الشاشة) و**شريط العودة** (انكسر ستريكك · تقريرك الأسبوعي · معلَم).
   كانا يظهران معاً في أوّل زيارة: شريطٌ يطلب فعلاً تحت حجابٍ لا يُمكِّن منه.

   القاعدة: الجولة أوّلاً — تعريفُ التطبيق يسبق مطالبته. ولا يظهر الشريط إلا بعد
   انتهائها. ومصدرُ الحقيقة هنا وحده كي لا تقرأ كل جهةٍ المفتاح بنفسها فتتفرّقا. */

export const TOUR_KEY = "darb_tour_done";
/* يُبثّ فور انتهاء الجولة كي يظهر الشريط في الحال بلا إعادة تحميل */
export const TOUR_DONE_EVENT = "darb:tourDone";

/** هل الجولة ما زالت معلّقة (لم تُشاهَد بعد)؟ */
export const isTourPending = (): boolean => {
  try { return !localStorage.getItem(TOUR_KEY); } catch { return false; }
};

/** يُعلّم الجولة منتهيةً ويُخبر المشتركين. */
export const markTourDone = (): void => {
  try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* تجاهل */ }
  try { window.dispatchEvent(new CustomEvent(TOUR_DONE_EVENT)); } catch { /* تجاهل */ }
};

export const subscribeTour = (cb: () => void) => {
  window.addEventListener(TOUR_DONE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(TOUR_DONE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
