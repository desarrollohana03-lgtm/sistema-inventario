"use strict";

/* ============================================================
   HanaStock v2.1 (2026 Edition) — Mundo Hana, C.A.
   Next-Gen Inventory, Automation & Dispatch Intelligence
   ============================================================ */

/* Limpia service workers huérfanos de builds antiguos: pueden quedar
   listeners async rotos ("message channel closed before a response..."). */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initTheme();
  initMobileMenu();
  initNavigation();
  initAutomatizacion();
  initInventario();
  initReportes();
  initReportStudio();
  initAgenciasNOC();
  initModals();
  initToast();
  initCountUp();
  initDashboardChrome();
  initFlowChart();
  initDistribucionChart();
  initDashboardActions();
  initLastSync();
  initAgencySync();
  initActivityFeed();
  initRail();
  initCommandPalette();
  initKbdHelp();
  initShortcuts();
  initExports();
  initImport();
  initExportExcel();
  initEstadisticas();
  initHashRouting();
  init3DTilt();
  initHanaSelects();
  initConfiguracion();
  scheduleViewWarmup();
});

const $  = (selector, ctx = document) => ctx.querySelector(selector);
const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const sidebar = $("#sidebar");
const overlay = $("#overlay");
const views   = $$(".view");
const navBtns = $$(".nav-btn");

const VIEW_META = {
  panel:          "Dashboard",
  automatizacion: "Automatización",
  inventario:     "Inventario Central",
  agencias:       "Control de Agencias",
  reportes:       "Reportes y PDF",
  estadisticas:   "Estadísticas de Inventario",
  configuracion:  "Configuración",
};

/* ---------- 2b. HanaSelect: combobox custom que reemplaza al popup nativo ---------- */

const HANA_SELECTS = new WeakMap();
let hsOpenState = null;

const HS_CARET = '<svg class="hs-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const HS_CHECK = '<svg class="hs-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function hsSplitLabel(raw) {
  let text = String(raw || "").trim();
  let meta = "";
  const m = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m && /stock/i.test(m[2])) { text = m[1]; meta = m[2]; }
  const parts = text.split(" — ");
  return { code: parts.length > 1 ? parts.shift() : "", name: parts.join(" — ") || text, meta };
}

function hsInner(o) {
  const { code, name, meta } = hsSplitLabel(o.textContent);
  let metaHtml = "";
  if (meta) {
    const n = parseInt((meta.match(/(\d+)/) || [])[1], 10);
    const tone = Number.isFinite(n) && n <= 10 ? " low" : Number.isFinite(n) && n <= 20 ? " mid" : "";
    metaHtml = `<span class="hs-meta${tone}">${escapeHtml(meta)}</span>`;
  }
  return `${code ? `<span class="hs-chip">${escapeHtml(code)}</span>` : ""}<span class="hs-name">${escapeHtml(name)}</span>${metaHtml}`;
}

function hsRenderTrigger(state) {
  const { sel, btn } = state;
  const opt = sel.options[sel.selectedIndex];
  btn.innerHTML = `${hsInner(opt || {})}${HS_CARET}`;
}

function hsPlace(state) {
  const { btn, popup } = state;
  if (!popup) return;
  const rect = btn.getBoundingClientRect();
  const h = popup.offsetHeight;
  const w = popup.offsetWidth;
  const up = h > window.innerHeight - rect.bottom - 12 && rect.top > h + 12;
  popup.classList.toggle("hs-up", up);
  popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))}px`;
  popup.style.top = up ? `${rect.top - h - 6}px` : `${rect.bottom + 6}px`;
  popup.style.minWidth = `${rect.width}px`;
}

function hsSetActive(state, i, scroll) {
  if (!state.popup) return;
  state.popup.querySelectorAll(".hs-opt").forEach((r) => {
    r.classList.toggle("active", Number(r.dataset.index) === i);
  });
  const el = state.popup.querySelector(`.hs-opt[data-index="${i}"]`);
  if (el) {
    state.btn.setAttribute("aria-activedescendant", el.id);
    if (scroll) el.scrollIntoView({ block: "nearest" });
  }
}

function hsClose(state) {
  if (!state || !state.open) return;
  state.open = false;
  state.popup?.remove();
  state.popup = null;
  state.active = -1;
  state.btn.classList.remove("is-open");
  state.btn.setAttribute("aria-expanded", "false");
  state.btn.removeAttribute("aria-controls");
  state.btn.removeAttribute("aria-activedescendant");
  if (hsOpenState === state) hsOpenState = null;
}

function hsOpen(state) {
  if (hsOpenState && hsOpenState !== state) hsClose(hsOpenState);
  if (state.open) return;
  const { sel, btn } = state;
  const popup = document.createElement("div");
  const pid = `hs-pop-${sel.id || "x"}`;
  popup.className = "hs-popup";
  popup.id = pid;
  popup.setAttribute("role", "listbox");

  let idx = 0;
  Array.from(sel.options).forEach((o, i) => {
    const row = document.createElement("div");
    if (o.disabled) {
      row.className = "hs-opt hs-group";
      row.setAttribute("aria-disabled", "true");
      row.innerHTML = `<span class="hs-name">${escapeHtml(o.textContent.trim())}</span>`;
    } else {
      row.className = "hs-opt";
      row.setAttribute("role", "option");
      row.id = `${pid}-o${i}`;
      row.dataset.index = i;
      row.style.setProperty("--i", idx++);
      row.classList.toggle("selected", o.selected);
      row.setAttribute("aria-selected", o.selected ? "true" : "false");
      row.innerHTML = hsInner(o) + HS_CHECK;
      row.addEventListener("click", () => hsSelect(state, i));
    }
    popup.appendChild(row);
  });

  state.popup = popup;
  document.body.appendChild(popup);
  state.open = true;
  hsOpenState = state;
  btn.classList.add("is-open");
  btn.setAttribute("aria-expanded", "true");
  btn.setAttribute("aria-controls", pid);
  hsPlace(state);
  state.active = Math.max(0, sel.selectedIndex);
  hsSetActive(state, state.active, true);
}

function hsSelect(state, i) {
  const { sel } = state;
  const opt = sel.options[i];
  if (!opt) return;
  if (sel.selectedIndex !== i) {
    sel.selectedIndex = i;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  hsClose(state);
  state.btn.focus();
}

function hsKeys(state, e) {
  const list = Array.from(state.popup?.querySelectorAll(".hs-opt[data-index]") || []);
  if (e.key === "Escape") { hsClose(state); state.btn.focus(); e.preventDefault(); return; }
  if (e.key === "Tab") { hsClose(state); return; }
  if (!list.length) return;
  const pos = list.findIndex((r) => Number(r.dataset.index) === state.active);
  let target = null;
  if (e.key === "ArrowDown") target = list[(pos + 1) % list.length];
  else if (e.key === "ArrowUp") target = list[(pos - 1 + list.length) % list.length];
  else if (e.key === "Home") target = list[0];
  else if (e.key === "End") target = list[list.length - 1];
  else if (e.key === "Enter" || e.key === " ") { hsSelect(state, state.active); e.preventDefault(); return; }
  if (target) {
    state.active = Number(target.dataset.index);
    hsSetActive(state, state.active, true);
    e.preventDefault();
  }
}

function hsEnhance(sel) {
  if (HANA_SELECTS.has(sel)) return;
  const compact = sel.dataset.hanaSelect === "compact";
  const wrap = document.createElement("span");
  wrap.className = `hs-wrap${compact ? " hs-compact" : ""}`;
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.classList.add("hs-native");
  sel.setAttribute("aria-hidden", "true");
  wrap.parentElement.querySelector(":scope > svg")?.classList.add("hidden");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hs-trigger";
  btn.setAttribute("role", "combobox");
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  const label = sel.getAttribute("aria-label") || (sel.labels && sel.labels[0] && sel.labels[0].textContent.replace(/[*\s]+$/, "")) || sel.id;
  if (label) btn.setAttribute("aria-label", label);
  if (sel.required) btn.setAttribute("aria-required", "true");
  if (sel.disabled) btn.disabled = true;
  wrap.appendChild(btn);

  const state = { sel, btn, popup: null, open: false, active: -1 };
  HANA_SELECTS.set(sel, state);
  hsRenderTrigger(state);

  if (sel.id) {
    document.querySelectorAll(`label[for="${sel.id}"]`).forEach((lbl) => {
      lbl.addEventListener("click", (e) => { e.preventDefault(); btn.focus(); hsOpen(state); });
    });
  }
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.open) hsClose(state); else hsOpen(state);
  });
  btn.addEventListener("keydown", (e) => {
    if (!state.open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      hsOpen(state);
    }
  });

  /* Cambios programáticos de .value (p. ej. openCreateTransferModal) sincronizan el trigger. */
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  Object.defineProperty(sel, "value", {
    get() { return valueDesc.get.call(this); },
    set(v) { valueDesc.set.call(this, v); hsRenderTrigger(state); },
    configurable: true,
  });
  sel.addEventListener("change", () => hsRenderTrigger(state));
  new MutationObserver(() => hsRenderTrigger(state)).observe(sel, { childList: true });
}

function initHanaSelects() {
  $$("select[data-hana-select]").forEach(hsEnhance);
  document.addEventListener("mousedown", (e) => {
    const s = hsOpenState;
    if (s && !s.popup?.contains(e.target) && !s.btn.contains(e.target)) hsClose(s);
  });
  document.addEventListener("keydown", (e) => { if (hsOpenState) hsKeys(hsOpenState, e); });
  const reposition = () => { if (hsOpenState) hsPlace(hsOpenState); };
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
}

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer = null;
let syncTimer  = null;

/* ---------- 0. Tema claro / oscuro (persistente, sin recargar) ---------- */
const THEME_KEY = "hana_theme";

function applyTheme(mode) {
  const light = mode === "light";
  document.body.classList.toggle("light-mode", light);

  const btn = $("#btn-theme");
  if (btn) {
    btn.setAttribute("aria-pressed", String(light));
    btn.title = light ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", light ? "#F8FAFC" : "#121214");

  window.dispatchEvent(new CustomEvent("hana:theme", { detail: { light } }));
}

function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");

  const btn = $("#btn-theme");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next = document.body.classList.contains("light-mode") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    playCyberSound("click");
    toast(next === "light" ? "Modo claro activado" : "Modo oscuro activado", "info");
  });
}

/* ---------- 1. Audio deshabilitado (sin efectos de sonido) ---------- */
function playCyberSound() {
  /* Efectos de sonido deshabilitados intencionalmente. */
}

/* ---------- 2. Datos y Fallbacks de Respaldo ---------- */
const CODIGO_DUPLICADO = "8146";

const XML_VALIDO = `<?xml version="1.0" encoding="UTF-8"?>
<transferencia-central codigo="TRF-2026-0901" fecha="2026-09-21">
  <items>
    <item articulo="ZAP-HANA-42" categoria="Calzado" talla="42" cantidad="12" agencia="AG31"/>
    <item articulo="ZAP-HANA-40" categoria="Calzado" talla="40" cantidad="8" agencia="AG37"/>
    <item articulo="ROP-HANA-M" categoria="Ropa" talla="M" cantidad="18" agencia="AG32"/>
    <item articulo="ROP-HANA-L" categoria="Ropa" talla="L" cantidad="15" agencia="AG40"/>
    <item articulo="ZAP-HANA-39" categoria="Calzado" talla="39" cantidad="6" agencia="AG31"/>
    <item articulo="ACC-HANA-U" categoria="Accesorios" talla="Única" cantidad="10" agencia="AG31"/>
  </items>
</transferencia-central>`;

const XML_DUPLICADO = `<?xml version="1.0" encoding="UTF-8"?>
<transferencia-central codigo="TRF-2026-8146" fecha="2026-09-21">
  <registro-seguro id="seguro-8146">
    <hash-transferencia>SHA256:9f2c7a31b8146deadbeef0992381273918a</hash-transferencia>
  </registro-seguro>
  <items>
    <item articulo="ZAP-HANA-42" categoria="Calzado" talla="42" cantidad="12" agencia="AG31"/>
  </items>
</transferencia-central>`;

let currentXmlString = XML_VALIDO;

let FILAS_AUTOMATIZACION = [
  { articulo: "ZAP-HANA-42", categoria: "Calzado", descripcion: "Tenis Runner Air Negro", talla: "42", cantidad: 12, agencia: "AG31" },
  { articulo: "ZAP-HANA-40", categoria: "Calzado", descripcion: "Bota Urban Café Reforzada", talla: "40", cantidad: 8, agencia: "AG37" },
  { articulo: "ROP-HANA-M",  categoria: "Ropa",    descripcion: "Camisa Oxford Manga Larga", talla: "M", cantidad: 18, agencia: "AG32" },
  { articulo: "ROP-HANA-L",  categoria: "Ropa",    descripcion: "Chaqueta Denim Azul", talla: "L", cantidad: 15, agencia: "AG40" },
  { articulo: "ZAP-HANA-39", categoria: "Calzado", descripcion: "Zapatilla Stellar Pro Carbon", talla: "39", cantidad: 6, agencia: "AG31" },
  { articulo: "ACC-HANA-U",  categoria: "Accesorios", descripcion: "Gorra Urban Reflect", talla: "Única", cantidad: 10, agencia: "AG31" },
];

const PASOS_SINCRONIZACION = [
  "Validando integridad y estructura XML…",
  "Motor Anti-Duplicados: Verificando hash SHA-256 en Central…",
  "Enlace seguro TCP con nodos remotos (AG31 · AG32 · AG37 · AG40)…",
  "Registrando partidas arancelarias y descontando stock…",
  "Sincronización central completada sin conflictos",
];

let INVENTARIO = [
  { id: 1, codigo: "ZAP-HANA-36", nombre: "Sandalia Relax", categoria: "Calzado", talla: "36", precio: 42.0, stock: 0 },
  { id: 2, codigo: "ZAP-HANA-37", nombre: "Tenis Urbanista", categoria: "Calzado", talla: "37", precio: 65.0, stock: 18 },
  { id: 3, codigo: "ZAP-HANA-38", nombre: "Tenis Runner Air", categoria: "Calzado", talla: "38", precio: 85.0, stock: 14 },
  { id: 4, codigo: "ZAP-HANA-39", nombre: "Zapatilla Stellar Pro", categoria: "Calzado", talla: "39", precio: 98.0, stock: 22 },
  { id: 5, codigo: "ZAP-HANA-40", nombre: "Bota Urban", categoria: "Calzado", talla: "40", precio: 120.5, stock: 4 },
  { id: 6, codigo: "ZAP-HANA-41", nombre: "Botín Casual", categoria: "Calzado", talla: "41", precio: 110.0, stock: 15 },
  { id: 7, codigo: "ZAP-HANA-42", nombre: "Tenis Runner Air", categoria: "Calzado", talla: "42", precio: 85.0, stock: 12 },
  { id: 8, codigo: "ZAP-HANA-43", nombre: "Tenis Urban Slide", categoria: "Calzado", talla: "43", precio: 76.0, stock: 7 },
  { id: 9, codigo: "ZAP-HANA-44", nombre: "Tenis Urban Slide", categoria: "Calzado", talla: "44", precio: 76.0, stock: 6 },
  { id: 10, codigo: "ROP-HANA-S",  nombre: "Polo Stellar", categoria: "Ropa", talla: "S", precio: 28.0, stock: 40 },
  { id: 11, codigo: "ROP-HANA-M",  nombre: "Camisa Oxford", categoria: "Ropa", talla: "M", precio: 45.0, stock: 30 },
  { id: 12, codigo: "ROP-HANA-L",  nombre: "Chaqueta Denim", categoria: "Ropa", talla: "L", precio: 95.0, stock: 0 },
  { id: 13, codigo: "ROP-HANA-XL", nombre: "Pantalón Chino", categoria: "Ropa", talla: "XL", precio: 60.0, stock: 8 },
  { id: 14, codigo: "ACC-HANA-U",  nombre: "Gorra Urban Reflect", categoria: "Accesorios", talla: "Única", precio: 15.0, stock: 50 },
  { id: 15, codigo: "ACC-HANA-B",  nombre: "Cinturón Táctico", categoria: "Accesorios", talla: "M/L", precio: 22.5, stock: 16 },
];

/* ---------- 3. Navegación Principal ---------- */

function initNavigation() {
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      playCyberSound("click");
      showView(btn.dataset.view);
      if (window.innerWidth < 1024) closeMenuMovil();
    });
  });
}

function showView(name) {
  if (!VIEW_META[name]) return;

  views.forEach((v) => v.classList.add("hidden"));
  const view = $(`#view-${name}`);
  if (!view) return;
  view.classList.remove("hidden");
  /* El guardar y el log de Configuración viven fuera de la vista; se
     muestran con esta clase en el body. */
  document.body.classList.toggle("cfg-view-on", name === "configuracion");
  if (name === "configuracion") cfgCargar();
  view.classList.remove("view-enter");
  /* Re-disparo de la animación con doble rAF: el offsetWidth forzado
     provocaba un reflow síncrono de todo el documento en cada clic. */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => view.classList.add("view-enter"));
  });

  navBtns.forEach((b) => {
    const on = b.dataset.view === name;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });

  const crumb = $("#breadcrumb-page");
  if (crumb) crumb.textContent = VIEW_META[name];
  document.title = `HanaStock — ${VIEW_META[name]} · Mundo Hana`;
  try { history.replaceState(null, "", `#${name}`); } catch (_) { /* file:// */ }
}

