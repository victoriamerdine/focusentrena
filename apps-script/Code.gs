/**
 * Focus Entrena — Apps Script
 *
 * Este archivo va pegado en el editor de Apps Script del Google Sheet
 * (Extensiones > Apps Script), reemplazando Code.gs por completo.
 *
 * Contiene tres partes:
 *  1) Automatización del lado del entrenador (ya existente):
 *     - filterPatterns(e): trigger onEdit que arma los desplegables de
 *       Patrón/Músculo (col. A) y Ejercicio (col. B), y auto-completa el
 *       link de video (col. H) buscando en "EjerciciosConsolidado".
 *     - configurarColumnaA() / aplicarValidacionColumnaA(): arman la lista
 *       de valores permitidos en A8:A1000.
 *     - crearNuevaRutina() / crearHojaRutina(): duplica "Template Rutina",
 *       pide el nombre del alumno, lo pone en B2, genera un id único
 *       (slug) en E2 y nombra la pestaña "<nombre> - Rutina".
 *     - actualizarDashboard() / actualizarDashboardUnicavez(): arman la hoja
 *       "Dashboard" con el listado de alumnos, accesos directos y un
 *       checkbox por fila para marcar qué rutina borrar.
 *     - eliminarRutinasMarcadas(): borra las hojas tildadas en el Dashboard
 *       (pide confirmación antes de borrar).
 *  2) API pública de lectura para el frontend de alumnos (Next.js):
 *     - doGet(e): Web App que devuelve la rutina de un alumno en JSON.
 *  3) API de administración para el panel del entrenador (protegida por
 *     contraseña, ver sección al final del archivo):
 *     - doPost(e): crear/editar/borrar alumnos y guardar los ejercicios
 *       de un día.
 *
 * Contrato del Web App (lectura, pública):
 *   GET {WEB_APP_URL}?id=<valor de la celda E2 del alumno>
 *   -> 200 { alumno, tipoPlan, dias: [{ nombre, ejercicios: [...] }] }
 *   -> 200 { error: "not_found" | "missing_id" }
 * Cada ejercicio incluye "grupo": el color de fondo de la fila (hex) si el
 * entrenador coloreó ese bloque para indicar ejercicios a combinar en la
 * misma serie, o "" si la fila no tiene color.
 *
 * Contrato del Web App (escritura, panel del entrenador): ver el comentario
 * arriba de la sección 3, más abajo en este archivo.
 *
 * Rendimiento:
 *  - construirRutina() lee valores/fórmulas/rich text/colores en bloque
 *    (unas pocas llamadas totales) en vez de una por fila.
 *  - El índice id -> hoja (obtenerIndiceAlumnos) se cachea 5 min y lo
 *    comparten buscarAlumno() y generarIdUnico(), así crear un alumno no
 *    recorre todas las pestañas leyendo E2 una por una.
 *  - manejarListarAlumnos() lee B2/B4/E2 de cada hoja en una sola llamada
 *    (no tres) y cachea la lista 60s.
 *  - manejarObtenerCatalogo() arma las listas del desplegable con objetos
 *    en vez de array+indexOf (O(n) en vez de O(n²) con ~1400 filas) y
 *    cachea el resultado 30 min.
 *  - Todos esos cachés se invalidan solos al crear/editar/borrar un
 *    alumno, así que nunca quedan desactualizados por mucho tiempo.
 *
 * E2 = id de la rutina (usado en la URL, autogenerado por crearNuevaRutina
 * como slug del nombre, ej. "Pablo Salas" -> "pablo-salas"). B2 = nombre
 * del alumno, solo para mostrar en pantalla.
 */

var SPREADSHEET_ID = "10poNqi6ASxO6bP0bnjfIEgV3_eGR1qiZuubuHfd8eHk";
var DAY_REGEX = /^d[ií]a\s*\d+/i;

// ============================================================
// 1) AUTOMATIZACIÓN DEL SHEET (entrenador) — sin cambios
// ============================================================

