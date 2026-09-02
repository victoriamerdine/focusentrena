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
 * Cada ejercicio incluye "agrupador" (columna I, un texto/número libre que
 * pone el entrenador) y "grupo": un color (hex) calculado en el servidor
 * a partir del agrupador — mismo agrupador dentro de un día = mismo
 * color, "" si no tiene agrupador. El frontend de alumnos usa "grupo"
 * para mostrar "combinar en la misma serie"; el panel del entrenador usa
 * "agrupador" para el campo editable.
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

// Paleta de colores para agrupar ejercicios "a combinar en la misma serie".
// Ya no se lee/escribe el color de fondo de la celda (era frágil: se
// perdía fácil al crear/editar por API) — el color se calcula acá mismo,
// en el servidor, a partir del número que el entrenador pone en la
// columna "Agrupador". Mismo número dentro de un día = mismo color.
var PALETA_GRUPOS = ["#bfbfbf", "#ffe599", "#b6d7a8", "#f4cccc", "#a4c2f4", "#ffc000"];

// Toda hoja de plan (la de un alumno, o el template) tiene "Rutina" en el
// nombre — las de alumno se crean siempre como "<nombre> - Rutina" (ver
// crearHojaRutinaDesde). Filtrar así, en vez de mantener a mano una lista
// de hojas a EXCLUIR, es más robusto (cualquier hoja vieja/suelta que se
// haya ido acumulando en la planilla se ignora sola, sin acordarse de
// agregarla a ninguna lista) y más rápido: manejarListarAlumnos() antes
// leía una hoja por cada pestaña no excluida — con muchas hojas sueltas
// ajenas a los planes, esas lecturas de más eran pura pérdida de tiempo
// en cada carga del panel.
function esHojaDePlan(hoja) {
  return hoja.getName().includes("Rutina");
}

// Igual que esHojaDePlan(), pero sin el template — para todo lo que solo
// debe tocar hojas de alumnos reales.
function esHojaDeAlumno(hoja) {
  return esHojaDePlan(hoja) && hoja.getName() !== "Template Rutina";
}

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

// Migración one-off: escribe el encabezado "Agrupador" en la columna I de
// cada bloque de día (misma fila que "Patrón/Músculo"/"Ejercicio"), en
// "Template Rutina" y en todas las hojas de alumnos existentes. No pisa
// nada que ya esté escrito ahí. Correr una sola vez desde el editor
// (▶ Run) después de pegar esta versión del código — no usa getUi(), así
// que anda bien ejecutada directo desde el editor (Ver → Registros para
// confirmar cuántas hojas tocó).
function agregarEncabezadosAgrupador() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let hojasActualizadas = 0;

  ss.getSheets().forEach(hoja => {

    if (!esHojaDePlan(hoja)) return;

    const lastRow = hoja.getLastRow();
    if (lastRow < 1) return;

    const valores = hoja.getRange(1, 1, lastRow, 2).getValues();
    let tocada = false;

    for (let r = 0; r < valores.length; r++) {
      const colA = String(valores[r][0] || "").trim();
      const colB = String(valores[r][1] || "").trim();
      const esEtiquetaDia = DAY_REGEX.test(colA) || DAY_REGEX.test(colB);
      if (!esEtiquetaDia) continue;

      const filaEncabezado = r + 2; // la fila siguiente a la etiqueta del día
      const celda = hoja.getRange(filaEncabezado, 9); // columna I
      if (String(celda.getValue() || "").trim()) continue; // ya tiene algo, no se pisa

      celda.setValue("Agrupador");
      tocada = true;
    }

    if (tocada) hojasActualizadas++;
  });

  Logger.log(`Listo. Se agregó el encabezado "Agrupador" en ${hojasActualizadas} hoja(s).`);
}