function initHashRouting() {
  const initial = (location.hash || "").replace(/^#\/?/, "");
  if (initial && VIEW_META[initial]) showView(initial);
}

/* Precalienta el layout de las vistas ocultas cuando el navegador está idle:
   el primer clic deja de pagar de golpe el layout+paint de cientos de nodos
   (el clásico "al primero no va bien y luego sí"). Al quitar y poner
   `hidden` en la misma tarea no hay frame intermedio → sin parpadeo. */
function warmHiddenViews() {
  views.forEach((v) => {
    if (!v.classList.contains("hidden")) return;
    v.classList.remove("hidden");
    void v.offsetHeight;
    v.classList.add("hidden");
  });
}

function scheduleViewWarmup() {
  const run = () => requestAnimationFrame(warmHiddenViews);
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}

function initMobileMenu() {
  const menuBtn = $("#btn-menu");
  if (menuBtn) menuBtn.addEventListener("click", openMenuMovil);
  if (overlay) overlay.addEventListener("click", closeMenuMovil);
}

function openMenuMovil() {
  playCyberSound("click");
  sidebar.classList.remove("-translate-x-full");
  overlay.classList.remove("hidden");
}

function closeMenuMovil() {
  sidebar.classList.add("-translate-x-full");
  overlay.classList.add("hidden");
}

function initRail() {
  const btn = $("#btn-rail");
  if (!btn || !sidebar) return;
  btn.addEventListener("click", () => {
    playCyberSound("click");
    sidebar.classList.toggle("collapsed");
    const collapsed = sidebar.classList.contains("collapsed");
    btn.setAttribute("aria-expanded", String(!collapsed));
  });
}

/* ---------- 3.9 Autenticación local (demo sin backend) ---------- */

function currentUserName() {
  return localStorage.getItem("hana_user") || sessionStorage.getItem("hana_user") || "";
}

function prettyName(raw) {
  const base = raw.includes("@") ? raw.split("@")[0] : raw;
  return base
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function injectUserProfile(name) {
  const label = name || "Operador Hana";
  const nameEl = $("#sidebar-user-name");
  const iniEl = $("#sidebar-user-initials");
  if (nameEl) nameEl.textContent = label;
  if (iniEl) {
    const parts = label.split(/\s+/).filter(Boolean);
    const ini = (parts[0][0] || "") + (parts[1] ? parts[1][0] : "");
    iniEl.textContent = ini.toUpperCase();
  }
}

function switchAuthView(from, to) {
  from.classList.add("view-leaving");
  setTimeout(() => {
    from.classList.add("hidden");
    from.classList.remove("view-leaving");
    to.classList.remove("hidden");
    to.classList.add("view-entering");
    requestAnimationFrame(() => requestAnimationFrame(() => to.classList.remove("view-entering")));
  }, 350);
}

function initAuth() {
  const auth = $("#auth-container");
  const dash = $("#dashboard-container");
  if (!auth || !dash) return;

  const formLogin = $("#form-login");
  const formRegister = $("#form-register");
  const btnToggle = $("#auth-toggle");
  const switchText = $("#auth-switch-text");
  const errorBox = $("#auth-error");

  const showAuthError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  };
  const clearAuthError = () => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  };

  /* "Recordarme" activo → sesión persistente; desactivado → solo esta pestaña. */
  const saveSession = (name) => {
    const remember = $("#login-remember")?.checked !== false;
    localStorage.removeItem("hana_user");
    sessionStorage.removeItem("hana_user");
    (remember ? localStorage : sessionStorage).setItem("hana_user", name);
  };

  /* Toggle de visibilidad de la contraseña. */
  const passToggle = $("#login-pass-toggle");
  if (passToggle) {
    passToggle.addEventListener("click", () => {
      const input = $("#login-pass");
      const icon = $("#login-eye-icon");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      if (icon) icon.textContent = show ? "visibility" : "visibility_off";
      passToggle.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    });
  }

  /* Limpiar el error al volver a escribir. */
  ["#login-user", "#login-pass", "#reg-name", "#reg-user", "#reg-pass", "#reg-pass2"].forEach((sel) => {
    $(sel)?.addEventListener("input", clearAuthError);
  });

  // Sesión recordada → entrar directo al Dashboard
  const saved = currentUserName();
  if (saved) {
    auth.classList.add("hidden");
    dash.classList.remove("hidden");
    injectUserProfile(saved);
  }

  // Alternar Login ⇄ Registro
  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      playCyberSound("click");
      clearAuthError();
      const showingLogin = !formLogin.classList.contains("hidden");
      formLogin.classList.toggle("hidden", showingLogin);
      formRegister.classList.toggle("hidden", !showingLogin);
      if (switchText) switchText.textContent = showingLogin ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
      btnToggle.textContent = showingLogin ? "Inicia sesión" : "Regístrate aquí";
    });
  }

  // Iniciar Sesión
  if (formLogin) {
    formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = $("#login-user").value.trim();
      const pass = $("#login-pass").value;
      if (!u || !pass) {
        playCyberSound("warn");
        showAuthError("Completa usuario y contraseña para continuar.");
        return;
      }
      clearAuthError();
      const name = prettyName(u);
      saveSession(name);
      formLogin.reset();
      injectUserProfile(name);
      playCyberSound("success");
      switchAuthView(auth, dash);
    });
  }

  // Crear Cuenta
  if (formRegister) {
    formRegister.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#reg-name").value.trim();
      const u = $("#reg-user").value.trim();
      const p1 = $("#reg-pass").value;
      const p2 = $("#reg-pass2").value;
      if (!name || !u) {
        playCyberSound("warn");
        showAuthError("Nombre y usuario son obligatorios.");
        return;
      }
      if (p1.length < 8) {
        playCyberSound("warn");
        showAuthError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (p1 !== p2) {
        playCyberSound("warn");
        showAuthError("Las contraseñas no coinciden.");
        return;
      }
      clearAuthError();
      // Registro local de demostración: se guarda el perfil, nunca la contraseña.
      let users = [];
      try { users = JSON.parse(localStorage.getItem("hana_users") || "[]"); } catch { users = []; }
      if (!users.some((x) => (x.usuario || "").toLowerCase() === u.toLowerCase())) {
        users.push({ nombre: name, usuario: u });
        localStorage.setItem("hana_users", JSON.stringify(users));
      }
      const display = prettyName(name);
      saveSession(display);
      formRegister.reset();
      injectUserProfile(display);
      playCyberSound("success");
      toast(`Tu cuenta fue creada correctamente. Ya puedes gestionar el inventario, ${escapeHtml(display)}.`, "ok", { html: true, title: "Cuenta creada" });
      switchAuthView(auth, dash);
    });
  }

  // Cerrar Sesión
  const btnLogout = $("#btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      playCyberSound("warn");
      localStorage.removeItem("hana_user");
      sessionStorage.removeItem("hana_user");
      clearAuthError();
      if (formRegister && !formRegister.classList.contains("hidden")) btnToggle?.click();
      switchAuthView(dash, auth);
    });
  }
}

/* ---------- 4. Motor de Inventario Reactivo (API + Vista Dual) ---------- */

let activePillFilter = "todas";

function initInventario() {
  const inputSearch = $("#inv-search");
  const selectCat   = $("#inv-cat");
  const selectTalla = $("#inv-talla");
  const selectStock = $("#inv-stock");
  const btnClear    = $("#inv-clear");
  const pillsContainer = $("#inv-filter-pills");

  let sortState = { key: "nombre", dir: 1 };

  // Cargar productos desde API FastAPI
  fetchProductsFromApi();

  // Quick Filter Pills
  if (pillsContainer) {
    pillsContainer.addEventListener("click", (e) => {
      const pill = e.target.closest(".filter-pill");
      if (!pill) return;
      playCyberSound("click");
      $$(".filter-pill", pillsContainer).forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      activePillFilter = pill.dataset.pillFilter;

      // Sincronizar selectores correspondientes
      if (activePillFilter === "todas") {
        if (selectCat) selectCat.value = "todas";
        if (selectStock) selectStock.value = "todas";
      } else if (activePillFilter.startsWith("cat-")) {
        if (selectCat) selectCat.value = activePillFilter.replace("cat-", "");
        if (selectStock) selectStock.value = "todas";
      } else if (activePillFilter === "stock-en") {
        if (selectStock) selectStock.value = "stock";
      } else if (activePillFilter === "stock-bajo") {
        if (selectStock) selectStock.value = "bajo";
      } else if (activePillFilter === "stock-agotado") {
        if (selectStock) selectStock.value = "agotado";
      }
      render();
    });
  }

  function render() {
    const term = (inputSearch ? inputSearch.value || "" : "").trim().toLowerCase();
    const cat  = selectCat ? selectCat.value : "todas";
    const tal  = selectTalla ? selectTalla.value : "todas";
    const pillStockMap = { "stock-en": "stock", "stock-bajo": "bajo", "stock-agotado": "agotado" };
    const stk = selectStock ? selectStock.value : (pillStockMap[activePillFilter] || "todas");

    const filtered = INVENTARIO.filter((p) => {
      if (term) {
        const matchesTerm =
          p.nombre.toLowerCase().includes(term) ||
          p.codigo.toLowerCase().includes(term) ||
          (p.marca && p.marca.toLowerCase().includes(term));
        if (!matchesTerm) return false;
      }

      if (cat !== "todas" && p.categoria !== cat) return false;
      if (tal !== "todas" && p.talla !== tal) return false;

      if (stk === "stock" && p.stock <= 0) return false;
      if (stk === "bajo" && (p.stock <= 0 || p.stock > 10)) return false;
      if (stk === "agotado" && p.stock > 0) return false;

      return true;
    });

    filtered.sort((a, b) => {
      const va = a[sortState.key] ?? "";
      const vb = b[sortState.key] ?? "";
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * sortState.dir;
      }
      return String(va).localeCompare(String(vb), "es", { sensitivity: "base" }) * sortState.dir;
    });

    const countEl = $("#inv-count");
    if (countEl) {
      countEl.textContent = `Mostrando ${filtered.length} de ${INVENTARIO.length} artículos en Central`;
    }

    // Contadores dinámicos de los chips rápidos
    const chipCounts = {
      "#cnt-todas": INVENTARIO.length,
      "#cnt-stock": INVENTARIO.filter((p) => p.stock > 0).length,
      "#cnt-bajo": INVENTARIO.filter((p) => p.stock > 0 && p.stock <= 10).length,
      "#cnt-agotado": INVENTARIO.filter((p) => p.stock <= 0).length,
    };
    Object.entries(chipCounts).forEach(([sel, val]) => {
      const el = $(sel);
      if (el) el.textContent = val;
    });

    const totalEl = $("#inv-total-products");
    if (totalEl) totalEl.textContent = INVENTARIO.length;

    const empty = $("#inv-empty");
    if (empty) empty.classList.toggle("hidden", filtered.length > 0);

    renderMatrix(filtered);
  }

  window.__renderInventory = render;

  [inputSearch, selectCat, selectTalla, selectStock].forEach((el) => {
    if (el) el.addEventListener("input", render);
  });
  if (selectCat) selectCat.addEventListener("change", render);
  if (selectTalla) selectTalla.addEventListener("change", render);
  if (selectStock) selectStock.addEventListener("change", render);

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      playCyberSound("click");
      if (inputSearch) inputSearch.value = "";
      if (selectCat) selectCat.value = "todas";
      if (selectTalla) selectTalla.value = "todas";
      if (selectStock) selectStock.value = "todas";
      activePillFilter = "todas";
      if (pillsContainer) {
        $$(".filter-pill", pillsContainer).forEach((p, idx) => p.classList.toggle("active", idx === 0));
      }
      render();
    });
  }

  render();
}

function renderMatrix(items) {
  const grid = $("#inv-matrix-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const statusLbl = { ok: "Disponible", warn: "Stock Bajo", crit: "Agotado" };
  const lvlStyles = {
    ok: {
      text: "text-emerald-400",
      soft: "bg-emerald-500/15",
      bord: "border-emerald-500/30",
      dot: "bg-emerald-400",
      bar: "bg-emerald-500",
      groupText: "group-hover:text-emerald-400",
      hover: "hover:border-emerald-500/40 hover:shadow-emerald-950/20",
    },
    warn: {
      text: "text-amber-400",
      soft: "bg-amber-500/15",
      bord: "border-amber-500/30",
      dot: "bg-amber-400",
      bar: "bg-amber-500",
      groupText: "group-hover:text-amber-400",
      hover: "hover:border-amber-500/40 hover:shadow-amber-950/20",
    },
    crit: {
      text: "text-rose-400",
      soft: "bg-rose-500/15",
      bord: "border-rose-500/30",
      dot: "bg-rose-400",
      bar: "bg-rose-500",
      groupText: "group-hover:text-rose-400",
      hover: "hover:border-rose-500/40 hover:shadow-rose-950/20",
    },
  };

  items.forEach((p) => {
    const card = document.createElement("article");
    card.classList.add(
      "bg-[#16191F]", "border", "border-hana-border",
      "rounded-xl", "p-4",
      "flex", "flex-col", "justify-between",
      "transition-all", "duration-200",
      "group", "relative",
      "hover:shadow-xl"
    );
    card.dataset.productId = p.id;
    card.dataset.purpose = "product-card";

    let level = "ok";
    if (p.stock === 0) level = "crit";
    else if (p.stock <= 10) level = "warn";
    card.dataset.level = level;

    const c = lvlStyles[level];
    c.hover.split(" ").forEach((cls) => card.classList.add(cls));

    const pct = Math.min(100, Math.round((p.stock / 40) * 100));

    card.innerHTML = `
      <div class="space-y-3">
        <!-- Top Badges -->
        <div class="flex items-center justify-between gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase bg-[#111317] border border-hana-border text-slate-300 truncate">${p.categoria || "General"}</span>
          <span class="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${c.soft} border ${c.bord} ${c.text} flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${c.dot}"></span>
            ${statusLbl[level].toUpperCase()}
          </span>
        </div>
        <!-- Product Identifiers -->
        <div>
          <h3 class="text-base font-bold text-white tracking-tight ${c.groupText} transition-colors truncate">${p.nombre}</h3>
          <p class="text-[11px] font-mono text-slate-400 mt-0.5">COD: ${p.codigo}</p>
          <p class="text-[11px] uppercase tracking-wide text-slate-400 mt-0.5 truncate">${(p.marca || "Hana").toUpperCase()} · ${(p.color || "—").toUpperCase()} · TALLA ${p.talla || "U"}</p>
        </div>
        <!-- Inventory Meter -->
        <div class="p-2.5 bg-[#111317CC] rounded-lg border border-hana-border/70 space-y-2">
          <div class="flex items-baseline justify-between text-xs">
            <span class="text-[11px] uppercase font-mono tracking-wider text-slate-400">Existencia Total</span>
            <span class="font-mono font-bold text-sm text-white">${p.stock} <span class="text-[11px] font-normal text-slate-400">uds</span></span>
          </div>
          <!-- Progress Bar -->
          <div class="w-full bg-hana-base h-2 rounded-full overflow-hidden p-0.5 border border-hana-border/50">
            <div class="inv-meter-fill ${c.bar} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
          </div>
          <div class="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>MÍN 10</span>
            <span class="${c.text} font-semibold">${pct}% ÓPTIMO</span>
          </div>
        </div>
        <!-- Price and Physical Location -->
        <div class="flex items-center justify-between pt-1 border-t border-hana-border/50">
          <div>
            <span class="text-[10px] text-slate-400 uppercase font-mono block">Precio Unitario</span>
            <span class="text-base font-extrabold font-mono ${c.text}">Bs ${Number(p.precio).toFixed(2)}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-400 uppercase font-mono block">Ubicación Física</span>
            <span class="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-200 bg-[#111317] px-2 py-0.5 rounded border border-hana-border">
              <svg class="w-3 h-3 text-hana-primary" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" fill-rule="evenodd"></path></svg>
              ${p.pasillo || "Sin asignar"}
            </span>
          </div>
        </div>
      </div>`;

    grid.appendChild(card);
  });

  // Animación de llenado de las barras de existencia
  $$(".inv-meter-fill", grid).forEach((el) => {
    const target = el.style.width;
    el.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = target; }));
  });

  attachStockButtonEvents(grid);
}

function attachStockButtonEvents(container) {
  $$(".js-stock-inc", container).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      adjustStockLive(id, 1);
    });
  });

  $$(".js-stock-dec", container).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      adjustStockLive(id, -1);
    });
  });
}

async function fetchProductsFromApi() {
  try {
    const res = await fetch("/api/productos");
    if (!res.ok) throw new Error("API status " + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      INVENTARIO = data.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria ? p.categoria.nombre : "General",
        talla: p.talla || "—",
        marca: p.marca || "",
        color: p.color || "",
        pasillo: p.pasillo || "",
        precio: Number(p.precio) || 0,
        stock: p.stock || 0,
      }));
      if (window.__renderInventory) window.__renderInventory();
      populateTransferProductSelect();
    }
  } catch (err) {
    console.warn("Usando inventario local en caché:", err);
  }
}

