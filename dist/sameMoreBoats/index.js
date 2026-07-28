"use strict";
var __vendettaPlugin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // plugins/sameMoreBoats/src/modules/clipboard.ts
  function copyText(text) {
    var _a, _b;
    try {
      const c = import_common.clipboard;
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
      log("clipboard v1 FAIL", e);
    }
    try {
      const rnClip = import_common2.ReactNative.Clipboard;
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
      const mod = (0, import_metro.findByProps)("setString", "getString");
      if (mod == null ? void 0 : mod.setString) {
        mod.setString(text);
        return true;
      }
    } catch (e) {
      log("clipboard metro FAIL", e);
    }
    try {
      const mod = (0, import_metro.findByProps)("Clipboard");
      if ((_b = mod == null ? void 0 : mod.Clipboard) == null ? void 0 : _b.setString) {
        mod.Clipboard.setString(text);
        return true;
      }
    } catch {
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
  var import_common, import_common2, import_metro, log;
  var init_clipboard = __esm({
    "plugins/sameMoreBoats/src/modules/clipboard.ts"() {
      "use strict";
      import_common = __require("@vendetta/metro/common");
      import_common2 = __require("@vendetta/metro/common");
      import_metro = __require("@vendetta/metro");
      log = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/toast.ts
  function safeIcon() {
    const ids = ["ic_desktop_24px", "ic_settings_24px", "ic_compose_24px", "ic_emoji_24px", "ic_information_24px"];
    for (const n of ids) {
      try {
        const i = (0, import_assets.getAssetIDByName)(n);
        if (i)
          return i;
      } catch {
      }
    }
    return void 0;
  }
  function metroToast(msg) {
    try {
      const t = import_common3.toasts;
      if (t && typeof t.open === "function") {
        t.open(msg, safeIcon());
        return;
      }
      if (t && typeof t.showToast === "function") {
        t.showToast(msg, safeIcon());
        return;
      }
    } catch (e) {
      log2("metroToast FAIL", e);
    }
    try {
      (0, import_toasts.showToast)(msg, safeIcon());
    } catch (e) {
      log2("vendettaToast FAIL", e);
    }
  }
  function toast(msg) {
    metroToast(msg);
  }
  var import_common3, import_toasts, import_assets, log2;
  var init_toast = __esm({
    "plugins/sameMoreBoats/src/modules/toast.ts"() {
      "use strict";
      import_common3 = __require("@vendetta/metro/common");
      import_toasts = __require("@vendetta/ui/toasts");
      import_assets = __require("@vendetta/ui/assets");
      log2 = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
    }
  });

  // plugins/sameMoreBoats/src/modules/components.ts
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
    return import_common4.React.createElement(
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
      import_common4.React.createElement(
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
    return import_common4.React.createElement(
      View,
      { style: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" } },
      ...tags.map((t, i) => import_common4.React.createElement(BotTagPill, { key: i, text: t.text, color: t.color }))
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
      add(safeFind("name:" + n, () => (0, import_metro2.findByName)(n, false)));
      const all = safeFind("nameAll:" + n, () => (0, import_metro2.findByNameAll)(n, false));
      if (Array.isArray(all))
        for (const x of all)
          add(x);
      add(safeFind("dn:" + n, () => (0, import_metro2.findByDisplayName)(n, false)));
      const dall = safeFind("dnAll:" + n, () => (0, import_metro2.findByDisplayNameAll)(n, false));
      if (Array.isArray(dall))
        for (const x of dall)
          add(x);
      const p = safeFind("props:" + n, () => {
        const m = (0, import_metro2.findByProps)(n);
        return m ? m[n] : null;
      });
      add(p);
      const filterFound = safeFind("filter:" + n, () => (0, import_metro2.find)((m) => {
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
      if (!import_common4.React.isValidElement(ret))
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
      return import_common4.React.cloneElement(ret, props);
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
      const mod = safeFind("ctx:" + k, () => (0, import_metro2.findByProps)(k));
      if (mod && typeof mod[k] === "function") {
        targetMod = mod;
        targetFnName = k;
        break;
      }
    }
    if (!targetMod || !targetFnName) {
      try {
        const mod = (0, import_metro2.find)((m) => {
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
      const store = safeFind("DeveloperModeStore", () => (0, import_metro2.findByStoreName)("DeveloperModeStore"));
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
  var import_common4, import_metro2, import_patcher, log3, View, Text, TouchableOpacity, roleCache;
  var init_components = __esm({
    "plugins/sameMoreBoats/src/modules/components.ts"() {
      "use strict";
      import_common4 = __require("@vendetta/metro/common");
      import_metro2 = __require("@vendetta/metro");
      import_patcher = __require("@vendetta/patcher");
      init_clipboard();
      init_toast();
      log3 = (...a) => {
        try {
          console.log("[SMB]", ...a);
        } catch {
        }
      };
      ({ View, Text, TouchableOpacity } = import_common4.ReactNative);
      roleCache = /* @__PURE__ */ new Map();
    }
  });

  // plugins/sameMoreBoats/src/index.ts
  var src_exports = {};
  __export(src_exports, {
    default: () => src_default
  });

  // plugins/sameMoreBoats/src/modules/tags.ts
  var import_patcher2 = __require("@vendetta/patcher");
  var import_common5 = __require("@vendetta/metro/common");
  init_components();
  var log4 = (...a) => {
    try {
      console.log("[SMB]", ...a);
    } catch {
    }
  };
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
      (0, import_patcher2.before)("dispatch", import_common5.FluxDispatcher, (args) => {
        try {
          harvestRoles(args == null ? void 0 : args[0]);
        } catch {
        }
      })
    );
    log4("tags: role-cache feeder active");
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }

  // plugins/sameMoreBoats/src/modules/forums.ts
  var import_patcher3 = __require("@vendetta/patcher");
  var import_common6 = __require("@vendetta/metro/common");
  var FORUM = 15;
  var MEDIA = 16;
  var stamp = (ch) => {
    if (!ch || ch.__smbType)
      return;
    if (ch.type === FORUM || ch.type === MEDIA) {
      try {
        Object.defineProperty(ch, "__smbType", { value: ch.type, enumerable: false, configurable: true });
      } catch {
      }
    }
  };
  function enableForums() {
    const unpatches = [];
    unpatches.push(
      (0, import_patcher3.before)("dispatch", import_common6.FluxDispatcher, (args) => {
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
      (0, import_patcher3.before)("dispatch", import_common6.FluxDispatcher, (args) => {
        var _a;
        const action = args == null ? void 0 : args[0];
        if ((action == null ? void 0 : action.type) === "FETCH_CHANNEL_INFO" && ((_a = action.channel) == null ? void 0 : _a.type) === FORUM) {
          try {
            import_common6.FluxDispatcher.dispatch({
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

  // plugins/sameMoreBoats/src/modules/serverSettings.ts
  var import_patcher4 = __require("@vendetta/patcher");
  var import_common7 = __require("@vendetta/metro/common");
  var FULL_SECTIONS = [
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
  function enableServerSettings() {
    const unpatches = [];
    unpatches.push(
      (0, import_patcher4.before)("dispatch", import_common7.FluxDispatcher, (args) => {
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

  // plugins/sameMoreBoats/src/modules/memberList.ts
  var import_patcher5 = __require("@vendetta/patcher");
  var import_common8 = __require("@vendetta/metro/common");
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
      (0, import_patcher5.before)("dispatch", import_common8.FluxDispatcher, (args) => {
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

  // plugins/sameMoreBoats/src/modules/contextMenu.ts
  var import_patcher6 = __require("@vendetta/patcher");
  var import_common9 = __require("@vendetta/metro/common");
  var log5 = (...a) => {
    try {
      console.log("[SMB]", ...a);
    } catch {
    }
  };
  function expandContextMenu() {
    const un = [];
    un.push(
      (0, import_patcher6.before)("dispatch", import_common9.FluxDispatcher, (args) => {
        try {
          const a = args == null ? void 0 : args[0];
          if (!(a == null ? void 0 : a.type))
            return;
          if (/MESSAGE|CHANNEL|CONTEXT/i.test(a.type)) {
            log5("ctx observe:", a.type);
          }
        } catch {
        }
      })
    );
    log5("contextMenu: observer active (render in components.ts)");
    return () => un.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }

  // plugins/sameMoreBoats/src/modules/devtools.ts
  var import_patcher7 = __require("@vendetta/patcher");
  var import_common10 = __require("@vendetta/metro/common");
  init_toast();
  var log6 = (...a) => {
    try {
      console.log("[SMB]", ...a);
    } catch {
    }
  };
  function enableDevTools() {
    const unpatches = [];
    let buffer2 = [];
    let count = 0;
    unpatches.push(
      (0, import_patcher7.before)("dispatch", import_common10.FluxDispatcher, (args) => {
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
    log6("DevTools: listening to FluxDispatcher. Total captured:", count);
    return () => unpatches.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }

  // plugins/sameMoreBoats/src/modules/featureGates.ts
  var import_patcher8 = __require("@vendetta/patcher");
  var import_common11 = __require("@vendetta/metro/common");
  var PC_GATES = [
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
      (0, import_patcher8.before)("dispatch", import_common11.FluxDispatcher, (args) => {
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

  // plugins/sameMoreBoats/src/modules/styles.ts
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

  // plugins/sameMoreBoats/src/index.ts
  init_toast();
  init_components();

  // plugins/sameMoreBoats/src/modules/settings.ts
  var import_common12 = __require("@vendetta/metro/common");
  var import_debug = __require("@vendetta/debug");
  var import_loader = __require("@vendetta/loader");
  var import_alerts2 = __require("@vendetta/ui/alerts");
  var import_components2 = __require("@vendetta/ui/components");
  var import_storage = __require("@vendetta/storage");
  var import_commands = __require("@vendetta/commands");
  var import_constants = __require("@vendetta/constants");
  init_toast();

  // plugins/sameMoreBoats/src/modules/recon.ts
  var import_metro3 = __require("@vendetta/metro");
  var import_alerts = __require("@vendetta/ui/alerts");

  // plugins/sameMoreBoats/src/modules/settings.ts
  var log7 = (...a) => {
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
        const backend = (0, import_storage.createMMKVBackend)("SMBSettings");
        const store = await (0, import_storage.createStorage)(backend);
        const sync = (0, import_storage.wrapSync)(store);
        settings = sync;
        for (const k of Object.keys(DEFAULTS)) {
          if (settings[k] === void 0 || settings[k] === null) {
            settings[k] = DEFAULTS[k];
          }
        }
        log7("storage init ok", JSON.stringify(settings));
      } catch (e) {
        log7("storage init FAIL", e);
      }
    })();
    return storagePromise;
  }
  var { View: View2, Text: Text2, TextInput, ScrollView, TouchableOpacity: TouchableOpacity2 } = import_common12.ReactNative;
  var { FormSection, FormRow, FormSwitch, FormDivider, FormLabel } = import_components2.Forms;
  var unregCmd = null;
  function registerSmbCommand() {
    if (unregCmd)
      return unregCmd;
    try {
      unregCmd = (0, import_commands.registerCommand)({
        name: "smb",
        displayName: "smb",
        description: "Same More Boats settings & DevTools",
        displayDescription: "Same More Boats settings & DevTools",
        inputType: import_constants.ApplicationCommandInputType.BUILT_IN,
        type: import_constants.ApplicationCommandType.CHAT,
        applicationId: "-1",
        options: [
          {
            name: "action",
            displayName: "action",
            description: "open / connect / url",
            displayDescription: "open / connect / url",
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
        execute: (args, _ctx) => {
          var _a, _b, _c;
          try {
            const action = (_a = args == null ? void 0 : args.find((a) => a.name === "action")) == null ? void 0 : _a.value;
            const url = (_b = args == null ? void 0 : args.find((a) => a.name === "url")) == null ? void 0 : _b.value;
            if (action === "connect") {
              const u = url || settings.devtoolsUrl;
              if (!u)
                return { content: "No URL set. Use `/smb url <ws://...>`" };
              settings.devtoolsUrl = u;
              (0, import_debug.connectToDebugger)(u);
              return { content: "Connecting to DevTools at " + u };
            }
            if (action === "url") {
              if (!url)
                return { content: "Usage: `/smb url ws://192.168.x.x:8097`" };
              settings.devtoolsUrl = url;
              return { content: "DevTools URL saved: " + url };
            }
            const lines = [
              "**Same More Boats**",
              "Slash commands:",
              "`/smb connect <ws://...>` - Connect React DevTools",
              "`/smb url <ws://192.168.x.x:8097>` - Save DevTools URL",
              "",
              "Status: " + (settings.devtoolsUrl ? "DevTools URL = " + settings.devtoolsUrl : "No DevTools URL set")
            ];
            return { content: lines.join("\n") };
          } catch (e) {
            return { content: "SMB error: " + String((_c = e == null ? void 0 : e.message) != null ? _c : e) };
          }
        }
      });
      log7("slash command /smb registered");
    } catch (e) {
      log7("registerCommand fail", e);
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
      initStorage().then(() => {
        log8("settings ready", JSON.stringify(settings));
      }).catch((e) => {
        log8("storage FAIL", e);
      });
      const cfg = settings;
      let ok = 0;
      let fail = 0;
      const safe = (name, fn) => {
        try {
          const un = fn();
          if (typeof un === "function")
            patches.push(un);
          ok++;
          log8("module ok:", name);
        } catch (e) {
          fail++;
          log8("module FAIL:", name, e);
        }
      };
      safe("featureGates", () => patchFeatureGates(cfg));
      safe("styles", () => {
        styleEl = injectStyles(cfg);
      });
      safe("components", () => patchComponents());
      if (cfg.tags)
        safe("tags", () => enableTags());
      if (cfg.forums)
        safe("forums", () => enableForums());
      if (cfg.serverSettings)
        safe("serverSettings", () => enableServerSettings());
      if (cfg.groupedMembers)
        safe("memberList", () => enableGroupedMemberList());
      if (cfg.contextMenu)
        safe("contextMenu", () => expandContextMenu());
      if (cfg.devTools)
        safe("devtools", () => enableDevTools());
      try {
        unregCmd2 = registerSmbCommand();
      } catch (e) {
        log8("cmd reg fail", e);
      }
      loaded = true;
      log8(`loaded: ${ok} ok, ${fail} failed`);
      toast(
        fail === 0 ? "Same More Boats loaded" : `Same More Boats: ${ok} on, ${fail} skipped`
      );
    },
    onUnload() {
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
          styleEl.remove();
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
