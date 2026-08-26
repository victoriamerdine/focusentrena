/**
 * Focus Entrena — API de rutinas
 *
 * Este script debe adjuntarse al Google Sheet "PLAN MUSCULOS Y PATRONES"
 * (Extensiones > Apps Script) y publicarse como Web App (ver README.md).
 *
 * Contrato:
 *   GET {WEB_APP_URL}?id=<slug-de-la-hoja>
 *   -> 200 { alumno, tipoPlan, dias: [{ nombre, ejercicios: [...] }] }
 *   -> 200 { error: "not_found" | "missing_id" }
 *
 * El "id" es el nombre de la pestaña pasado por slugify(). Cualquier hoja
 * nueva creada a partir de "Template Rutina" queda disponible automáticamente,
 * sin tocar este script.
 */

var DAY_REGEX = /^d[ií]a\s*\d+/i;
var IGNORED_SHEETS = ["template rutina"];

function doGet(e) {
  var id = e && e.parameter ? e.parameter.id : null;

  if (!id) {
    return jsonResponse({ error: "missing_id" });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findSheetBySlug(ss, id);

  if (!sheet) {
    return jsonResponse({ error: "not_found" });
  }

  var routine = parseRoutine(sheet);
  return jsonResponse(routine);
}

function findSheetBySlug(ss, id) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (IGNORED_SHEETS.indexOf(name.toLowerCase().trim()) !== -1) continue;
    if (slugify(name) === id) return sheets[i];
  }
  return null;
}

function parseRoutine(sheet) {
  var alumno = String(sheet.getRange("B2").getValue() || "").trim();
  if (!alumno) alumno = humanizeSheetName(sheet.getName());

  var tipoPlan = String(sheet.getRange("B4").getValue() || "").trim();

  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 8);
  if (lastRow < 1) {
    return { alumno: alumno, tipoPlan: tipoPlan, dias: [] };
  }

  var values = sheet.getRange(1, 1, lastRow, Math.min(lastCol, 8)).getValues();
  var dias = [];
  var currentDay = null;

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var rowNumber = r + 1;
    var colA = String(row[0] || "").trim();
    var colB = String(row[1] || "").trim();

    var dayLabel = matchDayLabel(colA) || matchDayLabel(colB);

    if (dayLabel) {
      currentDay = { nombre: dayLabel, ejercicios: [] };
      dias.push(currentDay);
      continue; // la fila siguiente son los encabezados de columna, se saltea sola
    }

    if (!currentDay) continue;
    if (isHeaderRow(row)) continue;
    if (isRowEmpty(row)) continue;

    currentDay.ejercicios.push({
      patron: String(row[0] || "").trim(),
      ejercicio: String(row[1] || "").trim(),
      series: formatValue(row[2]),
      repeticiones: formatValue(row[3]),
      intensidad: formatValue(row[4]),
      pausas: formatValue(row[5]),
      notas: String(row[6] || "").trim(),
      video: extractVideoLink(sheet, rowNumber, 8),
    });
  }

  return { alumno: alumno, tipoPlan: tipoPlan, dias: dias };
}

function matchDayLabel(text) {
  if (text && DAY_REGEX.test(text)) return text;
  return null;
}

function isHeaderRow(row) {
  var b = String(row[1] || "").trim().toLowerCase();
  var c = String(row[2] || "").trim().toLowerCase();
  return b === "ejercicio" || c === "series";
}

function isRowEmpty(row) {
  for (var i = 0; i < row.length; i++) {
    if (String(row[i] || "").trim() !== "") return false;
  }
  return true;
}

function formatValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (value instanceof Date) return value.toString();
  return String(value).trim();
}

function extractVideoLink(sheet, rowNumber, colNumber) {
  var cell = sheet.getRange(rowNumber, colNumber);

  var richText = cell.getRichTextValue();
  if (richText) {
    var runs = richText.getRuns();
    for (var i = 0; i < runs.length; i++) {
      var url = runs[i].getLinkUrl();
      if (url) return url;
    }
    var wholeUrl = richText.getLinkUrl();
    if (wholeUrl) return wholeUrl;
  }

  var formula = cell.getFormula();
  if (formula) {
    var match = formula.match(/HYPERLINK\(\s*"([^"]+)"/i);
    if (match) return match[1];
  }

  var raw = String(cell.getValue() || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  return "";
}

function humanizeSheetName(name) {
  return name
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
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

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