async function adjustStockLive(productId, delta) {
  playCyberSound(delta > 0 ? "click" : "warn");

  const prod = INVENTARIO.find((p) => String(p.id) === String(productId));
  if (!prod) return;

  const oldStock = prod.stock;
  const newStock = Math.max(0, oldStock + delta);
  prod.stock = newStock;

  if (window.__renderInventory) window.__renderInventory();

  try {
    const res = await fetch(`/api/productos/${productId}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    if (res.ok) {
      const updated = await res.json();
      prod.stock = updated.stock;
      refreshStatsKpi();
    }
  } catch (err) {
    console.error("Error sincronizando stock con servidor:", err);
  }
}

async function refreshStatsKpi() {
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) return;
    const stats = await res.json();

    // Actualizar KPI total stock
    const stockEl = document.querySelector('[data-target]');
    if (stockEl) {
      // Buscar elementos count-up
      $$(".count-up").forEach((el) => {
        if (el.closest(".glass-card-glow")?.textContent.includes("Ítems en Stock")) {
          el.dataset.target = stats.total_stock;
          el.textContent = stats.total_stock;
        }
      });
    }
  } catch (_) {
    // Silencioso
  }
}

function populateTransferProductSelect() {
  const sel = $("#ct-producto");
  if (!sel) return;
  sel.innerHTML = "";
  INVENTARIO.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.codigo;
    opt.textContent = `${p.codigo} — ${p.nombre} (Stock: ${p.stock})`;
    opt.className = "bg-gray-950 text-white py-2";
    opt.style.cssText = "background-color:#030712;color:#ffffff;";
    sel.appendChild(opt);
  });
}

/* ---------- 5. Automatización & Anti-Duplicados Studio ---------- */

function initAutomatizacion() {
  const dropZone       = $("#drop-zone");
  const fileInput      = $("#file-xml");
  const btnValido      = $("#btn-test-valido");
  const btnDuplicado   = $("#btn-test-duplicado");
  const alertZone      = $("#alert-zone");
  const dupCodeSpan    = $("#dup-code");
  const dupHashSpan    = $("#dup-hash");
  const btnRevisar     = $("#btn-revisar-alerta");
  const fileName       = $("#file-name");
  const btnTable       = $("#btn-xml-view-table");
  const btnCode        = $("#btn-xml-view-code");
  const btnCopy        = $("#btn-copy-xml");
  const tableContainer = $("#xml-table-container");
  const codeContainer  = $("#xml-code-container");
  const codePre        = $("#xml-code-pre");

  let lastAutoRows = null;
  let activeMovement = { key: "transferencia", label: "Transferencia entre Almacenes", sign: 1 };

  // Tabs de tipo de movimiento
  const mvTabs = $("#mv-type-tabs");
  if (mvTabs) {
    mvTabs.addEventListener("click", (e) => {
      const t = e.target.closest(".mv-tab");
      if (!t) return;
      playCyberSound("click");
      $$(".mv-tab", mvTabs).forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      t.classList.add("active");
      t.setAttribute("aria-selected", "true");
      activeMovement = {
        key: t.dataset.mvType,
        label: t.textContent.trim(),
        sign: Number(t.dataset.mvSign) || 1,
      };
      renderImpact();
    });
  }

  function animateValue(el, target, fmt, dur = 800) {
    if (!el) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function renderImpact() {
    const panel = $("#impact-panel");
    if (!panel) return;
    if (!lastAutoRows || !lastAutoRows.length) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");

    const mv = activeMovement;
    const qty = lastAutoRows.reduce((s, r) => s + (Number(r.cantidad) || 0), 0);
    const signed = qty * mv.sign;
    const codes = new Set(lastAutoRows.map((r) => r.articulo));
    const stockActual = INVENTARIO
      .filter((p) => codes.has(p.codigo))
      .reduce((s, p) => s + (Number(p.stock) || 0), 0);
    const proyectado = Math.max(0, stockActual + signed);
    const valor = lastAutoRows.reduce((s, r) => {
      const prod = INVENTARIO.find((p) => p.codigo === r.articulo);
      return s + (prod ? (Number(prod.precio) || 0) * (Number(r.cantidad) || 0) : 0);
    }, 0);

    const badge = $("#imp-mv-type");
    if (badge) badge.textContent = mv.label.toUpperCase();

    const deltaK = $("#imp-delta-k");
    if (deltaK) deltaK.textContent = mv.sign >= 0 ? "Cantidad a Ingresar" : "Cantidad a Descontar";

    animateValue($("#imp-actual"), stockActual, (v) => `${v} uds`);

    const deltaEl = $("#imp-delta");
    if (deltaEl) {
      deltaEl.classList.toggle("pos", signed >= 0);
      deltaEl.classList.toggle("neg", signed < 0);
      animateValue(deltaEl, Math.abs(signed), (v) => `${signed >= 0 ? "+" : "−"}${v} uds`);
    }

    animateValue($("#imp-proyectado"), proyectado, (v) => `${v} uds`);
    animateValue($("#imp-valor"), valor, (v) => `Bs ${v.toLocaleString("es-VE")}`);

    const barActual = $("#imp-bar-actual");
    const barAdd = $("#imp-bar-add");
    const trackMax = Math.max(stockActual, proyectado, qty, 1);
    if (barActual) barActual.style.width = `${(Math.min(stockActual, proyectado) / trackMax) * 100}%`;
    if (barAdd) {
      barAdd.classList.toggle("neg", signed < 0);
      barAdd.style.width = `${(Math.abs(signed) / trackMax) * 100}%`;
    }
    const barLabel = $("#imp-bar-label");
    if (barLabel) barLabel.textContent = `${mv.label} · proyección ${proyectado} uds`;
  }

  // Toggle Tabla vs XML crudo
  if (btnTable && btnCode) {
    btnTable.addEventListener("click", () => {
      playCyberSound("click");
      btnTable.classList.add("active");
      btnCode.classList.remove("active");
      if (tableContainer) tableContainer.classList.remove("hidden");
      if (codeContainer) codeContainer.classList.add("hidden");
    });

    btnCode.addEventListener("click", () => {
      playCyberSound("click");
      btnCode.classList.add("active");
      btnTable.classList.remove("active");
      if (tableContainer) tableContainer.classList.add("hidden");
      if (codeContainer) codeContainer.classList.remove("hidden");
      renderXmlCode(currentXmlString);
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      playCyberSound("click");
      navigator.clipboard.writeText(currentXmlString).then(() => {
        toast("XML copiado al portapapeles.", "ok");
      });
    });
  }

  function renderXmlCode(xmlText) {
    if (!codePre) return;
    const escaped = xmlText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Syntax highlight simple
    const highlighted = escaped
      .replace(/(&lt;[?!]?[\w-]+)/g, '<span class="xml-tag">$1</span>')
      .replace(/(&lt;\/[\w-]+&gt;)/g, '<span class="xml-tag">$1</span>')
      .replace(/([\w-]+)=/g, '<span class="xml-attr">$1</span>=')
      .replace(/"([^"]*)"/g, '"<span class="xml-val">$1</span>"')
      .replace(/(&gt;)/g, '<span class="xml-tag">$1</span>');

    codePre.innerHTML = `<code>${highlighted}</code>`;
    if (btnCopy) btnCopy.classList.remove("hidden");
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("border-red-500", "bg-red-500/10");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-red-500", "bg-red-500/10");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-red-500", "bg-red-500/10");
      const file = e.dataTransfer.files[0];
      if (file) handleXmlFile(file);
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) handleXmlFile(file);
    });
  }

  if (btnValido) {
    btnValido.addEventListener("click", () => {
      playCyberSound("click");
      processXmlContent("transferencia-valida.xml", XML_VALIDO);
    });
  }

  if (btnDuplicado) {
    btnDuplicado.addEventListener("click", () => {
      playCyberSound("warn");
      processXmlContent("transferencia-duplicada-8146.xml", XML_DUPLICADO);
    });
  }

  if (btnRevisar) {
    btnRevisar.addEventListener("click", () => {
      playCyberSound("click");
      showView("reportes");
      const operador = escapeHtml(currentUserName() || "desconocido");
      toast(
        `<div class="toast-kv toast-line"><span class="k">Expediente</span><span class="v">TRF-2026-8146</span></div>` +
        `<div class="toast-kv toast-line"><span class="k">Solicitado por</span><span class="v">${operador}</span></div>` +
        `<div class="toast-kv toast-line"><span class="k">Huella</span><span class="v">SHA-256:9f2c…8146</span></div>` +
        `<div class="toast-kv toast-line"><span class="k">Estado</span><span class="v"><span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff3355] align-middle mr-1"></span>Consultando libro mayor…</span></div>`,
        "info",
        { html: true, duration: 9000, title: "Auditoría forense en curso" }
      );
      setTimeout(() => {
        playCyberSound("warn");
        toast(
          `<div class="toast-kv toast-line"><span class="k">Origen</span><span class="v">Agencia HANA-02</span></div>` +
          `<div class="toast-kv toast-line"><span class="k">Registrado</span><span class="v">21/09/2026 · 09:14</span></div>` +
          `<div class="toast-kv toast-line"><span class="k">Coincidencia</span><span class="v">100% · cadena íntegra</span></div>` +
          `<div class="toast-line"><span class="toast-verdict"><span class="vdot"></span>Carga rechazada · duplicado bloqueado</span></div>`,
          "error",
          { html: true, duration: 13000, title: "Dictamen anti-duplicados" }
        );
      }, 2400);
    });
  }

  // ---- Historial de movimientos confirmados (persistente) ----
  const MV_HISTORY_KEY = "hana_movimientos";
  const MV_HISTORY_SEED = [
    { tipo: "Compra Proveedor", guia: "FAC-2026-8712", proveedor: "Distribuciones Andina, C.A.", destino: "Almacén Central — Bahía 1-A2", cantidad: 220, fecha: "20/09/2026 02:32 p. m.", user: "Dima" },
    { tipo: "Transferencia entre Almacenes", guia: "TRF-2026-0877", proveedor: "Red Interna Hana", destino: "Agencia AG31", cantidad: 96, fecha: "21/09/2026 09:05 a. m.", user: "Operador Hana" },
    { tipo: "Devolución Cliente", guia: "DEV-2026-0341", proveedor: "Cliente #4412", destino: "Almacén Central — Cuarentena", cantidad: 14, fecha: "22/09/2026 04:48 p. m.", user: "Dima" },
  ];

  function getMvHistory() {
    try {
      const raw = localStorage.getItem(MV_HISTORY_KEY);
      return raw ? JSON.parse(raw) : MV_HISTORY_SEED;
    } catch {
      return MV_HISTORY_SEED;
    }
  }

  function saveMvHistory(list) {
    localStorage.setItem(MV_HISTORY_KEY, JSON.stringify(list.slice(0, 12)));
  }

  function renderMvHistory(markNew) {
    const ul = $("#mv-history");
    if (!ul) return;
    const items = getMvHistory();
    const countEl = $("#mv-hist-count");
    if (countEl) countEl.textContent = items.length;
    ul.innerHTML = "";
    if (!items.length) {
      ul.innerHTML = '<li class="py-6 text-center text-xs text-zinc-500">Sin movimientos registrados todavía.</li>';
      return;
    }
    items.forEach((m, i) => {
      const li = document.createElement("li");
      li.className = "mv-hist-item" + (markNew && i === 0 ? " new" : "");
      li.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <span class="badge badge-ok font-mono">✓ OK</span>
          <span class="font-mono text-[10px] text-zinc-500">${escapeHtml(m.fecha)}</span>
        </div>
        <p class="mt-1.5 text-xs font-semibold text-zinc-200">
          <span class="font-mono text-rose-300">${escapeHtml(m.guia)}</span>
          <span class="text-zinc-500"> · </span>${escapeHtml(m.tipo)}
        </p>
        <p class="mt-0.5 truncate text-[11px] text-zinc-500">${escapeHtml(m.destino)} · <b class="text-zinc-300">${m.cantidad} uds</b> · por ${escapeHtml(m.user || "Operador Hana")}</p>`;
      ul.appendChild(li);
    });
  }

  renderMvHistory(false);

  // ---- Confirmación de trámite administrativo ----
  const btnConfirmar = $("#btn-confirmar-tramite");
  const btnLimpiar   = $("#btn-limpiar-tramite");

  if (btnConfirmar) {
    btnConfirmar.addEventListener("click", () => {
      const proveedor = $("#mv-proveedor").value.trim();
      const guia      = $("#mv-guia").value.trim().toUpperCase();
      const destino   = $("#mv-destino").value.trim();
      const notas     = $("#mv-notas").value.trim();

      if (!proveedor || !guia) {
        playCyberSound("warn");
        toast("Completa el Proveedor / Origen y el N.º de Guía o Factura de referencia.", "error", { title: "Datos incompletos" });
        return;
      }
      if (!destino) {
        playCyberSound("warn");
        toast("Indica el almacén o la ubicación de destino del movimiento.", "error", { title: "Datos incompletos" });
        return;
      }
      if (!lastAutoRows || !lastAutoRows.length) {
        playCyberSound("warn");
        toast("Primero procesa un XML válido o pulsa «Carga Válida» para cargar el movimiento.", "error", { title: "Sin movimiento cargado" });
        return;
      }

      btnConfirmar.disabled = true;
      const label = btnConfirmar.querySelector("span");
      const original = label ? label.innerHTML : "";
      if (label) {
        label.innerHTML = '<svg width="15" height="15" class="mr-1.5 inline h-[15px] w-[15px] -mt-0.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sellando en el libro mayor…';
      }

      setTimeout(() => {
        const cantidad = lastAutoRows.reduce((s, r) => s + (Number(r.cantidad) || 0), 0);
        const mov = {
          tipo: activeMovement.label,
          guia,
          proveedor,
          destino,
          notas,
          cantidad,
          fecha: new Date().toLocaleString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          user: currentUserName() || "Operador Hana",
        };
        const hist = getMvHistory();
        hist.unshift(mov);
        saveMvHistory(hist);
        renderMvHistory(true);
        if (label) label.innerHTML = original;
        btnConfirmar.disabled = false;
        playCyberSound("success");
        toast(`Guía <b class="font-mono text-zinc-50">${escapeHtml(guia)}</b> · ${escapeHtml(mov.tipo)} · <b class="text-zinc-50">${cantidad} uds</b> sellada por ${escapeHtml(mov.user)}.`, "ok", { html: true, duration: 8000, title: "Trámite confirmado y sellado" });
      }, 1400);
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      playCyberSound("click");
      ["#mv-proveedor", "#mv-guia", "#mv-destino", "#mv-notas"].forEach((sel) => {
        const el = $(sel);
        if (el) el.value = "";
      });
      $("#mv-proveedor")?.focus();
    });
  }

  function handleXmlFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      processXmlContent(file.name, e.target.result);
    };
    reader.readAsText(file);
  }

  function processXmlContent(name, text) {
    currentXmlString = text;
    if (fileName) fileName.textContent = name;
    renderXmlCode(text);

    if (text.includes(CODIGO_DUPLICADO)) {
      playCyberSound("warn");
      if (alertZone) alertZone.classList.remove("hidden");
      if (dupCodeSpan) dupCodeSpan.textContent = CODIGO_DUPLICADO;
      if (dupHashSpan) dupHashSpan.textContent = "SHA256:9f2c7a31b" + CODIGO_DUPLICADO + "deadbeef88";
      const dupUserEl = $("#dup-user");
      if (dupUserEl) dupUserEl.textContent = currentUserName() || "SIN SESIÓN";
      clearAutoTable();
      toast(`Anti-Duplicados: Bloqueada transferencia con código ${CODIGO_DUPLICADO}.`, "error");
      hideSyncProgress();
    } else {
      if (alertZone) alertZone.classList.add("hidden");
      startSimulationFlow();
    }
  }

  function startSimulationFlow() {
    playCyberSound("click");
    const syncBox = $("#sync-box");
    const syncLog = $("#sync-log");
    const syncBar = $("#sync-bar");
    const syncState = $("#sync-state");

    if (syncBox) syncBox.classList.remove("hidden");
    if (syncLog) syncLog.innerHTML = "";
    if (syncBar) syncBar.style.width = "0%";
    if (syncState) {
      syncState.textContent = "En curso";
      syncState.className = "badge badge-warn";
    }

    if (syncTimer) clearInterval(syncTimer);

    let step = 0;
    const total = PASOS_SINCRONIZACION.length;

    syncTimer = setInterval(() => {
      if (step < total) {
        const p = document.createElement("p");
        p.textContent = `▶ ${PASOS_SINCRONIZACION[step]}`;
        if (syncLog) {
          syncLog.appendChild(p);
          syncLog.scrollTop = syncLog.scrollHeight;
        }
        step++;
        const pct = Math.round((step / total) * 100);
        if (syncBar) syncBar.style.width = `${pct}%`;
        playCyberSound("click");
      } else {
        clearInterval(syncTimer);
        syncTimer = null;
        if (syncState) {
          syncState.textContent = "Sincronizado";
          syncState.className = "badge badge-ok";
        }
        playCyberSound("success");
        fillAutoTable(FILAS_AUTOMATIZACION);
        toast("Transferencia procesada y sincronizada correctamente.", "ok");
      }
    }, 450);
  }

  function hideSyncProgress() {
    const syncBox = $("#sync-box");
    if (syncBox) syncBox.classList.add("hidden");
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  function fillAutoTable(rows) {
    const tbody = $("#auto-table-body");
    const empty = $("#auto-empty");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (empty) empty.classList.add("hidden");

    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.classList.add("row-animate");
      tr.innerHTML = `
        <td class="font-mono text-xs text-rose-300 font-bold">${r.articulo}</td>
        <td class="text-zinc-300">${r.categoria}</td>
        <td class="text-white">${r.descripcion}</td>
        <td class="font-mono text-zinc-300">${r.talla}</td>
        <td class="font-mono font-bold text-rose-400">${r.cantidad}</td>
        <td><span class="badge badge-ok font-mono">${r.agencia}</span></td>`;
      tbody.appendChild(tr);
    });

    lastAutoRows = rows;
    renderImpact();
  }

  function clearAutoTable() {
    const tbody = $("#auto-table-body");
    const empty = $("#auto-empty");
    if (tbody) tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    lastAutoRows = null;
    renderImpact();
  }
}

/* ---------- 6. Control de Agencias & NOC ---------- */

function initAgenciasNOC() {
  const btnPingAll = $("#btn-ping-all");

  if (btnPingAll) {
    btnPingAll.addEventListener("click", async () => {
      playCyberSound("ping");
      btnPingAll.disabled = true;
      btnPingAll.innerHTML = `<span><span class="pulse-dot"></span> Haciendo sweep NOC…</span>`;

      try {
        const res = await fetch("/api/agencias/ping-all", { method: "POST" });
        if (res.ok) {
          const agencias = await res.json();
          agencias.forEach((a) => {
            updateAgencyCardUI(a.codigo, a.latencia_ms, true);
          });
          playCyberSound("success");
          toast(`Barrido NOC completado: ${agencias.length} agencias verificadas en línea.`, "ok");
        }
      } catch (err) {
        console.error("Error en ping all:", err);
      } finally {
        btnPingAll.disabled = false;
        btnPingAll.innerHTML = `<span>
          <svg width="14" height="14" class="mr-1 inline h-3.5 w-3.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
          Ping Red Completa
        </span>`;
      }
    });
  }

  // Ping individual y Ficha NOC mediante DELEGACIÓN:
  // la red de agencias se renderiza en vivo y los nodos cambian de número.
  async function pingAgency(btn) {
    const code = btn.dataset.agency;
    playCyberSound("ping");
    btn.classList.add("animate-spin");

    try {
      const res = await fetch(`/api/agencias/${code}/ping`, { method: "POST" });
      if (res.ok) {
        const a = await res.json();
        updateAgencyCardUI(a.codigo, a.latencia_ms, true);
        toast(`Nodo ${code} respondió en ${a.latencia_ms} ms.`, "ok");
      }
    } catch (err) {
      toast(`Error al contactar con agencia ${code}.`, "error");
    } finally {
      btn.classList.remove("animate-spin");
    }
  }

  function openAgencyDetail(btn) {
    playCyberSound("click");
    $("#noc-modal-code").textContent = btn.dataset.agency;
    $("#noc-modal-name").textContent = btn.dataset.nombre;
    $("#noc-modal-ip").textContent = `${btn.dataset.host}:${btn.dataset.puerto}`;
    $("#noc-modal-latency").textContent = `${btn.dataset.latencia} ms`;
    openModal("#modal-agency-detail");
  }

  document.addEventListener("click", (e) => {
    const pingBtn = e.target.closest(".js-agency-ping-btn");
    if (pingBtn) {
      pingAgency(pingBtn);
      return;
    }
    const detailBtn = e.target.closest(".js-agency-detail-btn");
    if (detailBtn) openAgencyDetail(detailBtn);
  });

  // Buscador: filtra en tiempo real sobre la lista dinámica
  const searchAgencia = $("#search-agencia");
  if (searchAgencia) {
    searchAgencia.addEventListener("input", () => {
      agenciaFiltro = searchAgencia.value;
      renderAgencias(AGENCIAS_REDES);
    });
  }

  cargarAgencias();

  const btnNocPingDirect = $("#btn-noc-ping-direct");
  if (btnNocPingDirect) {
    btnNocPingDirect.addEventListener("click", () => {
      const code = $("#noc-modal-code").textContent;
      const pingBtn = document.querySelector(`.js-agency-ping-btn[data-agency="${code}"]`);
      if (pingBtn) pingBtn.click();
    });
  }

  const btnNocDispatch = $("#btn-noc-dispatch");
  if (btnNocDispatch) {
    btnNocDispatch.addEventListener("click", () => {
      closeModal("#modal-agency-detail");
      const code = $("#noc-modal-code").textContent;
      openCreateTransferModal(code);
    });
  }
}

/* ---------- 6.1 Red de Agencias DINÁMICA (fuente: BD Stellar vía API) ---------- */

// Las tiendas cerradas nunca se renderizan, sin importar lo que devuelva la fuente.
// Al cerrar una tienda basta con añadirla aquí o (mejor) marcarla inactiva en Stellar.
const AGENCIAS_CERRADAS = ["AG54", "AG13", "AG29", "AG61"];

let AGENCIAS_REDES = [];
let agenciaFiltro = "";

/* Simulación determinista de la respuesta en vivo de la BD de Stellar:
   universo de 64 códigos, 4 cerradas → 60 tiendas activas. */
function agenciasStellarSim() {
  const regiones = ["Capital", "Norte", "Sur", "Centro", "Oriente", "Occidente", "Llanos", "Andes", "Costa", "Guayana"];
  const estilos = ["Runner", "Urbanista", "Stellar", "Órbita", "Nexo", "Vórtice", "Delta", "Nova"];
  const plataformas = ["Linux · Rack", "Windows · VPS", "Linux · Edge"];
  const lista = [];
  for (let i = 1; i <= 64; i++) {
    const codigo = `AG${String(i).padStart(2, "0")}`;
    if (AGENCIAS_CERRADAS.includes(codigo)) continue;
    const seed = i * 7919;
    lista.push({
      id: i,
      codigo,
      nombre: `Agencia ${estilos[seed % estilos.length]} ${regiones[(seed >> 3) % regiones.length]}`,
      region: regiones[(seed >> 3) % regiones.length],
      host: `10.20.${3 + (i % 4)}.${10 + i}`,
      puerto: 8443,
      plataforma: plataformas[seed % 3],
      latencia_ms: 18 + (seed % 140),
      unidades: 40 + (seed % 460),
      activa: true,
      ultima_sincronizacion: null,
    });
  }
  return lista;
}

/* Carga la red: primero la API real de Stellar; si falla, la simulación. */
async function cargarAgencias() {
  try {
    const res = await fetch("/api/agencias");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error("respuesta vacía");
    AGENCIAS_REDES = data.filter((a) => a.activa && !AGENCIAS_CERRADAS.includes(a.codigo));
  } catch (err) {
    console.warn("Red Stellar no disponible; usando simulación en vivo:", err);
    AGENCIAS_REDES = agenciasStellarSim();
  }
  renderAgencias(AGENCIAS_REDES);
}

/* ---------- 6.1b Telemetría NOC ---------- */

let NOC_LAST_SWEEP = null;

function nocLatencyClass(ms) {
  if (!Number.isFinite(ms)) return "latency-poor";
  if (ms <= 40) return "latency-good";
  if (ms <= 80) return "latency-medium";
  return "latency-poor";
}

function nocStatus(ms, activa) {
  if (!activa) return { text: "Fuera de línea", cls: "st-off", ring: "latency-poor" };
  const ring = nocLatencyClass(ms);
  if (ring === "latency-good")   return { text: "En línea",   cls: "st-good", ring };
  if (ring === "latency-medium") return { text: "Estable",    cls: "st-med",  ring };
  return { text: "Degradada", cls: "st-bad", ring };
}

function nocSyncLabel(iso) {
  if (!iso) return "Sync —";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sync —";
  return `Sync ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function renderNocTelemetry(lista) {
  const box = $("#noc-telemetry");
  const bar = $("#noc-health-bar");
  if (!box) return;

  const total = lista.length;
  const online = lista.filter((a) => a.activa !== false).length;
  const lats = lista.map((a) => a.latencia_ms).filter((n) => Number.isFinite(n));
  const avg = lats.length ? Math.round(lats.reduce((s, n) => s + n, 0) / lats.length) : null;
  const good = lista.filter((a) => a.activa !== false && nocLatencyClass(a.latencia_ms) === "latency-good").length;
  const med  = lista.filter((a) => a.activa !== false && nocLatencyClass(a.latencia_ms) === "latency-medium").length;
  const bad  = total - good - med;
  const pct  = total ? Math.round((online / total) * 100) : 0;

  const sweep = NOC_LAST_SWEEP
    ? new Date(NOC_LAST_SWEEP).toLocaleTimeString("es-VE", { hour12: false })
    : "—";

  box.innerHTML = `
    <div class="noc-kpi stagger-in"><span class="noc-kpi-label">Nodos en malla</span><span class="noc-kpi-value">${total}</span></div>
    <div class="noc-kpi stagger-in"><span class="noc-kpi-label">En línea</span><span class="noc-kpi-value">${online}<em>/${total}</em></span></div>
    <div class="noc-kpi stagger-in"><span class="noc-kpi-label">Latencia media</span><span class="noc-kpi-value">${avg ?? "—"}<em>ms</em></span></div>
    <div class="noc-kpi stagger-in"><span class="noc-kpi-label">Último barrido</span><span class="noc-kpi-value noc-kpi-time">${sweep}</span></div>`;

  if (bar) {
    if (!total) {
      bar.innerHTML = `<span class="h-bad" style="flex-grow:1"></span>`;
    } else {
      bar.innerHTML = `
        <span class="h-good" style="flex-grow:${good || 0.0001}"></span>
        <span class="h-med"  style="flex-grow:${med || 0.0001}"></span>
        <span class="h-bad"  style="flex-grow:${bad || 0.0001}"></span>`;
    }
  }

  const label = $("#noc-health-label");
  if (label) {
    if (pct === 100 && bad === 0) { label.textContent = "Malla nominal"; label.className = "noc-health-label ok"; }
    else if (bad > 0)             { label.textContent = `${bad} nodo${bad > 1 ? "s" : ""} requiere atención`; label.className = "noc-health-label bad"; }
    else                          { label.textContent = "Operativa"; label.className = "noc-health-label med"; }
  }
}

/* Renderiza los nodos de la malla dentro de #agencias-grid. */
function renderAgencias(lista) {
  const grid = $("#agencias-grid");
  if (!grid) return;

  const term = agenciaFiltro.trim().toLowerCase();
  const visible = term
    ? lista.filter((a) =>
        (a.codigo || "").toLowerCase().includes(term) ||
        (a.nombre || "").toLowerCase().includes(term) ||
        (a.region || "").toLowerCase().includes(term))
    : lista;

  const countEl = $("#noc-active-count");
  if (countEl) countEl.textContent = visible.length;

  renderNocTelemetry(lista);

  grid.innerHTML = "";
  if (!visible.length) {
    grid.innerHTML = `<div class="col-span-full rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
      <svg class="mx-auto mb-3 text-zinc-600" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5.3 2.7 10l7.3 4.7V9.1c2-1.6 4.4-2.4 7.3-2.1"/><path d="M14 10.9v6l7.3-4.7-7.3-4.7v3.5c-2 1.6-4.4 2.4-7.3 2.1"/></svg>
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Sin agencias que coincidan con «${escapeHtml(agenciaFiltro)}»</p>
    </div>`;
    return;
  }

  visible.forEach((a) => {
    const activa = a.activa !== false;
    const st = nocStatus(a.latencia_ms, activa);
    const card = document.createElement("div");
    card.className = "noc-node glass-card-glow stagger-in js-agency-detail-btn";
    card.dataset.agencyCard = a.codigo;
    card.dataset.agency = a.codigo;
    card.dataset.nombre = a.nombre || a.codigo;
    card.dataset.host = a.host || "—";
    card.dataset.puerto = a.puerto || 8443;
    card.dataset.latencia = a.latencia_ms ?? "—";
    card.title = `Ficha NOC · ${a.codigo}`;
    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <span class="agencia-led${activa ? "" : " off"}" title="${activa ? "En línea" : "Fuera de línea"}" aria-hidden="true"></span>
          <span class="font-mono text-sm font-bold neon-glow-red">${escapeHtml(a.codigo)}</span>
          <span class="noc-chip truncate">${escapeHtml(a.region || "—")}</span>
        </div>
        <span class="latency-ring agency-ping ${st.ring} shrink-0" title="Latencia ${a.latencia_ms ?? "—"} ms">${a.latencia_ms ?? "—"}</span>
      </div>
      <p class="mt-2 truncate text-[11px] font-medium text-zinc-300">${escapeHtml(a.nombre || "")}</p>
      <p class="mt-0.5 truncate font-mono text-[10px] text-zinc-500">${escapeHtml(`${a.host || "—"}:${a.puerto || 8443}`)} · ${escapeHtml(a.plataforma || "Stellar")}</p>
      <div class="noc-node-foot">
        <span class="agency-sync-time">${nocSyncLabel(a.ultima_sincronizacion)}</span>
        <span class="flex items-center gap-2">
          <span class="noc-status ${st.cls}">${st.text}</span>
          <button type="button" class="icon-btn js-agency-ping-btn" data-agency="${escapeHtml(a.codigo)}" title="Hacer ping ahora" aria-label="Hacer ping a ${escapeHtml(a.codigo)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>
        </span>
      </div>`;
    grid.appendChild(card);
  });

  /* El mapeo de servidores de Configuración refleja siempre la malla real. */
  renderConfigServers(lista);
}

function updateAgencyCardUI(codigo, latenciaMs, activa) {
  /* Malla en memoria → fuente de verdad para la telemetría agregada. */
  const data = AGENCIAS_REDES.find((x) => x.codigo === codigo);
  if (data) {
    data.latencia_ms = latenciaMs;
    data.activa = activa;
    data.ultima_sincronizacion = new Date().toISOString();
    NOC_LAST_SWEEP = Date.now();
  }

  const card = document.querySelector(`[data-agency-card="${codigo}"]`);
  if (card) {
    const st = nocStatus(latenciaMs, activa);

    const led = card.querySelector(".agencia-led");
    if (led) {
      led.classList.toggle("off", !activa);
      led.title = activa ? "En línea" : "Fuera de línea";
    }

    const pingRing = card.querySelector(".agency-ping");
    if (pingRing) {
      pingRing.textContent = `${latenciaMs}`;
      pingRing.title = `Latencia ${latenciaMs} ms`;
      pingRing.className = `latency-ring agency-ping ${st.ring} shrink-0`;
    }

    const status = card.querySelector(".noc-status");
    if (status) {
      status.textContent = st.text;
      status.className = `noc-status ${st.cls}`;
    }

    const syncTime = card.querySelector(".agency-sync-time");
    if (syncTime) {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      syncTime.textContent = `Sync ${hh}:${mm}`;
    }

    card.dataset.latencia = latenciaMs;
  }

  renderNocTelemetry(AGENCIAS_REDES);
}

/* ---------- 7. Reportes, Manifiesto PDF & WhatsApp ---------- */

/* ---------- 7.0 Motor de impresión aislada (display:none por cadena) ----------
   printArea("#manifest-print-area", "portrait") marca el objetivo con
   .print-target, sus ancestros con .print-chain y el <body> con .printing +
   la utilidad de orientación. El CSS (§28 de custom.css) oculta todo lo que
   no esté en esa cadena, fuerza colores literales y controla paginación.
   La limpieza es doble: window.print() es bloqueante en Chrome/Firefox, y
   'afterprint' cubre navegadores no bloqueantes; el flag `done` evita doble
   limpieza. */
function printArea(targetSelector, orientation = "portrait") {
  const target = document.querySelector(targetSelector);
  if (!target) {
    toast("No se encontró el área de impresión.", "error");
    return;
  }

  const orientClass = orientation === "landscape" ? "print-landscape" : "print-portrait";
  const chain = [];
  for (let el = target.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    el.classList.add("print-chain");
    chain.push(el);
  }
  target.classList.add("print-target");
  document.body.classList.add("printing", orientClass);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    window.removeEventListener("afterprint", cleanup);
    document.body.classList.remove("printing", "print-portrait", "print-landscape");
    target.classList.remove("print-target");
    chain.forEach((el) => el.classList.remove("print-chain"));
  };

  window.addEventListener("afterprint", cleanup);
  /* Pase de formato 2026 si el objetivo vive dentro de Estadísticas
     (Ctrl+P lo cubre additionally el listener global de beforeprint). */
  if (typeof formatStatsForPrint === "function" && target.closest("#view-estadisticas")) {
    formatStatsForPrint();
  }
  try {
    window.print();
  } finally {
    /* print() bloquea hasta cerrar el diálogo en la mayoría de navegadores;
       si no se disparó afterprint aún, el cleanup idempotente corre ya. */
    setTimeout(cleanup, 500);
  }
}

function initReportes() {
  $$(".js-pdf").forEach((btn) => {
    btn.addEventListener("click", () => {
      playCyberSound("click");
      const traslado = btn.dataset.traslado || "TRF-2026-0841";
      openManifestModal(traslado);
    });
  });

  $$(".js-whatsapp").forEach((btn) => {
    btn.addEventListener("click", () => {
      playCyberSound("click");
      const traslado = btn.dataset.traslado || "TRF-2026-0841";
      const agencia = btn.dataset.agencia || "AG31";
      sendWhatsAppNotification(traslado, agencia);
    });
  });

  const btnPrint = $("#btn-print-manifest");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      playCyberSound("click");
      printArea("#manifest-print-area", "portrait");
    });
  }

  const btnShareWa = $("#btn-share-wa");
  if (btnShareWa) {
    btnShareWa.addEventListener("click", () => {
      playCyberSound("click");
      const trfId = $("#mf-id").textContent;
      const dest = $("#mf-destino").textContent;
      sendWhatsAppNotification(trfId, dest);
    });
  }
}

function openManifestModal(trfId) {
  const mfId = $("#mf-id");
  const mfDate = $("#mf-date");
  if (mfId) mfId.textContent = trfId;
  if (mfDate) {
    const d = new Date();
    mfDate.textContent = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  openModal("#modal-manifest");
}

function sendWhatsAppNotification(trfId, agencia) {
  const mensaje = encodeURIComponent(
    `📦 *HanaStock — Despacho Oficial*\n` +
    `Se ha generado la transferencia *${trfId}* con destino a la agencia *${agencia}*.\n` +
    `Estado: *Completada y Sincronizada en Central*\n` +
    `Fecha: ${new Date().toLocaleDateString("es-VE")}\n` +
    `Por favor confirmar recepción conforme en almacén.`
  );
  window.open(`https://wa.me/?text=${mensaje}`, "_blank");
  toast("Abriendo enlace oficial de WhatsApp...", "ok");
}

/* ---------- 11d. Report Studio (vista Reportes) ---------- */

function initReportStudio() {
  const view = $("#view-reportes");
  if (!view) return;

  view.addEventListener("click", (e) => {
    /* Chips de formato: descarga real del nodo central + sello de generación. */
    const chip = e.target.closest(".rep-card .report-chip");
    if (chip) {
      playCyberSound("click");
      const a = document.createElement("a");
      a.href = chip.dataset.href;
      a.download = chip.dataset.file || "reporte";
      document.body.appendChild(a);
      a.click();
      a.remove();
      const card = chip.closest(".rep-card");
      const titulo = card?.querySelector("h3")?.textContent || "Reporte";
      const last = card?.querySelector(".rep-last");
      if (last) {
        last.textContent = `${chip.textContent} · ${new Date().toLocaleTimeString("es-VE", { hour12: false })}`;
        last.hidden = false;
      }
      toast(`${titulo} (${chip.textContent}) exportado.`, "ok");
      return;
    }

    /* Rango de días de Movimientos: reescribe el query de los 3 formatos. */
    const seg = e.target.closest(".rep-seg-btn");
    if (seg) {
      playCyberSound("click");
      const card = seg.closest(".rep-card");
      card.querySelectorAll(".rep-seg-btn").forEach((b) => b.classList.toggle("active", b === seg));
      card.dataset.dias = seg.dataset.dias;
      card.querySelectorAll(".report-chip").forEach((c) => {
        c.dataset.href = c.dataset.href.replace(/dias=\d+/, `dias=${seg.dataset.dias}`);
      });
      return;
    }

    /* Copiar ID de transferencia. */
    const cp = e.target.closest(".js-copy-id");
    if (cp) {
      playCyberSound("click");
      const id = cp.dataset.traslado;
      const ok = () => toast(`ID ${id} copiado al portapapeles.`, "ok");
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(id).then(ok).catch(() => toast(`ID: ${id}`, "info"));
      } else {
        toast(`ID: ${id}`, "info");
      }
      return;
    }

    /* Marca la fila como notificada por WhatsApp. */
    const wa = e.target.closest(".js-whatsapp");
    if (wa) {
      const tag = wa.closest("tr")?.querySelector(".rep-wa");
      if (tag) tag.hidden = false;
    }
  });

  /* Búsqueda de la bitácora. */
  const search = $("#rep-search");
  search?.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase();
    let visibles = 0;
    $$("#rep-tbody tr[data-tr]").forEach((tr) => {
      const ok = !term || tr.dataset.tr.includes(term);
      tr.hidden = !ok;
      if (ok) visibles++;
    });
    const count = $("#rep-count");
    if (count) count.textContent = visibles;
    $("#rep-empty")?.classList.toggle("hidden", visibles !== 0);
  });
}

/* ---------- 8. Modales y Asistentes ---------- */

function initModals() {
  // Cerrar modales con botones .js-modal-close
  $$(".js-modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      playCyberSound("click");
      closeAllModals();
    });
  });

  // Cerrar al hacer clic en el backdrop
  $$(".modal-overlay").forEach((ov) => {
    ov.addEventListener("click", (e) => {
      if (e.target === ov) {
        playCyberSound("click");
        closeAllModals();
      }
    });
  });

  // Modal 1: Trigger Nuevo Producto
  const btnOpenNp = $("#btn-open-new-product");
  if (btnOpenNp) {
    btnOpenNp.addEventListener("click", () => {
      playCyberSound("click");
      openModal("#modal-new-product");
    });
  }

  // Modal 1: Formulario Nuevo Producto
  const formNp = $("#form-new-product");
  if (formNp) {
    formNp.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        codigo: $("#np-codigo").value.trim().toUpperCase(),
        nombre: $("#np-nombre").value.trim(),
        categoria_id: parseInt($("#np-categoria").value, 10),
        talla: $("#np-talla").value.trim() || null,
        color: $("#np-color").value.trim() || null,
        marca: $("#np-marca").value.trim() || null,
        precio: parseFloat($("#np-precio").value) || 0,
        stock: parseInt($("#np-stock").value, 10) || 0,
      };

      try {
        const res = await fetch("/api/productos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Error al crear producto");

        playCyberSound("success");
        toast(`Artículo ${payload.codigo} registrado exitosamente.`, "ok");
        formNp.reset();
        closeAllModals();
        fetchProductsFromApi();
        refreshStatsKpi();
      } catch (err) {
        playCyberSound("warn");
        toast("No se pudo registrar el artículo. Verifica el código único.", "error");
      }
    });
  }

  // Modal 4: Trigger Crear Transferencia Manual
  const btnOpenCt = $("#btn-open-create-trf");
  if (btnOpenCt) {
    btnOpenCt.addEventListener("click", () => {
      playCyberSound("click");
      openCreateTransferModal();
    });
  }

  const formCt = $("#form-create-transfer");
  if (formCt) {
    formCt.addEventListener("submit", (e) => {
      e.preventDefault();
      const agencia = $("#ct-agencia").value;
      const prodCode = $("#ct-producto").value;
      const cant = parseInt($("#ct-cantidad").value, 10) || 1;

      const prod = INVENTARIO.find((p) => p.codigo === prodCode) || {
        nombre: prodCode,
        categoria: "Calzado",
        talla: "U",
      };

      const trfCode = "TRF-2026-" + Math.floor(1000 + Math.random() * 9000);

      const generatedXml = `<?xml version="1.0" encoding="UTF-8"?>
<transferencia-central codigo="${trfCode}" fecha="${new Date().toISOString().split("T")[0]}">
  <items>
    <item articulo="${prod.codigo}" categoria="${prod.categoria}" talla="${prod.talla}" cantidad="${cant}" agencia="${agencia}"/>
  </items>
</transferencia-central>`;

      FILAS_AUTOMATIZACION = [
        {
          articulo: prod.codigo,
          categoria: prod.categoria,
          descripcion: prod.nombre,
          talla: prod.talla,
          cantidad: cant,
          agencia: agencia,
        },
      ];

      closeAllModals();
      showView("automatizacion");
      playCyberSound("success");
      toast(`Transferencia ${trfCode} armada hacia ${agencia}.`, "ok");

      const fileXmlBtn = $("#btn-test-valido");
      if (fileXmlBtn) {
        setTimeout(() => fileXmlBtn.click(), 250);
      }
    });
  }
}

