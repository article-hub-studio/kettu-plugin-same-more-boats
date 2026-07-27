// Diagnostic collector: records every Flux action type dispatched during the
// first N seconds after load, then shows them in a native modal so the user can
// screenshot the REAL action type names for the developer to wire modules to.

import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

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

  const finish = () => {
    if (unpatch) { try { unpatch(); } catch {} unpatch = null; }
    if (timer) { try { clearTimeout(timer); } catch {} timer = null; }

    const types = Array.from(seen).sort();
    log("diag captured", types.length, "types");
    let body: string;
    if (types.length === 0) {
      body = "(no actions captured — FluxDispatcher hook may be wrong)";
    } else {
      // modal content is string; join compactly. RN alert supports long text.
      body = types.join("\n");
    }
    try {
      (showConfirmationAlert as any)({
        title: `SMB diag — ${types.length} types`,
        content: body,
        confirmText: "OK",
        isDismissable: true,
        onConfirm: () => {},
      });
    } catch (e) {
      log("diag modal FAIL", e);
      // fallback: log to console so user can read via any console viewer
      types.forEach((t) => log("TYPE:", t));
    }
  };

  timer = setTimeout(finish, seconds * 1000);

  return () => {
    if (unpatch) { try { unpatch(); } catch {} unpatch = null; }
    if (timer) { try { clearTimeout(timer); } catch {} timer = null; }
  };
}
