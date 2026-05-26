/**
 * Version: 2026-04-17
 * Envoi quotidien à 9h d'un SEUL mail récapitulatif à Eve
 * s'il y a des fiches APP erreur grave en attente.
 * Condition: dans "APP Eve", ligne avec contenu (col A non vide)
 *            ET colonne O ET Q vides (pas encore traitée par le médecin)
 *            ET colonne S non cochée (pas clôturée)
 */
function checkAppEveErrors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("APP Eve");
  if (!sheet) throw new Error('Onglet "APP Eve" introuvable');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Colonnes (1-indexed)
  const colO = 15, colQ = 17, colS = 19;

  const range = sheet.getRange(2, 1, lastRow - 1, Math.max(colS, colQ, colO));
  const values = range.getValues();

  let pendingCount = 0;

  for (let i = 0; i < values.length; i++) {
    const valO = values[i][colO - 1];
    const valQ = values[i][colQ - 1];
    const valS = values[i][colS - 1]; // S = clôturé

    const oEmpty = valO === "" || valO === null;
    const qEmpty = valQ === "" || valQ === null;
    const isClosed = valS === true || String(valS).toUpperCase() === "TRUE";

    // Fiche en attente = O ou Q vide ET pas clôturée, ET la ligne a du contenu (col A non vide)
    const hasContent = values[i][0] !== "" && values[i][0] !== null;
    if (hasContent && (oEmpty || qEmpty) && !isClosed) {
      pendingCount++;
    }
  }

  if (pendingCount > 0) {
    const appUrl = WEBAPP_EXEC_URL;
    
    GmailApp.sendEmail(
      "eve.laparra@sdis66.fr",
      "APP – " + pendingCount + " fiche(s) erreur grave en attente",
      "Bonjour,\n\nIl y a actuellement " + pendingCount + " fiche(s) APP avec erreur grave en attente d'analyse médecin.\n\nAccéder à l'application : " + appUrl + "\n\nCordialement,\nSDS Analyse Opérationnelle (mail automatique)"
    );
  }
}


/**
 * TEST — Simule checkAppEveErrors et envoie le résultat + debug à brice.dubrey@sdis66.fr
 */
function testCheckAppEveErrors_Brice() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("APP Eve");
  if (!sheet) throw new Error('Onglet "APP Eve" introuvable');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    GmailApp.sendEmail("brice.dubrey@sdis66.fr", "[TEST] APP Eve – aucune ligne", "Onglet APP Eve vide (lastRow=" + lastRow + ")");
    return;
  }

  const colO = 15, colQ = 17, colS = 19;
  const range = sheet.getRange(2, 1, lastRow - 1, Math.max(colS, colQ, colO));
  const values = range.getValues();

  let pendingCount = 0;
  const debugLines = [];

  for (let i = 0; i < values.length; i++) {
    const valA = values[i][0];
    const valO = values[i][colO - 1];
    const valQ = values[i][colQ - 1];
    const valS = values[i][colS - 1];

    const hasContent = valA !== "" && valA !== null;
    const oEmpty = valO === "" || valO === null;
    const qEmpty = valQ === "" || valQ === null;
    const isClosed = valS === true || String(valS).toUpperCase() === "TRUE";

    const counted = hasContent && (oEmpty || qEmpty) && !isClosed;
    if (counted) {
      pendingCount++;
      debugLines.push("Ligne " + (i + 2) + " | A=" + valA + " | O=" + JSON.stringify(valO) + " | Q=" + JSON.stringify(valQ) + " | S=" + JSON.stringify(valS) + " → COMPTÉE");
    } else if (hasContent) {
      debugLines.push("Ligne " + (i + 2) + " | A=" + valA + " | O=" + JSON.stringify(valO) + " | Q=" + JSON.stringify(valQ) + " | S=" + JSON.stringify(valS) + " → ignorée (closed=" + isClosed + " oEmpty=" + oEmpty + " qEmpty=" + qEmpty + ")");
    }
  }

  const appUrl = WEBAPP_EXEC_URL;
  const body = "[TEST envoi vers brice]\n\n"
    + "Résultat : " + pendingCount + " fiche(s) en attente\n"
    + "URL qui serait envoyée : " + appUrl + "\n\n"
    + "=== DÉTAIL LIGNES ===\n"
    + (debugLines.length > 0 ? debugLines.join("\n") : "(aucune ligne avec contenu)");

  GmailApp.sendEmail(
    "brice.dubrey@sdis66.fr",
    "[TEST] APP Eve – " + pendingCount + " fiche(s) erreur grave en attente",
    body
  );
  Logger.log("Mail de test envoyé à brice.dubrey@sdis66.fr — " + pendingCount + " fiche(s)");
}

/**
 * À lancer UNE SEULE FOIS pour créer le déclencheur quotidien à 9h.
 */
function installDailyMailTrigger() {
  // Supprime les triggers existants sur cette fonction pour éviter doublons
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "checkAppEveErrors") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Crée un trigger quotidien à 9h (timezone du script = Europe/Paris)
  ScriptApp.newTrigger("checkAppEveErrors")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
}

function resetMemory() {
  PropertiesService.getDocumentProperties().deleteAllProperties();
  SpreadsheetApp.getActiveSpreadsheet().toast("Mémoire du script effacée !");
}
