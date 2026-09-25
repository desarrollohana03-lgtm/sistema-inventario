"use strict";

/* ============================================================
   HanaStock v2.1 (2026 Edition) — Mundo Hana, C.A.
   Next-Gen Inventory, Automation & Dispatch Intelligence
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initTheme();
  initAudio();
  initMobileMenu();
  initNavigation();
  initAutomatizacion();
  initInventario();
  initReportes();
  initAgenciasNOC();
  initModals();
  initToast();
  initCountUp();
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
  initFab();
  initHashRouting();
  init3DTilt();
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
};

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

/* ---------- 1. CyberSound (Web Audio API Haptics) ---------- */
let audioCtx = null;
let soundEnabled = localStorage.getItem("hana_sound_enabled") !== "false";

function initAudio() {
  const btn = $("#btn-audio-fx");
  const iconOn = $("#audio-icon-on");
  const iconOff = $("#audio-icon-off");

  const updateUI = () => {
    if (btn) {
      btn.classList.toggle("muted", !soundEnabled);
      if (iconOn && iconOff) {
        iconOn.classList.toggle("hidden", !soundEnabled);
        iconOff.classList.toggle("hidden", soundEnabled);
      }
    }
  };

  updateUI();

  if (btn) {
    btn.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem("hana_sound_enabled", soundEnabled ? "true" : "false");
      updateUI();
      if (soundEnabled) {
        playCyberSound("click");
        toast("Efectos de audio activados (2026 Synth).", "info");
      } else {
        toast("Audio silenciado.", "info");
      }
    });
  }
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCyberSound(type = "click") {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
      osc.frequency.setValueAtTime(1046.50, now + 0.1); // C6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === "warn") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.setValueAtTime(280, now + 0.08);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "ping") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (_) {
    // Audio context not allowed before gesture
  }
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
  return localStorage.getItem("hana_user") || "";
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
        toast("Completa usuario y contraseña para continuar.", "error");
        return;
      }
      const name = prettyName(u);
      localStorage.setItem("hana_user", name);
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
        toast("Nombre y usuario son obligatorios.", "error");
        return;
      }
      if (p1.length < 8) {
        playCyberSound("warn");
        toast("La contraseña debe tener al menos 8 caracteres.", "error");
        return;
      }
      if (p1 !== p2) {
        playCyberSound("warn");
        toast("Las contraseñas no coinciden.", "error");
        return;
      }
      // Registro local de demostración: se guarda el perfil, nunca la contraseña.
      let users = [];
      try { users = JSON.parse(localStorage.getItem("hana_users") || "[]"); } catch { users = []; }
      if (!users.some((x) => (x.usuario || "").toLowerCase() === u.toLowerCase())) {
        users.push({ nombre: name, usuario: u });
        localStorage.setItem("hana_users", JSON.stringify(users));
      }
      const display = prettyName(name);
      localStorage.setItem("hana_user", display);
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
      switchAuthView(dash, auth);
    });
  }
}

/* ---------- 4. Motor de Inventario Reactivo (API + Vista Dual) ---------- */

let activeViewMode = "matrix"; // 'matrix' | 'table'
let activePillFilter = "todas";

