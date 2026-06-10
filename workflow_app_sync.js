// ============================================================
// WORKFLOW APP SYNC — Alignement sécurisé par numéro d'intervention
// v1.0 — SDIS 66
// Auteur : généré automatiquement — ne pas modifier manuellement
// ============================================================

/**
 * Configuration centralisée de toutes les colonnes (0-indexed) et noms d'onglets.
 * Modifier ici en cas de changement de structure du classeur.
 */
const APP_WORKFLOW_CONFIG = {
  sheets: {
    app:  'APP',
    alex: 'APP Alex',
    eve:  'APP Eve',
    log:  'LOG_ALIGNEMENT_APP'
  },

  // Colonnes de l'onglet APP (0-indexed)
  appCols: {
    id:             1,   // B  — numéro d'intervention (clé primaire)
    bilanKo:        63,  // BL — case bilan incomplet
    pisuKo:         65,  // BN — case PISU pas ok
    ispBilanComm:   67,  // BP — commentaire ISP bilan incomplet
    ispPisuComm:    68,  // BQ — commentaire ISP PISU pas ok
    commChefAncre:  75,  // BX — commentaire chefferie ancré par ID
    commMedAncre:   76,  // BY — analyse médecin cheffe ancrée par ID
    actionMedAncre: 77,  // BZ — action médecin cheffe ancrée par ID
  },

  // Colonnes de l'onglet APP Alex (0-indexed)
  alexCols: {
    id:              0,  // A  — numéro d'intervention
    commentaireChef: 12, // M  — commentaire chefferie ISP
  },

  // Colonnes de l'onglet APP Eve (0-indexed)
  eveCols: {
    id:              0,  // A  — numéro d'intervention
    analyseChef:     14, // O  — analyse médecin cheffe
    actionSouhaitee: 16, // Q  — action souhaitée par médecin
    actionFaite:     17, // R  — action réalisée par chefferie
    cloture:         18, // S  — case clôturée
  },

  // Préfixes des tags (sans crochets)
  tags: {
    ispBilan:       'ISP BILAN',
    ispPisu:        'ISP PISU',
    chefAlex:       'JL',
    commChef:       'COM CHEF',
    actionChef:     'ACTION CHEF',
    actionRealisee: 'ACTION REALISEE'
  }
};


// ============================================================
// UTILITAIRES
// ============================================================

/**
 * Ajoute ou remplace un tag [PREFIX X] dans un commentaire.
 * - Si le commentaire est vide → retourne uniquement le tag.
 * - Si un tag [PREFIX *] existe déjà → le remplace par [PREFIX numeroIntervention].
 * - Sinon → ajoute le tag en fin, précédé d'un saut de ligne.
 *
 * @param {string} commentaire        Texte brut du commentaire
 * @param {string} prefixTag          Préfixe du tag, ex. "JL" ou "COM CHEF"
 * @param {string|number} numeroIntervention  Numéro d'intervention
 * @returns {string} Commentaire avec tag mis à jour
 */
function appendOrReplaceTag(commentaire, prefixTag, numeroIntervention) {
  const tag     = '[' + prefixTag + ' ' + String(numeroIntervention) + ']';
  const escaped = prefixTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('\\[' + escaped + ' [^\\]]+\\]');
  const comm    = String(commentaire || '').trim();
  if (!comm)           return tag;
  if (pattern.test(comm)) return comm.replace(pattern, tag);
  return comm + '\n' + tag;
}

/**
 * Construit un index {id → numéro de ligne 1-based} depuis un tableau 2D.
 * Conserve la PREMIÈRE occurrence par ID.
 *
 * @param {Array[]} data     Résultat de getValues()
 * @param {number}  idColIdx Colonne de l'ID (0-indexed)
 * @returns {Object} Map id → rowNum
 */
function _buildIdIndex(data, idColIdx) {
  const idx = {};
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][idColIdx] || '').trim();
    if (id && !idx[id]) idx[id] = i + 1;
  }
  return idx;
}

/**
 * Enregistre une anomalie d'alignement dans l'onglet LOG_ALIGNEMENT_APP.
 * Crée l'onglet avec en-tête si absent.
 *
 * @param {{id, sheet, col, problem, value, action}} issue
 */
