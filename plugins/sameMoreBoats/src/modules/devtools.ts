import { before } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { log } from "./utils";

// Ring buffer of the most recent Flux action types, for on-device debugging.
// Stored at module scope so it survives and stays queryable while active.
const BUFFER_MAX = 200;
let buffer: string[] = [];
let count = 0;
let active = false;

export function enableDevTools(): () => void {
  const unpatches: (() => void)[] = [];

  buffer = [];
  count = 0;
  active = true;

  unpatches.push(
    before("dispatch", FluxDispatcher, (args: any[]) => {
      const a = args?.[0];
      if (a?.type) {
        buffer.push(a.type);
        if (buffer.length > BUFFER_MAX) buffer.shift();
        count++;
      }
    })
  );

  log("DevTools: FluxDispatcher listener on");

  return () => {
    active = false;
    unpatches.forEach((u) => { try { u(); } catch {} });
  };
}

export function getDevToolsBuffer(): string[] {
  return [...buffer];
}

export function getDevToolsStats(): { count: number; buffered: number; active: boolean } {
  return { count, buffered: buffer.length, active };
}
