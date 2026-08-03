// Shared helpers for all Same More Boats modules.

/** Console logger namespaced under [SMB]. Never throws. */
export const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

/** Run fn and return its result; return null (and log) if it throws. */
export function safeFind(label: string, fn: () => any): any {
  try {
    return fn();
  } catch (e) {
    log("find", label, "ERR", e);
    return null;
  }
}

/** Simple promise-based delay. */
export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
