"use strict";

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initNavigation();
  initAutomatizacion();
  initInventario();
  initReportes();
  initToast();
  initCountUp();
  initLiveClock();
  initLastSync();
  initAgencyPing();
  initRail();
  initCommandPalette();
  initKbdHelp();
  initShortcuts();
  initExports();
  initFab();
  initHashRouting();
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
  agencias:       "Agencias",
  reportes:       "Reportes y PDF",
};

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer = null;
let syncTimer  = null;

const CODIGO_DUPLICADO = "8146";

const XML_VALIDO = `<?xml version="1.0" encoding="UTF-8"?>
<transferencia-central codigo="TRF-2026-0901" fecha="2026-09-17">
  <items>
    <item articulo="ZAP-HANA-42" categoria="Calzado" talla="42" cantidad="12" agencia="AG31"/>
    <item articulo="ZAP-HANA-40" categoria="Calzado" talla="40" cantidad="8" agencia="AG37"/>
    <item articulo="ROP-HANA-M" categoria="Ropa" talla="M" cantidad="18" agencia="AG32"/>
    <item articulo="ROP-HANA-L" categoria="Ropa" talla="L" cantidad="15" agencia="AG40"/>
    <item articulo="ZAP-HANA-39" categoria="Calzado" talla="39" cantidad="6" agencia="AG31"/>
    <item articulo="ROP-HANA-XL" categoria="Ropa" talla="XL" cantidad="4" agencia="AG32"/>
  </items>
</transferencia-central>`;

const XML_DUPLICADO = `<?xml version="1.0" encoding="UTF-8"?>
<transferencia-central codigo="TRF-2026-8146" fecha="2026-09-17">
  <registro-seguro id="seguro-8146">
    <hash-transferencia>SHA256:9f2c…8146</hash-transferencia>
  </registro-seguro>
  <items>
    <item articulo="ZAP-HANA-42" categoria="Calzado" talla="42" cantidad="12" agencia="AG31"/>
  </items>
</transferencia-central>`;

const FILAS_AUTOMATIZACION = [
  { articulo: "ZAP-HANA-42", categoria: "Calzado", descripcion: "Tenis deportivo con suela antideslizante", talla: "42", cantidad: 12, agencia: "AG31" },
  { articulo: "ZAP-HANA-40", categoria: "Calzado", descripcion: "Bota de trabajo reforzada",                talla: "40", cantidad: 8,  agencia: "AG37" },
  { articulo: "ROP-HANA-M",  categoria: "Ropa",    descripcion: "Camisa Oxford manga larga",               talla: "M",  cantidad: 18, agencia: "AG32" },
  { articulo: "ROP-HANA-L",  categoria: "Ropa",    descripcion: "Chaleco reflectivo unisex",               talla: "L",  cantidad: 15, agencia: "AG40" },
  { articulo: "ZAP-HANA-39", categoria: "Calzado", descripcion: "Zapatilla premium ultraliviana",          talla: "39", cantidad: 6,  agencia: "AG31" },
  { articulo: "ROP-HANA-XL", categoria: "Ropa",    descripcion: "Pantalón chino corte slim fit",           talla: "XL", cantidad: 4,  agencia: "AG32" },
];

const PASOS_SINCRONIZACION = [
  "Validando estructura XML…",
  "Analizando sistema anti-duplicados…",
  "Estableciendo conexión con agencias (AG31 · AG32 · AG37 · AG40)…",
  "Distribuyendo artículos ZAP-HANA / ROP-HANA por agencia…",
  "Sincronización completada correctamente",
];

