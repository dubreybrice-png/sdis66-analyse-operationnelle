/**
 * Version: 2026-01-29 v1.43
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
      // handleAppAutoCheckAlexHI(e); // DÉSACTIVÉ - H/I doivent être cochés manuellement
      return;
    }

    // =========================
    // Feuille "APP Alex"
    // =========================
    if (sheetName === "APP Alex") {
      handleAppAlex(e);        // N coche/décoche → cacher/afficher
      validateAppAlexCheckboxes(e); // Vérifier les combinaisons invalides
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

/**
 * Auto-coche H/I dans APP Alex selon la logique:
 * - Si Pisu pas ok (BL=63) ET Bilan ok (BI=60) → cocher H (col 8) dans APP Alex
 * - Si Bilan pas ok (BJ=61) ET Pisu ok (BK=62) → cocher I (col 9) dans APP Alex
 * - Si les deux pas ok → ne rien cocher
 */
function handleAppAutoCheckAlexHI(e) {
  const row = e.range.getRow();
  const col = e.range.getColumn();
  
  // Vérifier si c'est une édition dans les colonnes BI, BJ, BK, ou BL (61-64)
  if (row < 2 || col < 61 || col > 64) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName("APP");
  const alexSheet = ss.getSheetByName("APP Alex");
  if (!alexSheet) return;
  
  // Récupérer l'ID de la ligne modifiée (colonne B = 2 dans APP)
  const id = String(appSheet.getRange(row, 2).getValue()).trim();
  if (!id) return;
  
  // Récupérer les valeurs des checkboxes
  // BI = 61 (Bilan OK), BJ = 62 (Bilan incomplet), BK = 63 (Pisu OK), BL = 64 (Pisu pas ok)
  const bilanOk = appSheet.getRange(row, 61).getValue() === true;
  const bilanKo = appSheet.getRange(row, 62).getValue() === true;
  const pisuOk = appSheet.getRange(row, 63).getValue() === true;
  const pisuKo = appSheet.getRange(row, 64).getValue() === true;
  
  Logger.log("Auto H/I: ID=" + id + " Row=" + row + " BI(61)=" + bilanOk + " BJ(62)=" + bilanKo + " BK(63)=" + pisuOk + " BL(64)=" + pisuKo);
  
  // Trouver la ligne dans APP Alex (SEULEMENT dans les lignes FILTER, pas les résidus)
  const alexData = alexSheet.getDataRange().getValues();
  let alexRow = -1;
  
  // Chercher UNIQUEMENT dans les 100 premières lignes (zone FILTER)
  const maxSearchRow = Math.min(100, alexData.length);
  for (let i = 1; i < maxSearchRow; i++) {
    if (String(alexData[i][0]).trim() === id) {
      alexRow = i + 1;
      break;
    }
  }
  
  // Si pas trouvé dans APP Alex → NE RIEN FAIRE (ne pas créer de ligne)
  // Le FILTER de APP Alex doit d'abord créer la ligne automatiquement
  if (alexRow === -1) {
    Logger.log("Auto H/I: ID " + id + " non trouvé dans APP Alex (lignes FILTER). Ignore.");
    return;
  }
  
  // Logique de cochage automatique:
  // Si Pisu pas ok (BL) ET Bilan ok (BI) → cocher H (col 8)
  if (pisuKo && bilanOk) {
    alexSheet.getRange(alexRow, 8).setValue(true);
  } else {
    if (alexSheet.getRange(alexRow, 8).getValue() === true) {
      alexSheet.getRange(alexRow, 8).setValue(false);
    }
  }
  
  // Si Bilan pas ok (BJ) ET Pisu ok (BK) → cocher I (col 9)
  if (bilanKo && pisuOk) {
    alexSheet.getRange(alexRow, 9).setValue(true);
  } else {
    if (alexSheet.getRange(alexRow, 9).getValue() === true) {
      alexSheet.getRange(alexRow, 9).setValue(false);
    }
  }
}

/**
 * Valide que dans APP Alex on ne coche pas simultanément:
 * - H (col 8, Bilan finalement OK) ET J (col 10, Erreur bilan légère)
 * - I (col 9, Pisu finalement OK) ET K (col 11, Erreur pisu légère)
 */
function validateAppAlexCheckboxes(e) {
  const sheet = e.range.getSheet();
  const col = e.range.getColumn();
  const row = e.range.getRow();
  
  // Vérifier seulement si c'est une édition dans les colonnes H, I, J, K (8-11)
  if (row < 2 || col < 8 || col > 11) return;
  
  const hasH = sheet.getRange(row, 8).getValue() === true;  // Bilan finalement OK
  const hasI = sheet.getRange(row, 9).getValue() === true;  // Pisu finalement OK
  const hasJ = sheet.getRange(row, 10).getValue() === true; // Erreur bilan légère
  const hasK = sheet.getRange(row, 11).getValue() === true; // Erreur pisu légère
  
  // Vérifier les combinaisons invalides
  if (hasH && hasJ) {
    // Erreur: on ne peut pas cocher à la fois H et J
    sheet.getRange(row, 10).setValue(false); // Décocher J
    SpreadsheetApp.getUi().alert(
      "⚠️ ERREUR\n\nVous ne pouvez pas cocher à la fois:\n" +
      "• H (Bilan finalement OK)\n" +
      "• J (Erreur bilan légère)\n\n" +
      "Ces deux cases sont contradictoires.\n" +
      "La case J a été décochée.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
  
  if (hasI && hasK) {
    // Erreur: on ne peut pas cocher à la fois I et K
    sheet.getRange(row, 11).setValue(false); // Décocher K
    SpreadsheetApp.getUi().alert(
      "⚠️ ERREUR\n\nVous ne pouvez pas cocher à la fois:\n" +
      "• I (Pisu finalement OK)\n" +
      "• K (Erreur pisu légère)\n\n" +
      "Ces deux cases sont contradictoires.\n" +
      "La case K a été décochée.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}
