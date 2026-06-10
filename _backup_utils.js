/**
 * BACKUP UTILS — Sauvegarde du classeur avant toute modification risquée
 *
 * Usage :
 *   Menu ⚡ ADMIN → "Créer backup du classeur"
 *   → Crée une copie dans le même dossier Drive avec horodatage
 */

function backupClasseur() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const file = DriveApp.getFileById(ss.getId());
  const ts   = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyyMMdd_HHmm');
  const name = 'BACKUP_' + ss.getName() + '_' + ts;

  const parent = file.getParents().hasNext() ? file.getParents().next() : DriveApp.getRootFolder();
  const copy   = file.makeCopy(name, parent);

  const msg = 'Backup créé :\n' + copy.getName() + '\nID : ' + copy.getId();
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
  return copy.getId();
}
