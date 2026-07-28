import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function runDiagnostic(seconds = 6): () => void {
  const seen = new Set<string>();
  let unpatch: (() => void) | null = null;
  let timer: any = null;

  try {
    unpatch = before("dispatch", FluxDispatcher, (args: any[]) => {
      const a = args?.[0];
      const t = a?.type;
      if (typeof t === "string") seen.add(t);
    });
  } catch (e) { log("diag hook FAIL", e); }

  timer = setTimeout(() => {
    if (unpatch) { try { unpatch(); } catch {} unpatch = null; }
    const types = Array.from(seen).sort();
    log("diag captured", types.length, "types");
    types.forEach((t) => log("FLUX_TYPE:", t));
  }, seconds * 1000);

  return () => {
    if (unpatch) { try { unpatch(); } catch {} unpatch = null; }
    if (timer) { try { clearTimeout(timer); } catch {} timer = null; }
  };
}
