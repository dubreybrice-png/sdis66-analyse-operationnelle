/**
 * TAGGER COMMENTAIRES EXISTANTS
 *
 * Parcourt une seule fois les colonnes de référence et ajoute le tag
 * [PREFIX X] à la fin de chaque commentaire non vide.
 * Si le tag existe déjà → il est remplacé (pas de doublon).
 * Les cellules vides ne sont pas touchées.
 *
 * Colonnes taggées :
 *   APP      BP (col 68)  → [ISP BILAN X]
 *   APP      BQ (col 69)  → [ISP PISU X]
 *   APP Alex M  (col 13)  → [JL X]
 *   APP Eve  O  (col 15)  → [COM CHEF X]
 *   APP Eve  Q  (col 17)  → [ACTION CHEF X]
 *   APP Eve  R  (col 18)  → [ACTION REALISEE X]
 */
function taguerCommentairesExistants() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const shApp  = ss.getSheetByName('APP');
  const shAlex = ss.getSheetByName('APP Alex');
  const shEve  = ss.getSheetByName('APP Eve');

  let n = 0;

  // ── APP : BP (col 68) et BQ (col 69) — ID en col B (col 2) ─────────
  if (shApp) {
    const data = shApp.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const id = String(data[i][1] || '').trim(); // col B = index 1
      if (!id) continue;

      const bp = String(data[i][67] || '').trim(); // BP = index 67
      if (bp) {
        const t = _tagAR(bp, 'ISP BILAN', id);
        if (t !== bp) { shApp.getRange(i + 1, 68).setValue(t); n++; }
      }

      const bq = String(data[i][68] || '').trim(); // BQ = index 68
      if (bq) {
        const t = _tagAR(bq, 'ISP PISU', id);
        if (t !== bq) { shApp.getRange(i + 1, 69).setValue(t); n++; }
      }
    }
  }

  // ── APP Alex : M (col 13) — ID en col A (col 1) ─────────────────────
  if (shAlex) {
    const data = shAlex.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const id = String(data[i][0] || '').trim(); // col A = index 0
      if (!id) continue;

      const m = String(data[i][12] || '').trim(); // M = index 12
      if (m) {
        const t = _tagAR(m, 'JL', id);
        if (t !== m) { shAlex.getRange(i + 1, 13).setValue(t); n++; }
      }
    }
  }

  // ── APP Eve : O (col 15), Q (col 17), R (col 18) — ID en col A ──────
  if (shEve) {
    const data = shEve.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const id = String(data[i][0] || '').trim();
      if (!id) continue;

      const o = String(data[i][14] || '').trim(); // O = index 14
      if (o) {
        const t = _tagAR(o, 'COM CHEF', id);
        if (t !== o) { shEve.getRange(i + 1, 15).setValue(t); n++; }
      }

      const q = String(data[i][16] || '').trim(); // Q = index 16
      if (q) {
        const t = _tagAR(q, 'ACTION CHEF', id);
        if (t !== q) { shEve.getRange(i + 1, 17).setValue(t); n++; }
      }

      const r = String(data[i][17] || '').trim(); // R = index 17
      if (r) {
        const t = _tagAR(r, 'ACTION REALISEE', id);
        if (t !== r) { shEve.getRange(i + 1, 18).setValue(t); n++; }
      }
    }
  }

  const msg = '✅ ' + n + ' commentaire(s) tagué(s).';
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
  return n;
}

/** Ajoute ou remplace [PREFIX X] dans un commentaire. */
function _tagAR(commentaire, prefix, id) {
  const tag     = '[' + prefix + ' ' + String(id) + ']';
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('\\[' + escaped + ' [^\\]]+\\]');
  const comm    = String(commentaire || '').trim();
  if (!comm)              return tag;
  if (pattern.test(comm)) return comm.replace(pattern, tag);
  return comm + '\n' + tag;
}
