/**
 * Focus Entrena — Apps Script
 *
 * Este archivo va pegado en el editor de Apps Script del Google Sheet
 * (Extensiones > Apps Script), reemplazando Code.gs por completo.
 *
 * Contiene dos partes:
 *  1) Automatización del lado del entrenador (ya existente):
 *     - filterPatterns(e): trigger onEdit que arma los desplegables de
 *       Patrón/Músculo (col. A) y Ejercicio (col. B), y auto-completa el
 *       link de video (col. H) buscando en "EjerciciosConsolidado".
 *     - configurarColumnaA(): arma la lista de valores permitidos en A8:A1000.
 *     - crearNuevaRutina(): duplica "Template Rutina", pide el nombre del
 *       alumno, lo pone en B2, genera un id único (slug) en E2 y nombra la
 *       pestaña "<nombre> - Rutina".
 *     - actualizarDashboard() / actualizarDashboardUnicavez(): arman la hoja
 *       "Dashboard" con el listado de alumnos, accesos directos y un
 *       checkbox por fila para marcar qué rutina borrar.
 *     - eliminarRutinasMarcadas(): borra las hojas tildadas en el Dashboard
 *       (pide confirmación antes de borrar).
 *  2) API para el frontend (Next.js):
 *     - doGet(e): Web App que devuelve la rutina de un alumno en JSON.
 *
 * Contrato del Web App:
 *   GET {WEB_APP_URL}?id=<valor de la celda E2 del alumno>
 *   -> 200 { alumno, tipoPlan, dias: [{ nombre, ejercicios: [...] }] }
 *   -> 200 { error: "not_found" | "missing_id" }
 * Cada ejercicio incluye "grupo": el color de fondo de la fila (hex) si el
 * entrenador coloreó ese bloque para indicar ejercicios a combinar en la
 * misma serie, o "" si la fila no tiene color.
 *
 * Rendimiento: construirRutina() lee valores/fórmulas/rich text/colores en
 * bloque (unas pocas llamadas totales) en vez de una por fila, y
 * buscarAlumno() cachea 5 min el índice id -> hoja (CacheService) para no
 * recorrer todas las pestañas en cada visita. El índice se invalida solo
 * al crear o borrar una rutina.
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
  const hoja = ss.getActiveSheet();
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

  const template = ss.getSheetByName("Template Rutina");

  if (!template) {
    SpreadsheetApp.getUi().alert(
      'No existe la hoja "Template Rutina"'
    );
    return;
  }

  const respuesta = SpreadsheetApp.getUi().prompt(
    "Nueva Rutina",
    "Ingrese el nombre del alumno:",
    SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
  );

  if (
    respuesta.getSelectedButton() !==
    SpreadsheetApp.getUi().Button.OK
  ) {
    return;
  }

  const nombreAlumno =
    respuesta.getResponseText().trim();

  if (!nombreAlumno) {
    SpreadsheetApp.getUi().alert(
      "Debe ingresar un nombre."
    );
    return;
  }

  const nombreHoja =
    `${nombreAlumno} - Rutina`;

  if (ss.getSheetByName(nombreHoja)) {
    SpreadsheetApp.getUi().alert(
      "Esa rutina ya existe."
    );
    return;
  }

  const nuevaHoja = template.copyTo(ss);

  nuevaHoja.setName(nombreHoja);

  nuevaHoja.getRange("B2")
    .setValue(nombreAlumno);

  nuevaHoja.getRange("E2")
    .setValue(generarIdUnico(ss, nombreAlumno));

  ss.setActiveSheet(nuevaHoja);

  invalidarIndiceAlumnos();
  actualizarDashboard();

}

function generarIdUnico(ss, nombre) {

  const base = slugify(nombre);

  const existentes = ss.getSheets()
    .map(h => String(h.getRange("E2").getValue() || "").trim())
    .filter(String);

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

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const hoja = buscarAlumno(id, ss);

  if (!hoja) {
    return jsonResponse({ error: "not_found" });
  }

  const rutina = construirRutina(hoja);
  return jsonResponse(rutina);
}

// El índice id -> nombre de hoja se cachea 5 minutos para no tener que
// recorrer todas las pestañas (una llamada a la API por cada una) en cada
// visita. crearNuevaRutina() y eliminarRutinasMarcadas() invalidan el
// caché al tocar la lista de alumnos, así que nunca queda desactualizado
// más de un momento.
function buscarAlumno(id, ss) {

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

  const nombreHoja = indice[String(id).trim()];
  return nombreHoja ? ss.getSheetByName(nombreHoja) : null;
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