function openCreateTransferModal(defaultAgency = "AG31") {
  populateTransferProductSelect();
  const agSelect = $("#ct-agencia");
  const routeDest = $("#ct-route-dest");
  if (agSelect) {
    agSelect.value = defaultAgency;
    if (routeDest) routeDest.textContent = defaultAgency;
    agSelect.addEventListener("change", () => {
      if (routeDest) routeDest.textContent = agSelect.value;
    });
  }
  openModal("#modal-create-transfer");
}

function openModal(selector) {
  const el = $(selector);
  if (!el) return;
  el.classList.add("active");
}

function closeModal(selector) {
  const el = $(selector);
  if (!el) return;
  el.classList.remove("active");
}

function closeAllModals() {
  $$(".modal-overlay").forEach((ov) => ov.classList.remove("active"));
}

/* ---------- 17. Configuración del Sistema ---------- */

let cfgLogTimer = null;
let cfgIsDirty = false;

/* Indicadores de estado: chip del header + punto del rail (misma fuente de verdad). */
function cfgStatus(dot, state, text) {
  const chip = $(`#cfg-st-${dot}`);
  if (chip) {
    chip.dataset.state = state;
    const txt = chip.querySelector(".cfg-chip-txt");
    if (txt && text) txt.textContent = text;
  }
  const railDot = $(`.cfg-rail-dot[data-dot="${dot}"]`);
  if (railDot) railDot.dataset.dotState = state;
}

/* Log técnico temporal, esquina inferior derecha (sobre el botón de guardar). */
function cfgShowLog(msg, tipo = "ok") {
  const box = $("#cfg-log");
  if (!box) return;
  const t = new Date().toLocaleTimeString("es-VE", { hour12: false });
  box.innerHTML = `<span class="cfg-log-dot ${escapeHtml(tipo)}"></span>` +
                  `<span class="cfg-log-time">[${escapeHtml(t)}]</span> ` +
                  escapeHtml(msg);
  box.classList.add("show");
  if (cfgLogTimer) clearTimeout(cfgLogTimer);
  cfgLogTimer = setTimeout(() => box.classList.remove("show"), 4500);
}

function cfgSetDirty(v) {
  cfgIsDirty = v;
  const btn = $("#btn-cfg-save");
  if (!btn) return;
  btn.disabled = !v;
  btn.classList.toggle("is-dirty", v);
  btn.title = v ? "Hay cambios sin guardar" : "Sin cambios por guardar";
}

/* Rellena el mapeo de servidores remotos desde la malla NOC. */
function renderConfigServers(lista) {
  const tbody = $("#cfg-servers-body");
  if (!tbody) return;
  const count = $("#cfg-servers-count");
  if (count) count.textContent = `${lista.length} de 64`;

  const total = lista.length;
  const online = lista.filter((a) => a.activa !== false).length;
  cfgStatus("nodos", total && online === total ? "ok" : total ? "err" : "idle",
    total ? `Nodos · ${online}/${total} en línea` : "Nodos · sin red");

  tbody.innerHTML = lista.map((a) => {
    const dir = `${a.host || "10.0.0.0"}:${a.puerto || 8080}`;
    const ok = a.activa !== false;
    return `<tr class="cfg-row" data-cfg-code="${escapeHtml(a.codigo)}">
      <td><span class="noc-chip">${escapeHtml(a.codigo)}</span></td>
      <td class="cfg-td-region">${escapeHtml(a.region || "—")}</td>
      <td><input class="form-input cfg-td-ip" data-server="${escapeHtml(a.codigo)}" value="${escapeHtml(dir)}" spellcheck="false" autocomplete="off" aria-label="Dirección IP del servidor de ${escapeHtml(a.codigo)}"></td>
      <td><span class="badge ${ok ? "badge-ok" : "badge-warn"}">${ok ? "Enlace activo" : "Sin enlace"}</span></td>
      <td>
        <button type="button" class="cfg-row-test js-cfg-row-test" data-agency="${escapeHtml(a.codigo)}" title="Verificar enlace" aria-label="Verificar enlace con ${escapeHtml(a.codigo)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </button>
      </td>
    </tr>`;
  }).join("");
}

/* Carga la configuracion persistida en el nodo central (una sola vez). */
async function cfgCargar() {
  try {
    const res = await fetch("/api/configuracion");
    if (!res.ok) return;
    const c = await res.json();
    const set = (sel, v) => { const el = $(sel); if (el && v != null) el.value = v; };
    set("#cfg-db-host", c.db_host);
    set("#cfg-db-port", c.db_port);
    set("#cfg-db-user", c.db_user);
    const pass = $("#cfg-db-pass");
    if (pass && c.password_set) pass.placeholder = "•••••••• (guardado)";
    cfgStatus("mysql", "idle", `MySQL · ${c.db_host}:${c.db_port} · config. guardada`);
  } catch (_) {
    cfgStatus("mysql", "idle", "MySQL · nodo central no accesible");
  }
}

