"use strict";

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initNavigation();
  initAutomatizacion();
  initInventario();
  initReportes();
  initToast();
});

const $  = (selector, ctx = document) => ctx.querySelector(selector);
const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

const sidebar = $("#sidebar");
const overlay = $("#overlay");
const views   = $$(".view");
const navBtns = $$(".nav-btn");

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

function initNavigation() {
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.view;
      btn.setAttribute("aria-selected", "true");
      btn.setAttribute("aria-current", "page");
      navBtns.forEach((b) => {
        if (b !== btn) {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
          b.removeAttribute("aria-current");
        }
      });
      showView(target);
      if (window.innerWidth < 1024) closeMenuMovil();
    });
  });
}

function showView(name) {
  views.forEach((v) => v.classList.add("hidden"));
  const view = $(`#view-${name}`);
  if (!view) return;
  view.classList.remove("hidden");
  view.classList.remove("view-enter");
  void view.offsetWidth;
  view.classList.add("view-enter");
}

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

function showAlertaDuplicado() {
  const alertZone = $("#alert-zone");
  const syncBox   = $("#sync-box");
  const tableBody = $("#auto-table-body");
  const autoEmpty = $("#auto-empty");

  syncBox.classList.add("hidden");
  tableBody.innerHTML = "";
  autoEmpty.classList.remove("hidden");
  autoEmpty.textContent = "El archivo fue rechazado por el sistema anti-duplicados.";

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
      <td class="font-mono text-xs text-cyan-300">${r.articulo}</td>
      <td class="text-slate-400">${r.categoria}</td>
      <td class="text-slate-400">${r.descripcion}</td>
      <td class="text-slate-300">${r.talla}</td>
      <td class="font-semibold text-slate-200">${r.cantidad}</td>
      <td><span class="badge badge-ok">${r.agencia}</span></td>`;
    tableBody.appendChild(tr);
  });

  autoEmpty.textContent = "Carga un archivo XML válido o pulsa un caso de prueba para visualizar los datos.";

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

function initInventario() {
  const inputSearch = $("#inv-search");
  const selectCat   = $("#inv-cat");
  const selectTalla = $("#inv-talla");
  const selectStock = $("#inv-stock");
  const btnClear    = $("#inv-clear");
  const tbody       = $("#inv-tbody");
  const countEl     = $("#inv-count");
  const emptyEl     = $("#inv-empty");

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
        <td class="font-mono text-xs text-cyan-300">${p.codigo}</td>
        <td class="font-medium text-white">${p.nombre}</td>
        <td class="text-slate-400">${p.categoria}</td>
        <td class="text-slate-300">${p.talla}</td>
        <td class="text-slate-300">Bs ${p.precio.toFixed(2)}</td>
        <td class="font-semibold text-slate-200">${p.stock}</td>
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

  render();
}

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

function initToast() {
  const toastEl  = $("#toast");
  const toastMsg = $("#toast-msg");

  window.toast = (texto, tipo = "info") => {
    if (toastTimer) clearTimeout(toastTimer);

    toastMsg.textContent = texto;
    toastEl.dataset.tipo = tipo;

    toastEl.classList.remove("opacity-0", "translate-y-4");
    toastEl.classList.add("opacity-100", "translate-y-0");

    toastTimer = setTimeout(() => {
      toastEl.classList.add("opacity-0", "translate-y-4");
      toastEl.classList.remove("opacity-100", "translate-y-0");
    }, 3400);
  };
}