// Mismo mecanismo que agregarEncabezadosAgrupador() pero para las columnas
// J (Nota Alumno) y K (Carga) — las agregó Vicky a mano en "Template
// Rutina", así que acá solo hace falta backfillearlas en las hojas de
// alumnos que ya existían antes de esas columnas. Correr una sola vez
// desde el editor (▶ Run) — es seguro correrla de nuevo, no pisa nada que
// ya tenga contenido.
function agregarEncabezadosNotasCarga() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let hojasActualizadas = 0;

  ss.getSheets().forEach(hoja => {

    if (!esHojaDePlan(hoja)) return;

    const lastRow = hoja.getLastRow();
    if (lastRow < 1) return;

    const valores = hoja.getRange(1, 1, lastRow, 2).getValues();
    let tocada = false;

    for (let r = 0; r < valores.length; r++) {
      const colA = String(valores[r][0] || "").trim();
      const colB = String(valores[r][1] || "").trim();
      const esEtiquetaDia = DAY_REGEX.test(colA) || DAY_REGEX.test(colB);
      if (!esEtiquetaDia) continue;

      const filaEncabezado = r + 2; // la fila siguiente a la etiqueta del día
      const celdaNota = hoja.getRange(filaEncabezado, 10); // columna J
      const celdaCarga = hoja.getRange(filaEncabezado, 11); // columna K

      if (!String(celdaNota.getValue() || "").trim()) {
        celdaNota.setValue("Nota Alumno");
        tocada = true;
      }
      if (!String(celdaCarga.getValue() || "").trim()) {
        celdaCarga.setValue("Carga");
        tocada = true;
      }
    }

    if (tocada) hojasActualizadas++;
  });

  Logger.log(`Listo. Se agregaron los encabezados "Nota Alumno"/"Carga" en ${hojasActualizadas} hoja(s).`);
}