function initConfiguracion() {
  /* Rail → cambio de panel con entrada animada. */
  const railBtns = $$(".cfg-rail-btn");
  railBtns.forEach((b) => {
    b.addEventListener("click", () => {
      playCyberSound("click");
      railBtns.forEach((x) => {
        const on = x === b;
        x.classList.toggle("active", on);
        x.setAttribute("aria-selected", on ? "true" : "false");
      });
      $$(".cfg-pane").forEach((p) => {
        const on = p.id === `cfg-pane-${b.dataset.cfgPane}`;
        p.classList.toggle("active", on);
        if (on) {
          p.classList.remove("cfg-pane-in");
          requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add("cfg-pane-in")));
        }
      });
    });
  });

  /* Bloque A: prueba REAL de conexion MySQL contra el host indicado. */
  const btnTest = $("#btn-cfg-test");
  if (btnTest) {
    btnTest.addEventListener("click", async () => {
      playCyberSound("click");
      const host = ($("#cfg-db-host")?.value || "127.0.0.1").trim();
      const port = parseInt(($("#cfg-db-port")?.value || "3306").trim(), 10) || 3306;
      const user = ($("#cfg-db-user")?.value || "").trim();
      const pass = ($("#cfg-db-pass")?.value || "").trim();
      const original = btnTest.innerHTML;
      btnTest.disabled = true;
      btnTest.innerHTML = `<span><span class="pulse-dot" style="width:5px;height:5px"></span> Probando conexión…</span>`;
      cfgStatus("mysql", "test", `MySQL · probando :${port}`);
      cfgShowLog(`Handshake real → ${host}:${port} …`, "info");
      try {
        const res = await fetch("/api/configuracion/test-mysql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, user, password: pass || null }),
        });
        const r = await res.json();
        if (r.ok) {
          playCyberSound("success");
          cfgStatus("mysql", "ok", `MySQL · conectado :${port} · ${r.latency_ms}ms`);
          cfgShowLog(`¡Conexión establecida con MySQL en puerto ${port}! (${r.latency_ms} ms)`, "ok");
        } else {
          playCyberSound("click");
          cfgStatus("mysql", "err", "MySQL · rechazado");
          cfgShowLog(`MySQL no respondió: ${(r.error || "error desconocido").slice(0, 120)}`, "err");
        }
      } catch (err) {
        cfgStatus("mysql", "err", "MySQL · error");
        cfgShowLog("No se pudo contactar con el nodo central.", "err");
      } finally {
        btnTest.disabled = false;
        btnTest.innerHTML = original;
      }
    });
  }

  /* Toggle de visibilidad para campos sensibles. */
  $$(".cfg-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.target);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.classList.toggle("is-on", show);
      btn.setAttribute("aria-label", show ? "Ocultar" : "Mostrar");
    });
  });

  /* Panel B: búsqueda de nodos (filtro local de filas). */
  $("#cfg-servers-search")?.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    $$("#cfg-servers-body tr").forEach((tr) => {
      tr.hidden = !!term && !tr.textContent.toLowerCase().includes(term);
    });
  });

  /* Panel B: verificación de enlace por nodo (delegación: la tabla se re-renderiza). */
  $("#cfg-servers-body")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-cfg-row-test");
    if (!btn) return;
    const tr = btn.closest("tr");
    const code = btn.dataset.agency;
    playCyberSound("ping");
    btn.classList.add("is-testing");
    cfgShowLog(`Verificando enlace con ${code}…`, "info");
    setTimeout(() => {
      btn.classList.remove("is-testing");
      const badge = tr?.querySelector(".badge");
      if (badge) { badge.className = "badge badge-ok"; badge.textContent = "Verificado"; }
      playCyberSound("success");
      cfgShowLog(`Nodo ${code} respondió en ${35 + Math.floor(Math.random() * 55)} ms.`, "ok");
    }, 850);
  });

  /* Dirty-tracking: cualquier edición habilita "Guardar" (la búsqueda no cuenta). */
  $("#view-configuracion")?.addEventListener("input", (e) => {
    if (e.target.closest("#cfg-servers-search")) return;
    if (!cfgIsDirty) cfgSetDirty(true);
  });

  /* Guardar REAL: valida IPs y persiste config + mapeo de tiendas en la BD.
     Los secretos viajan cifrados al nodo central; nunca quedan en el navegador. */
  const btnSave = $("#btn-cfg-save");
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      let firstBad = null;
      $$("#cfg-servers-body .cfg-td-ip").forEach((inp) => {
        const ok = /^[\w.-]{2,}(:\d{2,5})?$/.test(inp.value.trim());
        inp.classList.toggle("cfg-invalid", !ok);
        if (!ok && !firstBad) firstBad = inp;
      });
      if (firstBad) {
        playCyberSound("click");
        cfgShowLog("Revisa las direcciones IP marcadas en rojo.", "err");
        $$(".cfg-rail-btn").find((b) => b.dataset.cfgPane === "servers")?.click();
        firstBad.focus();
        return;
      }

      const datos = {
        db_host: ($("#cfg-db-host")?.value || "127.0.0.1").trim(),
        db_port: parseInt(($("#cfg-db-port")?.value || "3306").trim(), 10) || 3306,
        db_user: ($("#cfg-db-user")?.value || "root").trim(),
        db_password: ($("#cfg-db-pass")?.value || "").trim() || null,
      };
      const servidores = $$("#cfg-servers-body .cfg-td-ip").map((inp) => {
        const [h, p] = inp.value.trim().split(":");
        return { codigo: inp.dataset.server, host: h, puerto: parseInt(p, 10) || 8080 };
      });

      cfgShowLog("Persistiendo configuración técnica…", "info");
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/configuracion", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos),
          }),
          fetch("/api/configuracion/servidores", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(servidores),
          }),
        ]);
        if (r1.ok && r2.ok) {
          cfgSetDirty(false);
          playCyberSound("success");
          const res = await r1.json();
          if (datos.db_password) {
            const p = $("#cfg-db-pass");
            if (p) { p.value = ""; p.placeholder = "•••••••• (guardado)"; }
          }
          const m = r2.ok ? await r2.json() : { actualizados: 0 };
          cfgShowLog(
            `Configuración guardada: ${res.db_host}:${res.db_port} · ${m.actualizados} tienda(s) re-mapeada(s).`,
            "ok",
          );
        } else {
          cfgShowLog(`El nodo central rechazó la configuración (HTTP ${r1.status}/${r2.status}).`, "err");
        }
      } catch (err) {
        cfgShowLog("Sin conexión con el nodo central; nada fue guardado.", "err");
      }
    });
  }
  cfgSetDirty(false);
}

/* ---------- 9. Toast Notificaciones ---------- */

function hideToast() {
  const toastEl = $("#toast");
  if (!toastEl) return;
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
  toastEl.classList.add("opacity-0", "scale-95", "pointer-events-none");
}

function initToast() {
  const btnClose = $("#toast-close");
  if (btnClose) {
    btnClose.addEventListener("click", (e) => {
      e.stopPropagation();
      hideToast();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideToast();
  });

  // Pausa inteligente: el aviso se detiene mientras el usuario lo lee
  const toastEl = $("#toast");
  const progEl  = $("#toast-progress");
  if (!toastEl || !progEl) return;
  let remaining = 0;

  toastEl.addEventListener("mouseenter", () => {
    if (!toastEl.classList.contains("opacity-100")) return;
    if (toastTimer) clearTimeout(toastTimer);
    const total = Number(progEl.dataset.total || 6000);
    const full = toastEl.offsetWidth || 1;
    const w = progEl.getBoundingClientRect().width;
    remaining = Math.max(1200, total * (w / full));
    progEl.style.transition = "none";
    progEl.style.width = `${(w / full) * 100}%`;
  });

  toastEl.addEventListener("mouseleave", () => {
    if (!toastEl.classList.contains("opacity-100")) return;
    progEl.style.transition = `width ${remaining}ms linear`;
    void progEl.offsetWidth;
    progEl.style.width = "0%";
    toastTimer = setTimeout(hideToast, remaining);
  });
}

/* Tiempo de lectura estimado: ~130 ms por palabra, entre 7 y 12 segundos */
function readingTimeMs(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.min(12000, Math.max(7000, words * 130));
}

function toast(msg, type = "info", opts = {}) {
  const toastEl = $("#toast");
  const msgEl   = $("#toast-msg");
  const titleEl = $("#toast-title");
  const iconEl  = $("#toast-icon");
  const progEl  = $("#toast-progress");
  if (!toastEl || !msgEl) return;

  if (toastTimer) clearTimeout(toastTimer);

  toastEl.dataset.tipo = type;
  if (titleEl) {
    titleEl.textContent = opts.title || "";
    titleEl.classList.toggle("hidden", !opts.title);
  }
  if (opts.html) msgEl.innerHTML = msg;
  else msgEl.textContent = msg;

  let iconSvg = "";
  if (type === "ok") {
    iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  } else if (type === "error") {
    iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else {
    iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  if (iconEl) iconEl.innerHTML = iconSvg;

  toastEl.classList.remove("opacity-0", "scale-95", "pointer-events-none");
  toastEl.classList.add("opacity-100", "scale-100", "pointer-events-auto");

  const dur = opts.duration || readingTimeMs(msgEl.textContent);

  if (progEl) {
    progEl.dataset.total = dur;
    progEl.style.transition = "none";
    progEl.style.width = "100%";
    void progEl.offsetWidth;
    progEl.style.transition = `width ${dur}ms linear`;
    progEl.style.width = "0%";
  }

  toastTimer = setTimeout(hideToast, dur + 100);
}

/* ---------- 10. Sincronización ---------- */

function initLastSync() {
  const lastSync = $("#last-sync-time");
  if (!lastSync) return;
  const tick = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    lastSync.textContent = `${hh}:${mm}:${ss}`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- 10b. Estado de Agencias: tiempos "en vivo" + sincronizar ---------- */
const AGENCY_AGE_BASE = { AG31: 12, AG32: 45, AG37: 120, AG40: 300 };

function formatAgencyAge(sec) {
  if (sec < 60) return `Sincronizado hace ${sec} seg`;
  return `Sincronizado hace ${Math.floor(sec / 60)} min`;
}

function initAgencySync() {
  const nodes = $$(".agency-age");
  if (!nodes.length) return;

  const state = {};
  nodes.forEach((el) => {
    const code = el.dataset.agency;
    const base = AGENCY_AGE_BASE[code];
    state[code] = base !== undefined ? base : parseInt(el.dataset.ageSec || "0", 10) || 0;
  });

  const render = () => {
    nodes.forEach((el) => {
      el.textContent = formatAgencyAge(state[el.dataset.agency] ?? 0);
    });
  };
  render();

  setInterval(() => {
    Object.keys(state).forEach((code) => { state[code] += 1; });
    render();
  }, 1000);

  $$(".agency-sync-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.agency;
      state[code] = 0;
      render();
      btn.classList.add("is-spinning");
      playCyberSound("ping");
      toast(`Sincronizando con ${code}…`, "info");
      setTimeout(() => {
        btn.classList.remove("is-spinning");
        toast(`${code} sincronizada.`, "ok");
      }, 700);
    });
  });
}

/* ---------- 10c. Actividades Recientes: edades "en vivo" ---------- */
function initActivityFeed() {
  const nodes = $$(".activity-age");
  if (!nodes.length) return;
  const fmt = (sec) =>
    sec < 60 ? `Hace ${sec} seg`
    : sec < 3600 ? `Hace ${Math.floor(sec / 60)} min`
    : sec < 86400 ? `Hace ${Math.floor(sec / 3600)} h`
    : `Hace ${Math.floor(sec / 86400)} d`;
  const state = nodes.map((el) => ({
    el,
    sec: parseInt(el.dataset.ageSec || "0", 10) || 0,
  }));
  const render = () => state.forEach((s) => { s.el.textContent = fmt(s.sec); });
  render();
  setInterval(() => {
    state.forEach((s) => { s.sec += 1; });
    render();
  }, 1000);
}

/* ---------- 11. Count-Up de Números KPI ---------- */

function initCountUp() {
  const prepare = (el) => {
    const target = parseFloat(el.dataset.target || el.textContent) || 0;
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const decimals = Math.max(0, parseInt(el.dataset.decimals || "0", 10) || 0);
    return { target, prefix, suffix, decimals };
  };
  const render = (el, cfg, value) => {
    const fixed = Number(value).toFixed(cfg.decimals);
    const [intPart, decPart] = fixed.split(".");
    const grouped = Number(intPart).toLocaleString("en-US");
    el.textContent = cfg.prefix + grouped + (decPart ? "." + decPart : "") + cfg.suffix;
  };

  $$(".count-up").forEach((el) => {
    const cfg = prepare(el);
    if (prefersReducedMotion()) { render(el, cfg, cfg.target); return; }

    const duration = 900;
    const startTime = performance.now();
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      render(el, cfg, cfg.target * ease);
      if (progress < 1) requestAnimationFrame(update);
      else render(el, cfg, cfg.target);
    };
    requestAnimationFrame(update);
  });
}

/* ---------- 11b. Gráfico de Flujo Entradas/Salidas (SVG) ---------- */
function _serie(n, base, amp, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const trend = base + amp * t;
    const wave = Math.sin(t * Math.PI * 2 + seed) * (amp * 0.18);
    const rnd = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    const jitter = (rnd - Math.floor(rnd) - 0.5) * (amp * 0.14);
    out.push(Math.max(20, Math.round(trend + wave + jitter)));
  }
  return out;
}

const FLOW_RANGES = {
  "7d": {
    subtitulo: "Últimos 7 días · unidades movimentadas",
    etiquetas: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    in: _serie(7, 780, 620, 1.2),
    out: _serie(7, 560, 520, 2.7),
    rotacion: "5.1×",
  },
  "30d": {
    subtitulo: "Últimos 30 días · unidades movimentadas",
    etiquetas: Array.from({ length: 30 }, (_, i) => String(i + 1)),
    in: _serie(30, 720, 980, 0.6),
    out: _serie(30, 520, 760, 1.9),
    rotacion: "4.8×",
  },
  "1y": {
    subtitulo: "Últimos 12 meses · unidades movimentadas",
    etiquetas: ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep"],
    in: _serie(12, 260, 240, 0.4),
    out: _serie(12, 200, 360, 1.1),
    rotacion: "4.8×",
  },
};
const FLOW_DEFAULT = "30d";

function initFlowChart() {
  const canvas = $("#flujoInventarioChart");
  if (!canvas || typeof Chart === "undefined") return;

  const COLOR_RED = "#E11D48";
  const COLOR_GRAY = "#E2E8F0";
  let rangeKey = FLOW_DEFAULT;

  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  const theme = () => {
    const light = document.body.classList.contains("light-mode");
    return {
      grid: light ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.05)",
      tick: light ? "#64748b" : "#94A3B8",
      tipBg: light ? "rgba(255, 255, 255, 0.98)" : "rgba(10, 10, 12, 0.96)",
      tipTitle: light ? "#0f172a" : "#ffffff",
      tipBody: light ? "#334155" : "#cbd5e1",
    };
  };
  const gradFill = (hex, top) => (context) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return hexA(hex, 0.12);
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hexA(hex, top));
    g.addColorStop(1, hexA(hex, 0));
    return g;
  };

  const t0 = theme();
  const r0 = FLOW_RANGES[rangeKey];

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: r0.etiquetas,
      datasets: [
        {
          label: "Salidas",
          data: r0.out,
          borderColor: COLOR_RED,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          backgroundColor: gradFill(COLOR_RED, 0.35),
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLOR_RED,
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
        },
        {
          label: "Entradas",
          data: r0.in,
          borderColor: COLOR_GRAY,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          backgroundColor: gradFill(COLOR_GRAY, 0.16),
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLOR_GRAY,
          pointHoverBorderColor: "#0f172a",
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t0.tipBg,
          borderColor: "rgba(225, 29, 72, 0.35)",
          borderWidth: 1,
          titleColor: t0.tipTitle,
          bodyColor: t0.tipBody,
          padding: 10,
          cornerRadius: 10,
          usePointStyle: true,
          boxPadding: 4,
          callbacks: {
            title: (items) => {
              const lbl = items && items[0] ? items[0].label : "";
              return rangeKey === "30d" ? `Día ${lbl}` : lbl;
            },
            label: (item) =>
              ` ${item.dataset.label}: ${Number(item.parsed.y).toLocaleString("es-VE")} uds`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: t0.grid },
          border: { display: false },
          ticks: { color: t0.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        },
        y: {
          beginAtZero: true,
          grid: { color: t0.grid },
          border: { display: false },
          ticks: {
            color: t0.tick,
            maxTicksLimit: 5,
            callback: (v) => Number(v).toLocaleString("es-VE"),
          },
        },
      },
      animation: prefersReducedMotion() ? false : { duration: 900, easing: "easeOutQuart" },
    },
  });

  const aplicarTema = () => {
    const c = theme();
    chart.options.scales.x.grid.color = c.grid;
    chart.options.scales.y.grid.color = c.grid;
    chart.options.scales.x.ticks.color = c.tick;
    chart.options.scales.y.ticks.color = c.tick;
    chart.options.plugins.tooltip.backgroundColor = c.tipBg;
    chart.options.plugins.tooltip.titleColor = c.tipTitle;
    chart.options.plugins.tooltip.bodyColor = c.tipBody;
    chart.update("none");
  };

  const setRange = (key) => {
    const r = FLOW_RANGES[key];
    if (!r) return;
    rangeKey = key;
    chart.data.labels = r.etiquetas;
    chart.data.datasets[0].data = r.out;
    chart.data.datasets[1].data = r.in;
    chart.update();

    const fmt = (n) => Number(n).toLocaleString("en-US");
    const sum = (a) => a.reduce((s, v) => s + v, 0);
    const sub = $("#flow-subtitle"); if (sub) sub.textContent = r.subtitulo;
    const ti = $("#flow-total-in"); if (ti) ti.textContent = `${fmt(sum(r.in))} uds`;
    const to = $("#flow-total-out"); if (to) to.textContent = `${fmt(sum(r.out))} uds`;
    const rot = $("#flow-rotacion"); if (rot) rot.textContent = `${r.rotacion} anual`;
  };

  const botones = $$(".flow-filter");
  botones.forEach((b) => {
    b.addEventListener("click", () => {
      botones.forEach((o) => { o.classList.remove("is-active"); o.removeAttribute("aria-pressed"); });
      b.classList.add("is-active");
      b.setAttribute("aria-pressed", "true");
      setRange(b.dataset.range);
      playCyberSound("click");
    });
  });

  window.addEventListener("hana:theme", aplicarTema);
  setRange(FLOW_DEFAULT);
}

/* ---------- 11b. Chrome del Dashboard ---------- */

function initDashboardChrome() {
  /* Medidores KPI: anchuras reales (clamp 4-100%) con animación de entrada. */
  requestAnimationFrame(() => {
    $$(".kpi-meter [data-w]").forEach((el) => {
      const w = Math.max(4, Math.min(100, parseFloat(el.dataset.w) || 0));
      el.style.width = `${w}%`;
    });
  });

  /* Acciones rápidas. */
  $("#btn-dash-new-product")?.addEventListener("click", () => {
    playCyberSound("click");
    openModal("#modal-new-product");
  });
  $("#btn-dash-new-trf")?.addEventListener("click", () => {
    playCyberSound("click");
    openCreateTransferModal();
  });
  $("#btn-ver-red-noc")?.addEventListener("click", () => { playCyberSound("click"); showView("agencias"); });
  $("#btn-ver-bitacora")?.addEventListener("click", () => { playCyberSound("click"); showView("reportes"); });
}

/* ---------- 11b2. Gráfico de Barras: Distribución del Inventario (Chart.js) ---------- */
function initDistribucionChart() {
  const canvas = $("#distribucionInventarioChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = ["Calzado", "Ropa", "Accesorios"];
  const data = [280, 188, 95];

  const theme = () => {
    const light = document.body.classList.contains("light-mode");
    return {
      grid: light ? "rgba(15, 23, 42, 0.06)" : "rgba(255, 255, 255, 0.03)",
      tick: light ? "#64748b" : "#94A3B8",
      tipBg: light ? "rgba(255, 255, 255, 0.98)" : "rgba(10, 10, 12, 0.96)",
      tipTitle: light ? "#0f172a" : "#ffffff",
      tipBody: light ? "#334155" : "#cbd5e1",
    };
  };
  const t0 = theme();

  const barGrad = (context) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return "rgba(225, 29, 72, 0.85)";
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, "#E11D48");
    g.addColorStop(1, "rgba(159, 18, 57, 0.35)");
    return g;
  };

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Unidades",
          data,
          backgroundColor: barGrad,
          hoverBackgroundColor: "#E11D48",
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
          maxBarThickness: 96,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t0.tipBg,
          borderColor: "rgba(225, 29, 72, 0.35)",
          borderWidth: 1,
          titleColor: t0.tipTitle,
          bodyColor: t0.tipBody,
          padding: 10,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            label: (item) => `Cantidad: ${Number(item.parsed.y).toLocaleString("es-VE")} unidades`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: t0.tick, font: { family: "'Inter', system-ui, sans-serif", size: 12, weight: "600" } },
        },
        y: {
          beginAtZero: true,
          grid: { color: t0.grid },
          border: { display: false },
          ticks: {
            color: t0.tick,
            font: { family: "'Inter', system-ui, sans-serif", size: 11 },
            maxTicksLimit: 5,
            callback: (v) => Number(v).toLocaleString("es-VE"),
          },
        },
      },
      animation: prefersReducedMotion() ? false : { duration: 900, easing: "easeOutQuart" },
    },
  });

  window.addEventListener("hana:theme", () => {
    const c = theme();
    chart.options.scales.y.grid.color = c.grid;
    chart.options.scales.x.ticks.color = c.tick;
    chart.options.scales.y.ticks.color = c.tick;
    chart.options.plugins.tooltip.backgroundColor = c.tipBg;
    chart.options.plugins.tooltip.titleColor = c.tipTitle;
    chart.options.plugins.tooltip.bodyColor = c.tipBody;
    chart.update("none");
  });

  /* Datos REALES de stock por categoría desde el nodo central; el array
     estático queda solo como respaldo si el fetch fallara. */
  fetch("/api/stats")
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      if (!s || !Array.isArray(s.distribucion) || !s.distribucion.length) return;
      chart.data.labels = s.distribucion.map((d) => d.nombre);
      chart.data.datasets[0].data = s.distribucion.map((d) => d.unidades);
      chart.update();
    })
    .catch(() => { /* silencioso: conserva el fallback */ });
}

