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
 *  2) API para el frontend (Next.js):
 *     - doGet(e): Web App que devuelve la rutina de un alumno en JSON.
 *
 * Contrato del Web App:
 *   GET {WEB_APP_URL}?id=<valor de la celda B2 del alumno>
 *   -> 200 { alumno, tipoPlan, dias: [{ nombre, ejercicios: [...] }] }
 *   -> 200 { error: "not_found" | "missing_id" }
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

function buscarAlumno(id, ss) {

  const hojas = ss.getSheets();

  for (const hoja of hojas) {

    const codigo = hoja.getRange("B2").getValue();

    if (codigo && String(codigo).trim() === String(id).trim()) {
      return hoja;
    }
  }

  return null;
}

function construirRutina(hoja) {

  const alumno = String(hoja.getRange("B2").getValue() || "").trim();
  const tipoPlan = String(hoja.getRange("B4").getValue() || "").trim();

  const lastRow = hoja.getLastRow();
  if (lastRow < 1) {
    return { alumno: alumno, tipoPlan: tipoPlan, dias: [] };
  }

  const valores = hoja.getRange(1, 1, lastRow, 8).getValues();

  const dias = [];
  let diaActual = null;

  for (let r = 0; r < valores.length; r++) {

    const fila = valores[r];
    const filaNumero = r + 1;
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

    diaActual.ejercicios.push({
      patron: colA,
      ejercicio: colB,
      series: formatearValor(fila[2]),
      repeticiones: formatearValor(fila[3]),
      intensidad: formatearValor(fila[4]),
      pausas: formatearValor(fila[5]),
      notas: String(fila[6] || "").trim(),
      video: extraerLinkVideo(hoja, filaNumero, 8),
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

function extraerLinkVideo(hoja, fila, columna) {

  const celda = hoja.getRange(fila, columna);

  // El link se escribe como =HYPERLINK("url","🎥 Ver Video") desde filterPatterns
  const formula = celda.getFormula();
  if (formula) {
    const match = formula.match(/HYPERLINK\(\s*"([^"]+)"/i);
    if (match) return match[1];
  }

  const richText = celda.getRichTextValue();
  if (richText) {
    const url = richText.getLinkUrl();
    if (url) return url;
  }

  const raw = String(celda.getValue() || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  return "";
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
