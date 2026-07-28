import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { toast } from "./toast";

const log = (...a: any[]) => { try { console.log("[SMB]", ...a); } catch {} };

export function enableDevTools(): () => void {
  const unpatches: (() => void)[] = [];
  let buffer: string[] = [];
  let count = 0;

  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      const a = args?.[0];
      if (a?.type) {
        buffer.push(a.type);
        if (buffer.length > 200) buffer.shift();
        count++;
      }
    })
  );

  toast("DevTools logger active — actions logged to console");
  log("DevTools: listening to FluxDispatcher. Total captured:", count);

  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}

export function getDevToolsBuffer(): string[] {
  return buffer ? [...buffer] : [];
}