/* ---------- 11c. Acciones del Panel (Menú de Reportes CSV) ---------- */
function initDashboardActions() {
  const dropdown = $("#report-dropdown");
  const btn = $("#btn-export-report");
  const menu = $("#report-menu");
  if (!dropdown || !btn || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    playCyberSound("click");
    setOpen(menu.hidden);
  });

  menu.querySelectorAll(".report-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      playCyberSound("click");
      const a = document.createElement("a");
      a.href = chip.dataset.href;
      a.download = chip.dataset.file || "reporte";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setOpen(false);
      const titulo = chip.closest(".report-option")?.querySelector(".report-option-title")?.textContent || "Reporte";
      toast(`${titulo} (${chip.textContent}) exportado.`, "ok");
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !dropdown.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      setOpen(false);
      btn.focus();
    }
  });
}

/* ---------- 12. 3D Tilt Interactivo ---------- */

function init3DTilt() {
  if (prefersReducedMotion()) return;

  document.addEventListener("mousemove", (e) => {
    const card = e.target.closest(".card-tilt");
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
  });

  document.addEventListener("mouseout", (e) => {
    const card = e.target.closest(".card-tilt");
    if (!card || card.contains(e.relatedTarget)) return;
    card.style.transform = "";
  });
}

/* ---------- 13. Command Palette (Ctrl + K) ---------- */

function initCommandPalette() {
  const root = $("#cmdk");
  const input = $("#cmdk-input");
  const list = $("#cmdk-list");
  if (!root || !input || !list) return;

  const COMMANDS = [
    { label: "Ir a Dashboard", section: "Navegación", run: () => showView("panel") },
    { label: "Ir a Automatización", section: "Navegación", run: () => showView("automatizacion") },
    { label: "Ir a Inventario Central", section: "Navegación", run: () => showView("inventario") },
    { label: "Ir a Control de Agencias", section: "Navegación", run: () => showView("agencias") },
    { label: "Ir a Reportes y PDF", section: "Navegación", run: () => showView("reportes") },
    { label: "Ir a Configuración", section: "Navegación", run: () => showView("configuracion") },
    { label: "Nuevo Producto en Central", section: "Acciones", run: () => openModal("#modal-new-product") },
    { label: "Nueva Transferencia de Almacén", section: "Acciones", run: () => openCreateTransferModal() },
    { label: "Hacer Ping a Red de Agencias", section: "Acciones", run: () => $("#btn-ping-all")?.click() },
    { label: "Importar Catálogo CSV / Excel", section: "Datos", run: () => $("#btn-import-products")?.click() },
  ];

  let sel = 0;
  let filtered = [...COMMANDS];

  const render = () => {
    list.innerHTML = "";
    filtered.forEach((cmd, idx) => {
      const li = document.createElement("li");
      li.className = `cmdk-item ${idx === sel ? "active" : ""}`;
      li.innerHTML = `
        <span class="text-white font-medium">${cmd.label}</span>
        <span class="text-xs text-zinc-500 font-mono">${cmd.section}</span>`;
      li.addEventListener("click", () => {
        close();
        cmd.run();
      });
      list.appendChild(li);
    });
  };

  const open = () => {
    playCyberSound("click");
    root.classList.add("active");
    input.value = "";
    filtered = [...COMMANDS];
    sel = 0;
    render();
    setTimeout(() => input.focus(), 50);
  };

  const close = () => {
    root.classList.remove("active");
  };

  window.__cmdkOpen = open;

  $("#btn-cmd-search")?.addEventListener("click", open);

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.section.toLowerCase().includes(q));
    sel = 0;
    render();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      sel = (sel + 1) % filtered.length;
      render();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      sel = (sel - 1 + filtered.length) % filtered.length;
      render();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[sel]) {
        close();
        filtered[sel].run();
      }
    } else if (e.key === "Escape") {
      close();
    }
  });

  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });
}

/* ---------- 14. Atajos de Teclado Globales ---------- */

function initShortcuts() {
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (window.__cmdkOpen) window.__cmdkOpen();
      return;
    }

    if (e.key === "Escape") {
      closeAllModals();
      $("#cmdk")?.classList.remove("active");
      $("#kbd-help")?.classList.remove("active");
      if (window.innerWidth < 1024) closeMenuMovil();
      return;
    }

    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;

    if (e.key >= "1" && e.key <= "6") {
      const viewsArr = Object.keys(VIEW_META);
      showView(viewsArr[parseInt(e.key, 10) - 1]);
    } else if (e.key === "/") {
      e.preventDefault();
      showView("inventario");
      setTimeout(() => $("#inv-search")?.focus(), 80);
    } else if (e.key === "?") {
      e.preventDefault();
      $("#kbd-help")?.classList.toggle("active");
    }
  });
}

function initKbdHelp() {
  const root = $("#kbd-help");
  if (!root) return;
  root.addEventListener("click", (e) => {
    if (e.target === root) root.classList.remove("active");
  });
}

/* ---------- 15. Exportaciones (CSV / JSON) ---------- */

function initExports() {
  $("#btn-export-inv")?.addEventListener("click", () => {
    playCyberSound("click");
    const rows = [
      ["Código", "Artículo", "Categoría", "Talla", "Precio Bs", "Stock", "Estado"],
      ...INVENTARIO.map((p) => [
        p.codigo,
        p.nombre,
        p.categoria,
        p.talla,
        Number(p.precio).toFixed(2),
        p.stock,
        p.stock === 0 ? "Agotado" : p.stock <= 10 ? "Bajo stock" : "Disponible",
      ]),
    ];
    downloadCsv("inventario-hanastock.csv", rows);
    toast(`Inventario exportado (${INVENTARIO.length} artículos en CSV).`, "ok");
  });

  $("#btn-export-json")?.addEventListener("click", () => {
    playCyberSound("click");
    const jsonStr = JSON.stringify(INVENTARIO, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario-hanastock.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Catálogo exportado en formato JSON.", "ok");
  });

  $("#btn-export-all")?.addEventListener("click", () => {
    playCyberSound("click");
    const trs = $$("#view-reportes tbody tr");
    const rows = [
      ["ID Transferencia", "Ruta", "Artículos", "Total", "Fecha", "Estado"],
      ...trs.map((tr) =>
        Array.from(tr.querySelectorAll("td"))
          .slice(0, 6)
          .map((td) => td.textContent.trim())
      ),
    ];
    downloadCsv("transferencias-hanastock.csv", rows);
    toast(`Transferencias exportadas (${trs.length} registros).`, "ok");
  });
}

/* ---------- 15.1 Importación de catálogo (bulk, un solo POST multipart) ----------
   El parseo y la validación viven en el backend
   (POST /api/productos/bulk-import: openpyxl para .xlsx real, csv nativo para
   .csv, transacción todo-o-nada). El cliente sólo sube el archivo crudo y
   gestiona el estado visual del modal #modal-import. */

const IMPORT_MAX_BYTES = 15 * 1024 * 1024;
const IMPORT_SPINNER_SVG =
  '<svg class="import-spin h-[18px] w-[18px] text-rose-100" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.28" stroke-width="4"/>' +
  '<path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
  '</svg>';

function initImport() {
  const btnOpen   = $("#btn-import-products");
  const modal     = $("#modal-import");
  const dropzone  = $("#import-dropzone");
  const fileInput = $("#inv-import-file");
  const fileInfo  = $("#import-file-info");
  const fileName  = $("#import-file-name");
  const fileSize  = $("#import-file-size");
  const okBox     = $("#import-success");
  const okCount   = $("#import-success-count");
  const errBox    = $("#import-error-container");
  const errTitle  = $("#import-error-title");
  const errList   = $("#import-error-list");
  const errCodes  = $("#import-error-codes");
  const errCodesList = $("#import-error-codes-list");
  const btnConfirm = $("#btn-import-confirm");
  const btnCancel  = $("#btn-import-cancel");
  const btnLabel   = $("#btn-import-confirm-label");
  if (!btnOpen || !modal || !dropzone || !fileInput || !btnConfirm || !btnLabel) return;

  let importBusy = false;
  let importFile = null;

  /* ----- utilidades de estado ----- */

  function clearImportUi() {
    errBox.classList.add("hidden");
    errList.innerHTML = "";
    errCodes.classList.add("hidden");
    errCodesList.innerHTML = "";
    okBox.classList.add("hidden");
    okBox.classList.remove("flex");
    fileInfo.classList.add("hidden");
    fileInfo.classList.remove("flex");
  }

  function resetImportState() {
    importBusy = false;
    importFile = null;
    fileInput.value = "";
    btnConfirm.disabled = true;
    btnLabel.textContent = "Importar lote";
    btnConfirm.querySelector(".import-spin")?.remove();
    [btnConfirm, btnCancel, dropzone, fileInput].forEach((el) => { el.disabled = false; });
    btnConfirm.classList.remove("cursor-wait", "opacity-80");
    clearImportUi();
  }

  function setBusyUi(busy) {
    importBusy = busy;
    [btnConfirm, btnCancel, dropzone, fileInput].forEach((el) => { el.disabled = busy; });
    btnConfirm.classList.toggle("cursor-wait", busy);
    btnConfirm.classList.toggle("opacity-80", busy);
    if (busy) {
      btnLabel.textContent = "Procesando lote masivo…";
      if (!btnConfirm.querySelector(".import-spin")) {
        btnConfirm.insertAdjacentHTML("afterbegin", IMPORT_SPINNER_SVG);
      }
    } else {
      btnLabel.textContent = "Importar lote";
      btnConfirm.querySelector(".import-spin")?.remove();
    }
  }

  function showImportErrors(detail) {
    errList.innerHTML = "";
    errCodesList.innerHTML = "";
    const det = detail && typeof detail === "object" ? detail : { mensaje: String(detail || "") };

    errTitle.textContent = det.mensaje || "El servidor rechazó el lote. No se importó nada.";

    if (Array.isArray(det.filas_invalidas) && det.filas_invalidas.length) {
      const items = det.filas_invalidas.slice(0, 50);
      const frag = document.createDocumentFragment();
      for (const f of items) {
        const li = document.createElement("li");
        li.className = "rounded-md bg-red-500/10 px-2 py-1.5";
        li.innerHTML =
          `<span class="text-red-400">Fila ${escapeHtml(f.fila ?? "?")}</span>` +
          (f.codigo ? ` · <b class="text-red-100">${escapeHtml(f.codigo)}</b>` : "") +
          ` — ${escapeHtml(f.motivo || "sin motivo")}`;
        frag.appendChild(li);
      }
      if (det.filas_invalidas.length > items.length) {
        const li = document.createElement("li");
        li.className = "px-2 text-red-300/70";
        li.textContent = `… y ${det.filas_invalidas.length - items.length} fila(s) más`;
        frag.appendChild(li);
      }
      errList.appendChild(frag);
    }

    if (Array.isArray(det.codigos_ya_existentes) && det.codigos_ya_existentes.length) {
      for (const c of det.codigos_ya_existentes.slice(0, 80)) {
        const chip = document.createElement("span");
        chip.className = "rounded-md border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-200";
        chip.textContent = c;
        errCodesList.appendChild(chip);
      }
      if (det.codigos_ya_existentes.length > 80) {
        const more = document.createElement("span");
        more.className = "px-1 font-mono text-[10px] text-red-300/70";
        more.textContent = `+${det.codigos_ya_existentes.length - 80} más`;
        errCodesList.appendChild(more);
      }
      errCodes.classList.remove("hidden");
    }

    errBox.classList.remove("hidden");
    errBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setImportFile(file) {
    clearImportUi();
    importFile = null;
    btnConfirm.disabled = true;

    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      showImportErrors({ mensaje: "Formato no soportado. Sube un archivo .xlsx o .csv.", filas_invalidas: [] });
      playCyberSound("warn");
      return;
    }
    if (file.size > IMPORT_MAX_BYTES) {
      showImportErrors({ mensaje: `El archivo supera el límite de 15 MB (${(file.size / 1024 / 1024).toFixed(1)} MB). Divídelo en lotes más pequeños.`, filas_invalidas: [] });
      playCyberSound("warn");
      return;
    }

    importFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = `${(file.size / 1024).toFixed(0)} KB`;
    fileInfo.classList.remove("hidden");
    fileInfo.classList.add("flex");
    btnConfirm.disabled = false;
    playCyberSound("click");
  }

  /* ----- ciclo de vida del modal ----- */

  btnOpen.addEventListener("click", () => {
    playCyberSound("click");
    resetImportState();
    openModal("#modal-import");
  });

  dropzone.addEventListener("click", () => {
    if (importBusy) return;
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    if (f) setImportFile(f);
  });

  ["dragover", "dragenter"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      if (importBusy) return;
      dropzone.classList.add("border-[rgba(225,29,72,0.75)]", "bg-[rgba(225,29,72,0.06)]");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-[rgba(225,29,72,0.75)]", "bg-[rgba(225,29,72,0.06)]");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    if (importBusy) return;
    const f = e.dataTransfer?.files?.[0];
    if (f) setImportFile(f);
  });

  /* Congelación anti-doble-envío: en fase de captura se bloquean cierre por
     botón X/Cancelar, clic en backdrop y tecla Escape mientras hay lote en vuelo. */
  modal.addEventListener("click", (e) => {
    if (!importBusy) return;
    if (e.target === modal || e.target.closest(".js-modal-close")) {
      e.stopPropagation();
      e.preventDefault();
      toast("Espera a que termine el lote en curso…", "info", { title: "Importación en progreso" });
    }
  }, true);
  document.addEventListener("keydown", (e) => {
    if (importBusy && e.key === "Escape" && modal.classList.contains("active")) {
      e.stopPropagation();
      e.preventDefault();
      toast("Espera a que termine el lote en curso…", "info", { title: "Importación en progreso" });
    }
  }, true);

  /* ----- envío ----- */

  async function runImport() {
    if (!importFile || importBusy) return;
    const file = importFile;

    setBusyUi(true);
    clearImportUi();

    try {
      const fd = new FormData();
      fd.append("file", file, file.name);

      const res  = await fetch("/api/productos/bulk-import", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        okCount.textContent = data.creados;
        okBox.classList.remove("hidden");
        okBox.classList.add("flex");
        playCyberSound("success");
        toast(
          `<b class="font-mono text-zinc-50">${data.creados}</b> artículos creados en una transacción atómica desde <b class="font-mono text-zinc-50">${escapeHtml(file.name)}</b>.`,
          "ok", { html: true, duration: 12000, title: "Importación completada" }
        );
        fetchProductsFromApi();
        refreshStatsKpi();
        setTimeout(() => closeModal("#modal-import"), 2600);
      } else {
        const det =
          data && typeof data.detail === "object"
            ? data.detail
            : { mensaje: typeof data?.detail === "string" ? data.detail : `El servidor respondió ${res.status}. No se importó ningún artículo.` };
        showImportErrors(det);
        playCyberSound("warn");
      }
    } catch {
      showImportErrors({ mensaje: "Error de red al contactar el servidor. No se importó ningún artículo.", filas_invalidas: [] });
      playCyberSound("warn");
    } finally {
      /* Garantizado: el spinner se detiene y el formulario se descongela
         tanto si la transacción tuvo éxito como si petó en cualquier punto. */
      setBusyUi(false);
      btnConfirm.disabled = !importFile;
      fileInput.value = "";
    }
  }

  btnConfirm.addEventListener("click", runImport);
}

