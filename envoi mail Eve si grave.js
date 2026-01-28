/**
 * Version: 2026-01-28 13:15
 * Scan quotidien (ou manuel) de l'onglet "APP Eve"
 * Condition:
 * - M non vide
 * - O OU Q vide
 * => envoie un mail avec lien vers la cellule M
 */
function checkAppEveErrors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("APP Eve");
  if (!sheet) throw new Error('Onglet "APP Eve" introuvable');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // rien à checker

  // Colonnes
  const colM = 13, colO = 15, colQ = 17;

  // On lit en une fois pour être rapide
  const range = sheet.getRange(2, 1, lastRow - 1, Math.max(colQ, colO, colM));
  const values = range.getValues();

  const props = PropertiesService.getDocumentProperties();
  const sheetId = sheet.getSheetId();
  const ssUrl = ss.getUrl();

  let countNewAlerts = 0;

  for (let i = 0; i < values.length; i++) {
    const row = i + 2; // car values commence à la ligne 2
    const valM = values[i][colM - 1];
    const valO = values[i][colO - 1];
    const valQ = values[i][colQ - 1];

    const mFilled = valM !== "" && valM !== null;
    const oEmpty = valO === "" || valO === null;
    const qEmpty = valQ === "" || valQ === null;

    const key = sheetId + "_" + row;

    if (mFilled && (oEmpty || qEmpty)) {
      // anti-doublon : on n’alerte qu’une fois tant que pas corrigé
      if (props.getProperty(key) === "1") continue;

      const a1 = sheet.getRange(row, colM).getA1Notation();
      const link = ssUrl + "#gid=" + sheetId + "&range=" + a1;

      GmailApp.sendEmail(
        "eve.laparra@sdis66.fr",
        "APP Eve – Erreur grave BPV",
        `Un nouveau bpv avec une erreur "grave" est à côter. Cliquez ici: ${link}`
      );

      props.setProperty(key, "1");
      countNewAlerts++;

    } else {
      // si la ligne est OK, on enlève le flag
      props.deleteProperty(key);
    }
  }

  ss.toast(`${countNewAlerts} nouvelle(s) alerte(s) envoyée(s).`, "APP Eve check", 5);
}


/**
 * À lancer UNE SEULE FOIS pour créer le déclencheur quotidien à midi.
 * (ensuite tu peux la supprimer si tu veux)
 */
function installDailyNoonTrigger() {
  // Supprime les triggers existants sur cette fonction pour éviter doublons
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "checkAppEveErrors") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Crée un trigger quotidien à 12h (timezone du script = Europe/Paris)
  ScriptApp.newTrigger("checkAppEveErrors")
    .timeBased()
    .everyDays(1)
    .atHour(12)
    .create();
}

function resetMemory() {
  PropertiesService.getDocumentProperties().deleteAllProperties();
  SpreadsheetApp.getActiveSpreadsheet().toast("Mémoire du script effacée !");
}