function filterPatterns(e) {

  const hoja = e.range.getSheet();

  // Ejecutar solo en hojas de rutinas
  if (!hoja.getName().includes("Rutina")) return;

  if (e.range.getA1Notation() === "B4") {
    configurarColumnaA();
  }

  const fila = e.range.getRow();
  const columna = e.range.getColumn();

  if (fila < 6) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const base = ss.getSheetByName("EjerciciosConsolidado");

  const datos = base.getDataRange().getValues();

  // B4 contiene Patrones o Musculo
  const tipoPlan = hoja.getRange("B4").getValue();

  // ==========
  // COLUMNA A
  // ==========
  if (columna === 1) {

    const valorSeleccionado = hoja.getRange(fila, 1).getValue();

    const celdaEjercicio = hoja.getRange(fila, 2);
    const celdaVideo = hoja.getRange(fila, 8);

    celdaEjercicio.clearContent();
    celdaEjercicio.clearDataValidations();
    celdaVideo.clearContent();

    if (!valorSeleccionado) return;

    let ejercicios = [];

    if (tipoPlan === "Patrones") {

      ejercicios = [
        ...new Set(
          datos
            .filter(r => r[1] === valorSeleccionado) // Categoría
            .map(r => r[3]) // Ejercicio
            .filter(String)
        )
      ];

    } else if (tipoPlan === "Musculo") {

      ejercicios = [
        ...new Set(
          datos
            .filter(r => r[2] === valorSeleccionado) // Músculo
            .map(r => r[3]) // Ejercicio
            .filter(String)
        )
      ];

    }

    if (ejercicios.length === 0) return;

    const regla = SpreadsheetApp.newDataValidation()
      .requireValueInList(ejercicios, true)
      .setAllowInvalid(false)
      .build();

    celdaEjercicio.setDataValidation(regla);
  }

  // ==========
  // COLUMNA B
  // ==========
  if (columna === 2) {

    const ejercicio = hoja.getRange(fila, 2).getValue();

    const celdaVideo = hoja.getRange(fila, 8);

    celdaVideo.clearContent();

    if (!ejercicio) return;

    const encontrado = datos.find(r => r[3] === ejercicio);

    if (!encontrado) return;

    const link = encontrado[4];

    if (!link) return;

    celdaVideo.setFormula(
      `=HYPERLINK("${link}","🎥 Ver Video")`
    );
  }
}

function configurarColumnaA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  aplicarValidacionColumnaA(ss, ss.getActiveSheet());
}

// Misma lógica que antes, pero recibe la hoja como parámetro para poder
// llamarse también desde la API del entrenador (ahí no hay "hoja activa").
function aplicarValidacionColumnaA(ss, hoja) {

  const base = ss.getSheetByName("EjerciciosConsolidado");
  const tipoPlan = hoja.getRange("B4").getValue();
  const datos = base.getDataRange().getValues();

  let lista = [];

  if (tipoPlan === "Patrones") {

    lista = [...new Set(
      datos
        .map(r => r[1])
        .filter(String)
    )].sort((a, b) =>
      a.toString().localeCompare(b.toString(), "es")
    );

  } else if (tipoPlan === "Musculo") {

    lista = [...new Set(
      datos
        .map(r => r[2])
        .filter(String)
    )].sort((a, b) =>
      a.toString().localeCompare(b.toString(), "es")
    );

  }

  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(lista, true)
    .setAllowInvalid(false)
    .build();

  hoja.getRange("A8:A1000").setDataValidation(regla);
}

function crearNuevaRutina() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const respuesta = ui.prompt(
    "Nueva Rutina",
    "Ingrese el nombre del alumno:",
    ui.ButtonSet.OK_CANCEL
  );

  if (respuesta.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const nombreAlumno = respuesta.getResponseText().trim();

  if (!nombreAlumno) {
    ui.alert("Debe ingresar un nombre.");
    return;
  }

  try {
    const resultado = crearHojaRutina(ss, nombreAlumno, null);
    ss.setActiveSheet(resultado.hoja);
  } catch (err) {
    ui.alert(err.message);
  }
}

// Núcleo compartido por crearNuevaRutina() (desde el menú de Sheets) y por
// la API del entrenador. tipoPlan es opcional: si no se pasa, se deja el
// que ya trae "Template Rutina" por defecto.
function crearHojaRutina(ss, nombreAlumno, tipoPlan) {

  const template = ss.getSheetByName("Template Rutina");

  if (!template) {
    throw new Error('No existe la hoja "Template Rutina"');
  }

  const nombreHoja = `${nombreAlumno} - Rutina`;

  if (ss.getSheetByName(nombreHoja)) {
    throw new Error("Esa rutina ya existe.");
  }

  const nuevaHoja = template.copyTo(ss);

  nuevaHoja.setName(nombreHoja);

  nuevaHoja.getRange("B2").setValue(nombreAlumno);

  if (tipoPlan) {
    nuevaHoja.getRange("B4").setValue(tipoPlan);
  }

  const id = generarIdUnico(ss, nombreAlumno);
  nuevaHoja.getRange("E2").setValue(id);

  invalidarIndiceAlumnos();
  invalidarListaAlumnos();
  actualizarDashboard();

  return { hoja: nuevaHoja, id: id, nombreHoja: nombreHoja };
}