// Configura el formato condicional de "Template Rutina" y de todas las
// hojas de alumnos existentes: pinta cada fila según el número que tenga
// en la columna Agrupador (I), con los mismos colores exactos que usa la
// app (PALETA_GRUPOS / colorParaAgrupador), así el Sheet se ve igual que
// la web. Al estar en "Template Rutina", cualquier alumno nuevo lo hereda
// solo (copyTo() copia el formato condicional). Correr una sola vez desde
// el editor (▶ Run) — es seguro correrla de nuevo, no duplica reglas.
function aplicarFormatoCondicionalAgrupador() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const RANGO_A1 = "A8:I1000";

  let hojasActualizadas = 0;

  ss.getSheets().forEach(hoja => {

    if (!esHojaDePlan(hoja)) return;

    const rango = hoja.getRange(RANGO_A1);

    // saca las reglas que hayamos puesto nosotros antes en este mismo
    // rango exacto (para poder correr esta función de nuevo sin duplicar),
    // dejando intacta cualquier otra regla de formato condicional que ya
    // exista en la hoja por otro motivo.
    const reglasPrevias = hoja.getConditionalFormatRules().filter(regla => {
      const rangos = regla.getRanges();
      return !(rangos.length === 1 && rangos[0].getA1Notation() === RANGO_A1);
    });

    const reglasNuevas = PALETA_GRUPOS.map((color, i) => {
      const valor = i + 1;
      return SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=$I8=${valor}`)
        .setBackground(color)
        .setRanges([rango])
        .build();
    });

    hoja.setConditionalFormatRules(reglasPrevias.concat(reglasNuevas));
    hojasActualizadas++;
  });

  Logger.log(`Listo. Formato condicional de Agrupador configurado en ${hojasActualizadas} hoja(s).`);
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

  const resultado = crearHojaRutinaDesde(ss, template, nombreAlumno);

  if (tipoPlan) {
    resultado.hoja.getRange("B4").setValue(tipoPlan);
  }

  return resultado;
}

// Clona cualquier hoja de rutina (el template, o la de un alumno existente
// — ver duplicarHojaRutina) hacia una nueva con nombre/id propios. copyTo()
// trae todo el contenido, formato condicional y validaciones de datos tal
// cual estén en la hoja de origen.
function crearHojaRutinaDesde(ss, hojaOrigen, nombreAlumno) {

  const nombreHoja = `${nombreAlumno} - Rutina`;

  if (ss.getSheetByName(nombreHoja)) {
    throw new Error("Esa rutina ya existe.");
  }

  const nuevaHoja = hojaOrigen.copyTo(ss);

  nuevaHoja.setName(nombreHoja);

  nuevaHoja.getRange("B2").setValue(nombreAlumno);

  const id = generarIdUnico(ss, nombreAlumno);
  nuevaHoja.getRange("E2").setValue(id);

  // Fecha de creación, para saber cuándo toca renovar el plan — arranca de
  // cero incluso al duplicar (es un plan nuevo, con su propio ciclo de
  // renovación de 30 días).
  nuevaHoja.getRange("E4").setValue(new Date());

  invalidarIndiceAlumnos();
  invalidarListaAlumnos();
  actualizarDashboard();

  return { hoja: nuevaHoja, id: id, nombreHoja: nombreHoja };
}

// Duplica el plan de un alumno existente hacia uno nuevo, con el nombre
// que elija el entrenador — mismos días/ejercicios/agrupadores, pero sin
// arrastrar la carga/notas personales del alumno original (no tienen
// sentido en un plan nuevo, sea para otro alumno o para renovarle a este).
function duplicarHojaRutina(ss, idOrigen, nombreNuevo) {

  const hojaOrigen = buscarAlumno(idOrigen, ss);
  if (!hojaOrigen) {
    throw new Error("No se encontró el plan a duplicar.");
  }

  const resultado = crearHojaRutinaDesde(ss, hojaOrigen, nombreNuevo);
  limpiarNotasAlumno(resultado.hoja);

  return resultado;
}

// Vacía las columnas J (Nota Alumno) y K (Carga) solo en las filas de
// datos de cada día — deja los encabezados ("Nota Alumno"/"Carga", justo
// debajo de la etiqueta de cada día) intactos. Misma detección de bloques
// de día que ubicarBloqueDia(), pero para todos los días de una hoja de
// una sola pasada en vez de uno a la vez.
function limpiarNotasAlumno(hoja) {

  const lastRow = hoja.getLastRow();
  if (lastRow < 1) return;

  const valores = hoja.getRange(1, 1, lastRow, 2).getValues();
  const filasEtiqueta = [];

  for (let r = 0; r < valores.length; r++) {
    const colA = String(valores[r][0] || "").trim();
    const colB = String(valores[r][1] || "").trim();
    if (DAY_REGEX.test(colA) || DAY_REGEX.test(colB)) filasEtiqueta.push(r + 1);
  }

  filasEtiqueta.forEach((filaEtiqueta, i) => {
    const filaDatosInicio = filaEtiqueta + 2;
    const filaFin = i === filasEtiqueta.length - 1 ? lastRow : filasEtiqueta[i + 1] - 1;
    if (filaFin >= filaDatosInicio) {
      hoja.getRange(filaDatosInicio, 10, filaFin - filaDatosInicio + 1, 2).clearContent();
    }
  });
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
    .filter(esHojaDeAlumno)
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

  const filas = [];

  ss.getSheets()
    .filter(esHojaDeAlumno)
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

// CacheService no acepta valores de más de 100KB por clave. Hasta ahora,
// cuando un JSON cacheable (catálogo, listado de alumnos, rutina de un
// alumno con muchos días) superaba ese límite, el chequeo `if (json.length
// < 100000)` simplemente NO cacheaba nada — sin error, sin aviso — y esa
// respuesta se recalculaba de cero en CADA visita al panel, todo el
// tiempo. Con ~1400 filas en EjerciciosConsolidado esto es un sospechoso
// directo de la lentitud del panel: si el catálogo creció más allá de
// 100KB en algún momento, el caché de 30 minutos dejó de servir de nada.
// Estas dos funciones parten el JSON en pedazos de <100KB y los guardan
// bajo claves numeradas (clave_n = cantidad de pedazos, clave_0, clave_1,
// ...), así el caché funciona sin importar el tamaño.
function cachePutGrande(cache, key, value, ttlSegundos) {
  const TAMANO_PEDAZO = 90000; // margen bajo el límite de 100KB
  const pedazos = [];
  for (let i = 0; i < value.length; i += TAMANO_PEDAZO) {
    pedazos.push(value.slice(i, i + TAMANO_PEDAZO));
  }
  // put() uno por uno (no putAll) para no depender de si CacheService le
  // pone además un límite propio al tamaño total de un solo putAll().
  cache.put(key + "_n", String(pedazos.length), ttlSegundos);
  pedazos.forEach((p, i) => cache.put(key + "_" + i, p, ttlSegundos));
}

function cacheGetGrande(cache, key) {
  const n = Number(cache.get(key + "_n"));
  if (!n) return null;
  let texto = "";
  for (let i = 0; i < n; i++) {
    const pedazo = cache.get(key + "_" + i);
    if (pedazo == null) return null; // falta un pedazo (venció desalineado) => cache miss
    texto += pedazo;
  }
  return texto;
}

function cacheRemoveGrande(cache, key) {
  const n = Number(cache.get(key + "_n"));
  if (!n) return;
  const claves = [key + "_n"];
  for (let i = 0; i < n; i++) claves.push(key + "_" + i);
  cache.removeAll(claves);
}

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
  const cacheado = cacheGetGrande(cache, cacheKey);

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

  cachePutGrande(cache, cacheKey, json, 90);

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
  cacheRemoveGrande(CacheService.getScriptCache(), "lista_alumnos_v1");
}

// Vacía a mano todos los cachés del panel del entrenador (índice de
// alumnos, lista de alumnos y catálogo de ejercicios). Normalmente no
// hace falta — se invalidan solos al crear/editar/borrar un alumno — pero
// es útil después de cambiar la lógica que arma alguno de ellos (por
// ejemplo el catálogo), para ver el resultado nuevo al toque en vez de
// esperar a que venza el caché viejo. Correr desde el editor (▶ Run),
// no hace falta contexto de UI.
function limpiarCacheEntrenador() {
  const cache = CacheService.getScriptCache();
  cache.remove("indice_alumnos_v1");
  cacheRemoveGrande(cache, "lista_alumnos_v1");
  cacheRemoveGrande(cache, "catalogo_v1");
}

// B2, E2, B4 y E4 en una sola lectura (antes eran hasta 4 llamadas
// separadas a la API de Sheets) — lo comparten construirRutina() y
// manejarListarAlumnos().
function leerEncabezadoHoja(hoja) {
  const bloque = hoja.getRange(2, 1, 3, 5).getValues();
  const alumno = String(bloque[0][1] || "").trim(); // B2
  const id = String(bloque[0][4] || "").trim(); // E2
  const tipoPlan = String(bloque[2][1] || "").trim(); // B4
  const fechaValor = bloque[2][4]; // E4
  const fechaCreacion = fechaValor instanceof Date
    ? Utilities.formatDate(fechaValor, Session.getScriptTimeZone(), "yyyy-MM-dd")
    : "";
  return { alumno: alumno, id: id, tipoPlan: tipoPlan, fechaCreacion: fechaCreacion };
}

function construirRutina(hoja) {

  const encabezado = leerEncabezadoHoja(hoja);
  const alumno = encabezado.alumno;
  const tipoPlan = encabezado.tipoPlan;
  const fechaCreacion = encabezado.fechaCreacion;

  const lastRow = hoja.getLastRow();
  if (lastRow < 1) {
    return { alumno: alumno, tipoPlan: tipoPlan, fechaCreacion: fechaCreacion, dias: [] };
  }

  // Se leen los datos, fórmulas y texto enriquecido en bloque (3 llamadas
  // totales) en vez de una llamada por fila — con rutinas de 20-30 filas
  // esto es la diferencia entre ~3 y ~100 llamadas a la API. Columna I =
  // Agrupador (ver PALETA_GRUPOS más arriba); J = Nota Alumno, K = Carga
  // (las llena el alumno desde su vista, ver manejarGuardarNotaAlumno).
  // También se lee el color de fondo de la columna A: es retrocompatibilidad
  // con rutinas viejas que agrupaban pintando la fila a mano, antes de que
  // existiera la columna Agrupador (ver aplicarRetrocompatibilidadDeGrupos).
  const rango = hoja.getRange(1, 1, lastRow, 11);
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
    // La fila se considera vacía en base a A-I solamente: una nota/carga
    // vieja que haya quedado huérfana en J/K (por ejemplo, un ejercicio que
    // se borró) no debe hacer aparecer una fila fantasma.
    if (esFilaVacia(fila.slice(0, 9))) continue;

    const colorFondo = coloresColA[r][0];
    const colorLegado = (!colorFondo || colorFondo.toLowerCase() === "#ffffff") ? "" : colorFondo;

    diaActual.ejercicios.push({
      // Posición dentro de los ejercicios de este día (0-based) — la usa el
      // alumno para guardar su nota/carga en la fila correcta, sin exponer
      // el número de fila real de la hoja.
      indice: diaActual.ejercicios.length,
      patron: colA,
      ejercicio: colB,
      series: formatearValor(fila[2]),
      repeticiones: formatearValor(fila[3]),
      intensidad: formatearValor(fila[4]),
      pausas: formatearValor(fila[5]),
      notas: String(fila[6] || "").trim(),
      video: extraerLinkVideoDeCelda(fila[7], formulas[r][7], richTexts[r][7]),
      agrupador: formatearValor(fila[8]),
      grupo: "", // lo completa aplicarRetrocompatibilidadDeGrupos() más abajo
      notaAlumno: String(fila[9] || "").trim(),
      carga: formatearValor(fila[10]),
      _colorLegado: colorLegado, // temporal, no queda en la respuesta final
    });
  }

  aplicarRetrocompatibilidadDeGrupos(dias);

  return { alumno: alumno, tipoPlan: tipoPlan, fechaCreacion: fechaCreacion, dias: dias };
}

// Dentro de cada día:
//  - si el ejercicio tiene "agrupador" (columna I), su color sale de
//    PALETA_GRUPOS según el número (ver colorParaAgrupador).
//  - si NO tiene agrupador pero la fila todavía tiene un color de fondo
//    de cuando se agrupaba a mano (antes de que existiera la columna
//    Agrupador), se sigue mostrando agrupado con ESE color tal cual —
//    y además se le precarga un número de agrupador "de mentira" (que no
//    choca con ningún agrupador real que ya exista en el día) para que
//    el panel del entrenador lo muestre ya cargado; si el entrenador
//    guarda ese día sin tocar nada más, ese número queda escrito de
//    verdad en la columna Agrupador y la fila queda migrada.
function aplicarRetrocompatibilidadDeGrupos(dias) {
  dias.forEach(dia => {

    const usados = {};
    dia.ejercicios.forEach(ex => {
      const n = parseInt(String(ex.agrupador || "").trim(), 10);
      if (!isNaN(n) && n > 0) usados[n] = true;
    });

    let candidato = 1;
    function siguienteDisponible() {
      while (usados[candidato]) candidato++;
      usados[candidato] = true;
      return candidato;
    }

    const numeroPorColorLegado = {};

    dia.ejercicios.forEach(ex => {

      if (ex.agrupador) {
        ex.grupo = colorParaAgrupador(ex.agrupador);
        delete ex._colorLegado;
        return;
      }

      if (ex._colorLegado) {
        if (!(ex._colorLegado in numeroPorColorLegado)) {
          numeroPorColorLegado[ex._colorLegado] = siguienteDisponible();
        }
        ex.agrupador = String(numeroPorColorLegado[ex._colorLegado]);
        ex.grupo = ex._colorLegado; // se ve igual que antes hasta que se guarde
      }

      delete ex._colorLegado;
    });
  });
}

// El número de agrupador mapea siempre al mismo color de PALETA_GRUPOS
// (1 -> primer color, 2 -> segundo, etc., y vuelve a empezar si hay más
// grupos que colores). Así el color que ve el alumno en la web es
// exactamente el mismo que pinta la regla de formato condicional del
// Sheet (ver aplicarFormatoCondicionalAgrupador) — no depende de en qué
// orden aparecen los números dentro del día.
function colorParaAgrupador(agrupador) {

  const valor = String(agrupador || "").trim();
  if (!valor) return "";

  const numero = parseInt(valor, 10);
  if (!isNaN(numero) && numero > 0) {
    return PALETA_GRUPOS[(numero - 1) % PALETA_GRUPOS.length];
  }

  // Si alguien pone texto en vez de un número, igual le asigna un color
  // estable (siempre el mismo para el mismo texto) en vez de dejarlo sin
  // pintar.
  let hash = 0;
  for (let i = 0; i < valor.length; i++) {
    hash = (hash * 31 + valor.charCodeAt(i)) % PALETA_GRUPOS.length;
  }
  return PALETA_GRUPOS[hash];
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

// Acciones que el alumno puede disparar desde su propia vista, sin la
// contraseña del entrenador (no tiene forma de escribirla). Sólo dejan
// tocar su nota personal y la carga usada — nada que afecte la rutina en
// sí. Mismo modelo de "seguridad" que ya tiene el link de lectura: alcanza
// con conocer el id del alumno, que no es secreto (es el link que se
// comparte).
const ACCIONES_PUBLICAS = ["guardar_nota_alumno"];

function doPost(e) {

  let datos;

  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "bad_request" });
  }

  const esPublica = ACCIONES_PUBLICAS.indexOf(datos.accion) !== -1;

  if (!esPublica && !verificarPassword(datos.password)) {
    return jsonResponse({ error: "unauthorized" });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {

    switch (datos.accion) {

      case "listar_alumnos":
        return jsonResponse({ ok: true, alumnos: manejarListarAlumnos(ss) });

      case "obtener_catalogo":
        return jsonResponse({ ok: true, catalogo: manejarObtenerCatalogo(ss) });

      // Junta listar_alumnos + obtener_catalogo en un solo viaje de ida y
      // vuelta: el panel del entrenador siempre pide los dos juntos al
      // entrar, y cada request a Apps Script tiene un costo fijo de
      // arranque bastante alto — pedir uno solo en vez de dos en paralelo
      // es la mejora más grande para la carga inicial del panel.
      case "cargar_panel":
        return jsonResponse({
          ok: true,
          alumnos: manejarListarAlumnos(ss),
          catalogo: manejarObtenerCatalogo(ss),
        });

      case "crear_alumno":
        return jsonResponse({ ok: true, alumno: manejarCrearAlumno(ss, datos) });

      case "duplicar_alumno":
        return jsonResponse({ ok: true, alumno: manejarDuplicarAlumno(ss, datos) });

      case "actualizar_alumno":
        manejarActualizarAlumno(ss, datos);
        return jsonResponse({ ok: true });

      case "eliminar_alumno":
        manejarEliminarAlumno(ss, datos);
        return jsonResponse({ ok: true });

      case "guardar_dia":
        manejarGuardarDia(ss, datos);
        return jsonResponse({ ok: true });

      case "guardar_nota_alumno":
        manejarGuardarNotaAlumno(ss, datos);
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
  const cacheado = cacheGetGrande(cache, cacheKey);

  if (cacheado) {
    try {
      return JSON.parse(cacheado);
    } catch (e) {
      // sigue de largo y la reconstruye
    }
  }

  const idsUsados = {};

  const resultado = ss.getSheets()
    .filter(esHojaDeAlumno)
    .map(h => {
      // Una sola lectura por hoja (mismo helper que usa construirRutina).
      const encabezado = leerEncabezadoHoja(h);
      let id = encabezado.id;

      // Hoja de plan sin id (se creó o se le cambió el nombre a mano en
      // Sheets, no desde la app) o con un id repetido de otra hoja (se
      // copió la pestaña entera sin pasar por "Duplicar plan"): se le
      // genera uno nuevo acá mismo, a partir del nombre, para que quede
      // utilizable sin que el entrenador tenga que tocar E2 a mano.
      if (!id || idsUsados[id]) {
        const nombreBase = encabezado.alumno || h.getName().replace(/\s*-\s*Rutina\s*$/i, "").trim() || h.getName();
        id = generarIdUnico(ss, nombreBase);
        h.getRange("E2").setValue(id);
        invalidarIndiceAlumnos();
      }

      idsUsados[id] = true;

      return {
        id: id,
        alumno: encabezado.alumno || h.getName(),
        tipoPlan: encabezado.tipoPlan,
        hoja: h.getName(),
        fechaCreacion: encabezado.fechaCreacion,
      };
    })
    .sort((a, b) => a.alumno.localeCompare(b.alumno, "es", { sensitivity: "base" }));

  const json = JSON.stringify(resultado);
  // 3 minutos en vez de 1: el listado no cambia tan seguido como para
  // justificar recalcularlo (una lectura por cada hoja de alumno) en cada
  // visita al panel dentro de una misma sesión de trabajo. Se invalida
  // solo de todos modos al crear/editar/borrar/duplicar un alumno.
  cachePutGrande(cache, cacheKey, json, 180);

  return resultado;
}

function manejarObtenerCatalogo(ss) {

  const cache = CacheService.getScriptCache();
  const cacheKey = "catalogo_v1";
  const cacheado = cacheGetGrande(cache, cacheKey);

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
  // Con ~1400 filas el JSON resultante puede superar fácil los 100KB que
  // acepta CacheService por clave — cachePutGrande() lo parte en pedazos
  // para que el caché siga funcionando sin importar el tamaño (antes, si
  // se pasaba del límite, quedaba sin cachear silenciosamente y este
  // cálculo se repetía en cada visita al panel).
  const json = JSON.stringify(resultado);
  cachePutGrande(cache, cacheKey, json, 1800);

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

function manejarDuplicarAlumno(ss, datos) {

  const idOrigen = String(datos.id || "").trim();
  const nombreNuevo = String(datos.nombreNuevo || "").trim();

  if (!idOrigen) throw new Error("Falta el plan a duplicar.");
  if (!nombreNuevo) throw new Error("Falta el nombre para la copia.");

  const resultado = duplicarHojaRutina(ss, idOrigen, nombreNuevo);
  const encabezado = leerEncabezadoHoja(resultado.hoja);

  return {
    id: resultado.id,
    alumno: nombreNuevo,
    tipoPlan: encabezado.tipoPlan,
    hoja: resultado.nombreHoja,
    fechaCreacion: encabezado.fechaCreacion,
  };
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

  if (typeof datos.fechaCreacion === "string" && datos.fechaCreacion.trim()) {
    // "yyyy-MM-dd" (lo que manda un <input type="date">). Se guarda al
    // mediodía para no correr de día por husos horarios al leerla de
    // vuelta con Utilities.formatDate().
    const partes = datos.fechaCreacion.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (partes) {
      const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), 12, 0, 0);
      hoja.getRange("E4").setValue(fecha);
    }
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

    // 9 columnas: A-H igual que antes + I (Agrupador). Ya no se toca el
    // color de fondo de la fila — el agrupamiento se calcula del lado del
    // servidor a partir del valor de "Agrupador" (ver colorearGruposPorDia),
    // así que no hay nada de formato que preservar ni que se pueda perder.
    const rango = hoja.getRange(bloque.filaDatosInicio, 1, totalFilas, 9);
    rango.clearContent();
    rango.clearDataValidations(); // si no, Sheets rechaza el valor nuevo por la
                                   // validación vieja que dejó filterPatterns

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
        String(ex.agrupador || ""),
      ]);

      hoja.getRange(bloque.filaDatosInicio, 1, ejercicios.length, 9).setValues(filas);
    }
  }

  invalidarRutinaCache(id);
  aplicarValidacionColumnaA(ss, hoja);
}

