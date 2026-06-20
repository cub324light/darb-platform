/* نقطة الدخول الموحّدة لنظام التقويم */
export type { CalEvent, CalendarProvider, ProviderKind } from "./types";
export { buildICS, downloadICS } from "./ics";
export { planToCalEvents, type PlanToCalOptions } from "./plan";
export {
  CALENDAR_PROVIDERS,
  UPCOMING_PROVIDERS,
  googleEventUrl,
  outlookEventUrl,
} from "./providers";
export {
  addToGoogleCalendar,
  isGoogleCalendarConfigured,
  type PushResult,
} from "./google";
