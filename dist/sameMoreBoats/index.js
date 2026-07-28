"use strict";
var __vendettaPlugin = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw new Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // plugins/sameMoreBoats/src/modules/clipboard.ts
  function copyText(text) {
    var _a, _b;
    try {
      const common = __require("@vendetta/metro/common");
      const c = common.clipboard;
      if (c && typeof c.setString === "function") {
        c.setString(text);
        return true;
      }
      if (c && typeof c.copy === "function") {
        c.copy(text);
        return true;
      }
      if ((_a = c == null ? void 0 : c.default) == null ? void 0 : _a.setString) {
        c.default.setString(text);
        return true;
      }
    } catch (e) {
      log("clipboard common FAIL", e);
    }
    try {
      const rn = __require("@vendetta/metro/common").ReactNative;
      const rnClip = (rn == null ? void 0 : rn.Clipboard) || (rn == null ? void 0 : rn.ExpoClipboard);
      if (rnClip == null ? void 0 : rnClip.setString) {
        rnClip.setString(text);
        return true;
      }
      if (rnClip == null ? void 0 : rnClip.setStringAsync) {
        rnClip.setStringAsync(text);
        return true;
      }
    } catch (e) {
      log("clipboard RN FAIL", e);
    }
    try {
      const metro = __require("@vendetta/metro");
      const mod = (_b = metro.findByProps) == null ? void 0 : _b.call(metro, "setString", "getString");
      if (mod == null ? void 0 : mod.setString) {
        mod.setString(text);
        return true;
      }
    } catch (e) {
      log("clipboard metro FAIL", e);
    }
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
      return true;
    } catch {
    }
    return false;
  }
  var log;
  var init_clipboard = __esm({
    "plugins/sameMoreBoats/src/modules/clipboard.ts"() {
      "use strict";
      log = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/toast.ts
  function toast(msg) {
    var _a;
    try {
      console.log("[SMB toast]", msg);
    } catch {
    }
    try {
      const metroMod = __require("@vendetta/metro/common");
      const t = metroMod.toasts;
      if (t && typeof t.open === "function") {
        t.open(msg, void 0);
        return;
      }
      if (t && typeof t.showToast === "function") {
        t.showToast(msg, void 0);
        return;
      }
    } catch (e) {
      log2("metroToast FAIL", e);
    }
    try {
      const uiToasts = __require("@vendetta/ui/toasts");
      const showToast = uiToasts.showToast || ((_a = uiToasts.default) == null ? void 0 : _a.showToast);
      let iconId;
      try {
        const assets = __require("@vendetta/ui/assets");
        if (assets.getAssetIDByName) {
          for (const n of ["ic_desktop_24px", "ic_information_24px", "ic_settings_24px"]) {
            const id = assets.getAssetIDByName(n);
            if (id) {
              iconId = id;
              break;
            }
          }
        }
      } catch {
      }
      if (showToast) {
        showToast(msg, iconId);
        return;
      }
    } catch (e) {
      log2("uiToast FAIL", e);
    }
  }
  var log2;
  var init_toast = __esm({
    "plugins/sameMoreBoats/src/modules/toast.ts"() {
      "use strict";
      log2 = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/components.ts
  var components_exports = {};
  __export(components_exports, {
    getDiagnostics: () => getDiagnostics,
    patchComponents: () => patchComponents,
    refreshRoleCache: () => refreshRoleCache
  });
  function refreshRoles(guildId, roles) {
    if (!guildId || !Array.isArray(roles))
      return;
    let map = roleCache.get(guildId);
    if (!map) {
      map = /* @__PURE__ */ new Map();
      roleCache.set(guildId, map);
    }
    for (const r of roles)
      if (r == null ? void 0 : r.id)
        map.set(r.id, r);
  }
  function refreshRoleCache(guildId, roles) {
    refreshRoles(guildId, roles);
  }
  function findRole(guildId, roleId) {
    var _a, _b;
    return (_b = (_a = roleCache.get(guildId)) == null ? void 0 : _a.get(roleId)) != null ? _b : null;
  }
  function BotTagPill({ text, color }) {
    return import_common.React.createElement(
      View,
      {
        style: {
          backgroundColor: color || "#5865F2",
          borderRadius: 4,
          paddingHorizontal: 4,
          paddingVertical: 1,
          marginLeft: 4,
          alignSelf: "center"
        }
      },
      import_common.React.createElement(
        Text,
        { style: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" } },
        text
      )
    );
  }
  function computeTagsFor(author, member, guildId) {
    var _a, _b;
    const tags = [];
    try {
      if (author == null ? void 0 : author.bot)
        tags.push({ text: "BOT", color: "#5865F2" });
      if (author == null ? void 0 : author.system)
        tags.push({ text: "SYSTEM", color: "#4E5058" });
      if ((author == null ? void 0 : author.flags) != null) {
        const flags = author.flags;
        if (flags & 1 << 16)
          tags.push({ text: "BOT", color: "#5865F2" });
        if (flags & 1)
          tags.push({ text: "STAFF", color: "#5865F2" });
        if (flags & 1 << 2)
          tags.push({ text: "HYPESQUAD", color: "#f47b67" });
        if (flags & 1 << 3)
          tags.push({ text: "BUG HUNTER", color: "#3ba55d" });
        if (flags & 1 << 9)
          tags.push({ text: "EARLY", color: "#7289da" });
        if (flags & 1 << 14)
          tags.push({ text: "BUG HUNTER GOLD", color: "#faa61a" });
        if (flags & 1 << 6)
          tags.push({ text: "HYPESQUAD BRILLIANCE", color: "#f47b67" });
        if (flags & 1 << 7)
          tags.push({ text: "HYPESQUAD BRAVERY", color: "#9c84ef" });
        if (flags & 1 << 8)
          tags.push({ text: "HYPESQUAD BALANCE", color: "#45ddc0" });
      }
      if ((member == null ? void 0 : member.roles) && guildId) {
        for (const roleId of member.roles) {
          const role = findRole(guildId, roleId);
          if (((_a = role == null ? void 0 : role.tags) == null ? void 0 : _a.bot_id) || ((_b = role == null ? void 0 : role.tags) == null ? void 0 : _b.integration_id) || (role == null ? void 0 : role.icon) || (role == null ? void 0 : role.unicode_emoji)) {
            const name = role.unicode_emoji ? `${role.unicode_emoji} ${role.name}` : role.name;
            tags.push({ text: name, color: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#4E5058" });
          }
        }
      }
    } catch {
    }
    return tags;
  }
  function tagsRow(tags) {
    return import_common.React.createElement(
      View,
      { style: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" } },
      ...tags.map((t, i) => import_common.React.createElement(BotTagPill, { key: i, text: t.text, color: t.color }))
    );
  }
  function safeFind(label, fn) {
    try {
      const r = fn();
      return r;
    } catch (e) {
      log3("find", label, "ERR", e);
      return null;
    }
  }
  function findNameplateComponents() {
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    const add = (x) => {
      if (x && !seen.has(x)) {
        seen.add(x);
        results.push(x);
      }
    };
    const names = ["Nameplate", "NameplateInner", "Username", "MessageAuthor", "BotTag", "BotTagRegular", "AuthorTag", "RoleIcon", "PillWrapper", "ButtonPill"];
    for (const n of names) {
      add(safeFind("name:" + n, () => (0, import_metro.findByName)(n, false)));
      const all = safeFind("nameAll:" + n, () => (0, import_metro.findByNameAll)(n, false));
      if (Array.isArray(all))
        for (const x of all)
          add(x);
      add(safeFind("dn:" + n, () => (0, import_metro.findByDisplayName)(n, false)));
      const dall = safeFind("dnAll:" + n, () => (0, import_metro.findByDisplayNameAll)(n, false));
      if (Array.isArray(dall))
        for (const x of dall)
          add(x);
      const p = safeFind("props:" + n, () => {
        const m = (0, import_metro.findByProps)(n);
        return m ? m[n] : null;
      });
      add(p);
      const filterFound = safeFind("filter:" + n, () => (0, import_metro.find)((m) => {
        if (typeof m === "function" && (m.displayName === n || m.name === n))
          return true;
        if (m && typeof m === "object") {
          for (const k of Object.keys(m)) {
            try {
              const v = m[k];
              if (typeof v === "function" && (v.displayName === n || v.name === n))
                return true;
            } catch {
            }
          }
        }
        return false;
      }));
      add(filterFound);
    }
    return results;
  }
  function injectTagsIntoElement(ret, tags) {
    if (!tags.length || !ret)
      return ret;
    try {
      if (!import_common.React.isValidElement(ret))
        return ret;
      const injected = tagsRow(tags);
      const props = { ...ret.props || {} };
      const children = props.children;
      if (Array.isArray(children)) {
        props.children = [...children, injected];
      } else if (children === void 0 || children === null) {
        props.children = [injected];
      } else {
        props.children = [children, injected];
      }
      return import_common.React.cloneElement(ret, props);
    } catch (e) {
      log3("injectTags FAIL", e);
      return ret;
    }
  }
  function patchComponentRender(comp, label, handleRet) {
    if (!comp)
      return;
    const unpatches = [];
    const tryPatchKey = (parent, key) => {
      try {
        const target = parent == null ? void 0 : parent[key];
        if (typeof target !== "function")
          return false;
        const un = (0, import_patcher.after)(key, parent, (args, ret) => {
          try {
            return handleRet(args, ret);
          } catch (e) {
            log3(label, key, "after FAIL", e);
            return ret;
          }
        });
        if (typeof un === "function") {
          unpatches.push(un);
          log3(label, "patched", key);
          return true;
        }
      } catch (e) {
        log3(label, key, "patch FAIL", e);
      }
      return false;
    };
    let ok = tryPatchKey(comp, "default");
    if (!ok)
      ok = tryPatchKey(comp, "type");
    if (!ok && typeof comp === "function") {
      try {
        const un = (0, import_patcher.after)(comp, (args, ret) => {
          try {
            return handleRet(args, ret);
          } catch (e) {
            log3(label, "self FAIL", e);
            return ret;
          }
        });
        if (typeof un === "function") {
          unpatches.push(un);
          log3(label, "patched self");
          ok = true;
        }
      } catch (e) {
        log3(label, "self patch FAIL", e);
      }
    }
    if (!ok && (comp == null ? void 0 : comp.type) && typeof comp.type === "function") {
      try {
        const un = (0, import_patcher.after)("type", comp, (args, ret) => {
          try {
            return handleRet(args, ret);
          } catch (e) {
            log3(label, "type FAIL", e);
            return ret;
          }
        });
        if (typeof un === "function") {
          unpatches.push(un);
          log3(label, "patched .type");
          ok = true;
        }
      } catch (e) {
        log3(label, "type patch FAIL", e);
      }
    }
    if (!ok && (comp == null ? void 0 : comp.render) && typeof comp.render === "function") {
      try {
        const un = (0, import_patcher.after)("render", comp, (args, ret) => {
          try {
            return handleRet(args, ret);
          } catch (e) {
            log3(label, "render FAIL", e);
            return ret;
          }
        });
        if (typeof un === "function") {
          unpatches.push(un);
          log3(label, "patched .render");
          ok = true;
        }
      } catch (e) {
        log3(label, "render patch FAIL", e);
      }
    }
    if (!ok) {
      log3(label, "no patchable key");
      return;
    }
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  function patchMessageAuthor() {
    const comps = findNameplateComponents();
    if (!comps.length) {
      log3("MessageAuthor: no components found");
      return;
    }
    log3("MessageAuthor: found", comps.length, "candidates");
    const unpatches = [];
    for (const comp of comps) {
      const un = patchComponentRender(comp, "msgAuthor", (args, ret) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
        const props = (_a = args == null ? void 0 : args[0]) != null ? _a : {};
        const author = (_d = (_b = props.author) != null ? _b : props.user) != null ? _d : (_c = props.message) == null ? void 0 : _c.author;
        const member = (_f = props.member) != null ? _f : (_e = props.message) == null ? void 0 : _e.member;
        const guildId = (_j = (_h = props.guildId) != null ? _h : (_g = props.message) == null ? void 0 : _g.guildId) != null ? _j : (_i = props.channel) == null ? void 0 : _i.guild_id;
        if (!author)
          return ret;
        const tags = computeTagsFor(author, member, guildId);
        if (!tags.length)
          return ret;
        return injectTagsIntoElement(ret, tags);
      });
      if (typeof un === "function")
        unpatches.push(un);
    }
    if (!unpatches.length) {
      log3("MessageAuthor: none patchable");
      return;
    }
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  function patchContextMenuItems() {
    const finderKeys = [
      "buildMessageContextMenuItems",
      "buildContextMenuItems",
      "menuItems",
      "getMessageContextMenus",
      "openContextMenu",
      "buildMenu",
      "getMenuItems",
      "ContextMenuContainer",
      "MenuContainer",
      "ActionSheetPresenter"
    ];
    let targetMod = null;
    let targetFnName = null;
    for (const k of finderKeys) {
      const mod = safeFind("ctx:" + k, () => (0, import_metro.findByProps)(k));
      if (mod && typeof mod[k] === "function") {
        targetMod = mod;
        targetFnName = k;
        break;
      }
    }
    if (!targetMod || !targetFnName) {
      try {
        const mod = (0, import_metro.find)((m) => {
          if (!m || typeof m !== "object")
            return false;
          for (const k of Object.keys(m)) {
            if (typeof m[k] === "function" && /context.?menu|menuItems|buildMenu|getMenuItems|openMenu/i.test(k)) {
              return true;
            }
          }
          return false;
        });
        if (mod) {
          for (const k of Object.keys(mod)) {
            if (typeof mod[k] === "function" && /context.?menu|menuItems|buildMenu|getMenuItems|openMenu/i.test(k)) {
              targetMod = mod;
              targetFnName = k;
              break;
            }
          }
        }
      } catch (e) {
        log3("ctx filter find FAIL", e);
      }
    }
    if (!targetMod || !targetFnName) {
      log3("ContextMenu: no builder found");
      return;
    }
    log3("ContextMenu builder found:", targetFnName);
    return (0, import_patcher.after)(targetFnName, targetMod, (args, ret) => {
      var _a, _b, _c, _d, _e, _f, _g;
      try {
        if (!Array.isArray(ret))
          return ret;
        const ctx = (_a = args == null ? void 0 : args[0]) != null ? _a : {};
        const target = (_c = (_b = ctx.message) != null ? _b : ctx.user) != null ? _c : ctx.channel;
        const additions = [];
        if (target == null ? void 0 : target.id) {
          additions.push({
            label: "Copy ID",
            id: "smb-copy-id",
            action: () => {
              if (copyText(String(target.id)))
                toast("Copied ID: " + target.id);
            }
          });
        }
        if (((_d = ctx.message) == null ? void 0 : _d.id) && ctx.channelId) {
          additions.push({
            label: "Copy Message Link",
            id: "smb-copy-link",
            action: () => {
              const guild = ctx.guildId ? `${ctx.guildId}/` : "@me/";
              if (copyText(`https://discord.com/channels/${guild}${ctx.channelId}/${ctx.message.id}`))
                toast("Message link copied");
            }
          });
        }
        if ((_e = ctx.message) == null ? void 0 : _e.content) {
          additions.push({
            label: "Copy Raw Message",
            id: "smb-copy-raw",
            action: () => {
              if (copyText(ctx.message.content))
                toast("Raw message copied");
            }
          });
        }
        if ((_f = ctx.user) == null ? void 0 : _f.id) {
          additions.push({
            label: "Copy User ID",
            id: "smb-copy-user-id",
            action: () => {
              if (copyText(String(ctx.user.id)))
                toast("User ID copied");
            }
          });
          additions.push({
            label: "Copy Username",
            id: "smb-copy-username",
            action: () => {
              const uname = ctx.user.username + (ctx.user.discriminator ? "#" + ctx.user.discriminator : "");
              if (copyText(uname))
                toast("Username copied");
            }
          });
        }
        if ((_g = ctx.channel) == null ? void 0 : _g.id) {
          additions.push({
            label: "Copy Channel ID",
            id: "smb-copy-channel-id",
            action: () => {
              if (copyText(String(ctx.channel.id)))
                toast("Channel ID copied");
            }
          });
        }
        if (additions.length) {
          additions.unshift({ type: "divider", id: "smb-divider" });
          return [...ret, ...additions];
        }
        return ret;
      } catch (e) {
        log3("contextMenu render FAIL", e);
        return ret;
      }
    });
  }
  function patchDeveloperMode() {
    var _a;
    try {
      const store = safeFind("DeveloperModeStore", () => (0, import_metro.findByStoreName)("DeveloperModeStore"));
      if (!store) {
        log3("DeveloperModeStore not found");
        return;
      }
      const orig = (_a = store.getDeveloperMode) == null ? void 0 : _a.bind(store);
      if (typeof orig !== "function") {
        log3("getDeveloperMode not a function");
        return;
      }
      store.getDeveloperMode = () => true;
      log3("DeveloperMode forced ON");
      return () => {
        try {
          store.getDeveloperMode = orig;
        } catch {
        }
      };
    } catch (e) {
      log3("patchDeveloperMode FAIL", e);
    }
  }
  function diagnostics() {
    const out = [];
    const checks = [
      ["nameplate.comps", () => findNameplateComponents().length],
      ["ctxMenu.builder", () => (0, import_metro.findByProps)("buildMessageContextMenuItems")],
      ["ctxMenu.items", () => (0, import_metro.findByProps)("menuItems")],
      ["ctxMenu.open", () => (0, import_metro.findByProps)("openContextMenu")],
      ["ctxMenu.container", () => (0, import_metro.findByProps)("ContextMenuContainer")],
      ["nameplate", () => (0, import_metro.findByName)("Nameplate", false)],
      ["nameplateInner", () => (0, import_metro.findByName)("NameplateInner", false)],
      ["username", () => (0, import_metro.findByName)("Username", false)],
      ["botTag", () => (0, import_metro.findByName)("BotTag", false)],
      ["GuildStore", () => (0, import_metro.findByStoreName)("GuildStore")],
      ["GuildMemberStore", () => (0, import_metro.findByStoreName)("GuildMemberStore")],
      ["RoleStore", () => (0, import_metro.findByStoreName)("RoleStore")],
      ["DeveloperModeStore", () => (0, import_metro.findByStoreName)("DeveloperModeStore")],
      ["clipboard", () => (0, import_metro.findByProps)("setString")]
    ];
    for (const [label, fn] of checks) {
      try {
        const r = fn();
        out.push(`${label}: ${r ? "FOUND" : "miss"}`);
      } catch {
        out.push(`${label}: ERR`);
      }
    }
    return out;
  }
  function getDiagnostics() {
    return diagnostics();
  }
  function patchComponents() {
    const un = [];
    const safe = (label, fn) => {
      try {
        const r = fn();
        if (typeof r === "function")
          un.push(r);
      } catch (e) {
        log3("patchComponents", label, "FAIL", e);
      }
    };
    safe("messageAuthor", patchMessageAuthor);
    safe("contextMenu", patchContextMenuItems);
    safe("developerMode", patchDeveloperMode);
    log3("component patches:", un.length);
    return () => un.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  var import_common, import_metro, import_patcher, log3, View, Text, TouchableOpacity, roleCache;
  var init_components = __esm({
    "plugins/sameMoreBoats/src/modules/components.ts"() {
      "use strict";
      import_common = __require("@vendetta/metro/common");
      import_metro = __require("@vendetta/metro");
      import_patcher = __require("@vendetta/patcher");
      init_clipboard();
      init_toast();
      log3 = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
      ({ View, Text, TouchableOpacity } = import_common.ReactNative);
      roleCache = /* @__PURE__ */ new Map();
    }
  });

  // plugins/sameMoreBoats/src/modules/featureGates.ts
  var featureGates_exports = {};
  __export(featureGates_exports, {
    patchFeatureGates: () => patchFeatureGates
  });
  function addGates(features) {
    if (!Array.isArray(features))
      return false;
    const set = new Set(features);
    PC_GATES.forEach((g) => set.add(g));
    const arr = Array.from(set);
    if (arr.length !== features.length) {
      features.splice(0, features.length, ...arr);
      return true;
    }
    return false;
  }
  function harvest(obj, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 6)
      return;
    if (Array.isArray(obj)) {
      for (const x of obj)
        harvest(x, depth + 1);
      return;
    }
    if (Array.isArray(obj.features))
      addGates(obj.features);
    if (obj.guild && Array.isArray(obj.guild.features))
      addGates(obj.guild.features);
    if (Array.isArray(obj.guilds)) {
      for (const g of obj.guilds)
        if (g && Array.isArray(g.features))
          addGates(g.features);
    }
    for (const k of Object.keys(obj)) {
      if (k === "features" || k === "guild" || k === "guilds")
        continue;
      const v = obj[k];
      if (v && typeof v === "object")
        harvest(v, depth + 1);
    }
  }
  function patchFeatureGates(_cfg) {
    const unpatches = [];
    unpatches.push(
      (0, import_patcher2.before)("dispatch", import_common2.FluxDispatcher, (args) => {
        try {
          harvest(args == null ? void 0 : args[0]);
        } catch {
        }
      })
    );
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  var import_patcher2, import_common2, PC_GATES;
  var init_featureGates = __esm({
    "plugins/sameMoreBoats/src/modules/featureGates.ts"() {
      "use strict";
      import_patcher2 = __require("@vendetta/patcher");
      import_common2 = __require("@vendetta/metro/common");
      PC_GATES = [
        "guild_tags",
        "role_tags",
        "forum_channels",
        "forum_search",
        "guidelines_screen",
        "member_list_grouping",
        "server_guide",
        "onboarding",
        "community_guild_settings_v2",
        "role_icon_upload",
        "guild_role_subscriptions",
        "auto_mod",
        "guild_incidents",
        "member_verification",
        "developer_mode",
        "dev_tools"
      ];
    }
  });

  // plugins/sameMoreBoats/src/modules/tags.ts
  var tags_exports = {};
  __export(tags_exports, {
    enableTags: () => enableTags
  });
  function harvestRoles(obj, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 6)
      return;
    if (Array.isArray(obj)) {
      for (const x of obj)
        harvestRoles(x, depth + 1);
      return;
    }
    if (obj.guildId && Array.isArray(obj.roles))
      refreshRoleCache(obj.guildId, obj.roles);
    if (obj.id && Array.isArray(obj.roles))
      refreshRoleCache(obj.id, obj.roles);
    if (obj.guild && obj.guild.id && Array.isArray(obj.guild.roles))
      refreshRoleCache(obj.guild.id, obj.guild.roles);
    if (Array.isArray(obj.guilds)) {
      for (const g of obj.guilds)
        if ((g == null ? void 0 : g.id) && Array.isArray(g.roles))
          refreshRoleCache(g.id, g.roles);
    }
    for (const k of Object.keys(obj)) {
      if (k === "roles" || k === "guild" || k === "guilds")
        continue;
      const v = obj[k];
      if (v && typeof v === "object")
        harvestRoles(v, depth + 1);
    }
  }
  function enableTags() {
    const unpatches = [];
    unpatches.push(
      (0, import_patcher3.before)("dispatch", import_common3.FluxDispatcher, (args) => {
        try {
          harvestRoles(args == null ? void 0 : args[0]);
        } catch {
        }
      })
    );
    log5("tags: role-cache feeder active");
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  var import_patcher3, import_common3, log5;
  var init_tags = __esm({
    "plugins/sameMoreBoats/src/modules/tags.ts"() {
      "use strict";
      import_patcher3 = __require("@vendetta/patcher");
      import_common3 = __require("@vendetta/metro/common");
      init_components();
      log5 = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/forums.ts
  var forums_exports = {};
  __export(forums_exports, {
    enableForums: () => enableForums
  });
  function enableForums() {
    const unpatches = [];
    unpatches.push(
      (0, import_patcher4.before)("dispatch", import_common4.FluxDispatcher, (args) => {
        const action = args == null ? void 0 : args[0];
        if (!action)
          return;
        if (action.channel)
          stamp(action.channel);
        if (Array.isArray(action.channels))
          action.channels.forEach(stamp);
        if (action.channelUpdates)
          Object.values(action.channelUpdates).forEach(stamp);
        if (action.guild && Array.isArray(action.guild.channels))
          action.guild.channels.forEach(stamp);
        if (Array.isArray(action.guilds)) {
          for (const g of action.guilds)
            if (g && Array.isArray(g.channels))
              g.channels.forEach(stamp);
        }
      })
    );
    unpatches.push(
      (0, import_patcher4.before)("dispatch", import_common4.FluxDispatcher, (args) => {
        var _a;
        const action = args == null ? void 0 : args[0];
        if ((action == null ? void 0 : action.type) === "FETCH_CHANNEL_INFO" && ((_a = action.channel) == null ? void 0 : _a.type) === FORUM) {
          try {
            import_common4.FluxDispatcher.dispatch({
              type: "LOAD_MESSAGES",
              channelId: action.channel.id
            });
          } catch {
          }
        }
      })
    );
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  var import_patcher4, import_common4, FORUM, MEDIA, stamp;
  var init_forums = __esm({
    "plugins/sameMoreBoats/src/modules/forums.ts"() {
      "use strict";
      import_patcher4 = __require("@vendetta/patcher");
      import_common4 = __require("@vendetta/metro/common");
      FORUM = 15;
      MEDIA = 16;
      stamp = (ch) => {
        if (!ch || ch.__smbType)
          return;
        if (ch.type === FORUM || ch.type === MEDIA) {
          try {
            Object.defineProperty(ch, "__smbType", { value: ch.type, enumerable: false, configurable: true });
          } catch {
          }
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/serverSettings.ts
  var serverSettings_exports = {};
  __export(serverSettings_exports, {
    enableServerSettings: () => enableServerSettings
  });
  function enableServerSettings() {
    const unpatches = [];
    unpatches.push(
      (0, import_patcher5.before)("dispatch", import_common5.FluxDispatcher, (args) => {
        const action = args == null ? void 0 : args[0];
        if (!(action == null ? void 0 : action.type))
          return;
        const t = action.type;
        if (/GUILD.*SETTINGS|SETTINGS.*OPEN|GUILD.*CONFIG/i.test(t)) {
          if (!Array.isArray(action.sections) || action.sections.length < FULL_SECTIONS.length) {
            action.sections = FULL_SECTIONS;
          }
        }
      })
    );
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  var import_patcher5, import_common5, FULL_SECTIONS;
  var init_serverSettings = __esm({
    "plugins/sameMoreBoats/src/modules/serverSettings.ts"() {
      "use strict";
      import_patcher5 = __require("@vendetta/patcher");
      import_common5 = __require("@vendetta/metro/common");
      FULL_SECTIONS = [
        { key: "overview", label: "Overview" },
        { key: "roles", label: "Roles" },
        { key: "emoji", label: "Emoji" },
        { key: "stickers", label: "Stickers" },
        { key: "widget", label: "Widget" },
        { key: "automod", label: "AutoMod" },
        { key: "onboarding", label: "Onboarding" },
        { key: "incidents", label: "Incidents" },
        { key: "audit_log", label: "Audit Log" },
        { key: "members", label: "Members" },
        { key: "bans", label: "Bans" },
        { key: "integrations", label: "Integrations" },
        { key: "delete", label: "Delete Server" }
      ];
    }
  });

  // plugins/sameMoreBoats/src/modules/memberList.ts
  var memberList_exports = {};
  __export(memberList_exports, {
    enableGroupedMemberList: () => enableGroupedMemberList
  });
  function buildGroups(members) {
    const online = members.filter((m) => (m == null ? void 0 : m.status) !== "offline");
    const offline = members.filter((m) => (m == null ? void 0 : m.status) === "offline");
    const groups = [
      { id: "online", label: "Online", count: online.length, collapsed: false }
    ];
    if (offline.length)
      groups.push({ id: "offline", label: "Offline", count: offline.length, collapsed: true });
    return groups;
  }
  function enableGroupedMemberList() {
    const unpatches = [];
    unpatches.push(
      (0, import_patcher6.before)("dispatch", import_common6.FluxDispatcher, (args) => {
        const action = args == null ? void 0 : args[0];
        if (!action)
          return;
        let members = null;
        if (Array.isArray(action.members))
          members = action.members;
        else if (action.member)
          members = [action.member];
        if (members && members.length) {
          action.__smbGroups = buildGroups(members);
          action.__smbGrouped = true;
        }
      })
    );
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  var import_patcher6, import_common6;
  var init_memberList = __esm({
    "plugins/sameMoreBoats/src/modules/memberList.ts"() {
      "use strict";
      import_patcher6 = __require("@vendetta/patcher");
      import_common6 = __require("@vendetta/metro/common");
    }
  });

  // plugins/sameMoreBoats/src/modules/contextMenu.ts
  var contextMenu_exports = {};
  __export(contextMenu_exports, {
    expandContextMenu: () => expandContextMenu
  });
  function expandContextMenu() {
    const un = [];
    un.push(
      (0, import_patcher7.before)("dispatch", import_common7.FluxDispatcher, (args) => {
        try {
          const a = args == null ? void 0 : args[0];
          if (!(a == null ? void 0 : a.type))
            return;
          if (/MESSAGE|CHANNEL|CONTEXT/i.test(a.type)) {
            log6("ctx observe:", a.type);
          }
        } catch {
        }
      })
    );
    log6("contextMenu: observer active (render in components.ts)");
    return () => un.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  var import_patcher7, import_common7, log6;
  var init_contextMenu = __esm({
    "plugins/sameMoreBoats/src/modules/contextMenu.ts"() {
      "use strict";
      import_patcher7 = __require("@vendetta/patcher");
      import_common7 = __require("@vendetta/metro/common");
      log6 = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/devtools.ts
  var devtools_exports = {};
  __export(devtools_exports, {
    enableDevTools: () => enableDevTools,
    getDevToolsBuffer: () => getDevToolsBuffer
  });
  function enableDevTools() {
    const unpatches = [];
    let buffer2 = [];
    let count = 0;
    unpatches.push(
      (0, import_patcher8.before)("dispatch", import_common8.FluxDispatcher, (args) => {
        const a = args == null ? void 0 : args[0];
        if (a == null ? void 0 : a.type) {
          buffer2.push(a.type);
          if (buffer2.length > 200)
            buffer2.shift();
          count++;
        }
      })
    );
    toast("DevTools logger active \u2014 actions logged to console");
    log7("DevTools: listening to FluxDispatcher. Total captured:", count);
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }
  function getDevToolsBuffer() {
    return buffer ? [...buffer] : [];
  }
  var import_patcher8, import_common8, log7;
  var init_devtools = __esm({
    "plugins/sameMoreBoats/src/modules/devtools.ts"() {
      "use strict";
      import_patcher8 = __require("@vendetta/patcher");
      import_common8 = __require("@vendetta/metro/common");
      init_toast();
      log7 = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/styles.ts
  var styles_exports = {};
  __export(styles_exports, {
    injectStyles: () => injectStyles
  });
  function injectStyles(cfg) {
    var _a, _b;
    try {
      const el = document.createElement("style");
      el.setAttribute("data-smb", "true");
      el.textContent = `
      [class*="roleTag"], [class*="botTag"] { display: inline-flex !important; }
      [class*="authorTag"] { display: inline-flex !important; margin-left: 4px; }
      [class*="forumChannelList"] { overflow-x: auto !important; flex-direction: row !important; }
      [class*="forumThreadCard"] { min-width: 280px !important; }
      [class*="guildSettingsSidebar"] { display: flex !important; }
      [class*="memberListGroup"] { display: flex !important; flex-direction: column !important; }
      ${cfg.forceDesktopLayout ? `
      body { font-size: 14px !important; }
      [class*="sidebar"] { width: 240px !important; }
      ` : ""}
    `;
      (_b = (_a = document.head) == null ? void 0 : _a.appendChild) == null ? void 0 : _b.call(_a, el);
      return el;
    } catch {
      return null;
    }
  }
  var init_styles = __esm({
    "plugins/sameMoreBoats/src/modules/styles.ts"() {
      "use strict";
    }
  });

  // plugins/sameMoreBoats/src/index.ts
  var src_exports = {};
  __export(src_exports, {
    default: () => src_default
  });

  // plugins/sameMoreBoats/src/modules/settings.ts
  var log4 = (...a) => {
    try {
      console.log("[SMB]", ...a);
    } catch {
    }
  };
  var DEFAULTS = {
    tags: true,
    forums: true,
    serverSettings: true,
    groupedMembers: true,
    contextMenu: true,
    devTools: false,
    forceDesktopLayout: false,
    recon: false,
    devtoolsUrl: ""
  };
  var settings = { ...DEFAULTS };
  var storagePromise = null;
  async function initStorage() {
    if (storagePromise)
      return storagePromise;
    storagePromise = (async () => {
      try {
        const storageMod = await import("@vendetta/storage");
        const createMMKVBackend = storageMod.createMMKVBackend;
        const createStorage = storageMod.createStorage;
        const wrapSync = storageMod.wrapSync;
        if (!createMMKVBackend || !createStorage || !wrapSync) {
          log4("storage: missing exports, using defaults");
          return;
        }
        const backend = createMMKVBackend("SMBSettings");
        const store = await createStorage(backend);
        const sync = wrapSync(store);
        settings = sync;
        for (const k of Object.keys(DEFAULTS)) {
          if (settings[k] === void 0 || settings[k] === null) {
            settings[k] = DEFAULTS[k];
          }
        }
        log4("storage init ok", JSON.stringify(settings));
      } catch (e) {
        log4("storage init FAIL", e);
      }
    })();
    return storagePromise;
  }
  var unregCmd = null;
  function registerSmbCommand() {
    var _a, _b;
    if (unregCmd)
      return unregCmd;
    try {
      let registerCommand;
      let ApplicationCommandInputType;
      let ApplicationCommandType;
      try {
        const cmdMod = __require("@vendetta/commands");
        registerCommand = cmdMod.registerCommand;
        const constMod = __require("@vendetta/constants");
        ApplicationCommandInputType = constMod.ApplicationCommandInputType;
        ApplicationCommandType = constMod.ApplicationCommandType;
      } catch (e) {
        log4("commands module unavailable", e);
        return () => {
        };
      }
      if (!registerCommand) {
        log4("registerCommand not found");
        return () => {
        };
      }
      unregCmd = registerCommand({
        name: "smb",
        displayName: "smb",
        description: "Same More Boats",
        displayDescription: "Same More Boats",
        inputType: (_a = ApplicationCommandInputType == null ? void 0 : ApplicationCommandInputType.BUILT_IN) != null ? _a : 0,
        type: (_b = ApplicationCommandType == null ? void 0 : ApplicationCommandType.CHAT) != null ? _b : 1,
        applicationId: "-1",
        options: [
          {
            name: "action",
            displayName: "action",
            description: "connect / url / status",
            displayDescription: "connect / url / status",
            type: 3,
            required: false
          },
          {
            name: "url",
            displayName: "url",
            description: "DevTools WebSocket URL",
            displayDescription: "DevTools WebSocket URL",
            type: 3,
            required: false
          }
        ],
        execute: async (args, _ctx) => {
          var _a2, _b2, _c;
          try {
            const action = (_a2 = args == null ? void 0 : args.find((a) => a.name === "action")) == null ? void 0 : _a2.value;
            const url = (_b2 = args == null ? void 0 : args.find((a) => a.name === "url")) == null ? void 0 : _b2.value;
            if (action === "connect") {
              const u = url || settings.devtoolsUrl;
              if (!u)
                return { content: "No URL set. Use `/smb url <ws://...>`" };
              settings.devtoolsUrl = u;
              try {
                const debugMod = await import("@vendetta/debug");
                if (debugMod.connectToDebugger)
                  debugMod.connectToDebugger(u);
              } catch (e) {
                log4("connect fail", e);
              }
              return { content: "Connecting to DevTools at " + u };
            }
            if (action === "url") {
              if (!url)
                return { content: "Usage: `/smb url ws://192.168.x.x:8097`" };
              settings.devtoolsUrl = url;
              return { content: "DevTools URL saved: " + url };
            }
            if (action === "status") {
              const lines2 = [];
              try {
                const compMod = await Promise.resolve().then(() => (init_components(), components_exports));
                if (compMod.getDiagnostics)
                  lines2.push(...compMod.getDiagnostics());
              } catch {
              }
              lines2.push("");
              lines2.push("DevTools URL: " + (settings.devtoolsUrl || "(none)"));
              return { content: lines2.join("\n") };
            }
            const lines = [
              "**Same More Boats**",
              "",
              "Commands:",
              "`/smb connect <ws://...>` \u2014 Connect React DevTools",
              "`/smb url <ws://...>` \u2014 Save DevTools URL",
              "`/smb status` \u2014 Show diagnostics",
              "",
              "Status: " + (settings.devtoolsUrl ? "URL = " + settings.devtoolsUrl : "No DevTools URL set")
            ];
            return { content: lines.join("\n") };
          } catch (e) {
            return { content: "SMB error: " + String((_c = e == null ? void 0 : e.message) != null ? _c : e) };
          }
        }
      });
      log4("slash command /smb registered");
    } catch (e) {
      log4("registerCommand fail", e);
    }
    return () => {
      if (unregCmd) {
        try {
          unregCmd();
        } catch {
        }
        unregCmd = null;
      }
    };
  }

  // plugins/sameMoreBoats/src/index.ts
  init_toast();
  var log8 = (...a) => {
    try {
      console.log("[SMB]", ...a);
    } catch {
    }
  };
  var patches = [];
  var styleEl = null;
  var loaded = false;
  var unregCmd2 = null;
  var src_default = {
    onLoad() {
      if (loaded) {
        toast("Same More Boats already loaded");
        return;
      }
      loaded = true;
      log8("onLoad starting");
      initStorage().then(() => {
        log8("settings ready", JSON.stringify(settings));
        const cfg = settings;
        const safe = (name, fn) => {
          try {
            const un = fn();
            if (typeof un === "function")
              patches.push(un);
            log8("ok:", name);
          } catch (e) {
            log8("FAIL:", name, e);
          }
        };
        safe("featureGates", () => {
          const { patchFeatureGates: patchFeatureGates2 } = (init_featureGates(), __toCommonJS(featureGates_exports));
          return patchFeatureGates2(cfg);
        });
        safe("components", () => {
          const { patchComponents: patchComponents2 } = (init_components(), __toCommonJS(components_exports));
          return patchComponents2();
        });
        if (cfg.tags)
          safe("tags", () => {
            const { enableTags: enableTags2 } = (init_tags(), __toCommonJS(tags_exports));
            return enableTags2();
          });
        if (cfg.forums)
          safe("forums", () => {
            const { enableForums: enableForums2 } = (init_forums(), __toCommonJS(forums_exports));
            return enableForums2();
          });
        if (cfg.serverSettings)
          safe("serverSettings", () => {
            const { enableServerSettings: enableServerSettings2 } = (init_serverSettings(), __toCommonJS(serverSettings_exports));
            return enableServerSettings2();
          });
        if (cfg.groupedMembers)
          safe("memberList", () => {
            const { enableGroupedMemberList: enableGroupedMemberList2 } = (init_memberList(), __toCommonJS(memberList_exports));
            return enableGroupedMemberList2();
          });
        if (cfg.contextMenu)
          safe("contextMenu", () => {
            const { expandContextMenu: expandContextMenu2 } = (init_contextMenu(), __toCommonJS(contextMenu_exports));
            return expandContextMenu2();
          });
        if (cfg.devTools)
          safe("devtools", () => {
            const { enableDevTools: enableDevTools2 } = (init_devtools(), __toCommonJS(devtools_exports));
            return enableDevTools2();
          });
        safe("styles", () => {
          const { injectStyles: injectStyles2 } = (init_styles(), __toCommonJS(styles_exports));
          styleEl = injectStyles2(cfg);
        });
        try {
          unregCmd2 = registerSmbCommand();
        } catch (e) {
          log8("cmd reg fail", e);
        }
        toast("Same More Boats loaded \u2713");
      }).catch((e) => {
        log8("initStorage chain FAIL", e);
        toast("Same More Boats loaded (defaults)");
      });
    },
    onUnload() {
      var _a;
      patches.forEach((unpatch) => {
        try {
          unpatch();
        } catch {
        }
      });
      patches = [];
      if (unregCmd2) {
        try {
          unregCmd2();
        } catch {
        }
        unregCmd2 = null;
      }
      if (styleEl) {
        try {
          (_a = styleEl.remove) == null ? void 0 : _a.call(styleEl);
        } catch {
        }
        styleEl = null;
      }
      loaded = false;
      toast("Same More Boats unloaded");
    }
  };
  return __toCommonJS(src_exports);
})();
module.exports = __vendettaPlugin.default ?? __vendettaPlugin;
