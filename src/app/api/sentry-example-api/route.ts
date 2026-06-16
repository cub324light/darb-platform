export const dynamic = "force-dynamic";

/* مسار تجريبي — يُطلق خطأً في الخادم ليلتقطه Sentry عبر onRequestError */
class SentryExampleAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

export function GET() {
  throw new SentryExampleAPIError("خطأ تجريبي من مسار Sentry — احذفه بعد التحقق");
}