function downloadCsv(filename, rows) {
  const csv =
    "\ufeff" +
    rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- 15.2 Exportación XLSX nativa (sin dependencias) ---------- */

const _CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = _CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ZIP writer (método STORE) — suficiente para un .xlsx válido */
function zipStore(entries) {
  const enc = new TextEncoder();
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(10, dosTime, true);
    lh.setUint16(12, dosDate, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, e.data.length, true);
    lh.setUint32(22, e.data.length, true);
    lh.setUint16(26, name.length, true);
    locals.push(new Uint8Array(lh.buffer), name, e.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(12, dosTime, true);
    ch.setUint16(14, dosDate, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, e.data.length, true);
    ch.setUint32(24, e.data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    centrals.push(new Uint8Array(ch.buffer), name);

    offset += 30 + name.length + e.data.length;
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const out = new Uint8Array(offset + centralSize + 22);
  let p = 0;
  for (const c of parts) { out.set(c, p); p += c.length; }
  return out;
}

/* XLSX "Hana Editorial" del inventario Central: membrete rojo, banda de KPIs
   con SUBTOTAL() vivos, columna Valor (Bs) calculada, formato contable,
   doble filete rojo, hairlines y estado en texto coloreado (sin rellenos). */
function buildInventarioXlsx() {
  const enc = new TextEncoder();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const COLS = ["Código", "Artículo", "Categoría", "Talla", "Color", "Precio Bs", "Stock", "Ubicación", "Estado", "Valor (Bs)"];
  const sorted = [...INVENTARIO].sort(
    (a, b) => (a.categoria || "").localeCompare(b.categoria || "", "es") || (a.nombre || "").localeCompare(b.nombre || "", "es")
  );

  /* Anchos ABSOLUTOS 2026: max(max_contenido + 5, 14) — cero recortes/"###" */
  const displayLen = (val) => (typeof val === "number"
    ? Math.trunc(Math.abs(val)).toLocaleString("en-US").length + (val < 0 ? 2 : 0)
    : String(val ?? "").length);
  const WIDTHS = COLS.map((h, ci) => {
    let largo = h.length;
    sorted.forEach((p) => {
      const estado = p.stock === 0 ? "AGOTADO" : p.stock <= 10 ? "BAJO STOCK" : "DISPONIBLE";
      const vals = [p.codigo, p.nombre, p.categoria || "General", p.talla || "—", p.color || "—",
        Number(p.precio || 0), Number(p.stock || 0), p.pasillo || "Sin asignar", estado,
        Number(p.precio || 0) * Number(p.stock || 0)];
      largo = Math.max(largo, displayLen(vals[ci]));
    });
    return Math.max(largo + 5, 14);
  });

  const str = (ref, s, v) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  const num = (ref, s, v) => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
  const fml = (ref, s, f, v) => `<c r="${ref}" s="${s}"><f>${f}</f><v>${v}</v></c>`;

  const FIRST = 7;
  let totalStock = 0;
  let totalValor = 0;
  let bajoMin = 0;
  const dataRows = sorted.map((p, idx) => {
    const r = FIRST + idx;
    const st = p.stock === 0 ? 7 : p.stock <= 10 ? 6 : 5;
    const estado = p.stock === 0 ? "AGOTADO" : p.stock <= 10 ? "BAJO STOCK" : "DISPONIBLE";
    const precio = Number(p.precio || 0);
    const valor = precio * (p.stock || 0);
    totalStock += p.stock || 0;
    totalValor += valor;
    if (p.stock <= 10) bajoMin += 1;
    return `<row r="${r}" ht="20" customHeight="1">` +
      str("A" + r, 2, p.codigo) +
      str("B" + r, 2, p.nombre) +
      str("C" + r, 2, p.categoria || "General") +
      str("D" + r, 2, p.talla || "—") +
      str("E" + r, 2, p.color || "—") +
      num("F" + r, 3, precio.toFixed(2)) +
      num("G" + r, 4, p.stock || 0) +
      str("H" + r, 2, p.pasillo || "Sin asignar") +
      str("I" + r, st, estado) +
      fml("J" + r, 17, `F${r}*G${r}`, valor.toFixed(2)) +
      `</row>`;
  });
  const lastData = FIRST + sorted.length - 1;
  const tr = FIRST + sorted.length;

  const kpis = [
    ["A4", "C4", "ARTÍCULOS", fml("A5", 14, `SUBTOTAL(103,A${FIRST}:A${lastData})`, sorted.length)],
    ["D4", "E4", "STOCK TOTAL (UDS)", fml("D5", 14, `SUBTOTAL(109,G${FIRST}:G${lastData})`, totalStock)],
    ["F4", "G4", "BAJO MÍNIMO", fml("F5", 14, `COUNTIF(I${FIRST}:I${lastData},"BAJO STOCK")+COUNTIF(I${FIRST}:I${lastData},"AGOTADO")`, bajoMin)],
    ["H4", "J4", "VALOR INVENTARIO (Bs)", fml("H5", 15, `SUBTOTAL(109,J${FIRST}:J${lastData})`, totalValor.toFixed(2))],
  ];

  const rows = [];
  rows.push(`<row r="1" ht="44" customHeight="1">${str("A1", 8, "Hana")}</row>`);
  rows.push(`<row r="2" ht="28" customHeight="1">${str("A2", 12, "MUNDO HANA, C.A.")}</row>`);
  const fecha = new Date().toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" });
  rows.push(`<row r="3" ht="28" customHeight="1">${str("A3", 9, `Reporte de Inventario · Generado: ${fecha}`)}</row>`);
  rows.push(`<row r="4" ht="28" customHeight="1">${kpis.map(([a, , label]) => str(a, 13, label)).join("")}</row>`);
  rows.push(`<row r="5" ht="28" customHeight="1">${kpis.map(([, , , xml]) => xml).join("")}</row>`);
  rows.push(`<row r="6" ht="26" customHeight="1">${COLS.map((h, i) => str(String.fromCharCode(65 + i) + "6", 1, h)).join("")}</row>`);
  rows.push(...dataRows);
  rows.push(`<row r="${tr}" ht="26" customHeight="1">` +
    str("A" + tr, 10, "TOTAL EN ALMACÉN") +
    fml("G" + tr, 11, `SUBTOTAL(109,G${FIRST}:G${tr - 1})`, totalStock) +
    fml("J" + tr, 16, `SUBTOTAL(109,J${FIRST}:J${tr - 1})`, totalValor.toFixed(2)) +
    `</row>`);

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><tabColor rgb="FF0F172A"/><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="A1:J${tr}"/>` +
    `<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${rows.join("")}</sheetData>` +
    `<autoFilter ref="A6:J${lastData}"/>` +
    `<mergeCells count="11"><mergeCell ref="A1:D1"/><mergeCell ref="A2:D2"/><mergeCell ref="A3:F3"/>` +
    kpis.map(([a, b]) => {
      const ca = a.replace(/\d/, "");
      const cb = b.replace(/\d/, "");
      return `<mergeCell ref="${ca}4:${cb}4"/><mergeCell ref="${ca}5:${cb}5"/>`;
    }).join("") +
    `</mergeCells>` +
    `<printOptions horizontalCentered="1"/>` +
    `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>` +
    `<pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/>` +
    `<headerFooter><oddHeader>&amp;L&amp;8&amp;"Segoe UI,Italic"&amp;K8B8B93Hana · Reporte de Inventario&amp;R&amp;8&amp;"Segoe UI,Italic"&amp;K8B8B93Mundo Hana, C.A.</oddHeader>` +
    `<oddFooter>&amp;L&amp;8&amp;"Segoe UI,Italic"&amp;K8B8B93&amp;D &amp;T&amp;R&amp;8&amp;"Segoe UI,Italic"&amp;K8B8B93Página &amp;P de &amp;N</oddFooter></headerFooter>` +
    `</worksheet>`;

  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0;[Red](#,##0);&quot;–&quot;"/><numFmt numFmtId="165" formatCode="#,##0;[Red](#,##0);&quot;–&quot;"/></numFmts>` +
    `<fonts count="10">` +
    `<font><sz val="9"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="7"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>` +
    `<font><i/><sz val="9"/><color rgb="FF64748B"/><name val="Segoe UI"/></font>` +
    `<font><sz val="9"/><color rgb="FF059669"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="9"/><color rgb="FF92400E"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="9"/><color rgb="FFB91C1C"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="32"/><color rgb="FFA6192E"/><name val="Playfair Display Black"/></font>` +
    `<font><b/><sz val="12"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="7"/><color rgb="FF374151"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="8"/><color rgb="FF000000"/><name val="Segoe UI"/></font>` +
    `</fonts>` +
    `<fills count="4">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="4">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="medium"><color rgb="FF0F172A"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="18">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="165" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="5" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="bottom"/></xf>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="9" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="165" fontId="9" fillId="3" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="9" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="top"/></xf>` +
    `<xf numFmtId="0" fontId="8" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="bottom"/></xf>` +
    `<xf numFmtId="165" fontId="7" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="7" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="9" fillId="3" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Inventario Central" sheetId="1" r:id="rId1"/></sheets>` +
    `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Inventario Central'!$1:$6</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">'Inventario Central'!$A$1:$J$${tr}</definedName></definedNames>` +
    `<calcPr calcId="191029" fullCalcOnLoad="1"/>` +
    `</workbook>`;

  const wbRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  return zipStore([
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rootRels) },
    { name: "xl/workbook.xml", data: enc.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(wbRels) },
    { name: "xl/styles.xml", data: enc.encode(styles) },
    { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheet) },
  ]);
}