function generarIdUnico(ss, nombre) {

  const base = slugify(nombre);

  // Usa el índice ya cacheado (id -> hoja) en vez de volver a leer E2 de
  // cada pestaña una por una — con muchos alumnos esa era la parte más
  // lenta de crear uno nuevo.
  const existentes = Object.keys(obtenerIndiceAlumnos(ss));

  let id = base;
  let contador = 2;

  while (existentes.indexOf(id) !== -1) {
    id = `${base}-${contador}`;
    contador++;
  }

  return id;
}

function slugify(str) {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function actualizarDashboard() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let dashboard = ss.getSheetByName("Dashboard");

  if (!dashboard) {
    dashboard = ss.insertSheet("Dashboard");
  }

  // Se limpia contenido y formato para no arrastrar columnas fantasma si
  // alguna vez se convirtió este rango en una Tabla de Sheets (Insertar >
  // Tabla / clic derecho > Convertir en tabla). Si eso vuelve a pasar,
  // hay que sacarla a mano (clic en el nombre de la tabla > Convertir en
  // rango) antes de correr esta función de nuevo.
  dashboard.clear();
  dashboard.clearFormats();

  const hojas = ss.getSheets();

  const lista = hojas
    .filter(h =>
      ![
        "Dashboard",
        "EjerciciosConsolidado",
        "Datos",
        "Volumen Meso"
      ].includes(h.getName())
    )
    .map(h => ({
      nombre: h.getName(),
      gid: h.getSheetId()
    }))
    .sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es",
        { sensitivity: "base" }
      )
    );

  dashboard
    .getRange("A1:C1")
    .setValues([["Alumno", "Abrir", "Eliminar"]])
    .setFontWeight("bold");

  if (lista.length === 0) return;

  const datos = lista.map(h => [
    h.nombre,
    `=HYPERLINK("#gid=${h.gid}","Abrir")`
  ]);

  dashboard
    .getRange(2, 1, datos.length, 2)
    .setValues(datos);

  dashboard
    .getRange(2, 3, datos.length, 1)
    .insertCheckboxes();

  dashboard.autoResizeColumns(1, 3);
}

// Borra las hojas cuyo checkbox esté tildado en la columna "Eliminar" del
// Dashboard. Pide confirmación antes de borrar y refresca el Dashboard al
// terminar.
function eliminarRutinasMarcadas() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName("Dashboard");

  if (!dashboard) return;

  const lastRow = dashboard.getLastRow();

  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No hay rutinas en el Dashboard.");
    return;
  }

  const filas = dashboard.getRange(2, 1, lastRow - 1, 3).getValues();
  const aEliminar = filas
    .filter(fila => fila[2] === true)
    .map(fila => String(fila[0]).trim())
    .filter(String);

  if (aEliminar.length === 0) {
    SpreadsheetApp.getUi().alert("No marcaste ninguna rutina para eliminar.");
    return;
  }

  const ui = SpreadsheetApp.getUi();

  const confirmacion = ui.alert(
    "Eliminar rutinas",
    `Se van a borrar estas hojas:\n\n${aEliminar.join("\n")}\n\nEsta acción no se puede deshacer. ¿Confirmás?`,
    ui.ButtonSet.YES_NO
  );

  if (confirmacion !== ui.Button.YES) return;

  let borradas = 0;

  aEliminar.forEach(nombre => {
    const hoja = ss.getSheetByName(nombre);
    if (hoja) {
      ss.deleteSheet(hoja);
      borradas++;
    }
  });

  invalidarIndiceAlumnos();
  actualizarDashboard();

  ui.alert(`Se eliminaron ${borradas} rutina(s).`);
}