function initInventario() {
  const inputSearch = $("#inv-search");
  const selectCat   = $("#inv-cat");
  const selectTalla = $("#inv-talla");
  const selectStock = $("#inv-stock");
  const btnClear    = $("#inv-clear");
  const btnTable    = $("#btn-inv-view-table");
  const btnMatrix   = $("#btn-inv-view-matrix");
  const pillsContainer = $("#inv-filter-pills");

  let sortState = { key: "nombre", dir: 1 };

  // Cargar productos desde API FastAPI
  fetchProductsFromApi();

  // Selector de Vista (Tabla vs Matriz)
  if (btnTable && btnMatrix) {
    btnTable.addEventListener("click", () => {
      playCyberSound("click");
      activeViewMode = "table";
      btnTable.classList.add("active");
      btnMatrix.classList.remove("active");
      $("#inv-table-wrap").classList.remove("hidden");
      $("#inv-matrix-grid").classList.add("hidden");
      render();
    });

    btnMatrix.addEventListener("click", () => {
      playCyberSound("click");
      activeViewMode = "matrix";
      btnMatrix.classList.add("active");
      btnTable.classList.remove("active");
      $("#inv-table-wrap").classList.add("hidden");
      $("#inv-matrix-grid").classList.remove("hidden");
      render();
    });
  }

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

    if (activeViewMode === "table") {
      renderTable(filtered);
    } else {
      renderMatrix(filtered);
    }
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

  $$("#inv-table th.sortable").forEach((th) => {
    th.setAttribute("role", "button");
    th.setAttribute("tabindex", "0");
    th.addEventListener("click", () => {
      playCyberSound("click");
      const key = th.dataset.sort;
      if (sortState.key === key) sortState.dir *= -1;
      else sortState = { key, dir: 1 };
      $$("#inv-table th.sortable").forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
      th.classList.add(sortState.dir === 1 ? "sorted-asc" : "sorted-desc");
      render();
    });
  });

  render();
}

