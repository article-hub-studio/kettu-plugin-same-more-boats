// Role screen tracker.
//
// Discord's mobile role editor has no icon UI. To inject one we need to know
// exactly what components the role-edit (and role-permissions / role picker)
// screen renders. This module watches for those lazy screens loading, then
// walks the React element tree they return and logs the component names + prop
// keys, so the injection point can be found. Everything is read-only, guarded,
// and never throws. Dumps are surfaced via `/smb dump` too.
//
// Built with React.createElement (no JSX) to match the build pipeline.

import { React, FluxDispatcher } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { ActionSheetModule, noteLazyKey } from "./injectors";
import { log } from "./utils";

const CAPACITY = 6;
let captures: string[] = [];

const ROLE_KEY_RE = /[Rr]ole/i;
const FLUX_ROLE_RE = /ROLE|ROLE_EDIT|GUILD_SETTINGS|ROLE_MANAGER|ROLE_CREATE|ROLE_UPDATE/i;

// ---- helpers ----

function nameOf(type: any): string {
  try {
    if (typeof type === "string") return type;
    return type?.displayName || type?.name || Object.prototype.toString.call(type).slice(8, -1);
  } catch {
    return "?";
  }
}

function push(cap: string) {
  captures.push(cap);
  if (captures.length > CAPACITY) captures.shift();
  log("TRACK role-screen:\n" + cap);
}

// Walk a React element tree, collecting a flattened list of component names and
// flagging anything that looks like a role-field / icon editor / form control.
function walk(node: any, depth: number, out: string[]) {
  if (!node) return;
  if (depth > 14) return;
  if (Array.isArray(node)) {
    for (const c of node) walk(c, depth, out);
    return;
  }
  if (node?.props && (node.type || node.$$typeof)) {
    const name = nameOf(node.type);
    out.push(`${"  ".repeat(Math.min(depth, 12))}${name}`);
    const keys = Object.keys(node.props || {});
    if (keys.length) out.push(`${"  ".repeat(Math.min(depth, 12))}  props=[${keys.slice(0, 24).join(", ")}]`);
    // recurse into children
    if (node.props.children !== undefined) walk(node.props.children, depth + 1, out);
  } else if (typeof node === "object" && node?.children) {
    walk(node.children, depth, out);
  }
}

function dumpRender(res: any, key: string, extraProps: any) {
  try {
    const lines: string[] = [];
    lines.push(`## screen="${key}"`);
    if (extraProps && typeof extraProps === "object") {
      lines.push(`props=[${Object.keys(extraProps).slice(0, 20).join(", ")}]`);
    }
    walk(res, 0, lines);
    if (lines.length) push(lines.join("\n"));
  } catch (e) {
    log("dumpRender FAIL", e);
  }
}

// Given a lazily-loaded screen module, after-patch its default export so we can
// read the element it renders.
function trackLazyScreen(instance: any): (() => void) | null {
  try {
    if (!instance || !instance.default) return null;
    const unpatch = (after as any)("default", instance, (_a: any[], res: any) => {
      try { dumpRender(res, nameOf(instance.default || instance), _a?.[0] ?? null); } catch {}
      return res;
    });
    return unpatch;
  } catch (e) {
    log("trackLazyScreen FAIL", e);
    return null;
  }
}

// ---- public ----

export function getRoleCaptures(): string[] {
  return [...captures];
}

export function enableRoleTracking(): () => void {
  const unpatches: (() => void)[] = [];
  captures = [];

  if (ActionSheetModule && typeof ActionSheetModule.openLazy === "function") {
    const un = (before as any)("openLazy", ActionSheetModule, (args: any[]) => {
      try {
        const [component, key] = args;
        if (typeof key === "string") noteLazyKey(key);
        if (typeof key !== "string" || !ROLE_KEY_RE.test(key)) return;
        log("TRACK role screen loading:", key);
        if (!component || typeof component.then !== "function") return;
        component.then((instance: any) => {
          const unp = trackLazyScreen(instance);
          if (unp) unpatches.push(unp);
        }).catch(() => {});
      } catch (e) { log("track openLazy FAIL", e); }
    });
    if (typeof un === "function") unpatches.push(un);
  }

  if (FluxDispatcher && typeof FluxDispatcher.dispatch === "function") {
    unpatches.push(
      (before as any)("dispatch", FluxDispatcher, (args: any[]) => {
        try {
          const a = args?.[0];
          const t: string = a?.type;
          if (typeof t === "string" && FLUX_ROLE_RE.test(t)) {
            const keys = a && typeof a === "object" ? Object.keys(a).slice(0, 16).join(", ") : "";
            push(`## flux="${t}"  payloadKeys=[${keys}]`);
          }
        } catch (e) { log("track flux FAIL", e); }
      })
    );
  }

  log("RoleTracker: watching role screens");
  return () => unpatches.forEach((u) => { try { u(); } catch {} });
}

// Utility for tests/harness: lightweight React element that renders a subtree.
export function mkElement(type: any, props: any, children?: any): any {
  return React.createElement(type, props ?? null, children);
}