// Guarda la nota personal y la carga que carga el ALUMNO (no el
// entrenador) desde su propia vista — columnas J y K, que
// manejarGuardarDia ni siquiera toca (se queda en A:I), así que esto
// nunca pisa ni es pisado por una edición del entrenador. "indice" es la
// posición 0-based del ejercicio dentro del día (el mismo que manda
// construirRutina en cada ejercicio), no el número de fila real.
function manejarGuardarNotaAlumno(ss, datos) {

  const id = String(datos.id || "").trim();
  const diaNombre = String(datos.diaNombre || "").trim();
  const indice = Number(datos.indice);

  if (!id) throw new Error("Falta el id.");
  if (!diaNombre) throw new Error("Falta el día.");
  if (!Number.isInteger(indice) || indice < 0) throw new Error("Ejercicio inválido.");

  const hoja = buscarAlumno(id, ss);
  if (!hoja) throw new Error("No se encontró esa rutina.");

  const bloque = ubicarBloqueDia(hoja, diaNombre);
  if (!bloque) throw new Error(`No se encontró el día "${diaNombre}" en esta rutina.`);

  const fila = bloque.filaDatosInicio + indice;
  if (fila > bloque.filaFin) throw new Error("Ese ejercicio ya no existe en este día.");

  hoja.getRange(fila, 10, 1, 2).setValues([[
    String(datos.notaAlumno || ""),
    String(datos.carga || ""),
  ]]);

  invalidarRutinaCache(id);
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
  cacheRemoveGrande(CacheService.getScriptCache(), "rutina_" + id);
}