function renderTable(items) {
  const tbody = $("#inv-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  items.forEach((p) => {
    const tr = document.createElement("tr");
    tr.classList.add("row-animate");
    tr.dataset.productId = p.id;

    let estadoClase = "badge-ok";
    let estadoTexto = "Disponible";
    if (p.stock === 0) {
      estadoClase = "badge-danger";
      estadoTexto = "Agotado";
    } else if (p.stock <= 10) {
      estadoClase = "badge-warn";
      estadoTexto = "Bajo stock";
    }

    tr.innerHTML = `
      <td class="font-mono text-xs text-rose-300">${p.codigo}</td>
      <td class="font-medium text-white">${p.nombre}</td>
      <td class="text-zinc-400">${p.categoria}</td>
      <td class="text-zinc-300 font-mono">${p.talla || "—"}</td>
      <td class="text-zinc-400">${p.color || "—"}</td>
      <td class="text-zinc-300 font-mono">Bs ${Number(p.precio).toFixed(2)}</td>
      <td>
        <span class="stock-badge font-bold font-mono text-zinc-100">${p.stock}</span>
      </td>
      <td class="text-zinc-400 font-mono text-xs">${p.pasillo || "Sin asignar"}</td>
      <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
      <td class="text-right">
        <div class="stock-stepper">
          <button type="button" class="btn-stock-step js-stock-dec" data-id="${p.id}" ${p.stock <= 0 ? "disabled" : ""} title="Reducir stock (-1)">−</button>
          <span class="stock-value-badge">${p.stock}</span>
          <button type="button" class="btn-stock-step js-stock-inc" data-id="${p.id}" title="Aumentar stock (+1)">+</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  attachStockButtonEvents(tbody);
}

function renderMatrix(items) {
  const grid = $("#inv-matrix-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const statusLbl = { ok: "Disponible", warn: "Stock Bajo", crit: "Agotado" };

  items.forEach((p) => {
    const card = document.createElement("div");
    card.classList.add(
      "inv-card", "card-tilt", "group",
      "bg-surface-container-lowest", "rounded-xl", "p-space-md",
      "flex", "flex-col", "justify-between"
    );
    card.dataset.productId = p.id;

    let level = "ok";
    if (p.stock === 0) level = "crit";
    else if (p.stock <= 10) level = "warn";

    const pct = Math.min(100, Math.round((p.stock / 40) * 100));

    card.innerHTML = `
      <span class="pc-stripe ${level}" aria-hidden="true"></span>

      <div class="flex items-center justify-between mb-space-sm">
        <span class="font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary bg-surface-container-high px-2.5 py-1 rounded-md">${p.categoria || "General"}</span>
        <span class="pc-status ${level}"><span class="dot${level === "warn" ? " animate-pulse" : ""}"></span>${statusLbl[level]}</span>
      </div>

      <div class="mb-space-md">
        <h3 class="font-headline-md text-base text-on-surface font-semibold truncate group-hover:text-primary transition-colors">${p.nombre}</h3>
        <p class="font-label-sm text-label-sm text-outline uppercase font-mono mt-1 tracking-wider">COD: ${p.codigo}</p>
        <p class="font-label-sm text-label-sm text-on-surface-variant mt-1 truncate">${(p.marca || "Hana").toUpperCase()} · ${(p.color || "—").toUpperCase()} · TALLA ${p.talla || "U"}</p>
      </div>

      <div class="bg-surface-container-low rounded-lg p-space-sm mb-space-sm">
        <div class="flex justify-between items-baseline mb-1.5">
          <span class="font-label-sm text-label-sm uppercase tracking-[0.12em] text-outline">Existencia Total</span>
          <span class="font-title-lg text-title-lg ${level === "crit" ? "text-error" : "text-on-surface"} font-bold font-mono tabular-nums">${p.stock} <span class="font-body-sm text-body-sm text-outline font-normal font-sans">uds</span></span>
        </div>
        <div class="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
          <div class="pc-meter-fill ${level}" style="width: ${pct}%"></div>
        </div>
        <div class="flex justify-between items-center text-label-sm font-label-sm text-outline mt-1.5">
          <span class="font-mono">MÍN 10</span>
          <span class="${level === "ok" ? "text-on-surface-variant" : level === "warn" ? "text-[#f59e0b]" : "text-error"} font-semibold font-mono tabular-nums">${pct}% ÓPTIMO</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-space-xs font-body-sm text-body-sm pt-1 mb-space-md">
        <div class="flex flex-col">
          <span class="text-outline text-label-sm">Precio Unitario</span>
          <span class="text-on-surface font-semibold font-title-lg text-title-lg mt-0.5 font-mono tabular-nums">Bs ${Number(p.precio).toFixed(2)}</span>
        </div>
        <div class="flex flex-col items-end">
          <span class="text-outline text-label-sm">Ubicación física</span>
          <span class="text-on-surface font-semibold flex items-center gap-1 mt-0.5">
            <svg width="16" height="16" class="text-outline shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${p.pasillo || "Sin asignar"}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-space-xs pt-space-sm border-t border-surface-container-high">
        <span class="font-label-md text-label-md text-outline">Registrar Ajuste</span>
        <div class="stock-stepper ml-auto">
          <button type="button" class="btn-stock-step js-stock-dec" data-id="${p.id}" ${p.stock <= 0 ? "disabled" : ""} title="Reducir stock (-1)">−</button>
          <span class="stock-value-badge">${p.stock}</span>
          <button type="button" class="btn-stock-step js-stock-inc" data-id="${p.id}" title="Aumentar stock (+1)">+</button>
        </div>
      </div>`;

    grid.appendChild(card);
  });

  // Animación de llenado de las barras de existencia
  $$(".pc-meter-fill", grid).forEach((el) => {
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

/* Renderiza las micro-tarjetas glassmorphic dentro de #agencias-grid. */
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

  grid.innerHTML = "";
  if (!visible.length) {
    grid.innerHTML = `<div class="col-span-full rounded-xl border border-dashed border-white/10 py-10 text-center text-xs text-zinc-500">Sin agencias que coincidan con «${escapeHtml(agenciaFiltro)}».</div>`;
    return;
  }

  visible.forEach((a) => {
    const card = document.createElement("div");
    card.className = "agencia-micro glass-card-glow stagger-in js-agency-detail-btn";
    card.dataset.agencyCard = a.codigo;
    card.dataset.agency = a.codigo;
    card.dataset.nombre = a.nombre || a.codigo;
    card.dataset.host = a.host || "—";
    card.dataset.puerto = a.puerto || 8443;
    card.dataset.latencia = a.latencia_ms ?? "—";
    card.title = `Ficha NOC · ${a.codigo}`;
    card.innerHTML = `
      <div class="flex items-center justify-between gap-1">
        <span class="agencia-led${a.activa === false ? " off" : ""}" title="${a.activa === false ? "Fuera de línea" : "En línea"}" aria-hidden="true"></span>
        <span class="font-mono text-sm font-bold neon-glow-red">${a.codigo}</span>
      </div>
      <p class="mt-0.5 truncate text-[10px] text-zinc-500">${escapeHtml(a.nombre || a.region || "")}</p>
      <div class="mt-1.5 flex items-center justify-between gap-1">
        <span class="font-mono text-[11px] font-semibold text-zinc-200">${a.unidades ?? "—"} <span class="font-normal text-zinc-500">uds</span></span>
        <button type="button" class="icon-btn js-agency-ping-btn" data-agency="${a.codigo}" title="Hacer ping ahora" aria-label="Hacer ping a ${a.codigo}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      </div>`;
    grid.appendChild(card);
  });
}

