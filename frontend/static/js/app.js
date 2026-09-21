"use strict";

/* ============================================================
   HanaStock v2.1 (2026 Edition) — Mundo Hana, C.A.
   Next-Gen Inventory, Automation & Dispatch Intelligence
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
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
  initDashboardActions();
  initLiveClock();
  initLastSync();
  initRail();
  initCommandPalette();
  initKbdHelp();
  initShortcuts();
  initExports();
  initFab();
  initHashRouting();
  init3DTilt();
});

const $  = (selector, ctx = document) => ctx.querySelector(selector);
const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

const sidebar = $("#sidebar");
const overlay = $("#overlay");
const views   = $$(".view");
const navBtns = $$(".nav-btn");

const VIEW_META = {
  panel:          "Panel de Control",
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
  void view.offsetWidth;
  view.classList.add("view-enter");

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

/* ---------- 4. Motor de Inventario Reactivo (API + Vista Dual) ---------- */

let activeViewMode = "table"; // 'table' | 'matrix'
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
        selectCat.value = "todas";
        selectStock.value = "todas";
      } else if (activePillFilter.startsWith("cat-")) {
        selectCat.value = activePillFilter.replace("cat-", "");
        selectStock.value = "todas";
      } else if (activePillFilter === "stock-bajo") {
        selectStock.value = "bajo";
      } else if (activePillFilter === "stock-agotado") {
        selectStock.value = "agotado";
      }
      render();
    });
  }

  function render() {
    const term = (inputSearch.value || "").trim().toLowerCase();
    const cat  = selectCat.value;
    const tal  = selectTalla.value;
    const stk  = selectStock.value;

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
      inputSearch.value = "";
      selectCat.value = "todas";
      selectTalla.value = "todas";
      selectStock.value = "todas";
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
      <td class="text-zinc-300 font-mono">Bs ${Number(p.precio).toFixed(2)}</td>
      <td>
        <span class="stock-badge font-bold font-mono text-zinc-100">${p.stock}</span>
      </td>
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

  items.forEach((p) => {
    const card = document.createElement("div");
    card.classList.add("product-card", "card-tilt");
    card.dataset.productId = p.id;

    let meterClass = "normal";
    let estadoClase = "badge-ok";
    let estadoTexto = "Disponible";

    if (p.stock === 0) {
      meterClass = "danger";
      estadoClase = "badge-danger";
      estadoTexto = "Agotado";
    } else if (p.stock <= 10) {
      meterClass = "warn";
      estadoClase = "badge-warn";
      estadoTexto = "Bajo stock";
    }

    const pct = Math.min(100, Math.round((p.stock / 40) * 100));

    card.innerHTML = `
      <div>
        <div class="product-card-header">
          <div>
            <span class="font-mono text-xs font-bold text-rose-400">${p.codigo}</span>
            <h3 class="text-sm font-bold text-white mt-0.5">${p.nombre}</h3>
            <p class="text-xs text-zinc-400">${p.marca || "Hana"} · <span class="text-zinc-300">${p.categoria}</span></p>
          </div>
          <span class="badge ${estadoClase}">${estadoTexto}</span>
        </div>

        <div class="mt-3 flex items-center justify-between text-xs">
          <span class="text-zinc-400">Talla: <b class="font-mono text-zinc-200">${p.talla || "U"}</b></span>
          <span class="font-mono font-bold text-white">Bs ${Number(p.precio).toFixed(2)}</span>
        </div>

        <div class="stock-meter-wrap">
          <div class="flex justify-between text-[11px] text-zinc-400 mb-1">
            <span>Nivel de Stock</span>
            <span class="font-mono font-bold text-zinc-200">${p.stock} uds</span>
          </div>
          <div class="stock-meter-bar">
            <div class="stock-meter-fill ${meterClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-white/5 pt-3">
        <span class="text-[11px] text-zinc-500 font-mono">ID #${p.id}</span>
        <div class="stock-stepper">
          <button type="button" class="btn-stock-step js-stock-dec" data-id="${p.id}" ${p.stock <= 0 ? "disabled" : ""} title="Reducir stock (-1)">−</button>
          <span class="stock-value-badge">${p.stock}</span>
          <button type="button" class="btn-stock-step js-stock-inc" data-id="${p.id}" title="Aumentar stock (+1)">+</button>
        </div>
      </div>`;

    grid.appendChild(card);
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
      toast('Localizando transferencia "TRF-2026-8146" en historial central...', "info");
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
  }

  function clearAutoTable() {
    const tbody = $("#auto-table-body");
    const empty = $("#auto-empty");
    if (tbody) tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
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

  // Ping individual
  $$(".js-agency-ping-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
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
    });
  });

  // Ficha NOC en modal
  $$(".js-agency-detail-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playCyberSound("click");
      const code = btn.dataset.agency;
      const nombre = btn.dataset.nombre;
      const host = btn.dataset.host;
      const puerto = btn.dataset.puerto;
      const latencia = btn.dataset.latencia;

      $("#noc-modal-code").textContent = code;
      $("#noc-modal-name").textContent = nombre;
      $("#noc-modal-ip").textContent = `${host}:${puerto}`;
      $("#noc-modal-latency").textContent = `${latencia} ms`;

      openModal("#modal-agency-detail");
    });
  });

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