function actualizarDashboardUnicavez() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let dashboard = ss.getSheetByName("Dashboard");

  if (!dashboard) {
    dashboard = ss.insertSheet("Dashboard");
  }

  dashboard.clear();

  dashboard.getRange("A1").setValue("Alumno");
  dashboard.getRange("B1").setValue("Hoja");
  dashboard.getRange("C1").setValue("Abrir");

  const excluir = [
    "Dashboard",
    "EjerciciosConsolidado",
    "Datos",
    "Volumen Meso"
  ];

  const filas = [];

  ss.getSheets()
    .filter(h => !excluir.includes(h.getName()))
    .forEach(h => {

      let alumno = "";

      try {
        alumno = h.getRange("B2").getValue();
      } catch (e) {}

      if (!alumno) {
        alumno = h.getName();
      }

      filas.push([
        alumno,
        h.getName(),
        `=HYPERLINK("#gid=${h.getSheetId()}","🔗 Abrir")`
      ]);
    });

  filas.sort((a, b) =>
    a[0].toString().localeCompare(
      b[0].toString(),
      "es",
      { sensitivity: "base" }
    )
  );

  if (filas.length) {

    dashboard
      .getRange(2, 1, filas.length, 3)
      .setValues(filas);

  }

  dashboard.autoResizeColumns(1, 3);
}

// ============================================================
// 2) API PARA EL FRONTEND (Next.js)
// ============================================================

