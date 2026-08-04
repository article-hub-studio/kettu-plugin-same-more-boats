// Lightweight Discord API access for Same More Boats.
//
// Role icon editing needs a server-side write (`PATCH /guilds/{g}/roles/{r}`),
// so unlike the rest of the plugin we have to talk to the Discord API with the
// authenticated token. We prefer Discord's own HTTP module (it injects the
// correct headers / x-super-properties and handles Discord responses) and fall
// back to a plain fetch for builds where we can't find it.

import { findByProps } from "@vendetta/metro";
import { log } from "./utils";

const API_BASE = "https://discord.com/api/v9";

let tokenStore: any;
let httpClient: any;

function getToken(): string | undefined {
  try {
    if (!tokenStore) tokenStore = findByProps("getToken");
    const t = tokenStore?.getToken?.();
    return typeof t === "string" && t ? t : undefined;
  } catch (e) {
    log("token ERR", e);
    return undefined;
  }
}

function getHttp(): any {
  if (httpClient !== undefined) return httpClient;
  httpClient = null;
  try {
    const c = findByProps("get", "patch", "del", "put", "post");
    if (c && typeof c.get === "function" && typeof c.patch === "function") httpClient = c;
  } catch (e) {
    log("http module ERR", e);
  }
  return httpClient;
}

export interface ApiResult {
  ok: boolean;
  status: number;
  reason?: string;
}

/** PATCH/POST/DELETE via Discord's own HTTP util (rubust headers + response). */
async function viaHttp(method: string, url: string, body: any, token: string): Promise<ApiResult | null> {
  const h = getHttp();
  if (!h || typeof h[method] !== "function") return null;
  try {
    const res = await h[method]({ url, body });
    const status = res?.status ?? res?.statusCode ?? 0;
    const ok = res?.ok ?? (status >= 200 && status < 300);
    return { ok: !!ok, status: status || 0 };
  } catch (e) {
    log("http", method, "ERR", e);
    return null;
  }
}

/** Fallback raw fetch. */
async function viaFetch(method: string, url: string, body: any, token: string): Promise<ApiResult | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        authorization: token,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    log("fetch", method, "ERR", e);
    return null;
  }
}

async function apiWrite(method: "patch" | "post" | "del", path: string, body?: any): Promise<ApiResult> {
  const token = getToken();
  if (!token) return { ok: false, status: 0, reason: "no-token" };

  const url = `${API_BASE}${path}`;
  let r = await viaHttp(method, url, body ?? {}, token);
  if (!r) r = await viaFetch(method, url, body ?? {}, token);
  if (!r) return { ok: false, status: 0, reason: "transport-failed" };

  // 403/429 with no detail is common when the token/rate is the problem.
  if (!r.ok && r.status === 403) r.reason = "forbidden";
  return r;
}

/** Set (or clear, when icon is empty) the icon for a role in a guild. */
export function setRoleIcon(guildId: string, roleId: string, icon: string): Promise<ApiResult> {
  return apiWrite("patch", `/guilds/${guildId}/roles/${roleId}`, { icon: icon ? icon : null });
}

/** Discord guild object (cached in the client store). */
export function getGuild(guildId: string): any {
  try {
    const store = findByProps("getGuild");
    return store?.getGuild?.(guildId) ?? null;
  } catch (e) {
    log("getGuild ERR", e);
    return null;
  }
}

/** Server boost tier: 0-3. Role icons need tier 2. */
export function getPremiumTier(guildId: string | undefined): number {
  if (!guildId) return 0;
  return getGuild(guildId)?.premium_tier ?? 0;
}

/** Sorted list of visible roles for a guild (best-guess; skips @everyone). */
export function getGuildRoles(guildId: string): any[] {
  const g = getGuild(guildId);
  if (!g || !g.roles) return [];
  const roles = Array.isArray(g.roles)
    ? g.roles
    : Object.values(g.roles).filter((r: any) => r && typeof r === "object" && r.id);
  const sorted = roles
    .filter((r: any) => r?.id && r?.id !== guildId)
    .sort((a: any, b: any) => (b?.position ?? 0) - (a?.position ?? 0));
  return sorted.map((r: any) => ({ id: r.id, name: r.name, color: r.color, icon: r.icon }));
}