function updateAgencyCardUI(codigo, latenciaMs, activa) {
  const card = document.querySelector(`[data-agency-card="${codigo}"]`);
  if (!card) return;

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

function initToast() {
  const toastEl = $("#toast");
  if (!toastEl) return;
  toastEl.addEventListener("click", () => {
    toastEl.classList.remove("opacity-100", "translate-y-0");
    toastEl.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    if (toastTimer) clearTimeout(toastTimer);
  });
}

function toast(msg, type = "info") {
  const toastEl = $("#toast");
  const msgEl   = $("#toast-msg");
  const iconEl  = $("#toast-icon");
  const progEl  = $("#toast-progress");
  if (!toastEl || !msgEl) return;

  if (toastTimer) clearTimeout(toastTimer);

  msgEl.textContent = msg;

  let iconSvg = "";
  if (type === "ok") {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  } else if (type === "error") {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  if (iconEl) iconEl.innerHTML = iconSvg;

  toastEl.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
  toastEl.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");

  if (progEl) {
    progEl.style.transition = "none";
    progEl.style.width = "100%";
    void progEl.offsetWidth;
    progEl.style.transition = "width 3400ms linear";
    progEl.style.width = "0%";
  }

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("opacity-100", "translate-y-0", "pointer-events-auto");
    toastEl.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
  }, 3500);
}

/* ---------- 10. Reloj en Vivo & Sincronización ---------- */

function initLiveClock() {
  const clock = $("#clock-time");
  if (!clock) return;

  const tick = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    clock.textContent = `${hh}:${mm}:${ss}`;
  };

  tick();
  setInterval(tick, 1000);
}