const INVENTARIO = [
  { codigo: "ZAP-HANA-36", nombre: "Sandalia Relax",         categoria: "Calzado", talla: "36",   precio: 42.0,  stock: 0 },
  { codigo: "ZAP-HANA-37", nombre: "Tenis Urbanista",        categoria: "Calzado", talla: "37",   precio: 65.0,  stock: 18 },
  { codigo: "ZAP-HANA-38", nombre: "Tenis Runner Air",       categoria: "Calzado", talla: "38",   precio: 85.0,  stock: 14 },
  { codigo: "ZAP-HANA-39", nombre: "Zapatilla Stellar Pro",  categoria: "Calzado", talla: "39",   precio: 98.0,  stock: 22 },
  { codigo: "ZAP-HANA-40", nombre: "Bota Urban",             categoria: "Calzado", talla: "40",   precio: 120.5, stock: 4 },
  { codigo: "ZAP-HANA-41", nombre: "Botín Casual",           categoria: "Calzado", talla: "41",   precio: 110.0, stock: 15 },
  { codigo: "ZAP-HANA-42", nombre: "Tenis Runner Air",       categoria: "Calzado", talla: "42",   precio: 85.0,  stock: 12 },
  { codigo: "ZAP-HANA-43", nombre: "Tenis Urban Slide",      categoria: "Calzado", talla: "43",   precio: 76.0,  stock: 7 },
  { codigo: "ZAP-HANA-44", nombre: "Tenis Urban Slide",      categoria: "Calzado", talla: "44",   precio: 76.0,  stock: 6 },
  { codigo: "ROP-HANA-S",  nombre: "Polo Stellar",           categoria: "Ropa",    talla: "S",    precio: 28.0,  stock: 40 },
  { codigo: "ROP-HANA-M",  nombre: "Camisa Oxford",          categoria: "Ropa",    talla: "M",    precio: 45.0,  stock: 30 },
  { codigo: "ROP-HANA-L",  nombre: "Chaqueta Denim",         categoria: "Ropa",    talla: "L",    precio: 95.0,  stock: 0 },
  { codigo: "ROP-HANA-XL", nombre: "Pantalón Chino",         categoria: "Ropa",    talla: "XL",   precio: 60.0,  stock: 8 },
  { codigo: "ACC-HANA-U",  nombre: "Gorra Urban",            categoria: "Accesorios", talla: "Única", precio: 15.0, stock: 50 },
];

/* ---------- Navegación principal ---------- */

function initNavigation() {
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
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

/* ---------- Menú móvil ---------- */

function initMobileMenu() {
  $("#btn-menu").addEventListener("click", openMenuMovil);
  overlay.addEventListener("click", closeMenuMovil);
}

function openMenuMovil() {
  sidebar.classList.remove("-translate-x-full");
  overlay.classList.remove("hidden");
  overlay.classList.add("flex");
}

function closeMenuMovil() {
  sidebar.classList.add("-translate-x-full");
  overlay.classList.add("hidden");
  overlay.classList.remove("flex");
}

/* ---------- Sidebar rail (colapso) ---------- */

function initRail() {
  const btn = $("#btn-rail");
  if (!btn) return;

  let stored = "0";
  try { stored = localStorage.getItem("hana-rail") || "0"; } catch (_) {}

  const apply = (collapsed) => {
    sidebar.classList.toggle("sidebar-collapsed", collapsed);
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.title = collapsed ? "Expandir menú" : "Contraer menú";
    btn.setAttribute("aria-label", btn.title);
  };

  apply(stored === "1");

  btn.addEventListener("click", () => {
    const collapsed = !sidebar.classList.contains("sidebar-collapsed");
    apply(collapsed);
    try { localStorage.setItem("hana-rail", collapsed ? "1" : "0"); } catch (_) {}
  });
}

/* ---------- Automatización / XML ---------- */

function initAutomatizacion() {
  const dropZone  = $("#drop-zone");
  const fileInput = $("#file-xml");

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) processXmlFile(file);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add("drop-active");
    })
  );

  ["dragleave", "drop"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drop-active");
    })
  );

  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) processXmlFile(file);
  });

  $("#btn-test-valido").addEventListener("click", () =>
    analizarContenidoXML(XML_VALIDO, "simulacion/transferencia_2026_09_17.xml")
  );

  $("#btn-test-duplicado").addEventListener("click", () =>
    analizarContenidoXML(XML_DUPLICADO, "simulacion/transferencia_2026_8146.xml")
  );

  $("#btn-revisar-alerta").addEventListener("click", () => {
    toast(`Abriendo el detalle de la transferencia ${CODIGO_DUPLICADO}…`, "warning");
  });
}

function processXmlFile(file) {
  clearTimeout(syncTimer);
  const reader = new FileReader();
  reader.onload = () => analizarContenidoXML(String(reader.result || ""), file.name);
  reader.readAsText(file);
}

function analizarContenidoXML(contenido, nombreArchivo) {
  $("#file-name").textContent = nombreArchivo;

  if (contenido.includes(CODIGO_DUPLICADO)) {
    showAlertaDuplicado();
  } else {
    showDatosValidos();
  }
}