function logAlignementIssue(issue) {
  try {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const logName = APP_WORKFLOW_CONFIG.sheets.log;
    let   sh      = ss.getSheetByName(logName);
    if (!sh) {
      sh = ss.insertSheet(logName);
      sh.getRange(1, 1, 1, 7)
        .setValues([['Horodatage','InterventionID','Onglet','Colonne','Problème','Valeur','Action']])
        .setFontWeight('bold')
        .setBackground('#1a237e')
        .setFontColor('#ffffff');
    }
    sh.appendRow([
      new Date(),
      String(issue.id      || ''),
      String(issue.sheet   || ''),
      String(issue.col     || ''),
      String(issue.problem || ''),
      String(issue.value   || '').substring(0, 200),
      String(issue.action  || '')
    ]);
  } catch (e) {
    Logger.log('logAlignementIssue error: ' + e);
  }
}


// ============================================================
// SYNCHRONISATION PRINCIPALE
// ============================================================

/**
 * Synchronise les commentaires entre les onglets en utilisant le numéro
 * d'intervention comme seule clé fiable.
 *
 * Règle : APP BX / BY / BZ sont la SOURCE DE VÉRITÉ.
 *   → Propage BX → Alex col M
 *   → Propage BY → Eve col O
 *   → Propage BZ → Eve col Q
 *
 * Ne remplace JAMAIS un commentaire existant par une valeur vide.
 * À appeler depuis le menu ADMIN ou après une opération de masse.
 */
function syncWorkflowAPP() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = APP_WORKFLOW_CONFIG;

  const shApp  = ss.getSheetByName(cfg.sheets.app);
  const shAlex = ss.getSheetByName(cfg.sheets.alex);
  const shEve  = ss.getSheetByName(cfg.sheets.eve);

  if (!shApp || !shAlex) {
    Logger.log('syncWorkflowAPP: onglets APP ou APP Alex introuvables.');
    try { SpreadsheetApp.getUi().alert('Onglets APP ou APP Alex introuvables.'); } catch(e) {}
    return 0;
  }

  const appData  = shApp.getDataRange().getValues();
  const alexData = shAlex.getDataRange().getValues();
  const eveData  = shEve ? shEve.getDataRange().getValues() : [];

  const alexIdx = _buildIdIndex(alexData, cfg.alexCols.id);
  const eveIdx  = shEve ? _buildIdIndex(eveData, cfg.eveCols.id) : {};

  let nSync = 0;

  for (let i = 1; i < appData.length; i++) {
    const interId = String(appData[i][cfg.appCols.id] || '').trim();
    if (!interId) continue;

    const bx = String(appData[i][cfg.appCols.commChefAncre]  || '').trim();
    const by = String(appData[i][cfg.appCols.commMedAncre]   || '').trim();
    const bz = String(appData[i][cfg.appCols.actionMedAncre] || '').trim();

    // BX → Alex M
    if (bx) {
      const r = alexIdx[interId];
      if (r) {
        const cur = String(alexData[r - 1][cfg.alexCols.commentaireChef] || '').trim();
        if (cur !== bx) {
          shAlex.getRange(r, cfg.alexCols.commentaireChef + 1).setValue(bx);
          nSync++;
        }
      }
    }

    if (!shEve) continue;

    // BY → Eve O
    if (by) {
      const r = eveIdx[interId];
      if (r) {
        const cur = String(eveData[r - 1][cfg.eveCols.analyseChef] || '').trim();
        if (cur !== by) {
          shEve.getRange(r, cfg.eveCols.analyseChef + 1).setValue(by);
          nSync++;
        }
      }
    }

    // BZ → Eve Q
    if (bz) {
      const r = eveIdx[interId];
      if (r) {
        const cur = String(eveData[r - 1][cfg.eveCols.actionSouhaitee] || '').trim();
        if (cur !== bz) {
          shEve.getRange(r, cfg.eveCols.actionSouhaitee + 1).setValue(bz);
          nSync++;
        }
      }
    }
  }

  if (nSync > 0) {
    try {
      CacheService.getScriptCache().removeAll(['chefferie_counts_v4', 'all_isp_error_stats']);
    } catch(e) {}
  }

  const msg = 'syncWorkflowAPP : ' + nSync + ' cellule(s) synchronisée(s).';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) {}
  return nSync;
}