function initLastSync() {
  const lastSync = $("#last-sync-time");
  if (!lastSync) return;
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  lastSync.textContent = `${hh}:${mm}:${ss}`;
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
const FLOW_MESES    = ["Oct","Nov","Dic","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep"];
const FLOW_SALIDAS  = [180, 220, 260, 240, 300, 340, 320, 380, 420, 400, 470, 520];
const FLOW_ENTRADAS = [150, 190, 210, 260, 250, 300, 290, 330, 360, 410, 400, 450];

function initFlowChart() {
  const svg = $("#flow-chart");
  if (!svg) return;

  const NS = "http://www.w3.org/2000/svg";
  const W = 620, H = 260;
  const padL = 44, padR = 20, padT = 24, baseY = 210;
  const maxV = 560;
  const n = FLOW_MESES.length;

  const xAt = (i) => padL + (i * (W - padL - padR)) / (n - 1);
  const yAt = (v) => baseY - (v / maxV) * (baseY - padT);
  const toPts = (arr) => arr.map((v, i) => ({ x: xAt(i), y: yAt(v), v, label: FLOW_MESES[i] }));
  const outPts = toPts(FLOW_SALIDAS);
  const inPts  = toPts(FLOW_ENTRADAS);

  const smooth = (pts) => {
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };
  const area = (pts) => `${smooth(pts)} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`;
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  const grid = $("#flow-grid");
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const y = baseY - f * (baseY - padT);
    grid.appendChild(el("line", { x1: padL, y1: y, x2: W - padR, y2: y }));
  });
  [0, 280, 560].forEach((v) => {
    const t = el("text", { x: padL - 8, y: yAt(v) + 3, class: "flow-ylab" });
    t.textContent = v;
    grid.appendChild(t);
  });

  $("#flow-line-out").setAttribute("d", smooth(outPts));
  $("#flow-line-in").setAttribute("d", smooth(inPts));
  $("#flow-area-out").setAttribute("d", area(outPts));
  $("#flow-area-in").setAttribute("d", area(inPts));

  const xl = $("#flow-xlabels");
  outPts.forEach((p) => {
    const t = el("text", { x: p.x, y: H - 16, class: "flow-xlabel" });
    t.textContent = p.label;
    xl.appendChild(t);
  });

  const ptsG = $("#flow-points");
  const tip = $("#flow-tip");
  const wrap = $("#flow-wrap");
  const addPts = (pts, cls) => pts.forEach((p) => {
    const c = el("circle", { cx: p.x, cy: p.y, r: 3.2, class: `flow-point ${cls}` });
    c.dataset.value = p.v;
    c.dataset.label = p.label;
    ptsG.appendChild(c);
  });
  addPts(inPts, "flow-point-in");
  addPts(outPts, "flow-point-out");

  if (tip && wrap) {
    ptsG.addEventListener("pointerover", (e) => {
      const c = e.target.closest(".flow-point");
      if (!c) return;
      const cr = c.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      tip.textContent = `${c.dataset.label}: ${Number(c.dataset.value).toLocaleString("en-US")} uds`;
      tip.style.left = `${cr.left - wr.left + cr.width / 2}px`;
      tip.style.top = `${cr.top - wr.top}px`;
      tip.classList.add("show");
      c.classList.add("hot");
    });
    ptsG.addEventListener("pointerout", (e) => {
      const c = e.target.closest(".flow-point");
      if (!c) return;
      tip.classList.remove("show");
      c.classList.remove("hot");
    });
  }

  if (!prefersReducedMotion()) {
    [$("#flow-line-out"), $("#flow-line-in")].forEach((path) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 1.4s var(--ease-out-expo)";
      requestAnimationFrame(() => { path.style.strokeDashoffset = "0"; });
    });
    [$("#flow-area-out"), $("#flow-area-in")].forEach((a) => {
      a.style.opacity = "0";
      a.style.transition = "opacity 0.8s ease 0.5s";
      requestAnimationFrame(() => { a.style.opacity = "1"; });
    });
  }
}

/* ---------- 11c. Acciones del Panel (Exportar Reporte CSV) ---------- */
function initDashboardActions() {
  $("#btn-export-report")?.addEventListener("click", () => {
    playCyberSound("click");
    const val = (id) => { const el = $(id); return el ? (el.dataset.target || el.textContent.trim()) : ""; };
    const rows = [
      ["Mundo Hana — Reporte de Panel de Control"],
      ["Generado", new Date().toLocaleString("es-VE")],
      [],
      ["Métrica", "Valor"],
      ["Valor Total Inventario (USD)", val("#kpi-valor")],
      ["Alertas de Stock Bajo", val("#kpi-alertas")],
      ["Movimientos del Mes", val("#kpi-movimientos")],
      ["Total Productos en Stock", val("#kpi-stock")],
    ];
    downloadCsv("reporte-panel-hanastock.csv", rows);
    toast("Reporte del panel exportado (CSV).", "ok");
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
    { label: "Ir a Panel de Control", section: "Navegación", run: () => showView("panel") },
    { label: "Ir a Automatización", section: "Navegación", run: () => showView("automatizacion") },
    { label: "Ir a Inventario Central", section: "Navegación", run: () => showView("inventario") },
    { label: "Ir a Control de Agencias", section: "Navegación", run: () => showView("agencias") },
    { label: "Ir a Reportes y PDF", section: "Navegación", run: () => showView("reportes") },
    { label: "Nuevo Producto en Central", section: "Acciones", run: () => openModal("#modal-new-product") },
    { label: "Nueva Transferencia de Almacén", section: "Acciones", run: () => openCreateTransferModal() },
    { label: "Hacer Ping a Red de Agencias", section: "Acciones", run: () => $("#btn-ping-all")?.click() },
    { label: "Exportar Catálogo CSV", section: "Datos", run: () => $("#btn-export-inv")?.click() },
    { label: "Exportar Catálogo JSON", section: "Datos", run: () => $("#btn-export-json")?.click() },
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

/* ---------- 16. FAB (Floating Action Button) ---------- */

function initFab() {
  const fab = $("#fab-new");
  if (!fab) return;
  fab.addEventListener("click", () => {
    playCyberSound("click");
    openCreateTransferModal();
  });
}