function setEmptyState(el, titulo, mensaje) {
  const h3 = el.querySelector("h3");
  const p  = el.querySelector("p");
  if (h3 && titulo) h3.textContent = titulo;
  if (p) p.textContent = mensaje;
  else el.textContent = mensaje;
}

function showAlertaDuplicado() {
  const alertZone = $("#alert-zone");
  const syncBox   = $("#sync-box");
  const tableBody = $("#auto-table-body");
  const autoEmpty = $("#auto-empty");

  syncBox.classList.add("hidden");
  tableBody.innerHTML = "";
  autoEmpty.classList.remove("hidden");
  setEmptyState(autoEmpty, "Archivo rechazado", "El archivo fue rechazado por el sistema anti-duplicados.");

  alertZone.classList.remove("hidden", "view-enter", "shake");
  void alertZone.offsetWidth;
  alertZone.classList.add("view-enter", "shake");

  toast(`¡Transferencia ya registrada! El archivo contiene el código ${CODIGO_DUPLICADO}.`, "warning");
}

function showDatosValidos() {
  const alertZone = $("#alert-zone");
  const syncBox   = $("#sync-box");
  const tableBody = $("#auto-table-body");
  const autoEmpty = $("#auto-empty");

  alertZone.classList.add("hidden");
  alertZone.classList.remove("shake");

  tableBody.innerHTML = "";
  autoEmpty.classList.add("hidden");

  FILAS_AUTOMATIZACION.forEach((r) => {
    const tr = document.createElement("tr");
    tr.classList.add("row-animate");
    tr.innerHTML = `
      <td class="font-mono text-xs text-rose-300">${r.articulo}</td>
      <td class="text-zinc-400">${r.categoria}</td>
      <td class="text-zinc-400">${r.descripcion}</td>
      <td class="text-zinc-300">${r.talla}</td>
      <td class="font-semibold text-zinc-200">${r.cantidad}</td>
      <td><span class="badge badge-ok">${r.agencia}</span></td>`;
    tableBody.appendChild(tr);
  });

  setEmptyState(autoEmpty, "Sin datos de transferencia", "Carga un archivo XML válido o pulsa un caso de prueba para visualizar los datos.");

  syncBox.classList.remove("hidden");
  iniciarLogSincronizacion();
  toast("Archivo XML válido. Transferencia sincronizada correctamente.", "ok");
}

function iniciarLogSincronizacion() {
  clearTimeout(syncTimer);

  const log   = $("#sync-log");
  const bar   = $("#sync-bar");
  const state = $("#sync-state");

  log.innerHTML = "";
  bar.style.width = "0%";
  state.textContent = "En curso";
  state.className = "badge badge-ok";

  const appendStep = (msg, done = false) => {
    const div = document.createElement("div");
    div.className = `sync-step${done ? " step-ok" : ""}`;
    div.textContent = msg;
    log.appendChild(div);
  };

  let index = 0;
  const tick = () => {
    if (index >= PASOS_SINCRONIZACION.length) {
      bar.style.width = "100%";
      state.textContent = "Completada";
      return;
    }
    const esUltimo = index === PASOS_SINCRONIZACION.length - 1;
    appendStep(PASOS_SINCRONIZACION[index], esUltimo);
    bar.style.width = `${Math.round(((index + 1) / PASOS_SINCRONIZACION.length) * 100)}%`;
    index += 1;
    syncTimer = setTimeout(tick, 600);
  };

  tick();
}

/* ---------- Inventario (filtros + orden) ---------- */

const TALLA_ORDER = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "XS", "S", "M", "L", "XL", "Única"];
const tallaRank = (t) => {
  const i = TALLA_ORDER.indexOf(t);
  return i === -1 ? 99 : i;
};

function compareInv(a, b, key) {
  switch (key) {
    case "precio": return a.precio - b.precio;
    case "stock":  return a.stock - b.stock;
    case "talla":  return tallaRank(a.talla) - tallaRank(b.talla);
    default:       return String(a[key]).localeCompare(String(b[key]), "es");
  }
}