function updateAgencyCardUI(codigo, latenciaMs, activa) {
  const card = document.querySelector(`[data-agency-card="${codigo}"]`);
  if (!card) return;

  const led = card.querySelector(".agencia-led");
  if (led) {
    led.classList.toggle("off", !activa);
    led.title = activa ? "En línea" : "Fuera de línea";
  }

  const pingRing = card.querySelector(".agency-ping");
  if (pingRing) {
    pingRing.textContent = `${latenciaMs}`;
    pingRing.className = `latency-ring ${activa ? "latency-good" : "latency-poor"} agency-ping shrink-0`;
  }

  const syncTime = card.querySelector(".agency-sync-time");
  if (syncTime) {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    syncTime.textContent = `Sync ${hh}:${mm}`;
  }
}

/* ---------- 7. Reportes, Manifiesto PDF & WhatsApp ---------- */

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
      window.print();
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

function closeAllModals() {
  $$(".modal-overlay").forEach((ov) => ov.classList.remove("active"));
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

    if (e.key >= "1" && e.key <= "5") {
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

/* ---------- 15.1 Importación de catálogo (CSV) ---------- */

function parseCsvLine(line, delim) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function initImport() {
  const btnImport = $("#btn-import-products");
  const fileInput = $("#inv-import-file");
  if (!btnImport || !fileInput) return;

  btnImport.addEventListener("click", () => {
    playCyberSound("click");
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      playCyberSound("warn");
      toast("Formato no soportado. Guarda el archivo como CSV desde Excel e impórtalo de nuevo.", "error");
      return;
    }

    const text = (await file.text()).replace(/^\ufeff/, "");
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) {
      toast("El archivo CSV está vacío.", "error");
      return;
    }

    const delim = (lines[0].split(";").length >= lines[0].split(",").length) ? ";" : ",";
    let rows = lines.map((l) => parseCsvLine(l, delim));
    if (/c[oó]digo/i.test(rows[0][0] || "")) rows = rows.slice(1);

    const catMap = { calzado: 1, ropa: 2, accesorios: 3 };
    let ok = 0;
    const fails = [];

    for (const cols of rows) {
      const payload = {
        codigo: (cols[0] || "").toUpperCase(),
        nombre: cols[1] || "",
        categoria_id: catMap[(cols[2] || "").toLowerCase()] || 1,
        talla: cols[3] || null,
        precio: parseFloat((cols[4] || "0").replace(",", ".")) || 0,
        stock: parseInt(cols[5], 10) || 0,
      };
      if (!payload.codigo || !payload.nombre) continue;

      try {
        const res = await fetch("/api/productos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        ok++;
      } catch {
        fails.push(payload.codigo);
      }
    }

    fetchProductsFromApi();
    refreshStatsKpi();

    if (fails.length) {
      playCyberSound("warn");
      toast(`${ok} importados · ${fails.length} fallaron (${fails.slice(0, 3).join(", ")}${fails.length > 3 ? "…" : ""}).`, "error");
    } else if (ok) {
      playCyberSound("success");
      toast(`${ok} artículos importados desde ${file.name}.`, "ok");
    } else {
      playCyberSound("warn");
      toast("No se encontró ninguna fila válida en el CSV.", "error");
    }
  });
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

function buildInventarioXlsx() {
  const enc = new TextEncoder();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const COLS = ["Código", "Artículo", "Categoría", "Talla", "Color", "Precio Bs", "Stock", "Ubicación", "Estado"];
  const WIDTHS = [14, 28, 14, 9, 14, 12, 9, 12, 14];
  const sorted = [...INVENTARIO].sort(
    (a, b) => (a.categoria || "").localeCompare(b.categoria || "", "es") || (a.nombre || "").localeCompare(b.nombre || "", "es")
  );

  const str = (ref, s, v) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  const num = (ref, s, v) => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;

  const rows = [];
  rows.push(`<row r="1" ht="22" customHeight="1">${str("A1", 8, "HanaStock · Reporte de Inventario — Mundo Hana, C.A.")}</row>`);
  const fecha = new Date().toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" });
  rows.push(`<row r="2">${str("A2", 9, `Generado: ${fecha} · ${sorted.length} artículos registrados en Central`)}</row>`);
  rows.push(`<row r="3">${COLS.map((h, i) => str(String.fromCharCode(65 + i) + "3", 1, h)).join("")}</row>`);

  let totalStock = 0;
  sorted.forEach((p, idx) => {
    const r = 4 + idx;
    const st = p.stock === 0 ? 7 : p.stock <= 10 ? 6 : 5;
    const estado = p.stock === 0 ? "AGOTADO" : p.stock <= 10 ? "BAJO STOCK" : "DISPONIBLE";
    totalStock += p.stock || 0;
    rows.push(
      `<row r="${r}">` +
      str("A" + r, 2, p.codigo) +
      str("B" + r, 2, p.nombre) +
      str("C" + r, 2, p.categoria || "General") +
      str("D" + r, 2, p.talla || "—") +
      str("E" + r, 2, p.color || "—") +
      num("F" + r, 3, Number(p.precio || 0).toFixed(2)) +
      num("G" + r, 4, p.stock || 0) +
      str("H" + r, 2, p.pasillo || "Sin asignar") +
      str("I" + r, st, estado) +
      `</row>`
    );
  });

  const tr = 4 + sorted.length;
  rows.push(`<row r="${tr}">${str("A" + tr, 10, "TOTAL EN ALMACÉN")}${num("G" + tr, 11, totalStock)}</row>`);

  const lastData = 3 + sorted.length;
  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:I${tr}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${rows.join("")}</sheetData>` +
    `<autoFilter ref="A3:I${lastData}"/>` +
    `<mergeCells count="2"><mergeCell ref="A1:I1"/><mergeCell ref="A2:I2"/></mergeCells>` +
    `</worksheet>`;

  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>` +
    `<fonts count="8">` +
    `<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF065F46"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF92400E"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FFBE123C"/><name val="Calibri"/></font>` +
    `<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="14"/><color rgb="FFBE123C"/><name val="Calibri"/></font>` +
    `</fonts>` +
    `<fills count="6">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFE11D48"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="12">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
    `<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment horizontal="center"/></xf>` +
    `<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf>` +
    `<xf numFmtId="0" fontId="4" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf>` +
    `<xf numFmtId="0" fontId="5" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf>` +
    `<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `<xf numFmtId="1" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"><alignment horizontal="center"/></xf>` +
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

    setTimeout(() => {
      try {
        const bytes = buildInventarioXlsx();
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "inventario-hanastock.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        playCyberSound("success");
        toast(`El archivo <b class="font-mono text-zinc-50">inventario-hanastock.xlsx</b> con <b class="text-zinc-50">${INVENTARIO.length}</b> artículos se guardó en tu equipo.`, "ok", { html: true, duration: 10000, title: "Reporte descargado" });
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

/* ---------- 16. FAB (Floating Action Button) ---------- */

function initFab() {
  const fab = $("#fab-new");
  if (!fab) return;
  fab.addEventListener("click", () => {
    playCyberSound("click");
    openCreateTransferModal();
  });
}