// ============================================================
// VÉRIFICATION DE COHÉRENCE
// ============================================================

/**
 * Vérifie que APP BX correspond bien à Alex col M pour chaque intervention.
 * Log les anomalies dans LOG_ALIGNEMENT_APP.
 * Retourne un rapport {nOk, nDecale, nManquant}.
 */
function autoCheckWorkflowAPP() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = APP_WORKFLOW_CONFIG;

  const shApp  = ss.getSheetByName(cfg.sheets.app);
  const shAlex = ss.getSheetByName(cfg.sheets.alex);

  if (!shApp || !shAlex) {
    const err = 'Onglets introuvables.';
    try { SpreadsheetApp.getUi().alert(err); } catch(e) {}
    return { error: err };
  }

  const appData  = shApp.getDataRange().getValues();
  const alexData = shAlex.getDataRange().getValues();
  const alexIdx  = _buildIdIndex(alexData, cfg.alexCols.id);

  let nOk = 0, nDecale = 0, nManquant = 0;

  for (let i = 1; i < appData.length; i++) {
    const interId = String(appData[i][cfg.appCols.id] || '').trim();
    if (!interId) continue;

    const bx = String(appData[i][cfg.appCols.commChefAncre] || '').trim();
    if (!bx) continue;

    const r = alexIdx[interId];
    if (!r) {
      logAlignementIssue({
        id: interId, sheet: cfg.sheets.alex, col: 'M',
        problem: 'ID présent dans APP BX mais absent de APP Alex',
        value:   bx.substring(0, 80),
        action:  'Lancer syncWorkflowAPP()'
      });
      nManquant++;
      continue;
    }

    const alexM = String(alexData[r - 1][cfg.alexCols.commentaireChef] || '').trim();
    if (alexM && alexM !== bx) {
      logAlignementIssue({
        id: interId, sheet: cfg.sheets.alex, col: 'M',
        problem: 'Alex M ≠ APP BX — décalage détecté',
        value:   'Alex: ' + alexM.substring(0, 40) + ' | APP: ' + bx.substring(0, 40),
        action:  'Lancer syncWorkflowAPP()'
      });
      nDecale++;
    } else {
      nOk++;
    }
  }

  const msg = 'Vérification workflow : ' + nOk + ' OK — ' + nDecale + ' décalé(s) — ' + nManquant + ' manquant(s).\n' +
              (nDecale + nManquant > 0 ? 'Voir onglet LOG_ALIGNEMENT_APP.\nLancez syncWorkflowAPP() pour corriger.' : '');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) {}
  return { nOk, nDecale, nManquant };
}


// ============================================================
// TRIGGERS onEdit
// ============================================================

/**
 * Simple trigger onEdit — se déclenche sur les éditions humaines.
 * Tague les commentaires et les ancre dans APP (BX/BY/BZ).
 *
 * Note : les écritures faites par un script ne déclenchent PAS ce trigger
 * → aucune boucle infinie possible avec un simple trigger.
 *
 * Colonnes surveillées :
 *   APP  : BP (68), BQ (69)
 *   Alex : M  (13)
 *   Eve  : O  (15), Q (17), R (18)
 */
function onEdit(e) {
  _handleWorkflowEdit(e);
}

/**
 * Installe un trigger onEdit INSTALLABLE (plus de permissions que le simple trigger).
 * À lancer UNE SEULE FOIS depuis le menu ADMIN → "Installer trigger onEdit workflow".
 *
 * Attention : si ce trigger est installé ET que onEdit() simple est actif,
 * la logique s'exécutera deux fois. Désactiver le simple trigger si besoin.
 */
function createWorkflowTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onEditWorkflow')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('onEditWorkflow')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log('Trigger installable onEditWorkflow créé.');
  try { SpreadsheetApp.getUi().alert('Trigger onEditWorkflow installé avec succès.'); } catch(e) {}
}

/**
 * Handler pour le trigger installable (nécessite createWorkflowTrigger).
 * Identique au simple trigger mais avec anti-boucle via LockService.
 */