function initInventario() {
  const inputSearch = $("#inv-search");
  const selectCat   = $("#inv-cat");
  const selectTalla = $("#inv-talla");
  const selectStock = $("#inv-stock");
  const btnClear    = $("#inv-clear");
  const tbody       = $("#inv-tbody");
  const countEl     = $("#inv-count");
  const emptyEl     = $("#inv-empty");

  const sortState = { key: null, dir: 1 };

  const render = () => {
    const term  = inputSearch.value.trim().toLowerCase();
    const cat   = selectCat.value;
    const talla = selectTalla.value;
    const stock = selectStock.value;

    const rows = INVENTARIO.filter((p) => {
      if (term && !(p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term))) return false;
      if (cat !== "todas" && p.categoria !== cat) return false;
      if (talla !== "todas" && p.talla !== talla) return false;
      if (stock === "stock" && p.stock <= 0) return false;
      if (stock === "bajo" && !(p.stock > 0 && p.stock <= 10)) return false;
      if (stock === "agotado" && p.stock !== 0) return false;
      return true;
    });

    if (sortState.key) {
      rows.sort((a, b) => compareInv(a, b, sortState.key) * sortState.dir);
    }

    tbody.innerHTML = "";
    countEl.textContent = `Mostrando ${rows.length} de ${INVENTARIO.length} artículos`;
    emptyEl.classList.toggle("hidden", rows.length > 0);

    rows.forEach((p) => {
      const tr = document.createElement("tr");
      tr.classList.add("row-animate");

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
        <td class="text-zinc-300">${p.talla}</td>
        <td class="text-zinc-300">Bs ${p.precio.toFixed(2)}</td>
        <td class="font-semibold text-zinc-200">${p.stock}</td>
        <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>`;
      tbody.appendChild(tr);
    });
  };

  [inputSearch, selectCat, selectTalla, selectStock].forEach((el) =>
    el.addEventListener("input", render)
  );
  selectCat.addEventListener("change", render);
  selectTalla.addEventListener("change", render);
  selectStock.addEventListener("change", render);

  btnClear.addEventListener("click", () => {
    inputSearch.value = "";
    selectCat.value = "todas";
    selectTalla.value = "todas";
    selectStock.value = "todas";
    render();
  });

  $$("#inv-table th.sortable").forEach((th) => {
    th.setAttribute("role", "button");
    th.setAttribute("tabindex", "0");
    const activate = () => {
      const key = th.dataset.sort;
      if (sortState.key === key) sortState.dir *= -1;
      else sortState = { key, dir: 1 };
      $$("#inv-table th.sortable").forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
      th.classList.add(sortState.dir === 1 ? "sorted-asc" : "sorted-desc");
      render();
    };
    th.addEventListener("click", activate);
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
    });
  });

  render();
}

/* ---------- Reportes ---------- */

function initReportes() {
  $$(".js-pdf").forEach((btn) =>
    btn.addEventListener("click", () =>
      toast(`Generando PDF de la transferencia ${btn.dataset.traslado}…`, "info")
    )
  );

  $$(".js-whatsapp").forEach((btn) =>
    btn.addEventListener("click", () =>
      toast(`Notificación enviada a WhatsApp (${btn.dataset.agencia}) para ${btn.dataset.traslado}.`, "ok")
    )
  );
}

/* ---------- Toast con icono y barra de progreso ---------- */

function initToast() {
  const toastEl   = $("#toast");
  const toastMsg  = $("#toast-msg");
  const toastIcon = $("#toast-icon");
  const toastBar  = $("#toast-progress");

  const ICONS = {
    ok:      '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    warning: '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info:    '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  };

  const hide = () => {
    toastEl.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    toastEl.classList.remove("opacity-100", "translate-y-0");
  };

  window.toast = (texto, tipo = "info") => {
    if (toastTimer) clearTimeout(toastTimer);

    toastMsg.textContent = texto;
    toastEl.dataset.tipo = tipo;
    if (toastIcon) toastIcon.innerHTML = ICONS[tipo] || ICONS.info;

    toastEl.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toastEl.classList.add("opacity-100", "translate-y-0");

    if (toastBar) {
      toastBar.style.animation = "none";
      void toastBar.offsetWidth;
      toastBar.style.animation = "";
    }

    toastTimer = setTimeout(hide, 3400);
  };

  toastEl.addEventListener("click", () => {
    clearTimeout(toastTimer);
    hide();
  });
}

/* ---------- Contadores animados (KPIs) ---------- */

function initCountUp() {
  const els = $$(".count-up");
  if (!els.length) return;

  const fmt = (n) => n.toLocaleString("es-VE");
  const finish = (el) => { el.textContent = fmt(+el.dataset.target || 0); };

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    els.forEach(finish);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);

      const el = en.target;
      const target = +el.dataset.target || 0;
      const dur = 1100;
      const t0 = performance.now();

      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });

  els.forEach((el) => io.observe(el));
}

/* ---------- Reloj en vivo ---------- */

function initLiveClock() {
  const el = $("#clock-time");
  if (!el) return;

  const tick = () => {
    const now = new Date();
    const time = now.toLocaleTimeString("es-VE", { hour12: false });
    const date = now.toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short" });
    el.textContent = `${time} · ${date}`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- Última sincronización + edades relativas ---------- */

function initLastSync() {
  const el = $("#last-sync-time");
  if (el) {
    const stamp = () => new Date().toLocaleTimeString("es-VE", { hour12: false });
    el.textContent = stamp();
    setInterval(() => { el.textContent = stamp(); }, 45000);
  }

  $$("[data-age-min]").forEach((p) => {
    let m = +p.dataset.ageMin || 0;
    setInterval(() => {
      m += 1;
      p.textContent = `hace ${m} min`;
    }, 60000);
  });
}

/* ---------- Latencia simulada de agencias ---------- */

function initAgencyPing() {
  const rings = $$(".agency-ping");
  if (!rings.length) return;

  const bases = rings.map((r) => parseInt(r.textContent, 10) || 20);

  const apply = (ring, ms) => {
    ring.textContent = String(ms);
    ring.classList.toggle("latency-good", ms < 30);
    ring.classList.toggle("latency-medium", ms >= 30 && ms < 60);
    ring.classList.toggle("latency-poor", ms >= 60);
    ring.title = `${ring.dataset.agency}: ${ms} ms de respuesta`;
  };

  setInterval(() => {
    rings.forEach((ring, i) => {
      const jitter = Math.round((Math.random() - 0.42) * 16);
      apply(ring, Math.max(6, Math.min(120, bases[i] + jitter)));
    });
  }, 5000);
}

/* ---------- Paleta de comandos (Ctrl K) ---------- */

function initCommandPalette() {
  const root  = $("#cmdk");
  const input = $("#cmdk-input");
  const list  = $("#cmdk-list");
  if (!root || !input || !list) return;

  const COMMANDS = [
    ...Object.entries(VIEW_META).map(([id, label], i) => ({
      group: "Secciones", label, hint: String(i + 1), run: () => showView(id),
    })),
    { group: "Automatización", label: "Probar carga XML válida",        run: () => { showView("automatizacion"); $("#btn-test-valido").click(); } },
    { group: "Automatización", label: 'Probar duplicado "8146"',        run: () => { showView("automatizacion"); $("#btn-test-duplicado").click(); } },
    { group: "Inventario",     label: "Buscar artículo en inventario",  run: () => { showView("inventario"); $("#inv-search").focus(); } },
    { group: "Inventario",     label: "Limpiar filtros de inventario",  run: () => { showView("inventario"); $("#inv-clear").click(); } },
    { group: "Datos",          label: "Exportar inventario (CSV)",      run: () => $("#btn-export-inv").click() },
    { group: "Datos",          label: "Exportar transferencias (CSV)",  run: () => $("#btn-export-all").click() },
    { group: "Interfaz",       label: "Contraer / expandir menú lateral", run: () => $("#btn-rail").click() },
    { group: "Interfaz",       label: "Ver atajos de teclado",          run: () => window.__toggleKbdHelp && window.__toggleKbdHelp(true) },
  ];

  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  let items = COMMANDS.slice();
  let sel = 0;
  let lastFocus = null;

  const renderList = () => {
    list.innerHTML = "";
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "cmdk-empty";
      li.textContent = "Sin resultados para tu búsqueda.";
      list.appendChild(li);
      return;
    }
    items.forEach((c, i) => {
      const li = document.createElement("li");
      li.className = "cmdk-item";
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === sel ? "true" : "false");

      const label = document.createElement("span");
      label.textContent = c.label;

      const group = document.createElement("span");
      group.className = "cmdk-item-group";
      group.textContent = c.group;

      li.append(label, group);
      li.addEventListener("click", () => { close(); c.run(); });
      li.addEventListener("mousemove", () => { sel = i; syncSel(); });
      list.appendChild(li);
    });
  };

  const syncSel = () => {
    Array.from(list.children).forEach((li, i) =>
      li.setAttribute("aria-selected", i === sel ? "true" : "false")
    );
    const el = list.children[sel];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  };

  const setSel = (next) => {
    sel = Math.max(0, Math.min(items.length - 1, next));
    syncSel();
  };

  const filter = (q) => {
    const n = norm(q.trim());
    items = n
      ? COMMANDS.filter((c) => norm(`${c.label} ${c.group} ${c.hint || ""}`).includes(n))
      : COMMANDS.slice();
    sel = 0;
    renderList();
    syncSel();
  };

  const isOpen = () => root.classList.contains("active");

  const open = () => {
    lastFocus = document.activeElement;
    root.classList.add("active");
    input.value = "";
    filter("");
    requestAnimationFrame(() => input.focus());
  };

  const close = () => {
    root.classList.remove("active");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  window.__cmdkOpen = open;

  const trigger = $("#btn-cmd-search");
  if (trigger) trigger.addEventListener("click", open);

  input.addEventListener("input", () => filter(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(sel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(sel - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const c = items[sel];
      if (c) { close(); c.run(); }
    }
  });

  root.addEventListener("mousedown", (e) => {
    if (e.target === root) close();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen() ? close() : open();
    } else if (e.key === "Escape" && isOpen()) {
      close();
    }
  });
}

/* ---------- Ayuda de atajos ---------- */

function initKbdHelp() {
  const root = $("#kbd-help");
  if (!root) return;

  const set = (on) => root.classList.toggle("active", !!on);

  window.__toggleKbdHelp = (force) => {
    set(force !== undefined ? force : !root.classList.contains("active"));
  };

  root.addEventListener("mousedown", (e) => {
    if (e.target === root) set(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") set(false);
  });
}

/* ---------- Atajos globales de teclado ---------- */

function initShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const t = e.target;
    const tag = (t.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
    if (typing) return;

    const cmdkOpen = $("#cmdk") && $("#cmdk").classList.contains("active");
    const helpOpen = $("#kbd-help") && $("#kbd-help").classList.contains("active");
    if (cmdkOpen || helpOpen) return;

    if (e.key >= "1" && e.key <= "5") {
      const names = Object.keys(VIEW_META);
      showView(names[+e.key - 1]);
    } else if (e.key === "/") {
      e.preventDefault();
      showView("inventario");
      $("#inv-search").focus();
    } else if (e.key === "?") {
      e.preventDefault();
      window.__toggleKbdHelp && window.__toggleKbdHelp();
    } else if (e.key === "Escape" && window.innerWidth < 1024) {
      closeMenuMovil();
    }
  });
}

/* ---------- Exportación CSV ---------- */

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

const estadoDe = (p) => (p.stock === 0 ? "Agotado" : p.stock <= 10 ? "Bajo stock" : "Disponible");

function initExports() {
  const invBtn = $("#btn-export-inv");
  if (invBtn) {
    invBtn.addEventListener("click", () => {
      const rows = [
        ["Código", "Artículo", "Categoría", "Talla", "Precio Bs", "Stock", "Estado"],
        ...INVENTARIO.map((p) => [p.codigo, p.nombre, p.categoria, p.talla, p.precio.toFixed(2), p.stock, estadoDe(p)]),
      ];
      downloadCsv("inventario-hanastock.csv", rows);
      toast(`Inventario exportado (${INVENTARIO.length} artículos).`, "ok");
    });
  }

  const allBtn = $("#btn-export-all");
  if (allBtn) {
    allBtn.addEventListener("click", () => {
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
}

/* ---------- FAB: nueva transferencia ---------- */

function initFab() {
  const fab = $("#fab-new");
  if (!fab) return;

  fab.addEventListener("click", () => {
    showView("automatizacion");
    const dz = $("#drop-zone");
    if (dz) {
      setTimeout(() => {
        dz.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
        dz.classList.add("pulse-once");
        setTimeout(() => dz.classList.remove("pulse-once"), 2600);
      }, 120);
    }
    toast("Arrastra un archivo XML o usa un caso de prueba.", "info");
  });
}