function doGet(e) {

  const id = e && e.parameter ? e.parameter.id : null;

  if (!id) {
    return jsonResponse({ error: "missing_id" });
  }

  // Respuesta completa cacheada 90 segundos: una segunda visita al mismo
  // link poco después de la primera se sirve casi instantánea, sin volver
  // a tocar el Sheet. 90s es corto como para que un cambio del entrenador
  // se vea reflejado enseguida, pero evita repetir el trabajo pesado en
  // visitas seguidas (recargar la página, revisar durante el entreno, etc).
  const cache = CacheService.getScriptCache();
  const cacheKey = "rutina_" + id;
  const cacheado = cache.get(cacheKey);

  if (cacheado) {
    return ContentService
      .createTextOutput(cacheado)
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const hoja = buscarAlumno(id, ss);

  if (!hoja) {
    return jsonResponse({ error: "not_found" });
  }

  const rutina = construirRutina(hoja);
  const json = JSON.stringify(rutina);

  if (json.length < 100000) { // límite de CacheService por valor
    cache.put(cacheKey, json, 90);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// El índice id -> nombre de hoja se cachea 5 minutos para no tener que
// recorrer todas las pestañas (una llamada a la API por cada una) en cada
// visita. crearNuevaRutina() y eliminarRutinasMarcadas() invalidan el
// caché al tocar la lista de alumnos, así que nunca queda desactualizado
// más de un momento.
function buscarAlumno(id, ss) {
  const indice = obtenerIndiceAlumnos(ss);
  const nombreHoja = indice[String(id).trim()];
  return nombreHoja ? ss.getSheetByName(nombreHoja) : null;
}

// Índice id -> nombre de hoja, compartido por buscarAlumno() y
// generarIdUnico() (para no recorrer todas las pestañas dos veces por
// request). Cacheado 5 minutos.
function obtenerIndiceAlumnos(ss) {

  const cache = CacheService.getScriptCache();
  const cacheKey = "indice_alumnos_v1";

  let indice = null;
  const cacheado = cache.get(cacheKey);

  if (cacheado) {
    try {
      indice = JSON.parse(cacheado);
    } catch (e) {
      indice = null;
    }
  }

  if (!indice) {
    indice = construirIndiceAlumnos(ss);
    cache.put(cacheKey, JSON.stringify(indice), 300);
  }

  return indice;
}

function construirIndiceAlumnos(ss) {
  const indice = {};
  ss.getSheets().forEach(hoja => {
    const codigo = String(hoja.getRange("E2").getValue() || "").trim();
    if (codigo) indice[codigo] = hoja.getName();
  });
  return indice;
}

function invalidarIndiceAlumnos() {
  CacheService.getScriptCache().remove("indice_alumnos_v1");
}

function invalidarListaAlumnos() {
  CacheService.getScriptCache().remove("lista_alumnos_v1");
}

function construirRutina(hoja) {

  const alumno = String(hoja.getRange("B2").getValue() || "").trim();
  const tipoPlan = String(hoja.getRange("B4").getValue() || "").trim();

  const lastRow = hoja.getLastRow();
  if (lastRow < 1) {
    return { alumno: alumno, tipoPlan: tipoPlan, dias: [] };
  }

  // Se leen los datos, fórmulas, texto enriquecido y colores en bloque
  // (4 llamadas totales) en vez de una llamada por fila — con rutinas de
  // 20-30 filas esto es la diferencia entre ~4 y ~100 llamadas a la API.
  const rango = hoja.getRange(1, 1, lastRow, 8);
  const valores = rango.getValues();
  const formulas = rango.getFormulas();
  const richTexts = rango.getRichTextValues();
  const coloresColA = hoja.getRange(1, 1, lastRow, 1).getBackgrounds();

  const dias = [];
  let diaActual = null;

  for (let r = 0; r < valores.length; r++) {

    const fila = valores[r];
    const colA = String(fila[0] || "").trim();
    const colB = String(fila[1] || "").trim();

    const etiquetaDia = DAY_REGEX.test(colA) ? colA : (DAY_REGEX.test(colB) ? colB : null);

    if (etiquetaDia) {
      diaActual = { nombre: etiquetaDia, ejercicios: [] };
      dias.push(diaActual);
      continue; // la fila siguiente son los encabezados de columna, se saltea sola
    }

    if (!diaActual) continue;
    if (esFilaEncabezado(colA, colB)) continue;
    if (esFilaVacia(fila)) continue;

    const color = coloresColA[r][0];

    diaActual.ejercicios.push({
      patron: colA,
      ejercicio: colB,
      series: formatearValor(fila[2]),
      repeticiones: formatearValor(fila[3]),
      intensidad: formatearValor(fila[4]),
      pausas: formatearValor(fila[5]),
      notas: String(fila[6] || "").trim(),
      video: extraerLinkVideoDeCelda(fila[7], formulas[r][7], richTexts[r][7]),
      grupo: (!color || color.toLowerCase() === "#ffffff") ? "" : color,
    });
  }

  return { alumno: alumno, tipoPlan: tipoPlan, dias: dias };
}

function esFilaEncabezado(colA, colB) {
  return colA.toLowerCase() === "patrón/músculo" ||
    colA.toLowerCase() === "patron/musculo" ||
    colB.toLowerCase() === "ejercicio";
}

function esFilaVacia(fila) {
  for (let i = 0; i < fila.length; i++) {
    if (String(fila[i] || "").trim() !== "") return false;
  }
  return true;
}

function formatearValor(valor) {
  if (valor === "" || valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toString();
  return String(valor).trim();
}

function extraerLinkVideoDeCelda(valorCelda, formula, richText) {

  // El link se escribe como =HYPERLINK("url","🎥 Ver Video") desde filterPatterns
  if (formula) {
    const match = formula.match(/HYPERLINK\(\s*"([^"]+)"/i);
    if (match) return match[1];
  }

  if (richText) {
    const url = richText.getLinkUrl();
    if (url) return url;
  }

  const raw = String(valorCelda || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  return "";
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 3) API DE ADMINISTRACIÓN (panel del entrenador, requiere contraseña)
// ============================================================
//
// Contrato: POST {WEB_APP_URL} con body JSON (mandado con
// Content-Type: text/plain para evitar el preflight CORS que Apps Script
// no puede responder):
//   { "password": "...", "accion": "<nombre>", ...campos según la acción }
//
// Acciones disponibles:
//   listar_alumnos       -> { ok, alumnos: [{ id, alumno, tipoPlan, hoja }] }
//   obtener_catalogo     -> { ok, catalogo: { patrones, musculos,
//                              ejerciciosPorPatron, ejerciciosPorMusculo,
//                              videosPorEjercicio } }
//   crear_alumno         { nombreAlumno, tipoPlan } -> { ok, alumno }
//   actualizar_alumno    { id, nombreAlumno?, tipoPlan? } -> { ok }
//   eliminar_alumno      { id } -> { ok }
//   guardar_dia          { id, diaNombre, ejercicios: [...] } -> { ok }
//
// Cualquier error (password incorrecta, datos faltantes, etc.) responde
// { error: "..." } manteniendo status 200 (así es como funciona
// ContentService — el frontend debe mirar el campo "error"/"ok").
//
// guardar_dia NO inserta ni borra filas de la hoja (para no correr el
// riesgo de romper fórmulas del lado derecho de la planilla): reescribe
// los ejercicios dentro del rango de filas que ya existe entre la
// etiqueta de ese día y la del día siguiente. Si es el último día de la
// hoja, sí puede crecer más allá de esas filas. Si un día del medio no
// tiene lugar suficiente, devuelve un error pidiendo agregar filas a mano.

function configurarPasswordEntrenador() {

  const ui = SpreadsheetApp.getUi();

  const respuesta = ui.prompt(
    "Contraseña del panel de entrenador",
    "Ingresá la contraseña que vas a usar para entrar a focus-entrena.web.app/entrenador:",
    ui.ButtonSet.OK_CANCEL
  );

  if (respuesta.getSelectedButton() !== ui.Button.OK) return;

  const password = respuesta.getResponseText().trim();

  if (!password) {
    ui.alert("Debe ingresar una contraseña.");
    return;
  }

  PropertiesService.getScriptProperties().setProperty("TRAINER_PASSWORD", password);
  ui.alert("Listo, contraseña guardada.");
}

function verificarPassword(password) {
  const guardada = PropertiesService.getScriptProperties().getProperty("TRAINER_PASSWORD");
  return !!guardada && String(password || "") === guardada;
}

function doPost(e) {

  let datos;

  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "bad_request" });
  }

  if (!verificarPassword(datos.password)) {
    return jsonResponse({ error: "unauthorized" });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {

    switch (datos.accion) {

      case "listar_alumnos":
        return jsonResponse({ ok: true, alumnos: manejarListarAlumnos(ss) });

      case "obtener_catalogo":
        return jsonResponse({ ok: true, catalogo: manejarObtenerCatalogo(ss) });

      case "crear_alumno":
        return jsonResponse({ ok: true, alumno: manejarCrearAlumno(ss, datos) });

      case "actualizar_alumno":
        manejarActualizarAlumno(ss, datos);
        return jsonResponse({ ok: true });

      case "eliminar_alumno":
        manejarEliminarAlumno(ss, datos);
        return jsonResponse({ ok: true });

      case "guardar_dia":
        manejarGuardarDia(ss, datos);
        return jsonResponse({ ok: true });

      default:
        return jsonResponse({ error: "accion_desconocida" });
    }

  } catch (err) {
    return jsonResponse({ error: "server_error", detalle: err.message });
  }
}

function manejarListarAlumnos(ss) {

  const cache = CacheService.getScriptCache();
  const cacheKey = "lista_alumnos_v1";
  const cacheado = cache.get(cacheKey);

  if (cacheado) {
    try {
      return JSON.parse(cacheado);
    } catch (e) {
      // sigue de largo y la reconstruye
    }
  }

  const excluir = [
    "Dashboard",
    "EjerciciosConsolidado",
    "Datos",
    "Volumen Meso",
    "Template Rutina"
  ];

  const resultado = ss.getSheets()
    .filter(h => !excluir.includes(h.getName()))
    .map(h => {
      // B2, B4 y E2 en una sola lectura por hoja (antes eran 3 llamadas
      // separadas) — con muchos alumnos esto era lo que más pesaba al
      // entrar al panel.
      const bloque = h.getRange(2, 1, 3, 5).getValues();
      const alumno = String(bloque[0][1] || "").trim(); // B2
      const tipoPlan = String(bloque[2][1] || "").trim(); // B4
      const id = String(bloque[0][4] || "").trim(); // E2
      return {
        id: id,
        alumno: alumno || h.getName(),
        tipoPlan: tipoPlan,
        hoja: h.getName(),
      };
    })
    .filter(a => a.id)
    .sort((a, b) => a.alumno.localeCompare(b.alumno, "es", { sensitivity: "base" }));

  const json = JSON.stringify(resultado);
  if (json.length < 100000) {
    cache.put(cacheKey, json, 60);
  }

  return resultado;
}

function manejarObtenerCatalogo(ss) {

  const cache = CacheService.getScriptCache();
  const cacheKey = "catalogo_v1";
  const cacheado = cache.get(cacheKey);

  if (cacheado) {
    try {
      return JSON.parse(cacheado);
    } catch (e) {
      // sigue de largo y lo reconstruye
    }
  }

  const base = ss.getSheetByName("EjerciciosConsolidado");

  if (!base) {
    return { patrones: [], musculos: [], ejerciciosPorPatron: {}, ejerciciosPorMusculo: {}, videosPorEjercicio: {} };
  }

  const datos = base.getDataRange().getValues();
  // columnas: 0=#, 1=Categoría, 2=Músculo, 3=Ejercicio, 4=Link1

  // Se arma con objetos como "sets" (clave = existe) en vez de arrays +
  // indexOf: con ~1400 filas, buscar en un array que va creciendo dentro
  // del propio loop es O(n²) — esto es O(n).
  const patronesSet = {};
  const musculosSet = {};
  const porPatronSet = {};
  const porMusculoSet = {};
  const videosPorEjercicio = {};

  // Encabezados que a veces quedan mezclados en los datos (fila de título
  // repetida, con o sin tilde) — se ignoran como si fueran un patrón o
  // músculo más.
  const ENCABEZADOS_IGNORADOS = ["categoría", "categoria", "músculo", "musculo"];

  for (let i = 0; i < datos.length; i++) {

    const fila = datos[i];
    let categoria = String(fila[1] || "").trim();
    let musculo = String(fila[2] || "").trim();
    const ejercicio = String(fila[3] || "").trim();
    const link = String(fila[4] || "").trim();

    if (ENCABEZADOS_IGNORADOS.indexOf(categoria.toLowerCase()) !== -1) categoria = "";
    if (ENCABEZADOS_IGNORADOS.indexOf(musculo.toLowerCase()) !== -1) musculo = "";

    if (!ejercicio) continue;

    if (categoria) {
      patronesSet[categoria] = true;
      if (!porPatronSet[categoria]) porPatronSet[categoria] = {};
      porPatronSet[categoria][ejercicio] = true;
    }

    if (musculo) {
      musculosSet[musculo] = true;
      if (!porMusculoSet[musculo]) porMusculoSet[musculo] = {};
      porMusculoSet[musculo][ejercicio] = true;
    }

    if (link && !videosPorEjercicio[ejercicio]) {
      videosPorEjercicio[ejercicio] = link;
    }
  }

  const ordenar = arr => arr.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  const clavesOrdenadas = obj => ordenar(Object.keys(obj));

  const ejerciciosPorPatron = {};
  Object.keys(porPatronSet).forEach(k => {
    ejerciciosPorPatron[k] = clavesOrdenadas(porPatronSet[k]);
  });

  const ejerciciosPorMusculo = {};
  Object.keys(porMusculoSet).forEach(k => {
    ejerciciosPorMusculo[k] = clavesOrdenadas(porMusculoSet[k]);
  });

  const resultado = {
    patrones: clavesOrdenadas(patronesSet),
    musculos: clavesOrdenadas(musculosSet),
    ejerciciosPorPatron: ejerciciosPorPatron,
    ejerciciosPorMusculo: ejerciciosPorMusculo,
    videosPorEjercicio: videosPorEjercicio,
  };

  // EjerciciosConsolidado cambia poco, así que el caché dura media hora.
  // Si el catálogo no entra en el límite de 100KB por valor de
  // CacheService, sigue funcionando igual, simplemente sin cachear.
  const json = JSON.stringify(resultado);
  if (json.length < 100000) {
    cache.put(cacheKey, json, 1800);
  }

  return resultado;
}

function manejarCrearAlumno(ss, datos) {

  const nombreAlumno = String(datos.nombreAlumno || "").trim();
  const tipoPlan = String(datos.tipoPlan || "").trim();

  if (!nombreAlumno) throw new Error("Falta el nombre del alumno.");

  if (tipoPlan !== "Musculo" && tipoPlan !== "Patrones") {
    throw new Error('El tipo de plan debe ser "Musculo" o "Patrones".');
  }

  const resultado = crearHojaRutina(ss, nombreAlumno, tipoPlan);

  return { id: resultado.id, alumno: nombreAlumno, tipoPlan: tipoPlan, hoja: resultado.nombreHoja };
}

function manejarActualizarAlumno(ss, datos) {

  const id = String(datos.id || "").trim();
  if (!id) throw new Error("Falta el id.");

  const hoja = buscarAlumno(id, ss);
  if (!hoja) throw new Error("No se encontró esa rutina.");

  if (typeof datos.nombreAlumno === "string" && datos.nombreAlumno.trim()) {
    hoja.getRange("B2").setValue(datos.nombreAlumno.trim());
  }

  if (datos.tipoPlan === "Musculo" || datos.tipoPlan === "Patrones") {
    hoja.getRange("B4").setValue(datos.tipoPlan);
  }

  invalidarIndiceAlumnos();
  invalidarListaAlumnos();
  invalidarRutinaCache(id);
  actualizarDashboard();
}

function manejarEliminarAlumno(ss, datos) {

  const id = String(datos.id || "").trim();
  if (!id) throw new Error("Falta el id.");

  const hoja = buscarAlumno(id, ss);
  if (!hoja) throw new Error("No se encontró esa rutina.");

  ss.deleteSheet(hoja);

  invalidarIndiceAlumnos();
  invalidarListaAlumnos();
  invalidarRutinaCache(id);
  actualizarDashboard();
}

function manejarGuardarDia(ss, datos) {

  const id = String(datos.id || "").trim();
  const diaNombre = String(datos.diaNombre || "").trim();
  const ejercicios = Array.isArray(datos.ejercicios) ? datos.ejercicios : null;

  if (!id) throw new Error("Falta el id.");
  if (!diaNombre) throw new Error("Falta el día.");
  if (!ejercicios) throw new Error("Falta la lista de ejercicios.");

  const hoja = buscarAlumno(id, ss);
  if (!hoja) throw new Error("No se encontró esa rutina.");

  const bloque = ubicarBloqueDia(hoja, diaNombre);
  if (!bloque) throw new Error(`No se encontró el día "${diaNombre}" en esta rutina.`);

  const capacidad = bloque.filaFin - bloque.filaDatosInicio + 1;

  if (!bloque.esUltimoBloque && ejercicios.length > capacidad) {
    throw new Error(
      `Ese día tiene lugar para ${capacidad} ejercicios como máximo ahora mismo. ` +
      `Agregá filas manualmente en la hoja entre este día y el siguiente, o sacá algún ejercicio.`
    );
  }

  const filaFinReal = bloque.esUltimoBloque
    ? Math.max(bloque.filaFin, bloque.filaDatosInicio + ejercicios.length - 1)
    : bloque.filaFin;

  const totalFilas = filaFinReal - bloque.filaDatosInicio + 1;

  if (totalFilas > 0) {

    const rango = hoja.getRange(bloque.filaDatosInicio, 1, totalFilas, 8);
    rango.clearContent();
    rango.clearDataValidations(); // si no, Sheets rechaza el valor nuevo por la
                                   // validación vieja que dejó filterPatterns
    rango.setBackground("#ffffff");

    if (ejercicios.length > 0) {

      const filas = ejercicios.map(ex => [
        String(ex.patron || ""),
        String(ex.ejercicio || ""),
        String(ex.series || ""),
        String(ex.repeticiones || ""),
        String(ex.intensidad || ""),
        String(ex.pausas || ""),
        String(ex.notas || ""),
        String(ex.video || ""),
      ]);

      const rangoDatos = hoja.getRange(bloque.filaDatosInicio, 1, ejercicios.length, 8);
      rangoDatos.setValues(filas);

      const fondos = ejercicios.map(ex => {
        const color = (ex.grupo && /^#[0-9a-f]{6}$/i.test(ex.grupo)) ? ex.grupo : "#ffffff";
        return [color, color, color, color, color, color, color, color];
      });
      rangoDatos.setBackgrounds(fondos);
    }
  }

  invalidarRutinaCache(id);
  aplicarValidacionColumnaA(ss, hoja);
}

// Ubica, sin modificar nada, el rango de filas de datos de un día: desde
// la fila siguiente a su encabezado hasta la fila anterior a la etiqueta
// del día siguiente (o "esUltimoBloque: true" si no hay uno después).
function ubicarBloqueDia(hoja, diaNombre) {

  const lastRow = Math.max(hoja.getLastRow(), 1);
  const valores = hoja.getRange(1, 1, lastRow, 2).getValues();

  const bloques = [];

  for (let r = 0; r < valores.length; r++) {
    const colA = String(valores[r][0] || "").trim();
    const colB = String(valores[r][1] || "").trim();
    const etiqueta = DAY_REGEX.test(colA) ? colA : (DAY_REGEX.test(colB) ? colB : null);
    if (etiqueta) bloques.push({ nombre: etiqueta, filaEtiqueta: r + 1 });
  }

  const idx = bloques.findIndex(b => b.nombre === diaNombre);
  if (idx === -1) return null;

  const esUltimoBloque = idx === bloques.length - 1;
  const filaDatosInicio = bloques[idx].filaEtiqueta + 2;
  const filaFin = esUltimoBloque
    ? Math.max(lastRow, filaDatosInicio - 1)
    : bloques[idx + 1].filaEtiqueta - 1;

  return {
    filaDatosInicio: filaDatosInicio,
    filaFin: Math.max(filaFin, filaDatosInicio - 1),
    esUltimoBloque: esUltimoBloque,
  };
}

function invalidarRutinaCache(id) {
  CacheService.getScriptCache().remove("rutina_" + id);
}