function onEditWorkflow(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(500)) return;
  try {
    _handleWorkflowEdit(e);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Logique commune onEdit — taguer les commentaires + ancrer dans APP.
 * Appelée par onEdit() (simple) et onEditWorkflow() (installable).
 *
 * @param {Object} e  Événement onEdit Google Apps Script
 */
function _handleWorkflowEdit(e) {
  if (!e || !e.range) return;

  const range     = e.range;
  const sheetName = range.getSheet().getName();
  const col       = range.getColumn(); // 1-indexed
  const row       = range.getRow();
  if (row <= 1) return; // ignorer l'en-tête

  const cfg    = APP_WORKFLOW_CONFIG;
  const isApp  = (sheetName === cfg.sheets.app);
  const isAlex = (sheetName === cfg.sheets.alex);
  const isEve  = (sheetName === cfg.sheets.eve);
  if (!isApp && !isAlex && !isEve) return;

  // Colonnes surveillées (1-indexed)
  const watchApp  = [cfg.appCols.ispBilanComm + 1,    cfg.appCols.ispPisuComm + 1];    // BP=68, BQ=69
  const watchAlex = [cfg.alexCols.commentaireChef + 1];                                // M=13
  const watchEve  = [cfg.eveCols.analyseChef + 1, cfg.eveCols.actionSouhaitee + 1,
                     cfg.eveCols.actionFaite + 1];                                     // O=15, Q=17, R=18

  if (isApp  && !watchApp.includes(col))  return;
  if (isAlex && !watchAlex.includes(col)) return;
  if (isEve  && !watchEve.includes(col))  return;

  const val = String(e.value !== undefined ? e.value : (range.getValue() || '')).trim();
  if (!val) return;

  // Obtenir l'ID d'intervention (APP col B = 2 en 1-indexed ; Alex/Eve col A = 1)
  const sh      = range.getSheet();
  const interId = isApp
    ? String(sh.getRange(row, cfg.appCols.id + 1).getValue() || '').trim()
    : String(sh.getRange(row, 1).getValue() || '').trim();
  if (!interId) return;

  // Choisir le préfixe du tag
  let prefixTag = null;
  if (isApp  && col === cfg.appCols.ispBilanComm + 1)     prefixTag = cfg.tags.ispBilan;
  if (isApp  && col === cfg.appCols.ispPisuComm + 1)      prefixTag = cfg.tags.ispPisu;
  if (isAlex && col === cfg.alexCols.commentaireChef + 1) prefixTag = cfg.tags.chefAlex;
  if (isEve  && col === cfg.eveCols.analyseChef + 1)      prefixTag = cfg.tags.commChef;
  if (isEve  && col === cfg.eveCols.actionSouhaitee + 1)  prefixTag = cfg.tags.actionChef;
  if (isEve  && col === cfg.eveCols.actionFaite + 1)      prefixTag = cfg.tags.actionRealisee;
  if (!prefixTag) return;

  const tagged = appendOrReplaceTag(val, prefixTag, interId);
  if (tagged !== val) range.setValue(tagged);

  // Ancrage dans APP (BX/BY/BZ) pour les colonnes Alex M et Eve O/Q
  if (!isApp) {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const shApp = ss.getSheetByName(cfg.sheets.app);
    if (!shApp) return;

    const appData = shApp.getDataRange().getValues();
    for (let j = 1; j < appData.length; j++) {
      if (String(appData[j][cfg.appCols.id] || '').trim() !== interId) continue;

      const appRow      = j + 1;
      const finalValue  = (tagged !== val) ? tagged : val;

      if (isAlex && col === cfg.alexCols.commentaireChef + 1) {
        shApp.getRange(appRow, cfg.appCols.commChefAncre + 1).setValue(finalValue);
      } else if (isEve && col === cfg.eveCols.analyseChef + 1) {
        shApp.getRange(appRow, cfg.appCols.commMedAncre + 1).setValue(finalValue);
      } else if (isEve && col === cfg.eveCols.actionSouhaitee + 1) {
        shApp.getRange(appRow, cfg.appCols.actionMedAncre + 1).setValue(finalValue);
      }
      break;
    }
  }
}
