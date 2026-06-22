/* ─── أعلام المزامنة والحظر — خاليتان من Firebase ───
   تستوردهما AuthGate وCloudSync مباشرةً دون سحب حزمة Firebase
   في تحميل الصفحة المبدئي. cloud.ts هو الوحيد الذي يستدعي الـ setters. */

let _initialSyncDone = false;

export function isInitialSyncDone(): boolean { return _initialSyncDone; }
export function markInitialSyncDone(): void { _initialSyncDone = true; }
export function resetInitialSyncDone(): void { _initialSyncDone = false; }

let _accountBlocked = false;

export function isAccountBlocked(): boolean { return _accountBlocked; }
export function markAccountBlocked(v: boolean): void { _accountBlocked = v; }