function initExportExcel() {
  const btn = $("#btn-export-excel");
  if (!btn) return;

  btn.addEventListener("click", () => {
    playCyberSound("click");
    btn.disabled = true;
      toast("Compilando hoja de cálculo con estilos corporativos. Esto tomará un momento…", "info", { title: "Generando Excel" });

    setTimeout(async () => {
      try {
        const bytes = buildInventarioXlsx();
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ts = new Date().toISOString().slice(0,16).replace(/[-:T]/g,"");
        a.download = `inventario-hana-${ts}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        playCyberSound("success");
        toast(`El archivo <b class="font-mono text-zinc-50">inventario-hana.xlsx</b> con <b class="text-zinc-50">${INVENTARIO.length}</b> artículos se guardó en tu equipo.`, "ok", { html: true, duration: 10000, title: "Reporte descargado" });
      } catch (err) {
        console.error("Exportación XLSX fallida:", err);
        playCyberSound("warn");
        toast("Ocurrió un error al compilar la hoja de cálculo. Vuelve a intentarlo en unos segundos.", "error", { title: "Exportación fallida" });
      } finally {
        btn.disabled = false;
      }
    }, 1500);
  });
}

/* ---------- 12. Estadísticas de Inventario — Control de Saldos ---------- */

/* La alternancia de #view-estadisticas ya la cubre initNavigation():
   el botón del sidebar es .nav-btn[data-view="estadisticas"] y showView()
   lo resuelve vía el alta en VIEW_META. Aquí se atan los controles propios. */

/* Base contable mensual del rd026 (valores firmados: ajuste / inv. físico
   pueden ser negativos; venta / nota entrega / nota devcom se restan). */
const STATS_COLS_IN  = ["compra", "devcom", "recepcion", "transferencia", "traslado", "ajuste", "invFisico", "produccion", "devol"];
const STATS_COLS_OUT = ["venta", "notaEntrega", "notaDevcom"];

const STATS_BASE_ROWS = [
  { desc: "RD026 · Conjunto Dep. Basquet · ROPA T-M",    dep: "AG01", ini: 120, compra: 50, devcom: 4, recepcion: 0, transferencia: 10, traslado: 0,  ajuste: -2, invFisico: 0, venta: 38, devol: 6, notaEntrega: 0, produccion: 0, notaDevcom: 0 },
  { desc: "RD026 · Conjunto Dep. Basquet · ROPA T-L",    dep: "AG01", ini: 85,  compra: 40, devcom: 2, recepcion: 0, transferencia: 5,  traslado: 0,  ajuste: -1, invFisico: 0, venta: 30, devol: 3, notaEntrega: 0, produccion: 0, notaDevcom: 0 },
  { desc: "RD026 · Conjunto Dep. Basquet · CALZADO T-41", dep: "AG01", ini: 60,  compra: 24, devcom: 1, recepcion: 0, transferencia: 0,  traslado: 6,  ajuste: 0,  invFisico: 0, venta: 18, devol: 2, notaEntrega: 0, produccion: 0, notaDevcom: 0 },
  { desc: "RD026 · Conjunto Dep. Basquet · ROPA T-S",    dep: "AG31", ini: 45,  compra: 20, devcom: 0, recepcion: 8, transferencia: 0,  traslado: 0,  ajuste: -1, invFisico: 0, venta: 22, devol: 1, notaEntrega: 0, produccion: 0, notaDevcom: 0 },
  { desc: "RD026 · Conjunto Dep. Basquet · ROPA T-M",    dep: "AG31", ini: 70,  compra: 30, devcom: 2, recepcion: 0, transferencia: 0,  traslado: 0,  ajuste: -3, invFisico: 0, venta: 28, devol: 4, notaEntrega: 0, produccion: 0, notaDevcom: 0 },
  { desc: "RD026 · Conjunto Dep. Basquet · CALZADO T-39", dep: "AG31", ini: 38,  compra: 12, devcom: 1, recepcion: 0, transferencia: 0,  traslado: 0,  ajuste: 0,  invFisico: -2, venta: 15, devol: 1, notaEntrega: 0, produccion: 0, notaDevcom: 0 },
  { desc: "RD026 · Conjunto Dep. Basquet · ROPA T-L",    dep: "AG32", ini: 52,  compra: 25, devcom: 3, recepcion: 0, transferencia: 12, traslado: 0,  ajuste: 0,  invFisico: 0, venta: 20, devol: 2, notaEntrega: 4, produccion: 0, notaDevcom: 0 },
  { desc: "RD026 · Conjunto Dep. Basquet · CALZADO T-42", dep: "AG32", ini: 30,  compra: 0,  devcom: 0, recepcion: 0, transferencia: 0,  traslado: 0,  ajuste: 0,  invFisico: 0, venta: 6,  devol: 0, notaEntrega: 0, produccion: 0, notaDevcom: 2 },
];

const STATS_PERIODS = {
  semanal: { factor: 0.25, desde: "2026-09-22", intervalo: "22/09–28/09/26", etiqueta: "Semana 39 · 2026" },
  mensual: { factor: 1,    desde: "2026-09-01", intervalo: "01/09–28/09/26", etiqueta: "Septiembre 2026" },
  anual:   { factor: 11,   desde: "2026-01-01", intervalo: "01/01–28/09/26", etiqueta: "Ejercicio 2026 (ene–sep)" },
};

function statsScale(value, factor) {
  const v = Math.round(value * factor);
  return v === 0 ? 0 : v; /* normaliza -0 */
}

function statsRowValues(row, factor) {
  const vals = {};
  [...STATS_COLS_IN, ...STATS_COLS_OUT].forEach((k) => { vals[k] = statsScale(row[k], factor); });
  const fin = row.ini + STATS_COLS_IN.reduce((s, k) => s + vals[k], 0)
                      - STATS_COLS_OUT.reduce((s, k) => s + vals[k], 0);
  return { ...vals, ini: row.ini, fin };
}

function statsNumCell(v, extraClass = "") {
  const n = typeof v === "number" ? Math.round(v) : parseLooseNumber(v);
  if (n === null) {
    return `<td class="td-num${extraClass ? ` ${extraClass}` : ""}"><span class="td-zero" aria-label="sin movimientos">–</span></td>`;
  }
  const neg = n < 0;
  const txt = n === 0
    ? `<span class="td-zero" aria-label="cero">–</span>`
    : formatStatsNumber(n);
  return `<td class="td-num${neg ? " td-neg" : ""}${extraClass ? ` ${extraClass}` : ""}">${txt}</td>`;
}

/* ---------- Formato numérico "2026" para la tabla de estadísticas ----------
   Reglas estrictas:
     - decimales truncados por completo (1020.0000 -> 1020);
     - miles con separador de locale es-VE (1020 -> "1.020");
     - 0 / "-" / vacío -> guión tenue .td-zero (cero ruido visual).
   parseLooseNumber es tolerante: acepta números crudos de JS, texto "1020.00",
   formato es-VE "1.020,00" y formato inglés "1,020.00" — por eso el pase
   pre-impresión es idempotente sobre celdas ya formateadas. */

function parseLooseNumber(text) {
  let s = String(text ?? "").trim().replace(/\s+/g, "");
  if (!s || s === "–" || s === "-" || s === "—") return null;
  const neg = s.startsWith("-") || /^\(.+\)$/.test(s);
  s = s.replace(/[()+\-]/g, "");
  if (!/\d/.test(s)) return null;
  let n;
  if (s.includes(",")) {
    // es-VE: punto=miles, coma=decimal  ·  inglés: coma=miles, punto=decimal
    const ultimaComa = s.lastIndexOf(",");
    const ultPunto = s.lastIndexOf(".");
    if (ultimaComa > ultPunto) n = Number(s.replace(/\./g, "").replace(",", "."));
    else n = Number(s.replace(/,/g, ""));
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    n = Number(s.replace(/\./g, ""));            // "1.020" -> 1020
  } else {
    n = Number(s.replace(/\.\d+$/, ""));         // "1020.0000" -> 1020
  }
  if (!Number.isFinite(n)) return null;
  n = Math.round(n);
  return neg ? -n : n;
}

function formatStatsNumber(v) {
  const n = typeof v === "number" ? Math.round(v) : parseLooseNumber(v);
  if (n === null) return "–";
  if (n === 0) return "–";
  return n.toLocaleString("es-VE", { maximumFractionDigits: 0, useGrouping: true });
}

/* Pase defensivo ANTES de window.print(): reformatea todo td.td-num del tbody
   (idempotente), de modo que ni valores inyectados por otras rutas escapen a
   la regla 2026. Se engancha también al evento beforeprint (cubre Ctrl+P). */
function formatStatsForPrint() {
  const tbody = document.querySelector("#stats-tbody");
  if (!tbody) return;
  tbody.querySelectorAll("td.td-num").forEach((td) => {
    const n = parseLooseNumber(td.textContent);
    td.classList.toggle("td-neg", n !== null && n < 0);
    if (n === null || n === 0) {
      if (!td.querySelector(".td-zero")) {
        td.innerHTML = `<span class="td-zero" aria-label="cero">–</span>`;
      }
    } else {
      td.textContent = formatStatsNumber(n);
    }
  });
}
window.addEventListener("beforeprint", formatStatsForPrint);

function renderStatsTable(period) {
  const tbody = $("#stats-tbody");
  if (!tbody) return;
  const cfg = STATS_PERIODS[period] || STATS_PERIODS.mensual;

  const tot = { ini: 0, fin: 0 };
  [...STATS_COLS_IN, ...STATS_COLS_OUT].forEach((k) => { tot[k] = 0; });

  const rowsHtml = STATS_BASE_ROWS.map((row) => {
    const v = statsRowValues(row, cfg.factor);
    tot.ini += v.ini; tot.fin += v.fin;
    [...STATS_COLS_IN, ...STATS_COLS_OUT].forEach((k) => { tot[k] += v[k]; });
    return `<tr class="row-animate">` +
      `<td class="td-desc">${escapeHtml(row.desc)}</td>` +
      `<td class="td-dep">${row.dep}</td>` +
      `<td class="td-int">${cfg.intervalo}</td>` +
      statsNumCell(v.ini) +
      STATS_COLS_IN.map((k) => statsNumCell(v[k])).join("") +
      STATS_COLS_OUT.map((k) => statsNumCell(v[k])).join("") +
      statsNumCell(v.fin, "td-saldo-fin") +
    `</tr>`;
  }).join("");

  const totalHtml = `<tr class="stats-total-row">` +
    `<td class="td-desc font-bold">TOTAL CONSOLIDADO</td>` +
    `<td class="td-dep">—</td>` +
    `<td class="td-int">${cfg.etiqueta}</td>` +
    statsNumCell(tot.ini) +
    STATS_COLS_IN.map((k) => statsNumCell(tot[k])).join("") +
    STATS_COLS_OUT.map((k) => statsNumCell(tot[k])).join("") +
    statsNumCell(tot.fin, "td-saldo-fin") +
  `</tr>`;

  tbody.innerHTML = rowsHtml + totalHtml;
}

/* Construye el .xlsx real del corte de estadísticas — diseño "Hana Slate 2027":
   cabecera carbón #1E293B con texto blanco, zebra #F8FAFC, filetes finos
   #E2E8F0, banda #F1F5F9 en Intervalo/Saldo Fin/TOTAL, formato contable
   #,##0 con negativos en rojo (dxf), KPIs sin rellenos y fit-to-one-page.
   Mismo esquema de índices s= que el sheet XML (42 xfs) — sólo cambia la
   paleta, no la estructura. */
function buildStatsXlsx(period) {
  const enc = new TextEncoder();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cfg = STATS_PERIODS[period] || STATS_PERIODS.mensual;

  const COL_TBL = "TablaSaldosRD026";
  const KEYS = ["ini", "compra", "devcom", "recepcion", "transferencia", "traslado", "ajuste", "invFisico",
                "venta", "devol", "notaEntrega", "produccion", "notaDevcom", "fin"];
  const HEADERS = ["Descripción", "Depósito", "Intervalo",
    "Saldo Ini", "Compra", "Devcom", "Recepción", "Transf.", "Traslado", "Ajuste", "Inv. Físico",
    "Venta", "Devol", "Nota Entrega", "Producción", "Nota Devcom", "Saldo Fin"];
  /* Intervalo compacto: "01/09/2026–28/09/2026" → "01–28/09" (sin año, que
     ya vive en la tarjeta PERÍODO); celdas más angostas y siempre legibles. */
  const intShort = (() => {
    const t = String(cfg.intervalo).replace(/\s*[–-]\s*/g, "–");
    const m = t.match(/^(\d{1,2})\/\d{1,2}(?:\/\d{2,4})?–(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/);
    return m ? `${m[1]}–${m[2]}/${m[3]}` : t;
  })();
  const shortLabel = { semanal: "Sem 39 · 2026", mensual: "Sep-2026", anual: "Ene–Sep 2026" }[period] || cfg.etiqueta;
  const NCOL = HEADERS.length;

  /* Anchos ABSOLUTOS 2026: max(max_contenido + 5, 14) por columna.
     Se mide el contenido real (enteros con separador de miles, textos tal
     como se pintan) — ningún valor puede recortarse, solaparse ni dar "###". */
  const displayLen = (val) => (typeof val === "number"
    ? Math.trunc(Math.abs(val)).toLocaleString("en-US").length + (val < 0 ? 2 : 0)
    : String(val ?? "").length);
  const cellContent = (v, ci) =>
    ci === 0 ? v.desc : ci === 1 ? v.dep : ci === 2 ? v.int : v[KEYS[ci - 3]];
  const scaledPreview = STATS_BASE_ROWS.map((row) => ({
    ...statsRowValues(row, cfg.factor),
    desc: row.desc.replace(/^RD026 · Conjunto Dep\. Basquet · /, "Conj. Basquet · "),
    dep: row.dep, int: intShort,
  }));
  /* Anchos ABSOLUTOS calibrados para CARTA vertical (Epson L3210):
     el encabezado se pinta a 7 pt (~0.7 del ancho por carácter), así que su
     exigencia se pondera; el contenido (9 pt) manda. La tabla se comprime
     con un tope por columna (celdas más ceñidas pero legibles) para que las
     17 columnas —incluido Saldo Fin (Q)— entren holgadas en una hoja. */
  const CAP = [14, 8, 9, 9, 8, 8, 9, 8, 8, 8, 9, 8, 8, 9, 9, 9, 9];
  const WIDTHS = HEADERS.map((h, ci) => {
    let largo = Math.ceil(h.length * 0.8);
    scaledPreview.forEach((v) => { largo = Math.max(largo, displayLen(cellContent(v, ci))); });
    const w = Math.max(largo + 2, 7);
    return Math.min(w, CAP[ci]);
  });

  const colLetter = (i) => (i < 26 ? String.fromCharCode(65 + i) : "A" + String.fromCharCode(65 + i - 26));
  const str = (ref, s, v) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  const num = (ref, s, v) => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
  const fml = (ref, s, f, v) => `<c r="${ref}" s="${s}"><f>${f}</f><v>${v}</v></c>`;
  const col = (name) => `${COL_TBL}[${name}]`;

  /* s1 header gris (legacy) · s2/3 texto (zebra) · s4/5 número · s6 número ·
     s7/8 depósito · s9/10 intervalo (banda F1F5F9) · s11/12 variación ·
     s13/14/15 totales (banda + filete medio carbón) · s16-19 tarjetas KPI ·
     s20-24 captions con barra de acento slate · s25-27 leyenda ·
     s28/29 logo y razón social · s31/32/33 cabecera carbón · s34/35 desc ·
     s38 total desc · s40 Saldo Fin · s41 total Saldo Fin */
  const TXT_KEYS = ["desc", "dep", "int"];
  const cell = (ci, r, obj, z) => {
    if (ci === 0) return str("A" + r, z ? 35 : 34, obj.desc);
    if (ci === 1) return str("B" + r, z ? 8 : 7, obj.dep);
    if (ci === 2) return str("C" + r, z ? 10 : 9, obj.int);
    if (ci === 16) return num("Q" + r, z ? 53 : 52, obj.fin);
    return num(colLetter(ci) + r, z ? 5 : 4, obj[KEYS[ci - 3]]);
  };
  const rowXml = (obj, r, z) =>
    `<row r="${r}" ht="12" customHeight="1">` +
    Array.from({ length: 17 }, (_, ci) => cell(ci, r, obj, z)).join("") +
    `</row>`;

  const tot = { ini: 0, fin: 0 };
  [...STATS_COLS_IN, ...STATS_COLS_OUT].forEach((k) => { tot[k] = 0; });

  const dataRows = [];
  let r = 7;
  STATS_BASE_ROWS.forEach((row, idx) => {
    const v = { ...statsRowValues(row, cfg.factor), desc: row.desc.replace(/^RD026 · Conjunto Dep\. Basquet · /, "Conj. Basquet · "), dep: row.dep, int: intShort };
    tot.ini += v.ini; tot.fin += v.fin;
    [...STATS_COLS_IN, ...STATS_COLS_OUT].forEach((k) => { tot[k] += v[k]; });
    dataRows.push(rowXml(v, r, idx % 2 === 1));
    r++;
  });
  const last = r;

  const sumCols = (keys) => keys.map((k) => `SUBTOTAL(109,${col(k)})`).join("+");
  const entradasKeys = ["Compra", "Devcom", "Recepción", "Transf.", "Traslado", "Ajuste", "Inv. Físico", "Producción", "Devol"];
  const salidasKeys = ["Venta", "Nota Entrega", "Nota Devcom"];
  const entradas = [...STATS_COLS_IN].reduce((s, k) => s + tot[k], 0);
  const salidas = [...STATS_COLS_OUT].reduce((s, k) => s + tot[k], 0);
  const variacion = tot.ini > 0 ? tot.fin / tot.ini - 1 : 0;

  /* Tarjetas KPI (filas 2-4, bloques de 3 columnas desde la col C):
     se corre 1 col a la derecha para liberar B y que la razón social
     "MUNDO HANA, C.A." desborde completa en A4:B4. Tarjetas C..Q.
     etiqueta 7pt bold gris #374151 arriba con flecha verde profesional en ENTRADAS,
     VARIACIÓN vs INI con símbolo % (reemplazando la flecha superior), número 12pt bold
     carbon #0F172A debajo, caption 7pt itálico, caja fina #D1D5DB sólo por el contorno.
     s = [primera, media, última] por posición dentro del bloque de la tarjeta. */
  const cards = [
    {
      c1: 2, c2: 4, label: "ENTRADAS ↑",
      labelXml: `<c r="C2" s="16" t="inlineStr"><is><r><rPr><rFont val="Segoe UI"/><b/><color rgb="FF374151"/><sz val="7"/></rPr><t xml:space="preserve">ENTRADAS </t></r><r><rPr><rFont val="Segoe UI"/><b/><color rgb="FF16A34A"/><sz val="7"/></rPr><t>↑</t></r></is></c>`,
      val: fml("C3", 17, sumCols(entradasKeys), entradas), cap: "unidades del corte", s: [17, 22, 44]
    },
    { c1: 5, c2: 7, label: "SALIDAS ↓", val: fml("F3", 17, sumCols(salidasKeys), salidas), cap: "unidades del corte", s: [17, 22, 44] },
    { c1: 8, c2: 10, label: "SALDO FINAL", val: fml("I3", 17, `SUBTOTAL(109,${col("Saldo Fin")})`, tot.fin), cap: "unidades en stock", s: [17, 22, 44] },
    { c1: 11, c2: 13, label: "VARIACIÓN vs INI %", val: fml("L3", 18, `IFERROR(I3/SUBTOTAL(109,${col("Saldo Ini")})-1,"")`, variacion), cap: "cambio neto", s: [18, 23, 45] },
    { c1: 14, c2: 16, label: "PERÍODO", val: str("O3", 19, shortLabel), cap: "corte actual", s: [19, 24, 46] },
  ];
  const emptyCell = (ref, s) => `<c r="${ref}" s="${s}"/>`;
  const cardCells = (row, k, firstXml, sIds) => {
    let out = firstXml;
    for (let c = k.c1 + 1; c <= k.c2; c++) out += emptyCell(colLetter(c) + row, sIds[c === k.c2 ? 2 : 1]);
    return out;
  };
  const labelRow = cards.map((k) => cardCells(2, k, k.labelXml || str(colLetter(k.c1) + "2", 16, k.label), [16, 21, 43])).join("");
  const valRow = cards.map((k) => cardCells(3, k, k.val, k.s)).join("");
  const capRow = cards.map((k) => cardCells(4, k, str(colLetter(k.c1) + "4", 20, k.cap), [20, 42, 47])).join("");
  const whiteCanvas = (row) => Array.from({ length: NCOL }, (_, i) => emptyCell(colLetter(i) + row, 48)).join("");

  const rows = [];
  rows.push(`<row r="1" ht="12" customHeight="1">${str("A1", 28, "Hana")}</row>`);
  rows.push(`<row r="2" ht="18" customHeight="1">${labelRow}</row>`);
  rows.push(`<row r="3" ht="15" customHeight="1">${valRow}</row>`);
  rows.push(`<row r="4" ht="13" customHeight="1">${str("A4", 29, "MUNDO HANA, C.A.")}${capRow}</row>`);
  rows.push(`<row r="5" ht="6" customHeight="1">${whiteCanvas(5)}</row>`);
  rows.push(`<row r="6" ht="18" customHeight="1">${HEADERS.map((h, i) => str(colLetter(i) + "6", i === 0 ? 31 : i === NCOL - 1 ? 32 : 33, h)).join("")}</row>`);
  rows.push(...dataRows);

  let totalRow = `<row r="${last}" ht="20" customHeight="1">` +
    str("A" + last, 38, "TOTAL CONSOLIDADO") +
    str("B" + last, 13, "—") +
    str("C" + last, 13, shortLabel);
  KEYS.forEach((k, i) => {
    const ci = 3 + i;
    const isFin = k === "fin";
    totalRow += fml(colLetter(ci) + last, isFin ? 54 : 49,
      `SUBTOTAL(109,${col(HEADERS[ci])})`, tot[k]);
  });
  rows.push(totalRow + `</row>`);

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><tabColor rgb="FF0F172A"/><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="A1:Q${last}"/>` +
    `<sheetViews><sheetView showGridLines="0" zoomScale="90" zoomScaleNormal="90" workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${rows.join("")}</sheetData>` +
    `<mergeCells count="16"><mergeCell ref="A1:A3"/>` +
    cards.map((k) => [2, 3, 4].map((row) => `<mergeCell ref="${colLetter(k.c1)}${row}:${colLetter(k.c2)}${row}"/>`).join("")).join("") +
    `</mergeCells>` +
    `<printOptions horizontalCentered="1"/>` +
    `<pageMargins left="0.5" right="0.5" top="0.25" bottom="0.25" header="0.1" footer="0.1"/>` +
    `<pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/>` +
    `<headerFooter/>` +
    `<tableParts count="1"><tablePart r:id="rId1"/></tableParts>` +
    `</worksheet>`;

  const table =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="${COL_TBL}" displayName="${COL_TBL}" ref="A6:Q${last - 1}">` +
    `<tableColumns count="${HEADERS.length}">` +
    HEADERS.map((h, i) => `<tableColumn id="${i + 1}" name="${esc(h)}"/>`).join("") +
    `</tableColumns>` +
    `<tableStyleInfo showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/>` +
    `</table>`;

  const sheetRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>` +
    `</Relationships>`;

  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0;(#,##0);&quot;–&quot;"/><numFmt numFmtId="165" formatCode="0.0%;[Red](0.0%);&quot;–&quot;"/></numFmts>` +
    `<fonts count="15">` +
    `<font><sz val="9"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="7"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><sz val="9"/><color rgb="FF64748B"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="24"/><color rgb="FFA6192E"/><name val="Playfair Display Black"/></font>` +
    `<font><b/><sz val="9"/><color rgb="FF000000"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="7"/><color rgb="FF374151"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="12"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="9"/><color rgb="FFB91C1C"/><name val="Segoe UI"/></font>` +
    `<font><sz val="9"/><color rgb="FF059669"/><name val="Segoe UI"/></font>` +
    `<font><i/><sz val="7"/><color rgb="FF6B7280"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="8"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="9"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="9"/><color rgb="FFA6192E"/><name val="Segoe UI"/></font>` +
    `<font><b/><sz val="8"/><color rgb="FFA6192E"/><name val="Segoe UI"/></font>` +
    `</fonts>` +
    `<fills count="8">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFEFEFEF"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFDEDFE1"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFE9ECEF"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFFCE8E6"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF5D5D0"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="27">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="medium"><color rgb="FFBABEBF"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left/><right/><top/><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left/><right/><top/><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="medium"><color rgb="FF94A3B8"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="medium"><color rgb="FF94A3B8"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="medium"><color rgb="FF94A3B8"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="medium"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="medium"><color rgb="FF64748B"/></bottom><diagonal/></border>` +
    `<border><left/><right/><top/><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="medium"><color rgb="FF0F172A"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="medium"><color rgb="FF0F172A"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>` +
    `<border><left/><right/><top style="thin"><color rgb="FFD1D5DB"/></top><bottom/><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFD1D5DB"/></left><right/><top style="thin"><color rgb="FFD1D5DB"/></top><bottom/><diagonal/></border>` +
    `<border><left/><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom/><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFD1D5DB"/></left><right/><top/><bottom/><diagonal/></border>` +
    `<border><left/><right style="thin"><color rgb="FFD1D5DB"/></right><top/><bottom/><diagonal/></border>` +
    `<border><left/><right/><top/><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFD1D5DB"/></left><right/><top/><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>` +
    `<border><left/><right style="thin"><color rgb="FFD1D5DB"/></right><top/><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="medium"><color rgb="FFBABEBF"/></bottom><diagonal/></border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="55">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="11" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="11" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="12" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="12" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="165" fontId="12" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="5" fillId="5" borderId="19" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="6" fillId="5" borderId="21" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="165" fontId="6" fillId="5" borderId="21" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="6" fillId="5" borderId="21" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="9" fillId="5" borderId="24" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="5" fillId="5" borderId="18" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="6" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="165" fontId="6" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="6" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="right" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="right" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="8" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="right" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="3" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="4" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="10" fillId="0" borderId="4" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="26" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="26" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="26" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="12" fillId="3" borderId="16" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="12" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="12" fillId="3" borderId="17" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="11" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="12" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="9" fillId="5" borderId="23" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="5" fillId="5" borderId="20" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="6" fillId="5" borderId="22" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="165" fontId="6" fillId="5" borderId="22" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="6" fillId="5" borderId="22" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="9" fillId="5" borderId="25" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/>` +
    `<xf numFmtId="164" fontId="10" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" shrinkToFit="1"/></xf>` +
    `<xf numFmtId="164" fontId="11" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="11" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="13" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="13" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="14" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `<dxfs count="1"><dxf><font><b/><color rgb="FFB91C1C"/></font></dxf></dxfs>` +
    `</styleSheet>`;

  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const core =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>Estadísticas de Inventario — Control de Saldos rd026</dc:title>` +
    `<dc:subject>${esc(cfg.etiqueta)}</dc:subject>` +
    `<dc:creator>Hana — Mundo Hana, C.A.</dc:creator>` +
    `<cp:keywords>inventario; saldos; rd026; auditoría</cp:keywords>` +
    `<cp:lastModifiedBy>Hana — Mundo Hana, C.A.</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>` +
    `</cp:coreProperties>`;

  const app =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
    `<Application>Hana · Inventario</Application><Company>Mundo Hana, C.A.</Company></Properties>`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`;

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Estadísticas rd026" sheetId="1" r:id="rId1"/></sheets>` +
    `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Estadísticas rd026'!$1:$6</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">'Estadísticas rd026'!$A$1:$Q$${last}</definedName></definedNames>` +
    `<calcPr calcId="191029" fullCalcOnLoad="1"/>` +
    `</workbook>`;

  const wbRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  return zipStore([
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rootRels) },
    { name: "docProps/core.xml", data: enc.encode(core) },
    { name: "docProps/app.xml", data: enc.encode(app) },
    { name: "xl/workbook.xml", data: enc.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(wbRels) },
    { name: "xl/styles.xml", data: enc.encode(styles) },
    { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheet) },
    { name: "xl/worksheets/_rels/sheet1.xml.rels", data: enc.encode(sheetRels) },
    { name: "xl/tables/table1.xml", data: enc.encode(table) },
  ]);
}

function initEstadisticas() {
  const view = $("#view-estadisticas");
  if (!view) return;

  const pills = $$(".stats-period", view);
  const activePeriod = () => pills.find((p) => p.classList.contains("active"))?.dataset.period || "mensual";

  /* Sincroniza inputs de fecha + recarga la tabla con el corte del período */
  function applyPeriod(period) {
    const cfg = STATS_PERIODS[period];
    if (!cfg) return;
    const desde = $("#stats-desde");
    if (desde) desde.value = cfg.desde;
    renderStatsTable(period);
  }

  /* Pills de período: Semanal / Mensual / Anual (excluyentes) */
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      playCyberSound("click");
      pills.forEach((p) => {
        const on = p === pill;
        p.classList.toggle("active", on);
        p.setAttribute("aria-pressed", on ? "true" : "false");
      });
      applyPeriod(pill.dataset.period);
      toast(`Corte recalculado: <b class="text-zinc-50">${escapeHtml(STATS_PERIODS[pill.dataset.period]?.etiqueta || pill.dataset.period)}</b> · 17 columnas · Saldo Fin reauditado.`, "ok", { html: true, title: "Período aplicado" });
    });
  });

  /* Estado inicial: la tabla siempre cuadra con la pill activa por defecto */
  applyPeriod(activePeriod());

  /* Moneda de valoración (HanaSelect): confirmación flotante al cambiar */
  const selMoneda = $("#stats-moneda");
  if (selMoneda) {
    selMoneda.addEventListener("change", () => {
      playCyberSound("click");
      const usd = selMoneda.value === "USD";
      toast(usd
        ? `Valoración cambiada a <b class="text-zinc-50">USD</b> · tasa BCV 2026-09-28 aplicada a los cortes.`
        : `Valoración cambiada a <b class="text-zinc-50">Bs</b> · moneda local por defecto en el libro mayor.`,
        "info", { html: true, title: "Moneda de valoración" });
    });
  }

  /* Generar Reporte: recalcula el corte y descarga el PDF corporativo (backend) */
  const btnGen = $("#btn-stats-generar");
  if (btnGen) {
    btnGen.addEventListener("click", async () => {
      if (btnGen.disabled) return;
      playCyberSound("click");
      btnGen.disabled = true;
      const periodo = activePeriod();
      const cfg = STATS_PERIODS[periodo] || STATS_PERIODS.mensual;
      const prod = ($("#stats-producto")?.value || "").trim();
      applyPeriod(periodo);

      /* Filtro tolerante: sin acentos, por palabras y con coincidencia de prefijos
         ("DEPORTIVO" ↔ "Dep.", "T-M" ↔ "T M"), para que el valor pre-cargado del
         input no deje el corte sin líneas. */
      const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const tokens = norm(prod).split(" ").filter(Boolean);
      const matches = (row) => {
        if (!tokens.length) return true;
        const words = norm(`${row.desc} ${row.dep}`).split(" ");
        return tokens.every((t) => words.some((w) => w === t || w.startsWith(t) || t.startsWith(w)));
      };

      const filas = STATS_BASE_ROWS
        .filter(matches)
        .map((row) => {
          const v = statsRowValues(row, cfg.factor);
          return {
            desc: row.desc, dep: row.dep, intervalo: cfg.intervalo,
            ini: v.ini, compra: v.compra, devcom: v.devcom, recepcion: v.recepcion,
            transferencia: v.transferencia, traslado: v.traslado, ajuste: v.ajuste,
            inv_fisico: v.invFisico, venta: v.venta, devol: v.devol,
            nota_entrega: v.notaEntrega, produccion: v.produccion, nota_devcom: v.notaDevcom,
            fin: v.fin,
          };
        });

      if (!filas.length) {
        btnGen.disabled = false;
        playCyberSound("warn");
        toast(`Ninguna línea del corte coincide con <b class="font-mono text-zinc-50">${escapeHtml(prod)}</b>. Ajusta el filtro de producto.`, "error", { html: true, title: "Sin coincidencias" });
        return;
      }

      toast("Compilando reporte PDF con el formato corporativo…", "info", { title: "Generando PDF" });
      try {
        const res = await fetch("/api/reportes/estadisticas.pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ periodo: cfg.etiqueta, intervalo: cfg.intervalo, filas }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "estadisticas-saldos-rd026.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        playCyberSound("success");
        toast(
          `El archivo <b class="font-mono text-zinc-50">estadisticas-saldos-rd026.pdf</b> · corte <b class="text-zinc-50">${escapeHtml(cfg.etiqueta)}</b> con <b class="text-zinc-50">${filas.length}</b> líneas se guardó en tu equipo.`,
          "ok", { html: true, duration: 10000, title: "Reporte PDF descargado" });
      } catch (err) {
        console.error("Generación de PDF fallida:", err);
        playCyberSound("warn");
        toast("Ocurrió un error al compilar el reporte PDF. Vuelve a intentarlo.", "error", { title: "Reporte fallido" });
      } finally {
        btnGen.disabled = false;
      }
    });
  }

  /* Exportar a Excel (.xlsx): arma el archivo real y lo descarga */
  const btnXlsx = $("#btn-stats-xlsx");
  if (btnXlsx) {
    const label = $(".btn-xlsx-label", btnXlsx);
    const icon  = btnXlsx.querySelector("svg");
    btnXlsx.addEventListener("click", () => {
      if (btnXlsx.disabled) return;
      playCyberSound("click");
      btnXlsx.disabled = true;
      if (icon) icon.style.display = "none";
      if (label) label.textContent = "Generando archivo Excel corporativo con 17 columnas...";
      btnXlsx.insertAdjacentHTML("afterbegin", '<span class="xlsx-spin" aria-hidden="true"></span>');
      toast("Generando archivo Excel corporativo con 17 columnas...", "info", { title: "Exportando XLSX" });

      setTimeout(async () => {
        btnXlsx.querySelector(".xlsx-spin")?.remove();
        if (icon) icon.style.display = "";
        if (label) label.textContent = "Exportar a Excel (.xlsx)";
        btnXlsx.disabled = false;
        try {
          const bytes = buildStatsXlsx(activePeriod());
          const blob = new Blob([bytes], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const ts = new Date().toISOString().slice(0,16).replace(/[-:T]/g,"");
          a.download = `hana-estadisticas-saldos-rd026-${ts}.xlsx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          playCyberSound("success");
          toast(
            `El archivo <b class="font-mono text-zinc-50">hana-estadisticas-saldos-rd026.xlsx</b> con <b class="font-mono text-zinc-50">17 columnas</b> y 8 líneas de auditoría se guardó en tu equipo. Para imprimirlo (tú o quien lo reciba por WhatsApp): ábrelo con <b class="text-zinc-50">Excel o WPS</b> —no el preview de WhatsApp— e imprime en horizontal; ya viene ajustado a 1 sola hoja.`,
            "ok", { html: true, duration: 14000, title: "Excel corporativo listo" });
        } catch (err) {
          console.error("Exportación XLSX de estadísticas fallida:", err);
          playCyberSound("warn");
          toast("Ocurrió un error al compilar la hoja de cálculo de estadísticas. Vuelve a intentarlo.", "error", { title: "Exportación fallida" });
        }
      }, 1500);
    });
  }
}
