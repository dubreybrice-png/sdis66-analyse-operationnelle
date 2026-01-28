/**
 * Version: 2026-01-28 13:15
 * @OnlyCurrentDoc
 * Point d'entrée unique : se lance à chaque modification dans le fichier.
 */
function onEdit(e) {
  if (!e) return;

  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();

  try {
    // =========================
    // Feuille "APP"
    // =========================
    if (sheetName === "APP") {
      handleAppCheckToBI(e);   // BD/BF → BI
      handleAppHideOnBP(e);    // BP coche → cacher ligne
      return;
    }

    // =========================
    // Feuille "APP Alex"
    // =========================
    if (sheetName === "APP Alex") {
      handleAppAlex(e);        // N coche/décoche → cacher/afficher
      return;
    }

    // =========================
    // Feuille "Actions finales à mener chefferie"
    // =========================
    if (sheetName === "Actions finales à mener chefferie") {
      handleChefferie(e);      // S coche/décoche → cacher/afficher ici + APP Eve
      return;
    }

  } catch (err) {
    SpreadsheetApp.getActive().toast(
      "Erreur onEdit : " + err,
      "ERREUR SCRIPT",
      5
    );
    console.error(err);
  }
}

/**
 * Si on coche en BD (56) ou BF (58) alors on coche BI (61) sur la même ligne.
 * Feuille : APP
 */
function handleAppCheckToBI(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const col = range.getColumn();
  const row = range.getRow();

  // uniquement à partir de la ligne 2
  if (row < 2) return;

  // Colonne BD = 56, BF = 58
  if (col !== 56 && col !== 58) return;

  const value = range.getValue(); // booléen TRUE/FALSE

  if (value === true) {
    sheet.getRange(row, 61).setValue(true); // BI = 61
  }
}

/**
 * Si on coche une case en BP (68) dans APP, on cache la ligne.
 * Feuille : APP
 */
function handleAppHideOnBP(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const col = range.getColumn();
  const row = range.getRow();

  if (row < 2) return;

  const columnToWatch = 68; // BP

  if (col !== columnToWatch) return;

  const value = range.getValue(); // booléen

  if (value === true) {
    sheet.hideRows(row);
  }
  // Si tu veux réafficher si décoché, décommente :
  // else {
  //   sheet.showRows(row);
  // }
}

/**
 * Gestion des cases à cocher en colonne N sur APP Alex
 * Colonne N (14) : coche → cache la ligne, décoche → ré-affiche
 * Feuille : APP Alex
 */
function handleAppAlex(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();
  const col = range.getColumn();

  // Colonne N = 14, à partir de la ligne 2
  if (col !== 14 || row < 2) return;

  const value = range.getValue(); // TRUE / FALSE

  SpreadsheetApp.getActive().toast(
    "APP Alex N" + row + " → " + value,
    "Debug APP Alex",
    3
  );

  if (value === true) {
    sheet.hideRows(row);   // coche → on cache
  } else {
    sheet.showRows(row);   // décoche → on ré-affiche
  }
}

/**
 * Gestion des cases à cocher en colonne S (19) sur
 * "Actions finales à mener chefferie" + synchro avec "APP Eve"
 */
function handleChefferie(e) {
  const ss = e.source;
  const sheet = e.range.getSheet();
  const nomFeuille = sheet.getName();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  // Sécurité (normalement déjà filtré par onEdit)
  if (nomFeuille !== "Actions finales à mener chefferie") return;

  // Colonne S = 19, à partir de la ligne 2
  if (col !== 19 || row < 2) return;

  const value = range.getValue(); // TRUE / FALSE
  const numInter = sheet.getRange(row, 1).getValue(); // n° d'intervention en A

  const sheetEve = ss.getSheetByName("APP Eve");
  if (!sheetEve) return;

  const lastRowEve = sheetEve.getLastRow();
  if (lastRowEve < 2) {
    // Rien à faire s'il n'y a pas de données, on gère juste la ligne courante
    if (value === true) {
      sheet.hideRows(row);
    } else {
      sheet.showRows(row);
    }
    return;
  }

  // Numéros d'intervention de APP Eve, col A à partir de la ligne 2
  const dataEve = sheetEve.getRange(2, 1, lastRowEve - 1, 1).getValues();

  if (value === true) {
    // Case cochée : on cache ici et dans APP Eve
    sheet.hideRows(row);

    for (let i = 0; i < dataEve.length; i++) {
      if (dataEve[i][0] === numInter) {
        sheetEve.hideRows(i + 2); // +2 car data commence à la ligne 2
      }
    }
  } else {
    // Case décochée : on ré-affiche ici et dans APP Eve
    sheet.showRows(row);

    for (let i = 0; i < dataEve.length; i++) {
      if (dataEve[i][0] === numInter) {
        sheetEve.showRows(i + 2);
      }
    }
  }
}
