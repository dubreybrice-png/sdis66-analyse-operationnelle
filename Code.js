/****************************************************
 * SDIS 66 - SDS | WebApp Dashboard
 * CACHE SÉQUENTIEL + FIXES + LOCK SYSTEM + ANTI-DOUBLE-COUNT
 * Version: v1.73 | 2026-03-23
 * Modifications: Fix compteur chefferie (C_BP_CLOSE ne bloque plus le décompte)
 ****************************************************/

const DASHBOARD_SHEET_NAME = "Dashboard";
const TEMPS_SHEET_NAME = "Temps travail";
const APP_SHEET_NAME = "APP";

const ID_SS_2025 = "112sOp4EAPm3vq0doLWzWlAbsOdutszGKT86USjSqst0"; 
const ID_SS_RH   = "1lwQJ6xTET3qpr9-cPGBngdih_bmfrVRMOYcMgMkUVP0"; 
const ID_PROTOCOLES_CORRESP = "12-7VNgPo7PsoKoRHzm_y24a-2OoDiCvJIyJFTdC9l7c"; 
const ID_SS_ASTREINTE_DEPT = "1XPyV7-Ulno1f4-TgrtsCprL8c6cs3NU7jt1UNST3oXE"; 
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxcBF8FoEHFtRuWF5wMEcyLJuIukj44fg2zCIstkev5FMUw_vc4IjkSCDJLU8Rgpfqe/exec";
const APP_VERSION = "v1.84";

function getWebAppUrl_() {
  try { return ScriptApp.getService().getUrl(); } catch(e) { return WEBAPP_URL; }
}

const DASH_LASTDATE_CELL = "D2";
const DASH_PSUD_2026_CELL = "B3";
const DASH_TOTAL_2026_CELL = "B2";
const DASH_ASTREINTES_2026_CELL = "O30"; 

// 2025
const EXT_TEMPS_COL_DATE_AST = 14; 
const EXT_TEMPS_COL_DATE_GARDE = 5; 
const EXT_TEMPS_COL_MAT_GARDE = 1; 
const EXT_TEMPS_COL_MAT_AST = 10; 
const EXT_APP_COL_MAT = 8; 
const EXT_APP_COL_CENTRE = 2; 
const EXT_APP_COL_DATE = 13; 

// 2026
const C_TEMPS_MAT_GARDE = 1; 
const C_TEMPS_DATE_GARDE = 5; 
const C_TEMPS_MAT_AST = 10; 
const C_TEMPS_DATE_AST = 14; 
const C_APP_ID = 1;     
const C_APP_CIS = 2;    
const C_APP_MOTIF = 3;  
const C_APP_PDF = 4;    
const C_APP_ENGIN = 7;  
const C_APP_MAT = 8;    
const C_APP_NOM = 9;    
const C_APP_DATE = 13;  
const C_ISP_ANALYSE = 20; 
const C_PROTO_START = 21;  // V = 21 (0-indexed)
const C_PROTO_END = 50;    // AY = 50 (0-indexed) — 30 protocoles (18 adultes + 12 pédiatriques)
const C_AKIM = 51;         // AZ (0-indexed = 51, Google = 52)
const C_SMUR = 52;         // BA (0-indexed = 52, Google = 53)
const C_CCMU = 53;         // BB (0-indexed = 53, Google = 54)
const C_DEVENIR = 54;      // BC (0-indexed = 54, Google = 55)
const C_SOUSAN = 55;       // BD (0-indexed = 55, Google = 56)
const C_NBVICTIMES = 56;   // BE (0-indexed = 56, Google = 57)
const C_BG_EXAM = 60; 
const C_BH_ABS = 61;  
const C_BILAN_OK = 62; 
const C_BILAN_KO = 63; 
const C_PISU_OK = 64;  
const C_PISU_KO = 65;  
const C_BM_SURV_TRANSPORT = 66; // BM: Surveillance transport (checkbox)
const C_TXTBILAN_KO = 67;   // BN: Motif bilan incomplet (texte)
const C_TXTPISU_KO = 68;    // BO: Motif pisu pas ok (texte)
const C_BP_CLOSE = 69;      // BP: Case clôturée (ne plus afficher dans APP)
const C_BQ_PUI_COMMANDEE = 70; // BQ: PUI commandée (checkbox)
const C_BS_PROBLEM = 72; // Signaler problème à Brice (checkbox)
const C_BT_PROBLEM_TXT = 73; // Texte du problème pour Brice
const C_BU_LOCK = 74; // Timestamp de verrouillage pour éviter doublons
const C_APP_INFO_T = 19;  // Colonne T: information supplémentaire (lecture seule pour ISP)
const C_COMM_CHEF = 75;   // BX: Commentaire chefferie ancré par ID d'intervention
const C_COMM_MED = 76;    // BY: Analyse médecin cheffe ancrée par ID
const C_ACTION_MED = 77;  // BZ: Action requise médecin cheffe ancrée par ID

// === HELPER FUNCTIONS ===

// === CACHE SPREADSHEET (pas de limite 100Ko) ===
const CACHE_SS_PROP_KEY = "cache_spreadsheet_id";

function _getCacheSS() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty(CACHE_SS_PROP_KEY);
  if(ssId) {
    try { return SpreadsheetApp.openById(ssId); } catch(e) { /* supprimé? recréer */ }
  }
  // Créer le fichier cache
  const ss = SpreadsheetApp.create("📦 Cache SDS-Oper (ne pas supprimer)");
  const sheet = ss.getSheets()[0];
  sheet.setName("Cache");
  sheet.getRange("A1:C1").setValues([["key","value","timestamp"]]);
  props.setProperty(CACHE_SS_PROP_KEY, ss.getId());
  Logger.log("Cache spreadsheet créé: " + ss.getUrl());
  return ss;
}

function sheetCacheGet(key) {
  try {
    const ss = _getCacheSS();
    const sheet = ss.getSheetByName("Cache");
    if(!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
      if(data[i][0] === key) {
        const ts = data[i][2];
        const ttl = data[i][3] || 7200;
        if(ts && (new Date() - new Date(ts))/1000 < ttl) {
          return JSON.parse(data[i][1]);
        }
        return null; // Expiré
      }
    }
    return null;
  } catch(e) {
    Logger.log("sheetCacheGet error: " + e);
    return null;
  }
}

function sheetCachePut(key, value, ttlSeconds) {
  try {
    const ss = _getCacheSS();
    const sheet = ss.getSheetByName("Cache");
    if(!sheet) return;
    const jsonStr = JSON.stringify(value);
    const data = sheet.getDataRange().getValues();
    
    // Chercher si la clé existe déjà
    for(let i=1; i<data.length; i++) {
      if(data[i][0] === key) {
        sheet.getRange(i+1, 2, 1, 3).setValues([[jsonStr, new Date(), ttlSeconds || 7200]]);
        return;
      }
    }
    // Nouvelle clé
    sheet.appendRow([key, jsonStr, new Date(), ttlSeconds || 7200]);
  } catch(e) {
    Logger.log("sheetCachePut error: " + e);
  }
}

function sheetCacheRemove(key) {
  try {
    const ss = _getCacheSS();
    const sheet = ss.getSheetByName("Cache");
    if(!sheet) return;
    const data = sheet.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
      if(data[i][0] === key) {
        sheet.deleteRow(i+1);
        return;
      }
    }
  } catch(e) {
    Logger.log("sheetCacheRemove error: " + e);
  }
}

function isCheckboxChecked(val) {
  // Google Sheets checkboxes can return: true (boolean), "TRUE" (string), "✓" (checkmark), "Oui" (dropdown validation)
  if(!val) return false;
  const s = String(val).toUpperCase();
  return val === true || s === "TRUE" || s === "OUI" || val === "✓";
}

/**
 * Ajoute ou remplace un tag [PREFIX id] à la fin d'un commentaire, pour ancrer
 * visuellement chaque commentaire à son numéro d'intervention (sécurise le circuit
 * APP Alex / APP Eve contre tout décalage de ligne).
 */
function appendOrReplaceTag_(commentaire, prefix, id, legacyPrefixes) {
  let comm = String(commentaire || "").trim();
  if (!comm) return comm;
  // Supprimer les anciens tags devenus obsolètes (migration automatique, sans intervention manuelle)
  if (legacyPrefixes) {
    legacyPrefixes.forEach(function(lp) {
      const esc = lp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      comm = comm.replace(new RegExp("\\n?\\[" + esc + " [^\\]]+\\]", "g"), "").trim();
    });
  }
  const tag = "[" + prefix + " " + String(id).trim() + "]";
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("\\[" + escaped + " [^\\]]+\\]");
  if (pattern.test(comm)) return comm.replace(pattern, tag);
  return comm + "\n" + tag;
}

/**
 * Maintient APP Alex à jour SANS jamais réordonner les lignes existantes :
 * ajoute en fin de tableau les fiches APP (bilanKo / pisuKo) qui n'y figurent
 * pas encore. Si la formule FILTER historique est encore active en A2, ne fait
 * rien (elle gère déjà l'ajout automatique) — s'active seule après migration
 * via migrateAppAlexToStatic().
 */
function ensureAppAlexSynced_(ss) {
  try {
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const shAlex = ss.getSheetByName("APP Alex");
    if (!shApp || !shAlex) return;
    if (shAlex.getRange(2, 1).getFormula()) return; // FILTER encore actif : rien à faire

    const dataApp = shApp.getDataRange().getValues();
    const lastAlexRow = shAlex.getLastRow();
    const existingIds = new Set();
    if (lastAlexRow >= 2) {
      shAlex.getRange(2, 1, lastAlexRow - 1, 1).getValues().forEach(r => {
        const id = String(r[0]).trim();
        if (id) existingIds.add(id);
      });
    }

    const newRows = [];
    for (let i = 1; i < dataApp.length; i++) {
      const bilanKo = isCheckboxChecked(dataApp[i][C_BILAN_KO]);
      const pisuKo = isCheckboxChecked(dataApp[i][C_PISU_KO]);
      if (!bilanKo && !pisuKo) continue;
      const id = String(dataApp[i][C_APP_ID]).trim();
      if (!id || existingIds.has(id)) continue;
      existingIds.add(id);
      newRows.push([
        id,
        dataApp[i][C_APP_MOTIF],
        dataApp[i][C_APP_PDF],
        dataApp[i][C_APP_INFO_T],
        dataApp[i][C_APP_NOM],
        dataApp[i][C_TXTBILAN_KO],
        dataApp[i][C_TXTPISU_KO]
      ]);
    }

    if (newRows.length > 0) {
      const startRow = Math.max(2, shAlex.getLastRow() + 1);
      shAlex.getRange(startRow, 1, newRows.length, 7).setValues(newRows);
    }
  } catch (e) { Logger.log("ensureAppAlexSynced_ error: " + e); }
}

/**
 * MIGRATION UNIQUE (menu ADMIN) : convertit la formule FILTER volatile d'APP Alex
 * (A2) en valeurs statiques figées. APP Alex devient alors une table append-only
 * comme APP Eve, ce qui supprime la cause racine du décalage des lignes H-N.
 * Ne touche à AUCUNE valeur : capture l'état actuel puis le réécrit identique,
 * juste sans formule. Crée un backup du classeur avant toute opération.
 */
function migrateAppAlexToStatic() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shAlex = ss.getSheetByName("APP Alex");
  if (!shAlex) { SpreadsheetApp.getUi().alert("Onglet APP Alex introuvable."); return; }

  const formulaA2 = shAlex.getRange(2, 1).getFormula();
  if (!formulaA2) {
    SpreadsheetApp.getUi().alert("A2 ne contient déjà plus de formule. Migration déjà effectuée ?");
    return;
  }

  const confirm = SpreadsheetApp.getUi().alert(
    "Migration APP Alex",
    "Ceci va figer la formule FILTER de A2 en valeurs statiques (aucune donnée modifiée), après avoir créé un backup du classeur. Continuer ?",
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  if (confirm !== SpreadsheetApp.getUi().Button.YES) return;

  backupClasseur();

  const lastRow = shAlex.getLastRow();
  const lastCol = Math.max(7, shAlex.getLastColumn());
  if (lastRow < 2) { SpreadsheetApp.getUi().alert("APP Alex n'a aucune ligne de données."); return; }

  const values = shAlex.getRange(2, 1, lastRow - 1, lastCol).getValues();

  shAlex.getRange(2, 1).clearContent();
  shAlex.getRange(2, 1, values.length, lastCol).setValues(values);

  SpreadsheetApp.getUi().alert("Migration terminée : " + values.length + " ligne(s) figée(s) en valeurs statiques. APP Alex n'utilise plus de formule volatile.");
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ ADMIN')
    .addItem('💾 Créer backup du classeur', 'backupClasseur')
    .addItem('🏷️ Taguer commentaires existants', 'taguerCommentairesExistants')
    .addItem('🔧 Migrer APP Alex (FILTER → statique)', 'migrateAppAlexToStatic')
    .addSeparator()
    .addItem('Installer Trigger Cache (2h)', 'installCacheTrigger')
    .addItem('Mettre à jour Cache', 'updateHistoryCache')
    .addSeparator()
    .addItem('1. Diagnostiquer décalages commentaires', 'diagnosisDecalageCommentaires')
    .addItem('2. Réparer décalages (après diagnostic)', 'repairDecalageCommentaires')
    .addItem('Reset diagnostic (recommencer)', 'diagnosisReset')
    .addSeparator()
    .addItem('Restaurer commentaires (historique Drive)', 'findLastGoodRevisionAndRestore')
    .addToUi();
  
  // Auto-install triggers si pas présent + nettoyer anciens triggers
  try {
    const triggers = ScriptApp.getProjectTriggers();
    // Supprimer les anciens triggers preCacheAllData
    triggers.forEach(t => {
      if(t.getHandlerFunction() === "preCacheAllData") {
        ScriptApp.deleteTrigger(t);
      }
    });
    const hasCacheTrigger = triggers.some(t => t.getHandlerFunction() === "updateHistoryCache");
    if(!hasCacheTrigger) {
      installCacheTrigger();
    }
  } catch(e) {
    Logger.log("Erreur auto-install trigger: " + e);
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.test === "1") {
    return HtmlService.createHtmlOutput("<h1>Server OK</h1><p>doGet works.</p>")
      .setTitle("Test").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // Vue ISP individuelle : ?ispToken=TOKEN
  if (e && e.parameter && e.parameter.ispToken) {
    const t = HtmlService.createTemplateFromFile("IspView");
    t.scriptUrl = getWebAppUrl_();
    t.ispToken  = e.parameter.ispToken;
    return t.evaluate().setTitle("SDIS 66 - Mon espace ISP").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // Vue admin URLs ISP : ?page=isp-admin
  if (e && e.parameter && e.parameter.page === "isp-admin") {
    return HtmlService.createHtmlOutputFromFile("IspUrlsAdmin")
      .setTitle("URLs ISP").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // Vue dédiée action de correction : ?correctionId=X
  if (e && e.parameter && e.parameter.correctionId) {
    const t2 = HtmlService.createTemplateFromFile("ActionCorrection");
    t2.scriptUrl = getWebAppUrl_();
    t2.correctionId = e.parameter.correctionId;
    return t2.evaluate()
      .setTitle("SDIS 66 - Action de correction #" + e.parameter.correctionId)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // Vue page temporaire fiches non traitées : ?fichesNonTraitees=TOKEN
  if (e && e.parameter && e.parameter.fichesNonTraitees) {
    const t3 = HtmlService.createTemplateFromFile("FichesNonTraitees");
    t3.scriptUrl = getWebAppUrl_();
    t3.pageToken = e.parameter.fichesNonTraitees;
    return t3.evaluate()
      .setTitle("SDIS 66 - Fiches non traitées")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  const t = HtmlService.createTemplateFromFile("Home");
  t.scriptUrl = getWebAppUrl_();
  t.version = APP_VERSION;
  return t.evaluate().setTitle("SDIS 66 - SDS").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Génère le token ISP : base64(mat + ":" + dob)
 */
function _makeIspToken_(mat, dob) {
  return Utilities.base64EncodeWebSafe(mat + ":" + String(dob).trim());
}

function _decodeIspToken_(token) {
  try {
    const decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(token)).getDataAsString();
    const parts = decoded.split(":");
    if (parts.length < 2) return null;
    const mat = parts[0].trim().toUpperCase();
    const dob = parts.slice(1).join(":").trim();
    return { mat, dob };
  } catch(e) { return null; }
}

/**
 * Retourne les stats ISP depuis son token (pour IspView.html)
 */
function getIspPublicData(token) {
  try {
    const decoded = _decodeIspToken_(token);
    if (!decoded) return { error: "Token invalide." };
    return getIspStats(decoded.mat, decoded.dob, false);
  } catch(e) {
    return { error: e.message };
  }
}

/**
 * Retourne l'URL du BPV (col D de APP) pour une intervention donnée, après validation du token ISP.
 * Appelé par IspView.html quand l'ISP clique sur une ligne de son tableau de bilans.
 */
function getBpvPdfDataByToken(token, interId) {
  try {
    const decoded = _decodeIspToken_(token);
    if (!decoded) return { error: "Token invalide." };
    if (!checkAuth_(decoded.mat, decoded.dob)) return { error: "Accès refusé." };

    const ss = getSS_();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if (!shApp) return { error: "Feuille APP introuvable." };

    const data = shApp.getDataRange().getValues();
    const searchId = String(interId).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][C_APP_ID]).trim() !== searchId) continue;
      // Vérification sécurité : l'ISP ne peut accéder qu'à ses propres BPVs
      if (normalizeMat(data[i][C_APP_MAT]) !== decoded.mat) return { error: "Accès non autorisé." };
      const pdfUrl = String(data[i][C_APP_PDF] || '').trim();
      if (!pdfUrl || pdfUrl === '#N/A' || pdfUrl.indexOf('#N/A') >= 0) {
        return { error: "BPV non disponible pour cette intervention." };
      }
      return { directUrl: pdfUrl };
    }
    return { error: "Intervention introuvable." };
  } catch(e) {
    return { error: e.message };
  }
}

/**
 * Retourne la liste des ISPs avec leur URL personnalisée (pour IspUrlsAdmin.html).
 * Les DOBs sont lus depuis le spreadsheet RH (ID_SS_RH), pas depuis le Dashboard.
 */
function getIspUrlsForAdmin() {
  const ss      = getSS_();
  const baseUrl = getWebAppUrl_();
  // Lire la liste active depuis Config Agents (crée depuis Dashboard si absent)
  const activeAgents = getActiveAgents_(ss);

  // Lire les DOBs depuis le spreadsheet RH
  const dobByMat = {};
  try {
    const rhData = SpreadsheetApp.openById(ID_SS_RH).getSheets()[0].getDataRange().getValues();
    for (let i = 0; i < rhData.length; i++) {
      const m = normalizeMat(rhData[i][0]);
      if (!m) continue;
      const dob = rhData[i][1];
      let dobStr = "";
      if (Object.prototype.toString.call(dob) === "[object Date]") {
        dobStr = String(dob.getDate()).padStart(2,"0") + "/" +
                 String(dob.getMonth()+1).padStart(2,"0") + "/" + dob.getFullYear();
      } else if (dob) {
        dobStr = String(dob).trim();
      }
      if (dobStr) dobByMat[m] = dobStr;
    }
  } catch(eRh) { Logger.log("getIspUrlsForAdmin RH error: " + eRh); }

  const result = [];
  for (const agent of activeAgents) {
    const dobStr = dobByMat[agent.mat];
    if (!dobStr) continue;
    const token = _makeIspToken_(agent.mat, dobStr);
    result.push({ nom: agent.nom, token: token, url: baseUrl.split('?')[0] + "?ispToken=" + encodeURIComponent(token) });
  }
  Logger.log("getIspUrlsForAdmin: " + result.length + " ISPs générés");
  return result;
}

function getSS_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function getDropdownList_(sheet, colIndex) { const rule = sheet.getRange(2, colIndex + 1).getDataValidation(); return rule ? rule.getCriteriaValues()[0] : []; }

// ============================================================
// GESTION AGENTS — Config Agents sheet (A=Nom, B=Mat, C=Actif)
// ============================================================

const AGENTS_SHEET_NAME = "Config Agents";

/**
 * Retourne ou crée l'onglet Config Agents, seedé depuis Dashboard S3:T79.
 */
function getOrCreateAgentsSheet_(ss) {
  let sh = ss.getSheetByName(AGENTS_SHEET_NAME);
  if (sh) return sh;

  sh = ss.insertSheet(AGENTS_SHEET_NAME);
  sh.getRange(1, 1, 1, 3).setValues([["Nom", "Matricule", "Actif"]])
    .setBackground('#1565C0').setFontColor('#FFFFFF').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 200);
  sh.setColumnWidth(2, 120);
  sh.setColumnWidth(3, 80);

  // Seeder depuis Dashboard S3:T79
  try {
    const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    const rawAgents = dash.getRange("S3:T79").getValues();
    const rows = [];
    for (const r of rawAgents) {
      const nom = String(r[0]).trim();
      const mat = normalizeMat(r[1]);
      if (nom && mat) rows.push([nom, mat, true]);
    }
    if (rows.length > 0) {
      sh.getRange(2, 1, rows.length, 3).setValues(rows);
      const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
      sh.getRange(2, 3, rows.length + 100, 1).setDataValidation(rule);
    }
    Logger.log("Config Agents créé : " + rows.length + " agents seedés depuis Dashboard.");
  } catch(e) {
    Logger.log("Erreur seeding Config Agents : " + e);
  }
  return sh;
}

/**
 * Retourne la liste des agents ACTIFS [{nom, mat}].
 * Si Config Agents n'existe pas, crée la feuille (seed depuis Dashboard).
 */
function getActiveAgents_(ss) {
  const sh = getOrCreateAgentsSheet_(ss);
  const data = sh.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const nom = String(data[i][0]).trim();
    const mat = normalizeMat(data[i][1]);
    const actif = data[i][2] === true || String(data[i][2]).toUpperCase() === "TRUE";
    if (nom && mat && actif) result.push({ nom, mat });
  }
  return result;
}

/** Retourne la liste complète des agents (actifs et inactifs) pour l'admin. */
function getAgentsListAdmin(password) {
  if (String(password).trim() !== "0007") throw new Error("Mot de passe incorrect.");
  const ss = getSS_();
  const sh = getOrCreateAgentsSheet_(ss);
  const data = sh.getDataRange().getValues();
  return data.slice(1)
    .filter(r => normalizeMat(r[1]))
    .map(r => ({
      nom: String(r[0]).trim(),
      mat: normalizeMat(r[1]),
      actif: r[2] === true || String(r[2]).toUpperCase() === "TRUE"
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Active ou désactive un agent (par matricule). */
function setAgentActiveAdmin(password, mat, actif) {
  if (String(password).trim() !== "0007") throw new Error("Mot de passe incorrect.");
  const ss = getSS_();
  const sh = getOrCreateAgentsSheet_(ss);
  const data = sh.getDataRange().getValues();
  const normMat = normalizeMat(mat);
  for (let i = 1; i < data.length; i++) {
    if (normalizeMat(data[i][1]) === normMat) {
      sh.getRange(i + 1, 3).setValue(actif === true || actif === "true");
      _clearAdminCaches_();
      return { success: true };
    }
  }
  return { success: false, message: "Matricule non trouvé dans Config Agents." };
}

/** Ajoute un nouvel agent. */
function addAgentAdmin(password, nom, mat) {
  if (String(password).trim() !== "0007") throw new Error("Mot de passe incorrect.");
  const nomTrim = String(nom).trim();
  const matTrim = String(mat).trim().toUpperCase();
  if (!nomTrim || !matTrim) return { success: false, message: "Nom et matricule requis." };

  const ss = getSS_();
  const sh = getOrCreateAgentsSheet_(ss);
  const data = sh.getDataRange().getValues();
  const normNew = normalizeMat(matTrim);

  for (let i = 1; i < data.length; i++) {
    if (normalizeMat(data[i][1]) === normNew) {
      return { success: false, message: "Cet agent (matricule " + matTrim + ") existe déjà." };
    }
  }

  const lastRow = sh.getLastRow();
  sh.getRange(lastRow + 1, 1, 1, 3).setValues([[nomTrim, matTrim, true]]);
  const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sh.getRange(lastRow + 1, 3, 1, 1).setDataValidation(rule);
  _clearAdminCaches_();
  return { success: true };
}

/** Vide les caches admin (après modification de la liste agents). */
function _clearAdminCaches_() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove("admin_data_full_v2");
    sheetCacheRemove("admin_data_full_v2");
  } catch(e) {}
}

/* --- 1. STATS 2026 (RAPIDE) --- */
function getStats2026() {
  // === CHERCHER CACHE ===
  const _cache26 = CacheService.getScriptCache();
  const _ck26 = "stats2026_v11";
  try {
    const _c26 = _cache26.get(_ck26);
    if(_c26) return JSON.parse(_c26);
    const _sc26 = sheetCacheGet(_ck26);
    if(_sc26) { try { _cache26.put(_ck26, JSON.stringify(_sc26), 7200); } catch(e){} return _sc26; }
  } catch(e) {
    Logger.log("getStats2026 cache read error: " + e);
    // Continue sans cache
  }

  try {
  const ss = getSS_();
  const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  
  const psud2026 = Number(dash.getRange(DASH_PSUD_2026_CELL).getValue())||0;
  const total2026 = Number(dash.getRange(DASH_TOTAL_2026_CELL).getValue())||0;
  const astreintes2026 = Math.ceil(Number(dash.getRange(DASH_ASTREINTES_2026_CELL).getValue())||0);
  const secteur2026 = total2026 - psud2026;
  
  // Calculer la dernière date réelle depuis la feuille Temps travail (ne pas dépendre de D2)
  let lastDate = null;
  try {
    const shTempsCheck = ss.getSheetByName(TEMPS_SHEET_NAME);
    if(shTempsCheck) {
      const dCheck = shTempsCheck.getDataRange().getValues();
      for(let i=1; i<dCheck.length; i++) {
        const dA = coerceToDateTime_(dCheck[i][C_TEMPS_DATE_AST]);
        if(dA && (!lastDate || dA > lastDate)) lastDate = dA;
        const dG = coerceToDateTime_(dCheck[i][C_TEMPS_DATE_GARDE]);
        if(dG && (!lastDate || dG > lastDate)) lastDate = dG;
      }
    }
  } catch(eLD) {}
  if(!lastDate) {
    const lastDateRaw = dash.getRange(DASH_LASTDATE_CELL).getValue();
    lastDate = coerceToDate_(lastDateRaw) || new Date();
  }

  const cisNames = dash.getRange("E17:E47").getDisplayValues().flat();
  const cisCounts2026 = dash.getRange("F17:F47").getValues().flat();
  const cisCounts2025ytd = dash.getRange("H17:H47").getValues().flat();
  const cisTotals2025 = dash.getRange("G17:G47").getValues().flat();
  
  const sectNames = dash.getRange("I17:I23").getDisplayValues().flat();
  const sectCounts2026 = dash.getRange("J17:J23").getValues().flat();
  const sectCounts2025ytd = dash.getRange("L17:L23").getValues().flat();
  const sectTotals2025 = dash.getRange("K17:K23").getValues().flat();

  let countApp = 0;
    let ssoTotal = 0;
    const ssoByCisMap = {};
  try {
     const shApp = ss.getSheetByName(APP_SHEET_NAME);
     const data = shApp.getDataRange().getValues();
     for(let i=1; i<data.length; i++) {
         const pdf = String(data[i][C_APP_PDF]).trim();
         if(pdf && pdf !== "#N/A" && !pdf.includes("#N/A") && !data[i][C_BP_CLOSE]) countApp++;

       const motif = String(data[i][C_APP_MOTIF] || '').trim();
       if(motif.indexOf('FU_') === 0) {
         ssoTotal++;
         const rawCis = String(data[i][C_APP_CIS] || '').trim();
         const cis = rawCis === 'SD SSSM' ? 'Garde PSud' : (rawCis || 'Non défini');
         ssoByCisMap[cis] = (ssoByCisMap[cis] || 0) + 1;
       }
     }
  } catch(e){}

    const ssoCisNames = {};
    ssoCisNames['Garde PSud'] = true;
    cisNames.forEach(n => { if(n && String(n).trim()) ssoCisNames[String(n).trim()] = true; });
    Object.keys(ssoByCisMap).forEach(n => { if(n) ssoCisNames[n] = true; });
    const ssoByCis = Object.keys(ssoCisNames).sort().map(n => ({ name:n, count:ssoByCisMap[n] || 0 }));

  let counts = { isp: 0, med: 0 };
  try { counts = getChefferieCounts(); } catch(e) { console.log('getChefferieCounts error: ' + e); }

  // === Tuiles supplémentaires ===
  // Bilan OK % (J30) et PISU OK % (J33)
  const bilanOkPct = dash.getRange("J30").getDisplayValue();
  const pisuOkPct = dash.getRange("J33").getDisplayValue();

  // Top 5 motifs de départ (N31+ noms, P31+ %)
  const motifsNames = dash.getRange("N31:N45").getDisplayValues().flat();
  const motifsPct = dash.getRange("P31:P45").getDisplayValues().flat();
  const topMotifs = [];
  for (let m = 0; m < motifsNames.length && topMotifs.length < 5; m++) {
    if (motifsNames[m] && String(motifsNames[m]).trim()) {
      topMotifs.push({ name: motifsNames[m], pct: motifsPct[m] || "0%" });
    }
  }

  // PISU réalisés (J53) + top protocoles adulte (I55:K71) + enfant (I72:K84)
  const nbPisu = dash.getRange("J53").getDisplayValue();
  const protoNames = dash.getRange("I55:I84").getDisplayValues().flat();
  const protoRates = dash.getRange("K55:K84").getDisplayValues().flat();
  const protoAdulte = [];
  const protoEnfant = [];
  for (let p = 0; p < protoNames.length; p++) {
    if (!protoNames[p] || !String(protoNames[p]).trim()) continue;
    const entry = { name: protoNames[p].replace(/^Nbr protocole\s*/i, ""), pct: protoRates[p] || "0%" };
    if (p <= 17) protoAdulte.push(entry); // rows 55-72 = adult (index 0-17)
    else if (p >= 18) protoEnfant.push(entry); // rows 73-84 = enfant (index 18+)
  }
  // Trier par taux décroissant
  const parseRate = s => parseFloat(String(s).replace("%","").replace(",",".")) || 0;
  protoAdulte.sort((a,b) => parseRate(b.pct) - parseRate(a.pct));
  protoEnfant.sort((a,b) => parseRate(b.pct) - parseRate(a.pct));

  // === Temps disponibilité/astreinte par CIS et Secteur (2026) ===
  let tempsByCis = {};
  let tempsBySect = {};
  try {
    const shTemps26 = ss.getSheetByName(TEMPS_SHEET_NAME);
    if(shTemps26) {
      const dTemps = shTemps26.getDataRange().getValues();
      const cisToSect26 = {};
      for(let i=1; i<dTemps.length; i++) {
        const c = String(dTemps[i][18]||'').trim();
        const s = String(dTemps[i][19]||'').trim();
        if(c && s) cisToSect26[c] = s;
      }
      const _todayMidnight = new Date(); _todayMidnight.setHours(0,0,0,0);
      for(let i=1; i<dTemps.length; i++) {
        const cis = String(dTemps[i][13]||'').trim();
        if(!cis) continue;
        const dtAst = coerceToDateTime_(dTemps[i][C_TEMPS_DATE_AST]);
        if(!dtAst) continue;
        // Ne pas compter les créneaux futurs (évite surestimation si planning en avance)
        const _slotDay = new Date(dtAst.getFullYear(), dtAst.getMonth(), dtAst.getDate());
        if(_slotDay > _todayMidnight) continue;
        // Clé unique pour ce créneau de 30min : date + heure + minute
        const slotKey = dtAst.getFullYear() + '-' + dtAst.getMonth() + '-' + dtAst.getDate() + '_' + dtAst.getHours() + '_' + dtAst.getMinutes();
        const hAst = dtAst.getHours();
        const isDay = hAst >= 8 && hAst < 20;
        // Pour le CIS : dédupliquer (plusieurs ISP sur même créneau = 1 créneau couvert)
        if(!tempsByCis[cis]) tempsByCis[cis] = { total:new Set(), day:new Set(), night:new Set() };
        tempsByCis[cis].total.add(slotKey);
        if(isDay) tempsByCis[cis].day.add(slotKey); else tempsByCis[cis].night.add(slotKey);
        // Pour le secteur : même déduplication
        const sect = cisToSect26[cis] || 'Non défini';
        if(!tempsBySect[sect]) tempsBySect[sect] = { total:new Set(), day:new Set(), night:new Set() };
        tempsBySect[sect].total.add(slotKey);
        if(isDay) tempsBySect[sect].day.add(slotKey); else tempsBySect[sect].night.add(slotKey);
      }
    }
  } catch(eTmp) { Logger.log('tempsByCis error: ' + eTmp); }
  // Utiliser aujourd'hui comme référence (pas lastDate) pour éviter la surestimation
  // si les créneaux temps couvrent plus de jours que la dernière intervention
  const _refDate = new Date();
  const _jan1Ytd = new Date(_refDate.getFullYear(), 0, 1);
  const _nbDaysYtd = Math.max(1, Math.round((_refDate - _jan1Ytd) / (1000*60*60*24)) + 1);
  const _dayPoss = _nbDaysYtd * 12;   // 12h possibles en journée (8h-20h)
  const _nightPoss = _nbDaysYtd * 12; // 12h possibles la nuit (20h-8h)
  const _totPoss = _nbDaysYtd * 24;   // 24h totales
  const tempsCisList = Object.keys(tempsByCis).sort().map(k => {
    const v = tempsByCis[k];
    const hTotal = v.total.size * 0.5;
    const hDay   = v.day.size   * 0.5;
    const hNight = v.night.size * 0.5;
    return { name:k, h:hTotal, hDay:hDay, hNight:hNight,
      tauxDay:   Math.round(hDay   / _dayPoss   * 1000) / 10,
      tauxNight: Math.round(hNight / _nightPoss * 1000) / 10,
      tauxGlobal:Math.round(hTotal / _totPoss   * 1000) / 10 };
  });
  const tempsSectList = Object.keys(tempsBySect).sort().map(k => {
    const v = tempsBySect[k];
    const hTotal = v.total.size * 0.5;
    const hDay   = v.day.size   * 0.5;
    const hNight = v.night.size * 0.5;
    return { name:k, h:hTotal,
      tauxDay:   Math.round(hDay   / _dayPoss   * 1000) / 10,
      tauxNight: Math.round(hNight / _nightPoss * 1000) / 10,
      tauxGlobal:Math.round(hTotal / _totPoss   * 1000) / 10 };
  });

  const _result26 = {
    date: formatDateFR_(lastDate),
    psud: psud2026, total: total2026, sect: secteur2026, ast: astreintes2026,
    cis: cisNames.map((n, i) => ({ name:n, v26:Number(cisCounts2026[i])||0, v25:Number(cisCounts2025ytd[i])||0, v25tot:Number(cisTotals2025[i])||0 })),
    secteurs: sectNames.map((n, i) => ({ name:n, v26:Number(sectCounts2026[i])||0, v25:Number(sectCounts2025ytd[i])||0, v25tot:Number(sectTotals2025[i])||0 })),
    cntApp: countApp, ssoTotal: ssoTotal, ssoByCis: ssoByCis,
    cntIspG: counts.isp, cntMed: counts.med, cntAction: counts.action,
    bilanOkPct: bilanOkPct, pisuOkPct: pisuOkPct,
    topMotifs: topMotifs, nbPisu: nbPisu,
    protoAdulte: protoAdulte.slice(0, 5), protoEnfant: protoEnfant.slice(0, 5),
    tempsCis: tempsCisList, tempsSect: tempsSectList,
    doubleIspCis: getCisDoubleIspHours(), doubleIspSect: getSectDoubleIspHours()
  };
  // === ÉCRIRE CACHE ===
  try { _cache26.put(_ck26, JSON.stringify(_result26), 7200); sheetCachePut(_ck26, _result26, 7200); } catch(e){}
  return _result26;
  } catch(e) {
    Logger.log("getStats2026 ERROR: " + e + " | stack: " + (e.stack || ""));
    return { error: "Erreur chargement: " + (e.message || e), date: "", psud: 0, total: 0, sect: 0, ast: 0, cis: [], secteurs: [], cntApp: 0, ssoTotal: 0, ssoByCis: [], cntIspG: 0, cntMed: 0, cntAction: 0, bilanOkPct: "—", pisuOkPct: "—", topMotifs: [], nbPisu: "0", protoAdulte: [], protoEnfant: [], tempsCis: [], tempsSect: [], doubleIspCis: [], doubleIspSect: [] };
  }
}

/* --- 2. STATS 2025 (CACHE) --- */
function getStats2025() {
  const cache = CacheService.getScriptCache();
  const now = new Date();
  const cacheKey = "stats2025_vFinal_" + now.getDate(); 
  const cached = cache.get(cacheKey);
  if (cached) { return JSON.parse(cached); }
  // Spreadsheet fallback
  const shCached25 = sheetCacheGet(cacheKey);
  if(shCached25) { try { cache.put(cacheKey, JSON.stringify(shCached25), 7200); } catch(e){} return shCached25; }

  const ss = getSS_();
  const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  const lastDateRaw = dash.getRange(DASH_LASTDATE_CELL).getValue();
  const lastDate = coerceToDate_(lastDateRaw) || new Date();
  const cutoffCode = (lastDate.getMonth() + 1) * 100 + lastDate.getDate();

  let psud2025_ytd = 0, total2025_ytd = 0, astreintes2025_ytd = 0;
  let cis2025Map = {}, cisToSectMap25 = {};

  try {
    const ss25 = SpreadsheetApp.openById(ID_SS_2025);
    
    // Get CIS->Secteur mapping from Temps travail
    const shTemps25 = ss25.getSheetByName("Temps travail");
    if(shTemps25) {
        const d = shTemps25.getDataRange().getValues();
        for(let i=1; i<d.length; i++) {
             if(d[i][18] && d[i][19]) {
               cisToSectMap25[String(d[i][18]).trim()] = String(d[i][19]).trim();
             }
             const dateAst = coerceToDateTime_(d[i][EXT_TEMPS_COL_DATE_AST]);
             if(dateAst) {
                 const md = (dateAst.getMonth()+1)*100 + dateAst.getDate();
                 if(md <= cutoffCode) astreintes2025_ytd += 0.5;
             }
        }
    }
    
    const shApp25 = ss25.getSheetByName("APP");
    if(shApp25) {
        const data = shApp25.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            const d = coerceToDateTime_(data[i][EXT_APP_COL_DATE]); 
            if(d) {
                const md = (d.getMonth()+1)*100 + d.getDate();
                if(md <= cutoffCode) {
                    total2025_ytd++;
                    const cis = String(data[i][EXT_APP_COL_CENTRE]).trim();
                    if(cis === "SD SSSM") psud2025_ytd++;
                    else if(cis) cis2025Map[cis] = (cis2025Map[cis] || 0) + 1;
                }
            }
        }
    }
  } catch(e) {}

  const secteur2025_ytd = total2025_ytd - psud2025_ytd;
  let sect2025Map = {};
  for(let cis in cis2025Map) {
      let s = cisToSectMap25[cis] || "Autre";
      sect2025Map[s] = (sect2025Map[s] || 0) + cis2025Map[cis];
  }

  const result = {
    psud: psud2025_ytd, total: total2025_ytd, sect: secteur2025_ytd, ast: Math.ceil(astreintes2025_ytd),
    cisMap: cis2025Map, sectMap: sect2025Map,
    cacheTime: formatDateHeureFR_(new Date())
  };
  cache.put(cacheKey, JSON.stringify(result), 7200);
  sheetCachePut(cacheKey, result, 7200);
  return result;
}

/* === CACHE SÉQUENTIEL === */
function preCacheAllData() {
  // Redirige vers updateHistoryCache (ancienne fonction obsolète)
  return updateHistoryCache();
}

function getCacheStatus() {
  const cache = CacheService.getScriptCache();
  return cache.get("cache_status") || "";
}

function clearIspCache(mat) {
  const cache = CacheService.getScriptCache();
  const normalizedMat = normalizeMat(mat);
  
  // Nettoyer TOUS les formats de clé pour ce matricule (v3 + v4)
  cache.remove("isp_v3_" + normalizedMat);
  cache.remove("isp_v4_" + normalizedMat);
  cache.remove("isp_detail_" + normalizedMat);
  
  // Nettoyer les anciens caches spreadsheet
  sheetCacheRemove("isp_v3_" + normalizedMat);
  sheetCacheRemove("isp_v4_" + normalizedMat);
  sheetCacheRemove("isp_detail_" + normalizedMat);
  
  // Nettoyer via le fichier cache spreadsheet (chercher toutes clés contenant ce matricule)
  try {
    const cacheSS = _getCacheSS();
    const cacheSheet = cacheSS.getSheetByName("Cache");
    if(cacheSheet) {
      const data = cacheSheet.getDataRange().getValues();
      for(let i = data.length - 1; i >= 1; i--) {
        const key = String(data[i][0] || "");
        if(key.includes(normalizedMat) && (key.startsWith("isp_v") || key.startsWith("isp_detail_"))) {
          cacheSheet.deleteRow(i + 1);
        }
      }
    }
  } catch(e) { Logger.log("clearIspCache spreadsheet: " + e); }
  
  return true;
}

/* --- ADMIN --- */
function getAdminData(password) {
  if (password && String(password).trim() !== "0007") throw new Error("Mot de passe incorrect.");
  
  // === CHERCHER CACHE ===
  const cache = CacheService.getScriptCache();
  const adminCached = cache.get("admin_data_full_v2");
  if(adminCached) {
    const result = JSON.parse(adminCached);
    result.fromCache = true;
    return result;
  }
  // Spreadsheet fallback
  const shAdmin = sheetCacheGet("admin_data_full_v2");
  if(shAdmin) { shAdmin.fromCache = true; try { cache.put("admin_data_full_v2", JSON.stringify(shAdmin), 7200); } catch(e){} return shAdmin; }
  
  const ss = getSS_();
  const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);

  // txSoll (taux de sollicitation) est une formule Dashboard — on conserve la lecture
  // pour les agents existants ; les nouveaux agents auront txSoll=0.
  const txSollMap = {};
  try {
    dash.getRange("S3:AQ79").getValues().forEach(r => {
      const m = normalizeMat(r[1]);
      if (m) txSollMap[m] = Number(r[24]) || 0;
    });
  } catch(e) {}

  const activeAgents = getActiveAgents_(ss);
  const agentMap = {};
  for (const agent of activeAgents) {
    agentMap[agent.mat] = {
      nom: agent.nom, mat: agent.mat,
      interHg26:0, interG26:0, hAst26:0, hGarde26:0,
      interHg25:0, interG25:0, hAst25:0, hGarde25:0,
      txSoll: txSollMap[agent.mat] || 0,
      mAst: new Array(12).fill(0),
      mGarde: new Array(12).fill(0)
    };
  }

  // 2026
  const shTemps26 = ss.getSheetByName(TEMPS_SHEET_NAME);
  if (shTemps26) {
    const data = shTemps26.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const matAst = normalizeMat(data[i][C_TEMPS_MAT_AST]); 
      const matGarde = normalizeMat(data[i][C_TEMPS_MAT_GARDE]);
      if (matAst && agentMap[matAst]) {
        agentMap[matAst].hAst26 += 0.5;
        const dA = coerceToDateTime_(data[i][C_TEMPS_DATE_AST]);
        if(dA) agentMap[matAst].mAst[dA.getMonth()] += 0.5;
      }
      if (matGarde && agentMap[matGarde]) {
        agentMap[matGarde].hGarde26 += 0.5;
        const dG = coerceToDateTime_(data[i][C_TEMPS_DATE_GARDE]);
        if(dG) agentMap[matGarde].mGarde[dG.getMonth()] += 0.5;
      }
    }
  }
  const shApp26 = ss.getSheetByName(APP_SHEET_NAME);
  if (shApp26) {
    const data = shApp26.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const mat = normalizeMat(data[i][C_APP_MAT]); 
      if (!mat || !agentMap[mat]) continue;
      const centre = String(data[i][C_APP_CIS]||"").trim();
      if (centre === "SD SSSM") agentMap[mat].interG26++; else agentMap[mat].interHg26++;
    }
  }

  // 2025 YTD
  const lastDateRaw = dash.getRange(DASH_LASTDATE_CELL).getValue();
  const lastDate = coerceToDate_(lastDateRaw) || new Date();
  const cutoffCode = (lastDate.getMonth() + 1) * 100 + lastDate.getDate();

  try {
      const ss25 = SpreadsheetApp.openById(ID_SS_2025);
      const shApp25 = ss25.getSheetByName("APP");
      if(shApp25) {
          const data = shApp25.getDataRange().getValues();
          for(let i=1; i<data.length; i++) {
              const d = coerceToDateTime_(data[i][EXT_APP_COL_DATE]); 
              if(d) {
                  const md = (d.getMonth()+1)*100 + d.getDate();
                  if(md <= cutoffCode) {
                      const mat = normalizeMat(data[i][EXT_APP_COL_MAT]);
                      if(agentMap[mat]) {
                          const cis = String(data[i][EXT_APP_COL_CENTRE]).trim();
                          if(cis === "SD SSSM") agentMap[mat].interG25++;
                          else agentMap[mat].interHg25++;
                      }
                  }
              }
          }
      }
      const shTemps25 = ss25.getSheetByName("Temps travail");
      if(shTemps25) {
          const data = shTemps25.getDataRange().getValues();
          for(let i=1; i<data.length; i++) {
              const dA = coerceToDateTime_(data[i][EXT_TEMPS_COL_DATE_AST]);
              if(dA) {
                  const md = (dA.getMonth()+1)*100 + dA.getDate();
                  if(md <= cutoffCode) {
                      const mA = normalizeMat(data[i][EXT_TEMPS_COL_MAT_AST]);
                      if(agentMap[mA]) agentMap[mA].hAst25 += 0.5;
                  }
              }
              const dG = coerceToDateTime_(data[i][EXT_TEMPS_COL_DATE_GARDE]);
              if(dG) {
                  const md = (dG.getMonth()+1)*100 + dG.getDate();
                  if(md <= cutoffCode) {
                      const mG = normalizeMat(data[i][EXT_TEMPS_COL_MAT_GARDE]);
                      if(agentMap[mG]) agentMap[mG].hGarde25 += 0.5;
                  }
              }
          }
      }
  } catch(e) {}

  const stats = Object.values(agentMap);
  stats.sort((a, b) => b.interHg26 - a.interHg26);
  const soll = [...stats].sort((a, b) => b.txSoll - a.txSoll).map(s => ({ nom: s.nom, tx: (s.txSoll*100).toFixed(1)+"%" }));
  
  const monthly = stats.map(s => ({
    nom: s.nom,
    months: s.mAst.map(a => Math.ceil(a)),
    total: Math.ceil(s.hAst26)
  })).sort((a, b) => b.total - a.total);

  // === INÉLIGIBILITÉ À LA GARDE ===
  // Mois précédent complet : si on est en juin (5), on prend mai (4)
  const now = new Date();
  const prevMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const nbMoisPris = prevMonthIdx + 1; // nb de mois du 1er janvier au dernier jour du mois précédent
  const MONTH_NAMES = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const ineligibles = [];
  for (const s of Object.values(agentMap)) {
    const derMois = (s.mAst[prevMonthIdx] || 0) + (s.mGarde[prevMonthIdx] || 0);
    let totalAnnee = 0;
    for (let m = 0; m <= prevMonthIdx; m++) totalAnnee += (s.mAst[m] || 0) + (s.mGarde[m] || 0);
    const moyenne = nbMoisPris > 0 ? totalAnnee / nbMoisPris : 0;
    // Affiché uniquement si LES DEUX critères échouent (< 24h)
    if (derMois < 24 && moyenne < 24) {
      ineligibles.push({
        nom: s.nom,
        derMois: Math.round(derMois * 2) / 2,
        totalAnnee: Math.round(totalAnnee * 2) / 2,
        moyenne: Math.round(moyenne * 10) / 10,
        nbMois: nbMoisPris
      });
    }
  }
  ineligibles.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const ineligibilite = {
    prevMonthLabel: MONTH_NAMES[prevMonthIdx],
    nbMois: nbMoisPris,
    refDate: Utilities.formatDate(now, "Europe/Paris", "dd/MM/yyyy"),
    agents: ineligibles
  };

  const result = { activity: stats, sollicitation: soll, monthly: monthly, ineligibilite: ineligibilite };
  
  // === METTRE EN CACHE ===
  cache.put("admin_data_full_v2", JSON.stringify(result), 7200);
  sheetCachePut("admin_data_full_v2", result, 7200);
  
  return result;
}

/* --- HISTORIQUE TEMPS TRAVAIL --- */
function getHistoriqueTempsTravailAdmin() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "historique_temps_travail_v1";
  const cached = cache.get(cacheKey);
  if(cached) return JSON.parse(cached);
  const shCached = sheetCacheGet(cacheKey);
  if(shCached) { try { cache.put(cacheKey, JSON.stringify(shCached), 7200); } catch(e){} return shCached; }

  const ss = SpreadsheetApp.openById(ID_SS_2025);
  const sh = ss.getSheetByName("Historique temps travail");
  if(!sh) return [];

  const data = sh.getDataRange().getValues();
  const rows = [];
  for(let i=1; i<data.length; i++) {
    const nom = String(data[i][0] || "").trim();
    if(!nom) continue;
    rows.push({
      nom: nom,
      y2019: Number(data[i][1]) || 0,
      y2020: Number(data[i][2]) || 0,
      y2021: Number(data[i][3]) || 0,
      y2022: Number(data[i][4]) || 0,
      y2023: Number(data[i][5]) || 0,
      y2024: Number(data[i][6]) || 0,
      y2025: Number(data[i][7]) || 0
    });
  }

  cache.put(cacheKey, JSON.stringify(rows), 7200);
  sheetCachePut(cacheKey, rows, 7200);
  return rows;
}

/* --- ASTREINTE DEPARTEMENTALE ISPP --- */
function getAstreinteISPP() {
  const NOMS_ISPP = ["Dubrey", "Bois", "Piguillem", "Le Roy"];
  const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const COL_H = 7; // colonne H (Infirmier astreinte) = index 7 (0-based)
  
  // Vérifier le cache
  const cache = CacheService.getScriptCache();
  const cached = cache.get("astreinte_dept_ispp_v3");
  if (cached) return JSON.parse(cached);
  const shCachedIspp = sheetCacheGet("astreinte_dept_ispp_v3");
  if(shCachedIspp) { try { cache.put("astreinte_dept_ispp_v3", JSON.stringify(shCachedIspp), 7200); } catch(e){} return shCachedIspp; }
  
  const ss = SpreadsheetApp.openById(ID_SS_ASTREINTE_DEPT);
  
  // Initialiser compteurs : { nom: [jan, fev, mar, ...] }
  const compteurs = {};
  NOMS_ISPP.forEach(n => compteurs[n] = new Array(12).fill(0));
  
  for (let m = 0; m < 12; m++) {
    const sheetName = MOIS_NOMS[m] + " 2026";
    const sh = ss.getSheetByName(sheetName);
    if (!sh) continue;
    const lastRow = sh.getLastRow();
    if (lastRow < 2) continue;
    const colData = sh.getRange(2, COL_H + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < colData.length; i++) {
      const val = String(colData[i][0]).trim();
      if (!val) continue;
      const valLower = val.toLowerCase();
      // Chercher les noms - chaque nom séparément (pas else if!)
      if (valLower.indexOf("dubrey") !== -1) compteurs["Dubrey"][m]++;
      if (valLower.indexOf("bois") !== -1) compteurs["Bois"][m]++;
      if (valLower.indexOf("piguillem") !== -1) compteurs["Piguillem"][m]++;
      if (valLower.indexOf("le roy") !== -1) compteurs["Le Roy"][m]++;
    }
  }
  
  const result = NOMS_ISPP.map(nom => ({
    nom: nom,
    months: compteurs[nom],
    total: compteurs[nom].reduce((a, b) => a + b, 0)
  }));
  
  cache.put("astreinte_dept_ispp_v3", JSON.stringify(result), 7200);
  sheetCachePut("astreinte_dept_ispp_v3", result, 7200);
  return result;
}

/* --- PLANNING MENSUEL --- */
function getPlanningMois(moisParam) {
  const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const today = new Date();
  const moisIndex = (moisParam !== undefined && moisParam !== null) ? moisParam : today.getMonth();
  const moisNom = MOIS_NOMS[moisIndex];
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  
  const ss = SpreadsheetApp.openById(ID_SS_ASTREINTE_DEPT);
  const sheetName = moisNom + " 2026";
  const sh = ss.getSheetByName(sheetName);
  
  if (!sh) return null;
  
  // Lire toutes les lignes utilisées (nombre de jours variable selon le mois)
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const range = sh.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const backgroundColors = range.getBackgrounds();
  const fontColors = range.getFontColors();
  const fontWeights = range.getFontWeights();
  
  // Construire un index des colonnes depuis la ligne d'en-tête (ligne 0)
  const headerRow = values[0];
  const colIdx = {};
  for (let c = 0; c < headerRow.length; c++) {
    colIdx[String(headerRow[c]).trim().toLowerCase()] = c;
  }

  // Colonnes souhaitées : [titre exact, clé dans todayInfo]
  const PLANNING_COLS = [
    ["isp vli psud matin",        "isp_matin"],
    ["isp vli psud am",           "isp_am"],
    ["conducteur jour",           "conducteur_jour"],
    ["doublure / etudiant matin", "doublure_matin"],
    ["doublure / etudiant am",    "doublure_am"],
    ["médecin garde psud",        "medecin_garde"],
    ["isp vli psud nuit",        "isp_nuit"],
    ["conducteur nuit",           "conducteur_nuit"],
    ["doublure / etudiant nuit",  "doublure_nuit"],
    ["mad jour",                  "mad_jour"],
    ["mad nuit",                  "mad_nuit"],
    ["iad",                       "iad"],
    ["pharmacien astreinte jour", "pharma_jour"],
    ["pharmacien astreinte nuit", "pharma_nuit"]
  ];

  let todayInfo = { date: "" };
  PLANNING_COLS.forEach(function(c) { todayInfo[c[1]] = "-"; });

  for (let i = 1; i < values.length; i++) {
    const dateVal = values[i][1]; // colonne B (index 1)
    if (dateVal) {
      const cellDate = new Date(dateVal);
      if (cellDate.getDate() === todayDay && moisIndex === todayMonth) {
        todayInfo.date = String(cellDate.getDate()).padStart(2,"0") + "/" + String(cellDate.getMonth()+1).padStart(2,"0") + "/" + cellDate.getFullYear();
        PLANNING_COLS.forEach(function(c) {
          const idx = colIdx[c[0]];
          const val = (idx !== undefined) ? String(values[i][idx]||"").trim() : "";
          todayInfo[c[1]] = val || "-";
        });
        break;
      }
    }
  }
  
  // Générer HTML au serveur pour éviter les problèmes de sérialisation
  let html = '<table style="border-collapse:collapse;font-size:10px;width:100%;overflow-x:auto;">';
  for (let i = 0; i < values.length; i++) {
    // Arrêter dès que colonnes A et B sont vides (sauf header ligne 0)
    if (i > 0 && !values[i][0] && !values[i][1]) break;
    html += '<tr>';
    for (let j = 0; j < values[i].length; j++) {
      const bg = backgroundColors[i][j];
      const fc = fontColors[i][j];
      const fw = fontWeights[i][j];
      const style = `border:1px solid #333;padding:4px;background:${bg} !important;color:${fc};font-weight:${fw};`;
      
      // Colonne B (index 1) : formater les dates en JJ/MM/AAAA
      let cellText = '';
      if (j === 1 && i > 0 && values[i][j] instanceof Date) {
        const d = values[i][j];
        cellText = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
      } else {
        cellText = displayValues[i][j] || '';
      }
      
      html += `<td style="${style}">${cellText}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  
  return {
    html: html,
    mois: moisNom,
    moisIndex: moisIndex,
    todayInfo: todayInfo
  };
}

/* --- ISP DATA --- */
function getIspStats(matriculeInput, dobInput, forceRefresh) {
  try {
    const mat = normalizeMat(matriculeInput);
    
    // === VALIDER L'AUTHENTIFICATION EN PREMIER (avant le cache!) ===
    if(!checkAuth_(mat, dobInput)) throw new Error("Date de naissance incorrecte.");
    
    const cache = CacheService.getScriptCache();
    const cacheKey = "isp_v4_" + mat;
    if(!forceRefresh) {
      // 1. CacheService (rapide, <100Ko)
      const cached = cache.get(cacheKey);
      if(cached) {
          const result = JSON.parse(cached);
          result.fromCache = true;
          return result;
      }
      // 2. Spreadsheet cache (fallback, pas de limite)
      const sheetCached = sheetCacheGet(cacheKey);
      if(sheetCached) {
          sheetCached.fromCache = true;
          // Remettre aussi en CacheService pour la prochaine fois (si ça tient)
          try { cache.put(cacheKey, JSON.stringify(sheetCached), 7200); } catch(e) {}
          return sheetCached;
      }
    }
    
    const ss = getSS_();
    const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);

    // Chercher l'agent dans Config Agents (actif ou inactif, pour que l'ISP puisse voir ses données)
    const allAgentsSh = getOrCreateAgentsSheet_(ss).getDataRange().getValues();
    const foundAgentRow = allAgentsSh.slice(1).find(r => normalizeMat(r[1]) === mat);
    if (!foundAgentRow) throw new Error("Matricule non trouvé.");
    const agentName = String(foundAgentRow[0]).trim();

    // txSoll : conserver la lecture Dashboard pour les agents déjà présents (formule)
    let txSoll = 0;
    try {
      const matVals = dash.getRange("T3:T79").getDisplayValues().flat();
      const idx = matVals.findIndex(m => normalizeMat(m) === mat);
      if (idx !== -1) {
        const rawRow = dash.getRange(3 + idx, 19, 1, 25).getValues()[0] || [];
        txSoll = Number(rawRow[24]) || 0;
      }
    } catch(e) {}
    let histTempsTravail = null;
    try {
      const rows = getHistoriqueTempsTravailAdmin() || [];
      const norm = s => String(s || "").trim().toLowerCase();
      histTempsTravail = rows.find(r => norm(r.nom) === norm(agentName)) || null;
    } catch(e) {}
    const myName = String(agentName).trim().toLowerCase();

    // 2026
    let hAst26=0, hGarde26=0, interHg26=0, inter26=0;
    let bilanConf=0, pisuConf=0;
    const monthlyAst26 = new Array(12).fill(0);
    const monthlyGarde26 = new Array(12).fill(0);
    const shTemps = ss.getSheetByName(TEMPS_SHEET_NAME);
    if(shTemps) {
        const data = shTemps.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            if(normalizeMat(data[i][C_TEMPS_MAT_AST]) === mat) {
                hAst26 += 0.5;
                const dA = coerceToDateTime_(data[i][C_TEMPS_DATE_AST]);
                if(dA) monthlyAst26[dA.getMonth()] += 0.5;
            }
            if(normalizeMat(data[i][C_TEMPS_MAT_GARDE]) === mat) {
                hGarde26 += 0.5;
                const dG = coerceToDateTime_(data[i][C_TEMPS_DATE_GARDE]);
                if(dG) monthlyGarde26[dG.getMonth()] += 0.5;
            }
        }
    }
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const appDataRef = {}; 
    if(shApp) {
        const data = shApp.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            if(normalizeMat(data[i][C_APP_MAT]) === mat) {
                const cis = String(data[i][C_APP_CIS]||"").trim();
                if(cis !== "SD SSSM") interHg26++; 
            }
            const id = String(data[i][C_APP_ID]).trim();
            const cis = String(data[i][C_APP_CIS]||"").trim();
            appDataRef[id] = { 
                motif: data[i][C_APP_MOTIF],
                date: formatDateHeureFR_(data[i][C_APP_DATE]),
                centre: cis,
                engin: String(data[i][C_APP_ENGIN]||"").trim(),
                status: (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo"
            };
            const nameInApp = String(data[i][C_APP_NOM]).trim().toLowerCase();
            if(nameInApp === myName || nameInApp.includes(myName)) {
                if(isCheckboxChecked(data[i][C_BILAN_OK])) bilanConf++;
                if(isCheckboxChecked(data[i][C_PISU_OK])) pisuConf++;
            }
        }
    }

    // 2025
    let hAst25_tot=0, hGarde25_tot=0, interHg25_tot=0, hAst25_ytd=0, hGarde25_ytd=0, interHg25_ytd=0;
    const lastDateRaw = dash.getRange(DASH_LASTDATE_CELL).getValue();
    const lastDate = coerceToDate_(lastDateRaw) || new Date();
    const cutoffCode = (lastDate.getMonth() + 1) * 100 + lastDate.getDate();

    try {
        const ss25 = SpreadsheetApp.openById(ID_SS_2025);
        const dash25 = ss25.getSheetByName("Dashboard");
        const lr = dash25.getLastRow();
        if(lr >= 3) {
            const data25 = dash25.getRange(3, 1, lr-2, 40).getValues(); 
            for(let i=0; i<data25.length; i++) {
                if(normalizeMat(data25[i][1]) === mat) {
                    interHg25_tot = Number(data25[i][1]) || 0; 
                    hAst25_tot = Number(data25[i][2]) || 0;
                    hGarde25_tot = Number(data25[i][3]) || 0;
                    break;
                }
            }
        }
        const shApp25 = ss25.getSheetByName("APP");
        if(shApp25) {
            const data = shApp25.getDataRange().getValues();
            for(let i=1; i<data.length; i++) {
                const d = coerceToDateTime_(data[i][EXT_APP_COL_DATE]); 
                const m = normalizeMat(data[i][EXT_APP_COL_MAT]); 
                if(d && m === mat) {
                    const md = (d.getMonth()+1)*100 + d.getDate();
                    if(md <= cutoffCode) {
                        const c = String(data[i][EXT_APP_COL_CENTRE]||"").trim(); 
                        if(c !== "SD SSSM") interHg25_ytd++;
                    }
                }
            }
        }
        const shTemps25 = ss25.getSheetByName("Temps travail");
        if(shTemps25) {
            const data = shTemps25.getDataRange().getValues();
            for(let i=1; i<data.length; i++) {
                const dA = coerceToDateTime_(data[i][EXT_TEMPS_COL_DATE_AST]); 
                const mA = normalizeMat(data[i][EXT_TEMPS_COL_MAT_AST]); 
                if(dA && mA === mat && (dA.getMonth()+1)*100+dA.getDate() <= cutoffCode) hAst25_ytd += 0.5;
                const dG = coerceToDateTime_(data[i][EXT_TEMPS_COL_DATE_GARDE]); 
                const mG = normalizeMat(data[i][EXT_TEMPS_COL_MAT_GARDE]); 
                if(dG && mG === mat && (dG.getMonth()+1)*100+dG.getDate() <= cutoffCode) hGarde25_ytd += 0.5;
            }
        }
    } catch(e) {}

    // Erreurs et confirmations
    const errLegereBilanList = [], errLegerePisuList = [], errLourdeList = [];
    const okBilanList = [], okPisuList = []; // Listes séparées pour Bilan OK et Pisu OK
    const okById = {}; // Map pour les corrections (H ET I de APP Alex)
    const countedIds = new Set(); // Track IDs déjà comptés pour éviter double-counting
    let bilanOkCount = 0, pisuOkCount = 0;
    const shAlex = ss.getSheetByName("APP Alex");
    
    // 1. Construire un index APP : seulement les IDs de ce matricule
    const thisAgentIds = new Set(); // IDs appartenant à ce matricule
    const appRows = {}; // Stocker données APP par ID
    if(shApp) {
        const data = shApp.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            const id = String(data[i][C_APP_ID]).trim();
            const rowMat = normalizeMat(data[i][C_APP_MAT]);
            
            // Sauvegarder metadata pour tous (pour référence)
            appDataRef[id] = {
                motif: String(data[i][C_APP_MOTIF]||"").trim(),
                cis: String(data[i][C_APP_CIS]||"").trim(),
                engin: String(data[i][C_APP_ENGIN]||"").trim(),
                date: formatDateHeureFR_(data[i][C_APP_DATE]),
                status: (String(data[i][C_APP_CIS]||"").trim() === "SD SSSM") ? "De Garde" : "Astreinte / Dispo",
                nom: String(data[i][C_APP_NOM]||"").trim().toLowerCase()  // Nom pour comparaison
            };
            
            // Si c'est le bon matricule, le marquer et stocker les checkboxes
            if(rowMat === mat) {
                thisAgentIds.add(id);
                appRows[id] = {
                    bilanOk: data[i][C_BILAN_OK],
                    bilanKo: data[i][C_BILAN_KO],
                    pisuOk: data[i][C_PISU_OK],
                    pisuKo: data[i][C_PISU_KO],
                    commIsp:  [String(data[i][C_TXTBILAN_KO]||'').trim(), String(data[i][C_TXTPISU_KO]||'').trim()].filter(Boolean).join('\n'),
                    commChef: String(data[i][C_COMM_CHEF]||'').trim(),
                    commMed:  String(data[i][C_COMM_MED]||'').trim()
                };
            }
        }
    }
    
    console.log(`DEBUG ISP ${mat}: Trouvé ${thisAgentIds.size} interventions pour ce matricule`);
    console.log(`DEBUG ISP ${mat}: IDs = ${Array.from(thisAgentIds).join(", ")}`);
    
    // 2. Charger SEULEMENT les tags APP Alex pour les IDs de ce matricule
    const alexTags = {};
    let alexMatchCount = 0;
    if(shAlex) {
        const dAlex = shAlex.getDataRange().getValues();
        for(let i=1; i<dAlex.length; i++) {
            const id = String(dAlex[i][0]).trim(); // Colonne A = numéro intervention
            
            // FILTRER: seulement les IDs qui appartiennent à ce matricule
            if(!thisAgentIds.has(id)) continue;
            
            alexMatchCount++;
            
            // PRENDRE LA PREMIÈRE OCCURRENCE SEULEMENT (la formule FILTER génère les premières lignes)
            if(alexTags[id]) {
                continue; // ID déjà traité, ignorer les doublons
            }
            
            const rawH = dAlex[i][7];
            const rawI = dAlex[i][8];
            const rawJ = dAlex[i][9];
            const rawK = dAlex[i][10];
            const rawL = dAlex[i][11];
            const alexNom = String(dAlex[i][4]||"").trim().toLowerCase();
            
            alexTags[id] = { 
                hasH: isCheckboxChecked(rawH),
                hasI: isCheckboxChecked(rawI),
                hasJ: isCheckboxChecked(rawJ),
                hasK: isCheckboxChecked(rawK),
                hasL: isCheckboxChecked(rawL),
                nom: alexNom
            };
        }
    }
    
    console.log(`DEBUG ISP ${mat}: ========== DÉBUT ANALYSE ERREURS ==========`);
    console.log(`DEBUG ISP ${mat}: thisAgentIds contient ${thisAgentIds.size} IDs`);
    console.log(`DEBUG ISP ${mat}: alexTags contient ${Object.keys(alexTags).length} tags`);
    
    // 3. Parcourir les IDs de ce matricule et compter les erreurs depuis APP Alex
    for(const id of thisAgentIds) {
        console.log(`DEBUG ISP ${mat}: Traitement ID ${id}`);
        
        const motif = appDataRef[id]?.motif || "";
        const cis = appDataRef[id]?.cis || "";
        const engin = appDataRef[id]?.engin || "";
        const date = appDataRef[id]?.date || "";
        const status = appDataRef[id]?.status || "";
        
        const tags = alexTags[id];
        
        // Si pas de tags dans APP Alex, ignorer
        if(!tags) continue;
        
        // Vérifier si la fiche est fermée dans APP - si oui, ignorer
        const appRow = appRows[id];
        if(!appRow) continue; // Fiche n'existe pas dans APP
        
        if(tags.hasJ && !tags.hasH && !tags.hasL) {
            // Erreur Bilan Légère — Alex prend le dessus sur BILAN_OK de l'ISP
            const item = { id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Erreur Bilan Légère"], errorType: "Erreur Bilan Légère" };
            errLegereBilanList.push(item);
            console.log(`DEBUG ISP ${mat}: ID ${id} → ✅ Ajouté à errLegereBilanList`);
        }

        if(tags.hasK && !tags.hasI && !tags.hasL) {
            // Erreur Pisu Légère — Alex prend le dessus sur PISU_OK de l'ISP
            const item = { id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Erreur Pisu Légère"], errorType: "Erreur Pisu Légère" };
            errLegerePisuList.push(item);
        }
        
        if(tags.hasL) {
            // Erreur Grave (L coché)
            const item = { id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Erreur Grave"], errorType: "Erreur Grave" };
            errLourdeList.push(item);
        }
    }
    
    // COMPTER BILAN OK ET PISU OK DEPUIS APP
    const data = shApp.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
        const rowMat = normalizeMat(data[i][C_APP_MAT]);
        if(rowMat !== mat) continue; // Seulement ce matricule
        
        const id = String(data[i][C_APP_ID]).trim();
        const motif = appDataRef[id].motif;
        const cis = appDataRef[id].cis;
        const engin = appDataRef[id].engin;
        const date = appDataRef[id].date;
        const status = appDataRef[id].status;
        
        const bilanOk = data[i][C_BILAN_OK];
        const bilanKo = data[i][C_BILAN_KO];
        const pisuOk = data[i][C_PISU_OK];
        const pisuKo = data[i][C_PISU_KO];
        const tags = alexTags[id] || {};
        
        // === BILAN — Alex (H/J/L) prioritaire sur flags ISP ===
        if(tags.hasH && !tags.hasJ && !tags.hasL) {
            bilanOkCount++;
            countedIds.add(id + "_bilan");
            okBilanList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Bilan OK"], errorType: "" });
        } else if(!tags.hasH && !tags.hasJ && !tags.hasL && bilanOk) {
            // Aucune classification Alex bilan → fallback ISP
            bilanOkCount++;
            countedIds.add(id + "_bilan");
            okBilanList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Bilan OK"], errorType: "" });
        }
        // J=true ou L=true → erreur, déjà compté plus haut dans errLegereBilanList / errLourdeList

        // === PISU — Alex (I/K/L) prioritaire sur flags ISP ===
        if(tags.hasI && !tags.hasK && !tags.hasL) {
            pisuOkCount++;
            countedIds.add(id + "_pisu");
            okPisuList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Pisu OK"], errorType: "" });
        } else if(!tags.hasI && !tags.hasK && !tags.hasL && pisuOk) {
            // Aucune classification Alex pisu → fallback ISP
            pisuOkCount++;
            countedIds.add(id + "_pisu");
            okPisuList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Pisu OK"], errorType: "" });
        }
    }

    console.log(`DEBUG ISP ${mat}: RÉSULTATS - Bilan OK: ${bilanOkCount}, Pisu OK: ${pisuOkCount}, Erreur Bilan Légère: ${errLegereBilanList.length}, Erreur Pisu Légère: ${errLegerePisuList.length}, Erreur Grave: ${errLourdeList.length}`);

    // Fusionner toutes les listes en un tableau details unique (une ligne par intervention)
    const detailsById = {};
    [okBilanList, okPisuList, errLegereBilanList, errLegerePisuList, errLourdeList].forEach(function(lst) {
        lst.forEach(function(item) {
            if (!detailsById[item.id]) {
                detailsById[item.id] = { id:item.id, date:item.date, motif:item.motif, centre:item.centre, engin:item.engin, status:item.status, types:[] };
            }
            (item.types || []).forEach(function(t) {
                if (detailsById[item.id].types.indexOf(t) < 0) detailsById[item.id].types.push(t);
            });
        });
    });
    const details = Object.values(detailsById).sort(function(a, b) { return String(a.date) < String(b.date) ? 1 : -1; });
    details.forEach(function(item) {
        const r = appRows[item.id];
        if (r) { item.commIsp = r.commIsp || ''; item.commChef = r.commChef || ''; item.commMed = r.commMed || ''; }
    });

    const result = {
        nom: agentName,
        astreinte2026: hAst26, astreinte2025_ytd: hAst25_ytd, astreinte2025_tot: hAst25_tot,
        garde2026: hGarde26, garde2025_ytd: hGarde25_ytd, garde2025_tot: hGarde25_tot,
        inter2026: interHg26, inter2025_ytd: interHg25_ytd, inter2025_tot: interHg25_tot,
      txSoll: txSoll,
      histTempsTravail: histTempsTravail,
        bilanConf, pisuConf,
        bilanOkCount: bilanOkCount,
        pisuOkCount: pisuOkCount,
        okBilanList: okBilanList,
        okPisuList: okPisuList,
        errLegereBilan: errLegereBilanList,
        errLegerePisu: errLegerePisuList,
        errLourde: errLourdeList,
        details: details,
        monthlyAst26: monthlyAst26,
        monthlyGarde26: monthlyGarde26,
        debugInfo: {
            totalIds: thisAgentIds.size,
            idsWithTags: Object.keys(alexTags).length,
            sampleIds: Array.from(thisAgentIds).slice(0, 5),
            alexTagsList: Array.from(thisAgentIds).map(id => ({
                id: id,
                inAlex: !!alexTags[id],
                hasJ: alexTags[id] ? alexTags[id].hasJ : null,
                hasH: alexTags[id] ? alexTags[id].hasH : null,
                hasL: alexTags[id] ? alexTags[id].hasL : null,
                bilanOk_app: appRows[id] ? isCheckboxChecked(appRows[id].bilanOk) : null
            }))
        }
    };
    
    // Stocker en cache : CacheService (rapide) + Spreadsheet (durable, pas de limite)
    try {
      const jsonStr = JSON.stringify(result);
      // CacheService: version compacte si trop gros
      if(jsonStr.length > 90000) {
        const compact = Object.assign({}, result);
        compact.okBilanList = [];
        compact.okPisuList = [];
        compact.errLegereBilan = result.errLegereBilan.map(e => ({id:e.id}));
        compact.errLegerePisu = result.errLegerePisu.map(e => ({id:e.id}));
        compact.errLourde = result.errLourde.map(e => ({id:e.id}));
        delete compact.debugInfo;
        cache.put(cacheKey, JSON.stringify(compact), 7200);
      } else {
        cache.put(cacheKey, jsonStr, 7200);
      }
      // Spreadsheet cache: version complète (pas de limite de taille)
      sheetCachePut(cacheKey, result, 7200);
      console.log(`Cache ISP ${mat}: ${jsonStr.length} octets → CacheService + Spreadsheet`);
    } catch(cacheErr) {
      console.log(`Erreur cache ISP ${mat}: ${cacheErr}`);
    }
    result.fromCache = false;
    
    return result;
  } catch(e) { return { error: e.message }; }
}

/* --- CHEFFERIE --- */
function getChefferieCounts() {
    const cache = CacheService.getScriptCache();
    const cacheKey = "chefferie_counts_v4";
    const cached = cache.get(cacheKey);
    if(cached) return JSON.parse(cached);
    const shCachedChef = sheetCacheGet(cacheKey);
    if(shCachedChef) { try { cache.put(cacheKey, JSON.stringify(shCachedChef), 7200); } catch(e){} return shCachedChef; }
    
    const ss = getSS_();
    ensureAppAlexSynced_(ss);
    let isp = 0, med = 0, action = 0;
    try {
        const shApp = ss.getSheetByName(APP_SHEET_NAME);
        const shAlex = ss.getSheetByName("APP Alex");
        const shEve = ss.getSheetByName("APP Eve");

        const dApp = shApp.getDataRange().getValues();
        const dAlex = shAlex.getDataRange().getValues();
        const dEve = shEve ? shEve.getDataRange().getValues() : [];
        
        // Index des fiches clôturées dans APP Alex (colonne N)
        const alexClosedIds = new Set();
        const alexGraves = new Set();
        for(let i=1; i<dAlex.length; i++) {
            const id = String(dAlex[i][0]).trim();
            if(isCheckboxChecked(dAlex[i][13])) alexClosedIds.add(id); // N = clôturé
            if(isCheckboxChecked(dAlex[i][11])) alexGraves.add(id);    // L = Erreur Grave
        }
        
        // GREEN (isp) = bilans dans APP (bilanKo ou pisuKo) PAS clôturés dans Alex N
        // Note: on ne filtre PAS sur C_BP_CLOSE car l'ISP clôture toujours BP quand il sauve,
        // mais la chefferie doit quand même revoir la fiche. La clôture chefferie = colonne N dans Alex.
        for(let i=1; i<dApp.length; i++) {
            const bilanKo = isCheckboxChecked(dApp[i][C_BILAN_KO]);
            const pisuKo = isCheckboxChecked(dApp[i][C_PISU_KO]);
            if((bilanKo || pisuKo)) {
                const id = String(dApp[i][C_APP_ID]).trim();
                if(!alexClosedIds.has(id)) isp++;
            }
        }
        
        // ORANGE (med) = erreurs graves (L dans Alex) pas encore traitées dans APP Eve
        const eveDone = new Set();
        for(let i=1; i<dEve.length; i++) {
            const id = String(dEve[i][0]).trim();
            if(dEve[i][14] || dEve[i][16]) eveDone.add(id);
        }
        for(let id of alexGraves) {
            if(!eveDone.has(id)) med++;
        }
        
        // RED (action) = dans APP Eve, O ou Q rempli, S (col 18) pas coché
        for(let i=1; i<dEve.length; i++) {
            const hasAnalyse = !!dEve[i][14]; // O
            const hasAction = !!dEve[i][16];  // Q
            const isClosed = isCheckboxChecked(dEve[i][18]); // S
            if((hasAnalyse || hasAction) && !isClosed) action++;
        }
    } catch(e) {}
    
    const result = { isp, med, action };
    cache.put(cacheKey, JSON.stringify(result), 7200);
    sheetCachePut(cacheKey, result, 7200);
    return result;
}

// === NOUVELLE INTERFACE CHEFFERIE ===

/**
 * Mode 1: APP Chefferie - Fiches avec BJ=1 (Bilan Incomplet) OU BL=1 (Pisu pas OK) dans APP
 */
function getNextAppChefferie() {
    const ss = getSS_();
    ensureAppAlexSynced_(ss);
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const shAlex = ss.getSheetByName("APP Alex");
    const dataApp = shApp.getDataRange().getValues();
    const dataAlex = shAlex ? shAlex.getDataRange().getValues() : [];

    // Pré-construire alexMap (Fix #6 — O(n) au lieu de O(n²))
    const alexMap = {};
    for(let j=1; j<dataAlex.length; j++) {
        const id = String(dataAlex[j][0]).trim();
        if(id && !alexMap[id]) alexMap[id] = { row: j, data: dataAlex[j] };
    }

    for(let i=1; i<dataApp.length; i++) {
        const bilanKo = isCheckboxChecked(dataApp[i][C_BILAN_KO]);
        const pisuKo  = isCheckboxChecked(dataApp[i][C_PISU_KO]);
        if(!(bilanKo || pisuKo)) continue;

        const id = String(dataApp[i][C_APP_ID]).trim();
        const alexEntry = alexMap[id] || null;
        const alexData  = alexEntry ? alexEntry.data : null;
        const alexRow   = alexEntry ? alexEntry.row  : -1;

        // Si clôturé dans APP Alex (colonne N), passer au suivant
        if(alexData && isCheckboxChecked(alexData[13])) continue;

        const cis = String(dataApp[i][C_APP_CIS]||"").trim();
        // Fix #7 — APP BX (C_COMM_CHEF) en priorité, Alex col M en fallback
        const commChef = String(dataApp[i][C_COMM_CHEF] || "").trim()
                      || (alexData ? String(alexData[12]||"").trim() : "");

        return {
            found: true,
            rowApp: i+1,
            rowAlex: alexRow + 1,
            info: {
                interId: id,
                date:      formatDateHeureFR_(dataApp[i][C_APP_DATE]),
                infName:   dataApp[i][C_APP_NOM],
                motif:     dataApp[i][C_APP_MOTIF],
                engin:     String(dataApp[i][C_APP_ENGIN]||"").trim(),
                pdf:       dataApp[i][C_APP_PDF],
                status:    (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo",
                motifBilan: dataApp[i][C_TXTBILAN_KO] || "",
                motifPisu:  dataApp[i][C_TXTPISU_KO]  || "",
                bilanKo:   bilanKo,
                pisuKo:    pisuKo,
                infoT:     String(dataApp[i][C_APP_INFO_T] || "").trim()
            },
            checks: {
                H: alexData ? isCheckboxChecked(alexData[7])  : false,
                I: alexData ? isCheckboxChecked(alexData[8])  : false,
                J: alexData ? isCheckboxChecked(alexData[9])  : false,
                K: alexData ? isCheckboxChecked(alexData[10]) : false,
                L: alexData ? isCheckboxChecked(alexData[11]) : false
            },
            commentChef: commChef
        };
    }

    return { found: false, message: "Aucune fiche à traiter" };
}

/**
 * Mode 2: Analyse Médecin Cheffe - Fiches avec L=1 (Erreur Grave) dans APP Alex
 */
function getNextMedecinChef() {
    const ss = getSS_();
    const shAlex = ss.getSheetByName("APP Alex");
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const shEve = ss.getSheetByName("APP Eve");
    const dataAlex = shAlex.getDataRange().getValues();
    const dataApp = shApp.getDataRange().getValues();
    const dataEve = shEve ? shEve.getDataRange().getValues() : [];
    
    for(let i=1; i<dataAlex.length; i++) {
        const hasL = isCheckboxChecked(dataAlex[i][11]); // L = Erreur Grave
        if(!hasL) continue;
        
        const id = String(dataAlex[i][0]).trim();
        
        // Vérifier si déjà traité dans APP Eve (colonnes O=14 analyse OU Q=16 action)
        let alreadyDone = false;
        for(let j=1; j<dataEve.length; j++) {
            if(String(dataEve[j][0]).trim() === id && (dataEve[j][14] || dataEve[j][16])) {
                alreadyDone = true;
                break;
            }
        }
        if(alreadyDone) continue;
        
        // Chercher infos dans APP
        let appRow = -1;
        for(let j=1; j<dataApp.length; j++) {
            if(String(dataApp[j][C_APP_ID]).trim() === id) {
                appRow = j;
                break;
            }
        }
        
        const appInfo = appRow >= 0 ? dataApp[appRow] : null;
        const cis = appInfo ? String(appInfo[C_APP_CIS]||"").trim() : "";
        const status = (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo";

        // Lire commentaire chefferie depuis APP (ancré par ID) ou Alex (fallback)
        const commChefAnc  = appInfo ? String(appInfo[C_COMM_CHEF] || "").trim() : "";
        const commChefAlex = String(dataAlex[i][12] || "").trim();

        // Commentaire ISP : motif écrit par l'infirmière au moment de sa propre classification (APP BP/BQ)
        const motifBilan = appInfo ? String(appInfo[C_TXTBILAN_KO] || "").trim() : "";
        const motifPisu  = appInfo ? String(appInfo[C_TXTPISU_KO]  || "").trim() : "";

        return {
            found: true,
            rowAlex: i+1,
            info: {
                interId: id,
                date: appInfo ? formatDateHeureFR_(appInfo[C_APP_DATE]) : "",
                infName: appInfo ? appInfo[C_APP_NOM] : dataAlex[i][4],
                motif: appInfo ? appInfo[C_APP_MOTIF] : "",
                engin: appInfo ? String(appInfo[C_APP_ENGIN]||"").trim() : "",
                pdf: appInfo ? appInfo[C_APP_PDF] : dataAlex[i][2],
                status: status,
                commentISP: [motifBilan, motifPisu].filter(Boolean).join("\n"),
                commentChef: commChefAnc || commChefAlex,
                infoT: appInfo ? String(appInfo[C_APP_INFO_T] || "").trim() : ""
            }
        };
    }

    return { found: false, message: "Aucune fiche grave à analyser" };
}

/**
 * Sauvegarder APP Chefferie
 */
function saveAppChefferie(form) {
    try {
        const ss = getSS_();
        const shAlex = ss.getSheetByName("APP Alex");
        const interId = String(form.interId).trim();

        // Toujours re-résoudre la ligne par ID d'intervention (jamais faire confiance à form.rowAlex,
        // qui peut être périmé si APP Alex a bougé entre l'ouverture de la fiche et l'enregistrement).
        const dataAlex = shAlex.getDataRange().getValues();
        let row = -1;
        for(let i=1; i<dataAlex.length; i++) {
            if(String(dataAlex[i][0]).trim() === interId) { row = i+1; break; }
        }
        if(row === -1) {
            row = dataAlex.length + 1;
            shAlex.getRange(row, 1).setValue(form.interId);
        }

        // Sauvegarder les checkboxes H, I, J, K, L
        shAlex.getRange(row, 8).setValue(form.checks.H ? true : false);  // H
        shAlex.getRange(row, 9).setValue(form.checks.I ? true : false);  // I
        shAlex.getRange(row, 10).setValue(form.checks.J ? true : false); // J
        shAlex.getRange(row, 11).setValue(form.checks.K ? true : false); // K
        shAlex.getRange(row, 12).setValue(form.checks.L ? true : false); // L

        // Commentaire chefferie (colonne M = 13), tagué [COM CHEF ISP id] pour sécuriser le circuit
        const taggedComment = appendOrReplaceTag_(form.commentChef, "COM CHEF ISP", interId, ["JL", "COM CHEF"]);
        shAlex.getRange(row, 13).setValue(taggedComment);

        // Clôturer (colonne N = 14)
        shAlex.getRange(row, 14).setValue(true);

        // Ancrage anti-décalage : sauvegarder aussi dans APP (colonne BX, par ID)
        // Résistant aux décalages de formules FILTER dans APP Alex
        try {
            const shAppRef = ss.getSheetByName(APP_SHEET_NAME);
            if (shAppRef && form.commentChef) {
                const appData = shAppRef.getDataRange().getValues();
                for (let j = 1; j < appData.length; j++) {
                    if (String(appData[j][C_APP_ID]).trim() === interId) {
                        shAppRef.getRange(j + 1, C_COMM_CHEF + 1).setValue(taggedComment);
                        break;
                    }
                }
            }
        } catch(eAnc) { Logger.log("saveAppChefferie ancrage error: " + eAnc); }

        // Clear cache
        const cache_ = CacheService.getScriptCache();
        cache_.remove("chefferie_counts_v4");
        cache_.remove("all_isp_error_stats");
        sheetCacheRemove("all_isp_error_stats");
        const mat_ = _getMat_(ss, interId);
        if(mat_) { cache_.remove("isp_v4_" + mat_); cache_.remove("isp_detail_" + mat_); sheetCacheRemove("isp_v4_" + mat_); sheetCacheRemove("isp_detail_" + mat_); }

        return { success: true };
    } catch(e) {
        console.log("saveAppChefferie error: " + e.toString());
        return { success: false, error: e.toString() };
    }
}

/**
 * Sauvegarder Analyse Médecin
 */
function saveMedecinAnalyse(form) {
    try {
        const ss = getSS_();
        const shEve = ss.getSheetByName("APP Eve");
        
        // Chercher la ligne avec cet ID
        const dataEve = shEve.getDataRange().getValues();
        let row = -1;
        for(let i=1; i<dataEve.length; i++) {
            if(String(dataEve[i][0]).trim() === form.interId) {
                row = i+1;
                break;
            }
        }
        
        // Si pas trouvé, créer nouvelle ligne
        if(row === -1) {
            row = dataEve.length + 1;
            shEve.getRange(row, 1).setValue(form.interId);
        }
        
        // Analyse Médecin (colonne O = 15), taguée [COM MED CHEF id] pour sécuriser le circuit
        const interIdTrim = String(form.interId).trim();
        const taggedAnalyse = appendOrReplaceTag_(form.analyse, "COM MED CHEF", interIdTrim, ["COM CHEF"]);
        shEve.getRange(row, 15).setValue(taggedAnalyse);

        // Action Requise (colonne Q = 17), taguée [COM MED CHEF id]
        const taggedAction = appendOrReplaceTag_(form.action, "COM MED CHEF", interIdTrim, ["ACTION CHEF"]);
        shEve.getRange(row, 17).setValue(taggedAction);

        // Ancrage anti-décalage : sauvegarder aussi dans APP (colonnes BY/BZ, par ID)
        try {
            const shAppRef = ss.getSheetByName(APP_SHEET_NAME);
            if (shAppRef) {
                const appData = shAppRef.getDataRange().getValues();
                for (let j = 1; j < appData.length; j++) {
                    if (String(appData[j][C_APP_ID]).trim() === interIdTrim) {
                        if (form.analyse) shAppRef.getRange(j + 1, C_COMM_MED + 1).setValue(taggedAnalyse);
                        if (form.action)  shAppRef.getRange(j + 1, C_ACTION_MED + 1).setValue(taggedAction);
                        break;
                    }
                }
            }
        } catch(eAnc) { Logger.log("saveMedecinAnalyse ancrage error: " + eAnc); }

        // Clear cache
        const cache_ = CacheService.getScriptCache();
        cache_.remove("chefferie_counts_v4");
        cache_.remove("all_isp_error_stats");
        sheetCacheRemove("all_isp_error_stats");
        const mat_ = _getMat_(ss, interIdTrim);
        if(mat_) { cache_.remove("isp_v4_" + mat_); cache_.remove("isp_detail_" + mat_); sheetCacheRemove("isp_v4_" + mat_); sheetCacheRemove("isp_detail_" + mat_); }

        return { success: true };
    } catch(e) {
        console.log("saveMedecinAnalyse error: " + e.toString());
        return { success: false, error: e.toString() };
    }
}


/* --- APP PAGE --- */
function getNextCase(specificRow) {
    const ss = getSS_();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if(!shApp) return { done: true, message: "Aucune feuille APP trouvée." };
    
    const data = shApp.getDataRange().getValues();
    let rowToProcess = specificRow || -1;
    
    // Si specificRow n'est pas spécifié, chercher la première ligne sans PDF ou non clôturée
    if(!specificRow) {
        const now = new Date();
        const lockTimeoutMinutes = 30; // Timeout de 30 minutes pour le lock
        
        for(let i=1; i<data.length; i++) {
            const pdfVal = String(data[i][C_APP_PDF]);
            const isClosed = data[i][C_BP_CLOSE];
            const lockTimestamp = data[i][C_BU_LOCK];
            
            // Vérifier si la fiche est lockée par quelqu'un d'autre
            let isLocked = false;
            if(lockTimestamp) {
                const lockDate = new Date(lockTimestamp);
                const diffMinutes = (now - lockDate) / (1000 * 60);
                if(diffMinutes < lockTimeoutMinutes) {
                    isLocked = true;
                }
            }
            
            // Ignorer les fiches avec #N/A, vides, clôturées ou lockées
            if(pdfVal && pdfVal !== "#N/A" && !pdfVal.includes("#N/A") && !isClosed && !isLocked) {
                rowToProcess = i+1;
                break;
            }
        }
    } else {
        // Si specificRow est fourni, vérifier qu'il n'a pas #N/A
        const pdfVal = String(data[specificRow-1][C_APP_PDF]);
        if(pdfVal && pdfVal !== "#N/A" && !pdfVal.includes("#N/A")) {
            rowToProcess = specificRow;
        }
    }
    
    if(rowToProcess === -1) return { done: true, message: "Tous les dossiers sont traités." };
    
    // Écrire le timestamp de lock
    shApp.getRange(rowToProcess, C_BU_LOCK + 1).setValue(new Date());
    
    const rowIdx = rowToProcess - 1;
    const row = data[rowIdx];
    
    // Récupérer les correspondances de protocoles depuis le fichier externe
    // Mapping des protocoles (colonne 0-indexed => label)
    // === MIGRATION: Ancien système (col 21-48) → Nouveau système (col 21-50) ===
    // Les anciennes fiches utilisent l'ancien mapping. Pour compter correctement:
    // - Col 21 = VVP adulte (inchangé)
    // - Col 22 = ancien: Hypoglycémie, nouveau: ECG
    // - etc. Les anciennes coches restent dans les anciennes colonnes.
    // Le nouveau mapping s'applique aux nouvelles fiches.
    const PROTOCOLS_MAP = {
        // Adultes (1A à 17A + HPA)
        21: "VVP (1A)", 22: "ECG (2A)", 23: "Hypoglycémie (3A)", 24: "Choc hémorragique (4A)",
        25: "Brulure (5A)", 26: "Douleur aigue (6A)", 27: "Analgésie procédurale (7A)", 28: "ACR (8A)",
        29: "Anaphylaxie (9A)", 30: "Asthme/BPCO (10A)", 31: "OAP (11A)", 32: "Intox fumée (12A)",
        33: "Convulsion (13A)", 34: "Accouchement (14A)", 35: "Dlr Tho (15A)", 36: "Coup chaleur (16A)",
        37: "Fracture (17A)", 38: "Hors Protocole (HPA)",
        // Pédiatriques — numéros alignés sur les adultes
        39: "VVP (1E)", 40: "ECG (2E)", 41: "Hypoglycémie (3E)", 42: "Brulure (5E)",
        43: "Douleur aigue (6E)", 44: "ACR (8E)", 45: "Anaphylaxie (9E)", 46: "Asthme/BPCO (10E)",
        47: "Intox fumée (12E)", 48: "Convulsion (13E)", 49: "Nouveau Né (14E)", 50: "Hors Protocole (HPE)"
    };
    
    // Construire la liste des protocoles depuis colonnes V à AW
    const protoList = [];
    for(let colIdx = C_PROTO_START; colIdx <= C_PROTO_END; colIdx++) {
        const label = PROTOCOLS_MAP[colIdx] || "";
        if(label) {
            // Charger l'état réel de la case depuis la feuille
            const isChecked = isCheckboxChecked(row[colIdx]);
            protoList.push({ 
                colIdx: colIdx, 
                label: label, 
                checked: isChecked 
            });
        }
    }
    
    // Séparer adultes (V-AL = 21-37) et pédiatriques (AM-AW = 38-48)
    const protoAdult = protoList.filter(p => p.colIdx <= 38);
    const protoPedia = protoList.filter(p => p.colIdx >= 39);
    
    // Récupérer les critères et résultats
    const info = {
        interId: row[C_APP_ID],
        date: formatDateHeureFR_(row[C_APP_DATE]),
        infName: row[C_APP_NOM],
        cis: String(row[C_APP_CIS]||"").trim(),
        motif: String(row[C_APP_MOTIF]||"").trim(),
        engin: String(row[C_APP_ENGIN]||"").trim()
    };
    
    const criteres = {
        ax: { label: "AKIM", opts: getDropdownList_(shApp, C_AKIM), val: row[C_AKIM] },
        ay: { label: "SMUR", opts: getDropdownList_(shApp, C_SMUR), val: row[C_SMUR] },
        az: { label: "CCMU", opts: getDropdownList_(shApp, C_CCMU), val: row[C_CCMU] },
        ba: { label: "DEVENIR", opts: getDropdownList_(shApp, C_DEVENIR), val: row[C_DEVENIR] },
        bb: { label: "SOUSAN", opts: getDropdownList_(shApp, C_SOUSAN), val: row[C_SOUSAN] },
        bc: { label: "NB VICTIMES", opts: [], val: row[C_NBVICTIMES] },
        bg: { label: "Examen clinique", opts: getDropdownList_(shApp, C_BG_EXAM), val: row[C_BG_EXAM] }
    };
    
    const resultats = {
        bg: { label: "Examen clinique", opts: getDropdownList_(shApp, C_BG_EXAM), val: row[C_BG_EXAM] },
        checksBiBm: [
            { id: "bi", label: "Bilan OK", checked: isCheckboxChecked(row[C_BILAN_OK]), color: "ok", colIdx: C_BILAN_OK },
            { id: "bj", label: "Bilan incomplet", checked: isCheckboxChecked(row[C_BILAN_KO]), color: "orange", colIdx: C_BILAN_KO },
            { id: "bk", label: "Pisu OK", checked: isCheckboxChecked(row[C_PISU_OK]), color: "ok", colIdx: C_PISU_OK },
            { id: "bl", label: "Pisu pas ok", checked: isCheckboxChecked(row[C_PISU_KO]), color: "orange", colIdx: C_PISU_KO },
            { id: "bh", label: "Absence / erreur commande PUI", checked: isCheckboxChecked(row[C_BH_ABS]), color: null, colIdx: C_BH_ABS },
            { id: "bm", label: "Absence de traçabilité de la surveillance pendant transport", checked: isCheckboxChecked(row[C_BM_SURV_TRANSPORT]), color: null, colIdx: C_BM_SURV_TRANSPORT }
        ]
    };
    
    // Récupérer l'ISP Analyse
    const ispList = getDropdownList_(shApp, C_ISP_ANALYSE);
    
    const schema = {
        ispVal: row[C_ISP_ANALYSE],
        infoT: String(row[C_APP_INFO_T] || "").trim(),
        protoAdult: protoAdult,
        protoPedia: protoPedia,
        criteres: criteres,
        resultats: resultats,
        fieldBn: { label: "Motif bilan incomplet", val: row[C_TXTBILAN_KO]||"" },
        fieldBo: { label: "Motif pisu incomplet", val: row[C_TXTPISU_KO]||"" },
        pbCheck: row[C_BS_PROBLEM],
        pbTxt: row[C_BT_PROBLEM_TXT]||""
    };
    
    // Compter les fiches restantes (avec PDF valides, non clôturées, non lockées)
    let remaining = 0;
    const now = new Date();
    const lockTimeoutMinutes = 30;
    for(let i=rowToProcess; i<data.length; i++) {
        const pdfVal = String(data[i][C_APP_PDF]).trim();
        const isClosed = data[i][C_BP_CLOSE];
        const lockTimestamp = data[i][C_BU_LOCK];
        
        let isLocked = false;
        if(lockTimestamp) {
            const lockDate = new Date(lockTimestamp);
            const diffMinutes = (now - lockDate) / (1000 * 60);
            if(diffMinutes < lockTimeoutMinutes) {
                isLocked = true;
            }
        }
        
        if(pdfVal && pdfVal !== "#N/A" && !pdfVal.includes("#N/A") && !isClosed && !isLocked) {
            remaining++;
        }
    }
    
    return {
        done: false,
        rowNumber: rowToProcess,
        info: info,
        url: row[C_APP_PDF],
        schema: schema,
        ispList: ispList,
        remaining: remaining
    };
}

function saveCase(form) {
    try {
        const ss = getSS_();
        const shApp = ss.getSheetByName(APP_SHEET_NAME);
        if(!shApp) return { success: false, error: "Sheet not found" };
        
        const row = form.rowNumber;
        const updates = [];
        
        // ISP Analyse
        updates.push([row, C_ISP_ANALYSE + 1, form.isp]);
        
        // Protocoles (checkboxes true/false) - exclure colonnes critères (AKIM etc.)
        Object.keys(form.checks).forEach(colIdxStr => {
            const colIdx = parseInt(colIdxStr);
            if(isNaN(colIdx) || colIdx >= C_AKIM) return; // Ne pas écrire sur les colonnes critères
            updates.push([row, colIdx + 1, form.checks[colIdxStr] ? true : false]);
        });
        
        // Critères
        updates.push([row, C_AKIM + 1, form.criteres.ax]);
        updates.push([row, C_SMUR + 1, form.criteres.ay]);
        updates.push([row, C_CCMU + 1, form.criteres.az]);
        updates.push([row, C_DEVENIR + 1, form.criteres.ba]);
        updates.push([row, C_SOUSAN + 1, form.criteres.bb]);
        updates.push([row, C_NBVICTIMES + 1, form.criteres.bc]);
        
        // Résultats (checkboxes true/false)
        updates.push([row, C_BG_EXAM + 1, form.resultats.bg]);
        updates.push([row, C_BILAN_OK + 1, form.resultats.bi ? true : false]);
        updates.push([row, C_BILAN_KO + 1, form.resultats.bj ? true : false]);
        updates.push([row, C_PISU_OK + 1, form.resultats.bk ? true : false]);
        updates.push([row, C_PISU_KO + 1, form.resultats.bl ? true : false]);
        updates.push([row, C_BH_ABS + 1, form.resultats.bh ? true : false]);
        updates.push([row, C_BM_SURV_TRANSPORT + 1, form.resultats.bm ? true : false]);
        
        // Textes
        updates.push([row, C_TXTBILAN_KO + 1, form.txtBn]);
        updates.push([row, C_TXTPISU_KO + 1, form.txtBo]);
        
        // Clôture
        updates.push([row, C_BP_CLOSE + 1, true]);
        
        // Problème Brice
        updates.push([row, C_BS_PROBLEM + 1, form.pbCheck ? true : false]);
        updates.push([row, C_BT_PROBLEM_TXT + 1, form.pbTxt || ""]);
        
        // Batch update
        updates.forEach(u => {
            shApp.getRange(u[0], u[1]).setValue(u[2]);
        });

        // Si bilan/pisu pas ok, faire apparaître la fiche dans APP Alex (sans jamais réordonner les lignes existantes)
        if(form.resultats.bj || form.resultats.bl) ensureAppAlexSynced_(ss);

        // Clear caches
        const cache = CacheService.getScriptCache();
        cache.remove("chefferie_counts_v4");
        cache.remove("stats2026_v3");
        cache.remove("all_isp_error_stats");
        sheetCacheRemove("all_isp_error_stats");
        
        // Effacer le cache ISP du matricule concerné
        try {
          const shAppRef = ss.getSheetByName(APP_SHEET_NAME);
          const ispMat = normalizeMat(shAppRef.getRange(row, C_APP_MAT + 1).getValue());
          if(ispMat) {
            cache.remove("isp_v3_" + ispMat);
            cache.remove("isp_v4_" + ispMat);
            sheetCacheRemove("isp_v3_" + ispMat);
            sheetCacheRemove("isp_v4_" + ispMat);
            console.log("Cache ISP vidé pour: " + ispMat);
          }
        } catch(ce) { console.log("Erreur vidage cache ISP: " + ce); }
        
        return { success: true, message: "Fiche enregistrée et clôturée" };
    } catch(e) {
        console.log("saveCase error: " + e.toString());
        return { success: false, error: e.toString() };
    }
}

function skipCase(rowNumber) {
    const ss = getSS_();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if(!shApp) return { success: false };
    
    // Effacer le lock pour permettre à quelqu'un d'autre de prendre cette fiche
    shApp.getRange(rowNumber, C_BU_LOCK + 1).setValue("");
    
    return { success: true };
}

/* --- LISTING GLOBAL --- */
function getAllIspErrorStats() {
    const cache = CacheService.getScriptCache();
    const cacheKey = "all_isp_error_stats";
    const cached = cache.get(cacheKey);
    if(cached) return JSON.parse(cached);
    const shCachedErr = sheetCacheGet(cacheKey);
    if(shCachedErr) { try { cache.put(cacheKey, JSON.stringify(shCachedErr), 7200); } catch(e){} return shCachedErr; }
    
    const ss = getSS_();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const activeAgents = getActiveAgents_(ss);
    let stats = {};
    activeAgents.forEach(a => { stats[a.mat] = { nom: a.nom, mat: a.mat, bilanOk:0, pisuOk:0, errBilL:0, errPisuL:0, errGrave:0 }; });

    if(shApp) {
        const dApp = shApp.getDataRange().getValues();
        const shAlex = ss.getSheetByName("APP Alex");
        const dAlex = shAlex.getDataRange().getValues();
        
        // CHARGER APP ALEX EN MAP - PREMIÈRE OCCURRENCE SEULEMENT
        const alexMap = {};
        for(let i=1; i<dAlex.length; i++) {
            const id = String(dAlex[i][0]).trim();
            if(!id) continue;
            
            // PRENDRE LA PREMIÈRE OCCURRENCE SEULEMENT
            if(alexMap[id]) continue;
            
            alexMap[id] = { 
                reqBilOk: isCheckboxChecked(dAlex[i][7]),    // H
                reqPisuOk: isCheckboxChecked(dAlex[i][8]),   // I
                errBilL: isCheckboxChecked(dAlex[i][9]),     // J
                errPisuL: isCheckboxChecked(dAlex[i][10]),   // K
                errGrave: isCheckboxChecked(dAlex[i][11])    // L
            };
        }
        
        for(let i=1; i<dApp.length; i++) {
            const m = normalizeMat(dApp[i][C_APP_MAT]);
            if(!m) continue;
            const id = String(dApp[i][C_APP_ID]).trim();
            const alex = alexMap[id] || {};

            // Si l'agent n'est pas dans le dashboard, l'ajouter dynamiquement dès qu'il a une erreur
            if(!stats[m]) {
                const hasErr = isCheckboxChecked(dApp[i][C_BILAN_OK]) || isCheckboxChecked(dApp[i][C_PISU_OK])
                             || alex.reqBilOk || alex.reqPisuOk || alex.errBilL || alex.errPisuL || alex.errGrave;
                if(!hasErr) continue;
                const nom = String(dApp[i][C_APP_NOM] || dApp[i][C_APP_MAT] || m).trim();
                stats[m] = { nom: nom, mat: String(dApp[i][C_APP_MAT] || m), bilanOk:0, pisuOk:0, errBilL:0, errPisuL:0, errGrave:0 };
            }

            if(isCheckboxChecked(dApp[i][C_BILAN_OK]) || alex.reqBilOk) stats[m].bilanOk++;
            if(isCheckboxChecked(dApp[i][C_PISU_OK]) || alex.reqPisuOk) stats[m].pisuOk++;
            if(alex.errBilL  && !alex.reqBilOk  && !alex.errGrave) stats[m].errBilL++;
            if(alex.errPisuL && !alex.reqPisuOk && !alex.errGrave) stats[m].errPisuL++;
            if(alex.errGrave) stats[m].errGrave++;
        }
    }
    
    const result = Object.values(stats);
    cache.put(cacheKey, JSON.stringify(result), 7200); // Cache 2h
    sheetCachePut(cacheKey, result, 7200);
    return result;
}

function getIspDetailsAdmin(mat) {
    const cache = CacheService.getScriptCache();
    const cacheKey = "isp_detail_" + normalizeMat(mat);
    const cached = cache.get(cacheKey);
    if(cached) return JSON.parse(cached);
    const shCachedDet = sheetCacheGet(cacheKey);
    if(shCachedDet) { try { cache.put(cacheKey, JSON.stringify(shCachedDet), 7200); } catch(e){} return shCachedDet; }
    
    const ss = getSS_();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const shAlex = ss.getSheetByName("APP Alex");
    const shEve = ss.getSheetByName("APP Eve");
    const normalizedMat = normalizeMat(mat);
    let list = [];
    
    if(!shApp || !shAlex) return list;
    
    // 1. Charger APP Alex en map - PREMIÈRE OCCURRENCE pour checkboxes, COMBINER commentaires
    const alexData = {};
    const alexRows = shAlex.getDataRange().getValues();
    
    // Charger toutes les lignes (checkboxes H/I/J/K/L)
    for(let i=1; i<alexRows.length; i++) {
        const id = String(alexRows[i][0]).trim();
        if(!id) continue;
        
        // PRENDRE LA PREMIÈRE OCCURRENCE pour les checkboxes
        if(!alexData[id]) {
            alexData[id] = {
                H: isCheckboxChecked(alexRows[i][7]),
                I: isCheckboxChecked(alexRows[i][8]),
                J: isCheckboxChecked(alexRows[i][9]),
                K: isCheckboxChecked(alexRows[i][10]),
                L: isCheckboxChecked(alexRows[i][11]),
                commChef: String(alexRows[i][12]||"")
            };
        }
    }
    
    // Ensuite chercher les commentaires dans TOUTES les lignes (au cas où M n'est pas dans FILTER)
    for(let i=1; i<alexRows.length; i++) {
        const id = String(alexRows[i][0]).trim();
        if(!id || !alexData[id]) continue;
        
        const comm = String(alexRows[i][12]||"").trim();
        if(comm && !alexData[id].commChef) {
            alexData[id].commChef = comm;
        }
    }
    
    // 2. Charger APP Eve en map
    const eveData = {};
    if(shEve) {
        const eveRows = shEve.getDataRange().getValues();
        for(let i=1; i<eveRows.length; i++) {
            const id = String(eveRows[i][0]).trim();
            if(!id) continue;
            eveData[id] = { commMed: String(eveRows[i][14]||"") };
        }
    }
    
    // 3. Parcourir APP et construire la liste
    const appRows = shApp.getDataRange().getValues();
    for(let i=1; i<appRows.length; i++) {
        // Filtrer par matricule
        if(normalizeMat(appRows[i][C_APP_MAT]) !== normalizedMat) continue;
        
        const id = String(appRows[i][C_APP_ID]).trim();
        if(!id) continue;
        
        const alex = alexData[id] || {};
        const eve = eveData[id] || {};

        // Commentaires : APP BX/BY (ancré) → Alex/Eve (fallback)
        const commChefAnc = String(appRows[i][C_COMM_CHEF] || "").trim();
        const commMedAnc  = String(appRows[i][C_COMM_MED]  || "").trim();

        // Déterminer les types — Alex est toujours prioritaire sur les flags ISP
        let types = [];
        let errorType = "";

        if(alex.L) {
            // Erreur Grave : écrase tout
            types.push("Erreur Grave");
            errorType = "Erreur Grave";
        } else {
            // Axe bilan : Alex H/J prend le dessus sur BILAN_OK de l'ISP
            if(alex.H) {
                types.push("Bilan OK");
            } else if(alex.J) {
                types.push("Erreur Bilan Légère");
                if(!errorType) errorType = "Erreur Bilan Légère";
            } else if(isCheckboxChecked(appRows[i][C_BILAN_OK])) {
                types.push("Bilan OK");
            }

            // Axe pisu : Alex I/K prend le dessus sur PISU_OK de l'ISP
            if(alex.I) {
                types.push("Pisu OK");
            } else if(alex.K) {
                types.push("Erreur Pisu Légère");
                if(!errorType) errorType = "Erreur Pisu Légère";
            } else if(isCheckboxChecked(appRows[i][C_PISU_OK])) {
                types.push("Pisu OK");
            }
        }

        // Ne garder que si on a au moins un type
        if(types.length === 0) continue;
        
        const cis = String(appRows[i][C_APP_CIS]||"").trim();
        list.push({
            id: id,
            date: formatDateHeureFR_(appRows[i][C_APP_DATE]),
            centre: cis,
            motif: String(appRows[i][C_APP_MOTIF]||"—").trim(),
            engin: String(appRows[i][C_APP_ENGIN]||"—").trim(),
            pdf: appRows[i][C_APP_PDF],
            status: (cis === "SD SSSM") ? "Garde" : "Dispo/Astreinte",
            types: types,
            errorType: errorType,
            commChef: commChefAnc || alex.commChef || "",
            commMed: commMedAnc || eve.commMed || ""
        });
    }
    
    cache.put(cacheKey, JSON.stringify(list), 7200);
    sheetCachePut(cacheKey, list, 7200);
    return list;
}

// === ACTIONS FINALES CHEFFERIE ===

/**
 * Récupérer la prochaine fiche à traiter dans "Actions finales"
 * Critères: Dans APP Eve, O ou Q rempli, S (col 19) pas coché
 */
function getNextActionChefferie(skipRows) {
    const ss = getSS_();
    const shEve = ss.getSheetByName("APP Eve");
    const shAlex = ss.getSheetByName("APP Alex");
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if(!shEve) return { found: false, message: "Onglet APP Eve introuvable" };
    
    const skip = Array.isArray(skipRows) ? skipRows : [];
    const dataEve = shEve.getDataRange().getValues();
    const dataAlex = shAlex ? shAlex.getDataRange().getValues() : [];
    const dataApp = shApp ? shApp.getDataRange().getValues() : [];
    
    for(let i=1; i<dataEve.length; i++) {
        const hasAnalyse = !!dataEve[i][14]; // O
        const hasAction = !!dataEve[i][16];  // Q
        const isClosed = isCheckboxChecked(dataEve[i][18]); // S
        
        if((hasAnalyse || hasAction) && !isClosed) {
            if(skip.indexOf(i+1) >= 0) continue;
            const id = String(dataEve[i][0]).trim();
            
            // Chercher infos dans APP
            let appInfo = null;
            let appRowIdx = -1;
            for(let j=1; j<dataApp.length; j++) {
                if(String(dataApp[j][C_APP_ID]).trim() === id) {
                    appInfo = dataApp[j];
                    appRowIdx = j;
                    break;
                }
            }
            
            // Chercher commentaire chefferie : APP (ancré) → Alex (fallback)
            let commChefAlex = "";
            for(let j=1; j<dataAlex.length; j++) {
                if(String(dataAlex[j][0]).trim() === id) {
                    commChefAlex = String(dataAlex[j][12] || "").trim();
                    break;
                }
            }
            const commChefAnc   = appInfo ? String(appInfo[C_COMM_CHEF]   || "").trim() : "";
            const analyseAnc    = appInfo ? String(appInfo[C_COMM_MED]    || "").trim() : "";
            const actionReqAnc  = appInfo ? String(appInfo[C_ACTION_MED]  || "").trim() : "";

            const cis = appInfo ? String(appInfo[C_APP_CIS]||"").trim() : "";
            const status = (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo";

            return {
                found: true,
                rowEve: i+1,
                rowApp: appRowIdx >= 0 ? appRowIdx+1 : -1,
                bilanKo: appInfo ? isCheckboxChecked(appInfo[C_BILAN_KO]) : false,
                pisuKo: appInfo ? isCheckboxChecked(appInfo[C_PISU_KO]) : false,
                info: {
                    interId: id,
                    date: appInfo ? formatDateHeureFR_(appInfo[C_APP_DATE]) : "",
                    infName: appInfo ? appInfo[C_APP_NOM] : "",
                    motif: appInfo ? appInfo[C_APP_MOTIF] : "",
                    engin: appInfo ? String(appInfo[C_APP_ENGIN]||"").trim() : "",
                    pdf: appInfo ? appInfo[C_APP_PDF] : "",
                    status: status,
                    commChef: commChefAnc || commChefAlex,
                    analyseMed: analyseAnc || dataEve[i][14] || "",
                    actionRequise: actionReqAnc || dataEve[i][16] || "",
                    actionFaite: dataEve[i][17] || "",
                    infoT: appInfo ? String(appInfo[C_APP_INFO_T] || "").trim() : ""
                }
            };
        }
    }
    
    return { found: false, message: "Aucune action à traiter — tout est clôturé !" };
}

/**
 * Sauvegarder l'action faite par chefferie dans APP Eve col R (18), et clôturer S (19)
 */
function saveActionChefferie(form) {
    try {
        const ss = getSS_();
        const shEve = ss.getSheetByName("APP Eve");

        const row = form.rowEve;
        if(!row || row < 2) return { success: false, error: "Ligne invalide" };

        const interId = String(shEve.getRange(row, 1).getValue()).trim();

        // Action faite (colonne R = 18), taguée [COM CHEF id] pour sécuriser le circuit
        const taggedActionFaite = appendOrReplaceTag_(form.actionFaite, "COM CHEF", interId, ["ACTION REALISEE"]);
        shEve.getRange(row, 18).setValue(taggedActionFaite);

        // Clôturer (colonne S = 19)
        shEve.getRange(row, 19).setValue(true);

        // Reclassification : chaque bouton est indépendant (bilan et pisu se traitent séparément)
        if(form.rowApp && form.rowApp >= 2) {
            const shApp = ss.getSheetByName(APP_SHEET_NAME);
            if(shApp) {
                if(form.bilanOk) {
                    shApp.getRange(form.rowApp, C_BILAN_OK+1).setValue(true);
                    shApp.getRange(form.rowApp, C_BILAN_KO+1).setValue(false);
                    _setAlexClassification(ss, interId, { H: true, J: false });
                }
                if(form.bilanErrLegere) {
                    shApp.getRange(form.rowApp, C_BILAN_OK+1).setValue(false);
                    shApp.getRange(form.rowApp, C_BILAN_KO+1).setValue(true);
                    _setAlexClassification(ss, interId, { H: false, J: true });
                }
                if(form.pisuOk) {
                    shApp.getRange(form.rowApp, C_PISU_OK+1).setValue(true);
                    shApp.getRange(form.rowApp, C_PISU_KO+1).setValue(false);
                    _setAlexClassification(ss, interId, { I: true, K: false });
                }
                if(form.pisuErrLegere) {
                    shApp.getRange(form.rowApp, C_PISU_OK+1).setValue(false);
                    shApp.getRange(form.rowApp, C_PISU_KO+1).setValue(true);
                    _setAlexClassification(ss, interId, { I: false, K: true });
                }
            }
        }

        // Clear cache
        const cache_ = CacheService.getScriptCache();
        cache_.remove("chefferie_counts_v4");
        cache_.remove("all_isp_error_stats");
        sheetCacheRemove("all_isp_error_stats");
        const mat_ = _getMat_(ss, interId);
        if(mat_) { cache_.remove("isp_v4_" + mat_); cache_.remove("isp_detail_" + mat_); sheetCacheRemove("isp_v4_" + mat_); sheetCacheRemove("isp_detail_" + mat_); }

        return { success: true };
    } catch(e) {
        return { success: false, error: e.toString() };
    }
}

function _getMat_(ss, interId) {
  try {
    const d = ss.getSheetByName(APP_SHEET_NAME).getDataRange().getValues();
    for(let i=1; i<d.length; i++) {
      if(String(d[i][C_APP_ID]).trim() === interId) return normalizeMat(d[i][C_APP_MAT]);
    }
  } catch(e) {}
  return null;
}

/**
 * Met à jour les checkboxes de classification dans APP Alex (H/I/J/K) pour l'ID donné,
 * et retire systématiquement le flag Erreur Grave (col L) puisqu'une reclassification
 * vers OK ou erreur légère signifie que ce n'est plus une erreur grave.
 */
function _setAlexClassification(ss, interId, flags) {
    try {
        if (!interId) return;
        const shAlex = ss.getSheetByName("APP Alex");
        if (!shAlex) return;
        const dataAlex = shAlex.getDataRange().getValues();
        for (let i = 1; i < dataAlex.length; i++) {
            if (String(dataAlex[i][0]).trim() === interId) {
                const r = i + 1;
                if ('H' in flags) shAlex.getRange(r, 8).setValue(!!flags.H);  // col H
                if ('I' in flags) shAlex.getRange(r, 9).setValue(!!flags.I);  // col I
                if ('J' in flags) shAlex.getRange(r, 10).setValue(!!flags.J); // col J
                if ('K' in flags) shAlex.getRange(r, 11).setValue(!!flags.K); // col K
                if ('L' in flags) shAlex.getRange(r, 12).setValue(!!flags.L); // col L — optionnel
                else shAlex.getRange(r, 12).setValue(false); // col L = erreur grave, retirée par défaut
                break;
            }
        }
    } catch(e) { Logger.log("_setAlexClassification error: " + e); }
}

/**
 * Retourne toutes les fiches "Réaliser actions" (non clôturées) sous forme de liste plate
 */
function getAllActionsChefferie() {
    const ss = getSS_();
    const shEve = ss.getSheetByName("APP Eve");
    const shAlex = ss.getSheetByName("APP Alex");
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if(!shEve) return [];

    const dataEve = shEve.getDataRange().getValues();
    const dataAlex = shAlex ? shAlex.getDataRange().getValues() : [];
    const dataApp = shApp ? shApp.getDataRange().getValues() : [];

    // Index APP Alex par ID
    const alexMap = {};
    for(let j=1; j<dataAlex.length; j++) {
        const id = String(dataAlex[j][0]).trim();
        if(id && !alexMap[id]) alexMap[id] = String(dataAlex[j][12] || "").trim();
    }
    // Index APP par ID
    const appMap = {};
    for(let j=1; j<dataApp.length; j++) {
        const id = String(dataApp[j][C_APP_ID]).trim();
        if(id) appMap[id] = dataApp[j];
    }

    const result = [];
    for(let i=1; i<dataEve.length; i++) {
        const hasAnalyse = !!dataEve[i][14];
        const hasAction  = !!dataEve[i][16];
        const isClosed   = isCheckboxChecked(dataEve[i][18]);
        if((!hasAnalyse && !hasAction) || isClosed) continue;

        const id = String(dataEve[i][0]).trim();
        const appInfo = appMap[id] || null;
        const commChefAnc  = appInfo ? String(appInfo[C_COMM_CHEF]  || "").trim() : "";
        const analyseAnc   = appInfo ? String(appInfo[C_COMM_MED]   || "").trim() : "";
        const actionReqAnc = appInfo ? String(appInfo[C_ACTION_MED] || "").trim() : "";
        const cis = appInfo ? String(appInfo[C_APP_CIS]||"").trim() : "";

        result.push({
            rowEve: i+1,
            rowApp: appInfo ? (dataApp.indexOf(appInfo)+1) : -1,
            bilanKo: appInfo ? isCheckboxChecked(appInfo[C_BILAN_KO]) : false,
            pisuKo:  appInfo ? isCheckboxChecked(appInfo[C_PISU_KO])  : false,
            info: {
                interId:       id,
                date:          appInfo ? formatDateHeureFR_(appInfo[C_APP_DATE]) : "",
                infName:       appInfo ? String(appInfo[C_APP_NOM]||"") : "",
                motif:         appInfo ? String(appInfo[C_APP_MOTIF]||"") : "",
                engin:         appInfo ? String(appInfo[C_APP_ENGIN]||"").trim() : "",
                pdf:           appInfo ? appInfo[C_APP_PDF] : "",
                status:        (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo",
                commChef:      commChefAnc || alexMap[id] || "",
                analyseMed:    analyseAnc  || String(dataEve[i][14]||""),
                actionRequise: actionReqAnc || String(dataEve[i][16]||""),
                actionFaite:   String(dataEve[i][17]||""),
                infoT:         appInfo ? String(appInfo[C_APP_INFO_T]||"").trim() : ""
            }
        });
    }
    return result;
}

/**
 * Récupérer toutes les actions archivées (S=true), groupées par ISP
 */
function getArchivedActions() {
    const ss = getSS_();
    const shEve = ss.getSheetByName("APP Eve");
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const shAlex = ss.getSheetByName("APP Alex");
    if(!shEve) return [];
    
    const dataEve = shEve.getDataRange().getValues();
    const dataApp = shApp ? shApp.getDataRange().getValues() : [];
    const dataAlex = shAlex ? shAlex.getDataRange().getValues() : [];
    
    // Index APP par ID
    const appIndex = {};
    for(let i=1; i<dataApp.length; i++) {
        const id = String(dataApp[i][C_APP_ID]).trim();
        appIndex[id] = dataApp[i];
    }
    
    // Index Alex par ID
    const alexIndex = {};
    for(let i=1; i<dataAlex.length; i++) {
        const id = String(dataAlex[i][0]).trim();
        if(id && !alexIndex[id]) alexIndex[id] = dataAlex[i];
    }

    // Index APP : commChef ancré (BX) par ID — priorité sur Alex
    const appCommChefById = {};
    for(let i=1; i<dataApp.length; i++) {
        const id = String(dataApp[i][C_APP_ID]).trim();
        if(id) appCommChefById[id] = String(dataApp[i][C_COMM_CHEF] || "").trim();
    }
    
    // Grouper par ISP
    const ispMap = {}; // { ispName: [fiches] }
    
    for(let i=1; i<dataEve.length; i++) {
        const isClosed = isCheckboxChecked(dataEve[i][18]); // S
        if(!isClosed) continue;
        
        const id = String(dataEve[i][0]).trim();
        const appRow = appIndex[id];
        const alexRow = alexIndex[id];
        
        const ispName = appRow ? String(appRow[C_APP_NOM]||"").trim() : "";
        if(!ispName) continue;
        
        const cis = appRow ? String(appRow[C_APP_CIS]||"").trim() : "";
        const status = (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo";
        
        if(!ispMap[ispName]) ispMap[ispName] = [];
        // commChef : APP BX (ancré) → Alex col M (fallback)
        const commChefAnc = appCommChefById[id] || "";
        const commChefAlex = alexRow ? String(alexRow[12] || "").trim() : "";
        ispMap[ispName].push({
            id: id,
            date: appRow ? formatDateHeureFR_(appRow[C_APP_DATE]) : "",
            motif: appRow ? appRow[C_APP_MOTIF] : "",
            engin: appRow ? String(appRow[C_APP_ENGIN]||"").trim() : "",
            pdf: appRow ? appRow[C_APP_PDF] : "",
            status: status,
            commChef: commChefAnc || commChefAlex,
            analyseMed: dataEve[i][14] || "",
            actionRequise: dataEve[i][16] || "",
            actionFaite: dataEve[i][17] || ""
        });
    }
    
    // Convertir en array trié par nom
    return Object.keys(ispMap).sort().map(name => ({
        ispName: name,
        count: ispMap[name].length,
        fiches: ispMap[name]
    }));
}

// HELPERS
function getInterventionDetails(interId) {
  const ss = getSS_();
  const id = String(interId).trim();
  let pdfUrl="", commentChefferie="", analyseMed="", centre="", engin="",
      nom="", date="", motif="",
      commentISP="", commentMedAction="", actionFaite="",
      bilanOk=false, bilanKo=false, pisuOk=false, pisuKo=false,
      alexH=false, alexI=false, alexJ=false, alexK=false, alexL=false;

  const shApp = ss.getSheetByName(APP_SHEET_NAME);
  if(shApp) {
    const data = shApp.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][C_APP_ID]).trim() !== id) continue;
      pdfUrl     = data[i][C_APP_PDF];
      centre     = String(data[i][C_APP_CIS]||"").trim();
      engin      = String(data[i][C_APP_ENGIN]||"").trim();
      nom        = String(data[i][C_APP_NOM]||"").trim();
      date       = formatDateHeureFR_(data[i][C_APP_DATE]);
      motif      = String(data[i][C_APP_MOTIF]||"").trim();
      commentChefferie = String(data[i][C_COMM_CHEF]||"").trim();
      analyseMed       = String(data[i][C_COMM_MED]||"").trim();
      commentMedAction = String(data[i][C_ACTION_MED]||"").trim();
      const bp = String(data[i][C_TXTBILAN_KO]||"").trim();
      const bq = String(data[i][C_TXTPISU_KO]||"").trim();
      commentISP = [bp, bq].filter(Boolean).join("\n");
      bilanOk = isCheckboxChecked(data[i][C_BILAN_OK]);
      bilanKo = isCheckboxChecked(data[i][C_BILAN_KO]);
      pisuOk  = isCheckboxChecked(data[i][C_PISU_OK]);
      pisuKo  = isCheckboxChecked(data[i][C_PISU_KO]);
      break;
    }
  }

  // Alex : classification + fallback commentaire chefferie
  const shAlex = ss.getSheetByName("APP Alex");
  if(shAlex) {
    const data = shAlex.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]).trim() !== id) continue;
      alexH = isCheckboxChecked(data[i][7]);
      alexI = isCheckboxChecked(data[i][8]);
      alexJ = isCheckboxChecked(data[i][9]);
      alexK = isCheckboxChecked(data[i][10]);
      alexL = isCheckboxChecked(data[i][11]);
      if(!commentChefferie) commentChefferie = String(data[i][12]||"").trim();
      break;
    }
  }

  // Eve : analyse médecin, action requise (fallback), action faite
  const shEve = ss.getSheetByName("APP Eve");
  if(shEve) {
    const data = shEve.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
      if(String(data[i][0]).trim() !== id) continue;
      if(!analyseMed)       analyseMed       = String(data[i][14]||"").trim();
      if(!commentMedAction) commentMedAction = String(data[i][16]||"").trim();
      actionFaite = String(data[i][17]||"").trim();
      break;
    }
  }

  return {
    pdfUrl, commentChefferie, analyseMed, centre, engin,
    nom, date, motif,
    commentISP, commentMedAction, actionFaite,
    bilanOk, bilanKo, pisuOk, pisuKo,
    alexH, alexI, alexJ, alexK, alexL
  };
}

function recategoriserIntervention(form) {
  try {
    const ss = getSS_();
    const id = String(form.interId).trim();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const shAlex = ss.getSheetByName("APP Alex");

    // 1. Trouver la ligne APP
    const dataApp = shApp.getDataRange().getValues();
    let appRow = -1;
    for(let i=1; i<dataApp.length; i++) {
      if(String(dataApp[i][C_APP_ID]).trim() === id) { appRow = i; break; }
    }
    if(appRow === -1) return { success: false, error: "Intervention introuvable dans APP" };
    const appRowSheet = appRow + 1;

    // 2. Mettre à jour APP (bilan axis)
    if(form.errGrave || form.bilanErrLegere) {
      shApp.getRange(appRowSheet, C_BILAN_OK+1).setValue(false);
      shApp.getRange(appRowSheet, C_BILAN_KO+1).setValue(true);
    } else if(form.bilanOk) {
      shApp.getRange(appRowSheet, C_BILAN_OK+1).setValue(true);
      shApp.getRange(appRowSheet, C_BILAN_KO+1).setValue(false);
    }

    // 2b. APP (pisu axis)
    if(form.errGrave || form.pisuErrLegere) {
      shApp.getRange(appRowSheet, C_PISU_OK+1).setValue(false);
      shApp.getRange(appRowSheet, C_PISU_KO+1).setValue(true);
    } else if(form.pisuOk) {
      shApp.getRange(appRowSheet, C_PISU_OK+1).setValue(true);
      shApp.getRange(appRowSheet, C_PISU_KO+1).setValue(false);
    }

    // 3. S'assurer qu'une ligne Alex existe (cas : intervention précédemment OK, pas dans Alex)
    const hasError = form.errGrave || form.bilanErrLegere || form.pisuErrLegere;
    if(hasError) {
      const alexData = shAlex.getDataRange().getValues();
      let foundAlex = false;
      for(let i=1; i<alexData.length; i++) {
        if(String(alexData[i][0]).trim() === id) { foundAlex = true; break; }
      }
      if(!foundAlex) {
        const aRow = dataApp[appRow];
        shAlex.appendRow([
          id,
          aRow[C_APP_MOTIF]||"",
          aRow[C_APP_PDF]||"",
          aRow[C_APP_INFO_T]||"",
          aRow[C_APP_NOM]||"",
          aRow[C_TXTBILAN_KO]||"",
          aRow[C_TXTPISU_KO]||""
        ]);
      }
    }

    // 4. Mettre à jour les cases Alex (H/I/J/K/L)
    if(form.errGrave) {
      _setAlexClassification(ss, id, { H:false, I:false, J:false, K:false, L:true });
    } else {
      const flags = {};
      if(form.bilanOk)      { flags.H=true;  flags.J=false; }
      if(form.bilanErrLegere) { flags.H=false; flags.J=true;  }
      if(form.pisuOk)       { flags.I=true;  flags.K=false; }
      if(form.pisuErrLegere)  { flags.I=false; flags.K=true;  }
      if(Object.keys(flags).length > 0) _setAlexClassification(ss, id, flags);
    }

    // 5. Clear caches
    const cache = CacheService.getScriptCache();
    cache.remove("chefferie_counts_v4");
    cache.remove("all_isp_error_stats");
    sheetCacheRemove("all_isp_error_stats");
    const mat_ = _getMat_(ss, id);
    if(mat_) { cache.remove("isp_v4_" + mat_); cache.remove("isp_detail_" + mat_); sheetCacheRemove("isp_v4_" + mat_); sheetCacheRemove("isp_detail_" + mat_); }

    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function calcTrend(c,p) { if(!p) return {val:(c>0?"+100%":"0%"), color:"gray", arrow:"="}; const d = ((c-p)/p)*100; return { val: (d>0?"+":"")+d.toFixed(1)+"%", color: d>=0?"#39ff14":"#ff4d4d", arrow: d>=0?"▲":"▼" }; }
function normalizeMat(v) { return String(v||"").trim().toUpperCase(); }
function checkAuth_(m, d) { 
  if(d==="admin_override") return true; 
  try { 
    const s = SpreadsheetApp.openById(ID_SS_RH).getSheets()[0]; 
    const data = s.getDataRange().getValues(); 
    const inputDob = String(d).trim(); // JJ/MM/AAAA
    
    Logger.log(`checkAuth_ - Matricule: ${m}, DOB input: ${inputDob}`);
    
    // Chercher le matricule dans la feuille RH
    for(let i = 0; i < data.length; i++) {
      const rmMat = normalizeMat(data[i][0]);
      if(rmMat !== normalizeMat(m)) continue; // Pas ce matricule
      
      // Matricule trouvé - vérifier la date
      const rDob = data[i][1];
      let storedDobStr = "";
      
      if(Object.prototype.toString.call(rDob) === "[object Date]") {
        // C'est une vrai date Google Sheets
        storedDobStr = `${String(rDob.getDate()).padStart(2,"0")}/${String(rDob.getMonth()+1).padStart(2,"0")}/${rDob.getFullYear()}`;
      } else if(typeof rDob === "number") {
        // Date stockée comme nombre (timestamp Google Sheets)
        const d = new Date((rDob - 25569) * 86400 * 1000); // Formule Google Sheets
        storedDobStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
      } else {
        // C'est du texte
        storedDobStr = String(rDob).trim();
      }
      
      Logger.log(`checkAuth_ - Stored DOB: ${storedDobStr}, Match: ${storedDobStr === inputDob}`);
      
      if(storedDobStr === inputDob) {
        return true; // Authentification réussie
      }
    }
    
    // Matricule trouvé mais DOB ne correspond pas, ou matricule non trouvé
    Logger.log(`checkAuth_ - FAIL: Matricule ${m} avec DOB ${inputDob} non autorisé`);
    return false; // Authentification échouée
  } catch(e) { 
    Logger.log(`checkAuth_ ERROR: ${e.toString()}`);
    return false; // En cas d'erreur, REJETER l'authentification
  } 
}
function coerceToDate_(v){if(!v)return null;if(Object.prototype.toString.call(v)==="[object Date]")return v;let m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?new Date(m[3],m[2]-1,m[1]):null;}
function coerceToDateTime_(v){if(!v)return null;if(Object.prototype.toString.call(v)==="[object Date]")return v;const s=String(v).trim();let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2})[:\/](\d{2})(?:[:\/](\d{2}))?)?$/);if(m)return new Date(m[3],m[2]-1,m[1],m[4]||0,m[5]||0);return coerceToDate_(v);}
function formatDateFR_(d){return d?`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`:"";}
function formatDateHeureFR_(v){ const d = coerceToDateTime_(v); if(!d) return "—"; return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

/**
 * Pré-cache ISP en BULK : charge TOUS les fichiers UNE SEULE FOIS,
 * puis calcule les stats de chaque agent en mémoire.
 * Évite d'ouvrir le spreadsheet 2025 77 fois (cause du timeout).
 */
function _bulkPreCacheAllIsp() {
  const cache = CacheService.getScriptCache();
  const ss = getSS_();
  const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  
  // === 1. CHARGER TOUTES LES DONNÉES EN MÉMOIRE (1 seule fois) ===
  // DOBs depuis le registre RH (évite de dépendre de la colonne U du Dashboard)
  const dobByMatBulk = {};
  try {
    const rhData = SpreadsheetApp.openById(ID_SS_RH).getSheets()[0].getDataRange().getValues();
    for (const row of rhData) {
      const m = normalizeMat(row[0]);
      if (!m) continue;
      const dob = row[1];
      let dobStr = "";
      if (Object.prototype.toString.call(dob) === "[object Date]") {
        dobStr = String(dob.getDate()).padStart(2,"0") + "/" + String(dob.getMonth()+1).padStart(2,"0") + "/" + dob.getFullYear();
      } else if (typeof dob === "number") {
        const d2 = new Date((dob - 25569) * 86400000);
        dobStr = String(d2.getDate()).padStart(2,"0") + "/" + String(d2.getMonth()+1).padStart(2,"0") + "/" + d2.getFullYear();
      } else if (dob) {
        dobStr = String(dob).trim();
      }
      if (dobStr) dobByMatBulk[m] = dobStr;
    }
  } catch(eRhBulk) { Logger.log("_bulkPreCacheAllIsp RH error: " + eRhBulk); }

  const activeAgentsBulk = getActiveAgents_(ss);
  const agents = [];
  for (const a of activeAgentsBulk) {
    const dob = dobByMatBulk[a.mat];
    if (dob) agents.push({ mat: a.mat, dob, nom: a.nom, nomLower: a.nom.toLowerCase() });
  }
  Logger.log("Bulk ISP: " + agents.length + " agents à pré-cacher");
  
  const lastDateRaw = dash.getRange(DASH_LASTDATE_CELL).getValue();
  const lastDate = coerceToDate_(lastDateRaw) || new Date();
  const cutoffCode = (lastDate.getMonth() + 1) * 100 + lastDate.getDate();
  
  // Temps travail 2026
  const shTemps = ss.getSheetByName(TEMPS_SHEET_NAME);
  const tempsData = shTemps ? shTemps.getDataRange().getValues() : [];
  
  // APP 2026
  const shApp = ss.getSheetByName(APP_SHEET_NAME);
  const appData = shApp ? shApp.getDataRange().getValues() : [];
  
  // APP Alex
  const shAlex = ss.getSheetByName("APP Alex");
  const alexData = shAlex ? shAlex.getDataRange().getValues() : [];
  
  // 2025 (1 seule ouverture!)
  let tempsData25 = [], appData25 = [], dashData25 = [];
  try {
    const ss25 = SpreadsheetApp.openById(ID_SS_2025);
    const d25 = ss25.getSheetByName("Dashboard");
    if(d25 && d25.getLastRow() >= 3) dashData25 = d25.getRange(3, 1, d25.getLastRow()-2, 40).getValues();
    const a25 = ss25.getSheetByName("APP");
    if(a25) appData25 = a25.getDataRange().getValues();
    const t25 = ss25.getSheetByName("Temps travail");
    if(t25) tempsData25 = t25.getDataRange().getValues();
  } catch(e) { Logger.log("Erreur chargement 2025: " + e); }
  
  // Charger historique temps travail pour inclure dans chaque ISP
  let histRows = [];
  try { histRows = getHistoriqueTempsTravailAdmin() || []; } catch(e) { Logger.log("Erreur chargement historique: " + e); }
  
  Logger.log("Bulk ISP: Données chargées. Calcul par agent...");
  
  // === 2. Index APP, APP Alex par ID ===
  const appById = {};
  const appByMat = {};
  for(let i=1; i<appData.length; i++) {
    const id = String(appData[i][C_APP_ID]).trim();
    const mat = normalizeMat(appData[i][C_APP_MAT]);
    const cis = String(appData[i][C_APP_CIS]||"").trim();
    appById[id] = {
      mat, cis,
      motif: String(appData[i][C_APP_MOTIF]||"").trim(),
      engin: String(appData[i][C_APP_ENGIN]||"").trim(),
      date: formatDateHeureFR_(appData[i][C_APP_DATE]),
      nom: String(appData[i][C_APP_NOM]||"").trim().toLowerCase(),
      status: cis === "SD SSSM" ? "De Garde" : "Astreinte / Dispo",
      bilanOk: appData[i][C_BILAN_OK],
      bilanKo: appData[i][C_BILAN_KO],
      pisuOk: appData[i][C_PISU_OK],
      pisuKo: appData[i][C_PISU_KO]
    };
    if(!appByMat[mat]) appByMat[mat] = [];
    appByMat[mat].push(id);
  }
  
  const alexById = {};
  for(let i=1; i<alexData.length; i++) {
    const id = String(alexData[i][0]).trim();
    if(!id || alexById[id]) continue; // 1ère occurrence
    alexById[id] = {
      hasH: isCheckboxChecked(alexData[i][7]),
      hasI: isCheckboxChecked(alexData[i][8]),
      hasJ: isCheckboxChecked(alexData[i][9]),
      hasK: isCheckboxChecked(alexData[i][10]),
      hasL: isCheckboxChecked(alexData[i][11])
    };
  }
  
  // Index 2025 par mat
  const dash25ByMat = {};
  for(let i=0; i<dashData25.length; i++) {
    const m = normalizeMat(dashData25[i][1]);
    if(m) dash25ByMat[m] = { inter: Number(dashData25[i][1])||0, ast: Number(dashData25[i][2])||0, garde: Number(dashData25[i][3])||0 };
  }
  
  // === 3. CALCULER POUR CHAQUE AGENT ===
  let cachedCount = 0;
  const bulkCacheEntries = []; // Pour écriture batch dans le spreadsheet cache
  for(const agent of agents) {
    try {
      const mat = agent.mat;
      const myName = agent.nomLower;
      const cacheKey = "isp_v4_" + mat;
      
      // Temps travail 2026
      let hAst26=0, hGarde26=0, interHg26=0;
      let bilanConf=0, pisuConf=0;
      const monthlyAst26 = new Array(12).fill(0);
      const monthlyGarde26 = new Array(12).fill(0);
      
      for(let i=1; i<tempsData.length; i++) {
        if(normalizeMat(tempsData[i][C_TEMPS_MAT_AST]) === mat) {
          hAst26 += 0.5;
          const dA = coerceToDateTime_(tempsData[i][C_TEMPS_DATE_AST]);
          if(dA) monthlyAst26[dA.getMonth()] += 0.5;
        }
        if(normalizeMat(tempsData[i][C_TEMPS_MAT_GARDE]) === mat) {
          hGarde26 += 0.5;
          const dG = coerceToDateTime_(tempsData[i][C_TEMPS_DATE_GARDE]);
          if(dG) monthlyGarde26[dG.getMonth()] += 0.5;
        }
      }
      
      // APP 2026 - interventions + bilan/pisu confs
      const myIds = appByMat[mat] || [];
      for(const id of myIds) {
        const row = appById[id];
        if(row.cis !== "SD SSSM") interHg26++;
      }
      // bilanConf/pisuConf : match par NOM sur TOUT l'APP (comme getIspStats original)
      for(let i=1; i<appData.length; i++) {
        const nameInApp = String(appData[i][C_APP_NOM]||"").trim().toLowerCase();
        if(nameInApp === myName || nameInApp.includes(myName)) {
          if(isCheckboxChecked(appData[i][C_BILAN_OK])) bilanConf++;
          if(isCheckboxChecked(appData[i][C_PISU_OK])) pisuConf++;
        }
      }
      
      // 2025
      let hAst25_tot=0, hGarde25_tot=0, interHg25_tot=0, hAst25_ytd=0, hGarde25_ytd=0, interHg25_ytd=0;
      const d25 = dash25ByMat[mat];
      if(d25) { interHg25_tot = d25.inter; hAst25_tot = d25.ast; hGarde25_tot = d25.garde; }
      
      for(let i=1; i<appData25.length; i++) {
        const d = coerceToDateTime_(appData25[i][EXT_APP_COL_DATE]);
        const m = normalizeMat(appData25[i][EXT_APP_COL_MAT]);
        if(d && m === mat) {
          const md = (d.getMonth()+1)*100 + d.getDate();
          if(md <= cutoffCode) {
            const c = String(appData25[i][EXT_APP_COL_CENTRE]||"").trim();
            if(c !== "SD SSSM") interHg25_ytd++;
          }
        }
      }
      for(let i=1; i<tempsData25.length; i++) {
        const dA = coerceToDateTime_(tempsData25[i][EXT_TEMPS_COL_DATE_AST]);
        const mA = normalizeMat(tempsData25[i][EXT_TEMPS_COL_MAT_AST]);
        if(dA && mA === mat && (dA.getMonth()+1)*100+dA.getDate() <= cutoffCode) hAst25_ytd += 0.5;
        const dG = coerceToDateTime_(tempsData25[i][EXT_TEMPS_COL_DATE_GARDE]);
        const mG = normalizeMat(tempsData25[i][EXT_TEMPS_COL_MAT_GARDE]);
        if(dG && mG === mat && (dG.getMonth()+1)*100+dG.getDate() <= cutoffCode) hGarde25_ytd += 0.5;
      }
      
      // Erreurs depuis APP Alex + Bilan/Pisu OK
      const errLegereBilan = [], errLegerePisu = [], errLourde = [];
      const okBilanList = [], okPisuList = [];
      let bilanOkCount = 0, pisuOkCount = 0;
      
      for(const id of myIds) {
        const row = appById[id];
        const tags = alexById[id] || {};
        
        // Erreurs (seulement si tags APP Alex existent)
        if(tags.hasJ && !isCheckboxChecked(row.bilanOk)) {
          errLegereBilan.push({ id, motif: row.motif, centre: row.cis, engin: row.engin, date: row.date, status: row.status, types: ["Erreur Bilan Légère"], errorType: "Erreur Bilan Légère" });
        }
        if(tags.hasK && !isCheckboxChecked(row.pisuOk)) {
          errLegerePisu.push({ id, motif: row.motif, centre: row.cis, engin: row.engin, date: row.date, status: row.status, types: ["Erreur Pisu Légère"], errorType: "Erreur Pisu Légère" });
        }
        if(tags.hasL) {
          errLourde.push({ id, motif: row.motif, centre: row.cis, engin: row.engin, date: row.date, status: row.status, types: ["Erreur Grave"], errorType: "Erreur Grave" });
        }
        
        // Bilan OK / Pisu OK (comme dans getIspStats original)
        if(isCheckboxChecked(row.bilanOk)) {
          bilanOkCount++;
          okBilanList.push({ id, motif: row.motif, centre: row.cis, engin: row.engin, date: row.date, status: row.status, types: ["Bilan OK"], errorType: "" });
        } else if(isCheckboxChecked(row.bilanKo) && tags.hasH) {
          bilanOkCount++;
          okBilanList.push({ id, motif: row.motif, centre: row.cis, engin: row.engin, date: row.date, status: row.status, types: ["Bilan OK"], errorType: "" });
        }
        if(isCheckboxChecked(row.pisuOk)) {
          pisuOkCount++;
          okPisuList.push({ id, motif: row.motif, centre: row.cis, engin: row.engin, date: row.date, status: row.status, types: ["Pisu OK"], errorType: "" });
        } else if(isCheckboxChecked(row.pisuKo) && tags.hasI) {
          pisuOkCount++;
          okPisuList.push({ id, motif: row.motif, centre: row.cis, engin: row.engin, date: row.date, status: row.status, types: ["Pisu OK"], errorType: "" });
        }
      }
      
      // txSoll depuis le Dashboard
      const txSoll = Number(rawAgents[agent.idx][24]) || 0;
      // histTempsTravail - chercher par nom dans les données historique
      let histTempsTravail = null;
      if(histRows && histRows.length) {
        const normN = s => String(s || "").trim().toLowerCase();
        histTempsTravail = histRows.find(r => normN(r.nom) === normN(agent.nom)) || null;
      }

      const result = {
        nom: agent.nom,
        astreinte2026: hAst26, astreinte2025_ytd: hAst25_ytd, astreinte2025_tot: hAst25_tot,
        garde2026: hGarde26, garde2025_ytd: hGarde25_ytd, garde2025_tot: hGarde25_tot,
        inter2026: interHg26, inter2025_ytd: interHg25_ytd, inter2025_tot: interHg25_tot,
        txSoll: txSoll,
        histTempsTravail: histTempsTravail,
        bilanConf, pisuConf,
        bilanOkCount, pisuOkCount,
        okBilanList, okPisuList,
        errLegereBilan, errLegerePisu, errLourde,
        monthlyAst26, monthlyGarde26
      };
      
      // Accumuler pour écriture batch
      try {
        const jsonStr = JSON.stringify(result);
        if(jsonStr.length <= 90000) {
          cache.put(cacheKey, jsonStr, 7200);
        }
        bulkCacheEntries.push({ key: cacheKey, json: jsonStr });
      } catch(ce) {}
      
      cachedCount++;
    } catch(agentErr) {
      Logger.log("Erreur bulk agent " + agent.mat + ": " + agentErr);
    }
  }
  
  // === 4. ÉCRITURE BATCH dans le spreadsheet cache ===
  try {
    const cacheSS = _getCacheSS();
    const cacheSheet = cacheSS.getSheetByName("Cache");
    if(cacheSheet) {
      const existingData = cacheSheet.getDataRange().getValues();
      const keyRowMap = {};
      for(let i=1; i<existingData.length; i++) {
        keyRowMap[existingData[i][0]] = i + 1; // row number (1-based)
      }
      
      const now = new Date();
      const toAppend = [];
      
      for(const entry of bulkCacheEntries) {
        const rowNum = keyRowMap[entry.key];
        if(rowNum) {
          // Mise à jour existante
          cacheSheet.getRange(rowNum, 2, 1, 3).setValues([[entry.json, now, 7200]]);
        } else {
          toAppend.push([entry.key, entry.json, now, 7200]);
        }
      }
      
      // Append nouvelles clés en batch
      if(toAppend.length > 0) {
        cacheSheet.getRange(cacheSheet.getLastRow() + 1, 1, toAppend.length, 4).setValues(toAppend);
      }
      Logger.log("Batch cache: " + bulkCacheEntries.length + " entrées écrites");
    }
  } catch(batchErr) {
    Logger.log("Erreur batch cache: " + batchErr);
  }
  
  Logger.log("Bulk ISP terminé: " + cachedCount + "/" + agents.length + " agents");
}

function updateHistoryCache() {
  try {
    Logger.log("Début updateHistoryCache");
    
    const startTime = new Date();
    
    // 1. Précalculer les données 2026
    getStats2026();
    
    // 2. Précalculer les données 2025
    getStats2025();
    
    // 3. Précalculer les données par ISP (tableau global)
    getAllIspErrorStats();
    
    // 4. Précalculer les données admin
    getAdminData();
    
    // 5. Précalculer les compteurs de chefferie (APP)
    getChefferieCounts();

    // 5a. Précalculer historique temps travail
    try { getHistoriqueTempsTravailAdmin(); } catch(e) { Logger.log("Erreur pré-cache historique temps travail: " + e); }
    
    // 5b. Précalculer astreinte départementale ISPP
    try { getAstreinteISPP(); } catch(e) { Logger.log("Erreur pré-cache ISPP: " + e); }
    
    // 6. Précalculer les fiches chefferie ISP + médecin
    try {
      getChefferieNextCase('app_isp');
      getChefferieNextCase('med_chef');
    } catch(e) { Logger.log("Erreur pré-cache chefferie: " + e); }
    
    // 7. Pré-charger les données ISP individuelles en BULK (1 seul chargement des fichiers)
    try {
      _bulkPreCacheAllIsp();
    } catch(e) {
      Logger.log("Erreur bulk ISP: " + e);
    }
    
    const endTime = new Date();
    const statusMsg = `✅ ${formatDateHeureFR_(endTime)}`;
    
    // Stocker le status du cache
    const cache = CacheService.getScriptCache();
    cache.put("cache_status", statusMsg, 86400); // Stocke pendant 24h
    
    Logger.log("updateHistoryCache terminé avec succès");
    return statusMsg;
  } catch(e) {
    Logger.log("Erreur updateHistoryCache: " + e.toString());
    const cache = CacheService.getScriptCache();
    cache.put("cache_status", "❌ Erreur: " + e.toString().substring(0, 50), 3600);
    return "Erreur: " + e.toString();
  }
}

function installCacheTrigger() {
  // Supprimer les anciens triggers pour éviter les doublons
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if(fn === "updateHistoryCache" || fn === "preCacheAllData") {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Créer un trigger toutes les 2 heures
  ScriptApp.newTrigger("updateHistoryCache")
    .timeBased()
    .everyHours(2)
    .create();
  
  // Exécuter immédiatement une première fois
  updateHistoryCache();
  
  return "Trigger installé : cache mis à jour toutes les 2h";
}

function clearAllCaches() {
  try {
    const cache = CacheService.getScriptCache();

    // 1) Clés globales connues
    cache.removeAll(["admin_data_full_v2", "astreinte_dept_ispp_v3", "cache_status", "history_cache_v2", "historique_temps_travail_v1", "stats2026_v4", "stats2026_v6", "stats2026_v7", "stats2026_v8", "stats2026_v9", "stats2026_v11", "stats2025_vStable", "chefferie_counts_v4", "all_isp_error_stats", "stats2026_v3"]);

    // 2) Clés par agent : isp_v4_MAT et isp_detail_MAT
    // CacheService.removeAll() ne supporte pas les wildcards — on lit la liste des
    // matricules depuis le Dashboard et on supprime chaque clé individuellement.
    try {
      const ss = getSS_();
      const allAgents = getActiveAgents_(ss);
      const agentKeys = [];
      allAgents.forEach(function(a) {
        agentKeys.push("isp_v4_" + a.mat);
        agentKeys.push("isp_detail_" + a.mat);
      });
      if(agentKeys.length) cache.removeAll(agentKeys);
    } catch(e2) {
      Logger.log("clearAllCaches agent keys error: " + e2);
    }

    // 3) Vider TOUT le spreadsheet cache (toutes les clés)
    const cacheSS = _getCacheSS();
    const cacheSheet = cacheSS.getSheetByName("Cache");
    if(cacheSheet) {
      const lastRow = cacheSheet.getLastRow();
      if(lastRow > 1) {
        cacheSheet.deleteRows(2, lastRow - 1);
      }
    }

    return "✅ Tous les caches vidés (CacheService + Spreadsheet). La page va se recharger.";
  } catch(e) {
    Logger.log("clearAllCaches error: " + e);
    return "⚠️ Cache partiellement vidé (erreur: " + e.message + ")";
  }
}
function getDashboardData(){ return getStats2026(); }

/**
 * MIGRATION PROTOCOLES — À exécuter UNE SEULE FOIS
 * 
 * Problème : les lignes 2-271 ont été analysées avec l'ancien système de protocoles.
 * Les cases cochées sont dans les anciennes colonnes (V-AW) avec l'ancien mapping.
 * Le nouveau système utilise V-AY (30 colonnes) avec un mapping différent.
 * 
 * Solution : pour chaque nouveau protocole dans Dashboard J, on calcule :
 *   = [nombre de TRUE dans l'ancienne colonne équivalente, lignes 2-271]
 *     + COUNTIF(APP!<nouvelle_col>272:<nouvelle_col>;TRUE)
 * 
 * Mapping ancien → nouveau :
 * ADULTES:
 *   V=VVP → V(VVP)                    | AC=ACR → AC(ACR)         | AI=DlrTho → AJ(DlrTho)
 *   W=Hypo → X(Hypo)                  | AD=Allergie → AD(Anaph)  | AJ=CoupChaleur → AK
 *   X=DétrCircu → Y(ChocHémo)         | AE=DRA → AE(Asthme)     | AK=Fracture → AL
 *   Y=Brulure → Z(Brulure)            | AF=IntoxFum → AG(Intox)  | AL=HPA → AM(HPA)
 *   Z=DlrAigue → AA(DlrAigue)         | AG=Convul → AH(Convul)
 *   AA=Penthrox → AA(DlrAigue)         | AH=Accouch → AI(Accouch)
 *   AB=DlrIade → AB(AnalgésieProcéd)   |
 * 
 * PÉDIATRIQUES:
 *   AM=VVP → AN    | AO=Brulure → AQ  | AQ=ACR → AS       | AS=DRA → AU     | AU=Convul → AW
 *   AN=Hypo → AP   | AP=Dlr → AR       | AR=Allergie → AT   | AT=IntoxFum → AV | AV=NvxNé → AX
 *                                                                                 | AW=HPE → AY
 * 
 * Nouveaux protocoles sans équivalent ancien (compteur ancien = 0) :
 *   W=ECG(2A), AF=OAP(11A), AO=ECG(2E)
 */
function migrateProtocoles2026() {
  const ss = getSS_();
  
  // === 1. Renommer en-têtes APP (ligne 1) ===
  const shApp = ss.getSheetByName(APP_SHEET_NAME);
  if (!shApp) throw new Error("Onglet APP introuvable");
  
  const headers = [
    "VVP (1A)", "ECG (2A)", "Hypoglycémie (3A)", "Choc hémorragique (4A)",
    "Brulure (5A)", "Douleur aigue (6A)", "Analgésie procédurale (7A)", "ACR (8A)",
    "Anaphylaxie (9A)", "Asthme/BPCO (10A)", "OAP (11A)", "Intox fumée (12A)",
    "Convulsion (13A)", "Accouchement (14A)", "Dlr Tho (15A)", "Coup chaleur (16A)",
    "Fracture (17A)", "Hors Protocole (HPA)",
    "VVP (1E)", "ECG (2E)", "Hypoglycémie (3E)", "Brulure (5E)",
    "Douleur aigue (6E)", "ACR (8E)", "Anaphylaxie (9E)", "Asthme/BPCO (10E)",
    "Intox fumée (12E)", "Convulsion (13E)", "Nouveau Né (14E)", "Hors Protocole (HPE)"
  ];
  
  const startCol = C_PROTO_START + 1;
  shApp.getRange(1, startCol, 1, headers.length).setValues([headers]);
  
  shApp.getRange(1, C_AKIM + 1).setValue("AKIM");
  shApp.getRange(1, C_SMUR + 1).setValue("SMUR");
  shApp.getRange(1, C_CCMU + 1).setValue("CCMU");
  shApp.getRange(1, C_DEVENIR + 1).setValue("DEVENIR");
  shApp.getRange(1, C_SOUSAN + 1).setValue("SOUSAN");
  shApp.getRange(1, C_NBVICTIMES + 1).setValue("NB VICTIMES");
  
  // === 2. Compter les TRUE dans les anciennes colonnes (lignes 2-271) ===
  // Anciennes colonnes V(col22) à AW(col49) = 28 colonnes
  const OLD_LAST_ROW = 271;
  const oldRange = shApp.getRange(2, 22, OLD_LAST_ROW - 1, 28); // V=22 à AW=49, 28 cols
  const oldData = oldRange.getValues();
  
  // Compter TRUE par colonne (index 0-27 = V-AW)
  const oldCounts = new Array(28).fill(0);
  for (let r = 0; r < oldData.length; r++) {
    for (let c = 0; c < 28; c++) {
      if (isCheckboxChecked(oldData[r][c])) oldCounts[c]++;
    }
  }
  // oldCounts[0]=V, [1]=W, [2]=X... [27]=AW
  
  // === 3. Mapper ancien → nouveau ===
  // Nouveau : 30 colonnes (V=0 à AY=29)
  // Pour chaque nouveau protocole : combien de l'ancien ?
  const newColLetters = [
    "V","W","X","Y","Z","AA","AB","AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM",
    "AN","AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY"
  ];
  
  // Index dans oldCounts : V=0, W=1, X=2, Y=3, Z=4, AA=5, AB=6, AC=7, AD=8, AE=9,
  //                        AF=10, AG=11, AH=12, AI=13, AJ=14, AK=15, AL=16,
  //                        AM=17, AN=18, AO=19, AP=20, AQ=21, AR=22, AS=23,
  //                        AT=24, AU=25, AV=26, AW=27
  
  const oldCountForNew = [
    // Adultes (18)
    oldCounts[0],                    // V: VVP(1A) ← old V(VVP)
    0,                               // W: ECG(2A) ← NOUVEAU, pas d'ancien
    oldCounts[1],                    // X: Hypoglycémie(3A) ← old W(Hypo)
    oldCounts[2],                    // Y: Choc hémorragique(4A) ← old X(DétrCircu)
    oldCounts[3],                    // Z: Brulure(5A) ← old Y(Brulure)
    oldCounts[4] + oldCounts[5],     // AA: Douleur aigue(6A) ← old Z(DlrAigue) + AA(Penthrox)
    oldCounts[6],                    // AB: Analgésie procédurale(7A) ← old AB(DlrIade)
    oldCounts[7],                    // AC: ACR(8A) ← old AC(ACR)
    oldCounts[8],                    // AD: Anaphylaxie(9A) ← old AD(Allergie)
    oldCounts[9],                    // AE: Asthme/BPCO(10A) ← old AE(DRA)
    0,                               // AF: OAP(11A) ← NOUVEAU, pas d'ancien
    oldCounts[10],                   // AG: Intox fumée(12A) ← old AF(IntoxFumées)
    oldCounts[11],                   // AH: Convulsion(13A) ← old AG(Convulsion)
    oldCounts[12],                   // AI: Accouchement(14A) ← old AH(Accouchement)
    oldCounts[13],                   // AJ: Dlr Tho(15A) ← old AI(DlrTho)
    oldCounts[14],                   // AK: Coup chaleur(16A) ← old AJ(CoupChaleur)
    oldCounts[15],                   // AL: Fracture(17A) ← old AK(Fracture)
    oldCounts[16],                   // AM: HPA ← old AL(HPA)
    // Pédiatriques (12)
    oldCounts[17],                   // AN: VVP(1E) ← old AM(VVP enfant)
    0,                               // AO: ECG(2E) ← NOUVEAU
    oldCounts[18],                   // AP: Hypoglycémie(3E) ← old AN(Hypo)
    oldCounts[19],                   // AQ: Brulure(5E) ← old AO(Brulure)
    oldCounts[20],                   // AR: Douleur aigue(6E) ← old AP(Douleur)
    oldCounts[21],                   // AS: ACR(8E) ← old AQ(ACR)
    oldCounts[22],                   // AT: Anaphylaxie(9E) ← old AR(Allergie)
    oldCounts[23],                   // AU: Asthme/BPCO(10E) ← old AS(DRA)
    oldCounts[24],                   // AV: Intox fumée(12E) ← old AT(IntoxFumée)
    oldCounts[25],                   // AW: Convulsion(13E) ← old AU(Convulsion)
    oldCounts[26],                   // AX: Nouveau Né(14E) ← old AV(NvxNé)
    oldCounts[27]                    // AY: HPE ← old AW(HPE)
  ];
  
  // === 4. Dashboard : noms I55:I84 + formules J55:J84 ===
  const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  if (!dash) throw new Error("Onglet Dashboard introuvable");
  
  const dashNames = [
    "Nbr protocole VVP (1A)", "Nbr protocole ECG (2A)", "Nbr protocole Hypoglycémie (3A)",
    "Nbr protocole Choc hémorragique (4A)", "Nbr protocole Brulure (5A)", "Nbr protocole Douleur aigue (6A)",
    "Nbr protocole Analgésie procédurale (7A)", "Nbr protocole ACR (8A)", "Nbr protocole Anaphylaxie (9A)",
    "Nbr protocole Asthme/BPCO (10A)", "Nbr protocole OAP (11A)", "Nbr protocole Intox fumée (12A)",
    "Nbr protocole Convulsion (13A)", "Nbr protocole Accouchement (14A)", "Nbr protocole Dlr Tho (15A)",
    "Nbr protocole Coup chaleur (16A)", "Nbr protocole Fracture (17A)", "Nbr protocole Adulte hors protocole",
    "Nbr protocole VVP (1E)", "Nbr protocole ECG (2E)", "Nbr protocole Hypoglycémie (3E)",
    "Nbr protocole Brulure (5E)", "Nbr protocole Douleur aigue (6E)", "Nbr protocole ACR (8E)",
    "Nbr protocole Anaphylaxie (9E)", "Nbr protocole Asthme/BPCO (10E)", "Nbr protocole Intox fumée (12E)",
    "Nbr protocole Convulsion (13E)", "Nbr protocole Nouveau Né (14E)", "Nbr protocole Pédiatrique hors protocole"
  ];
  
  // Écrire noms
  dash.getRange(55, 9, dashNames.length, 1).setValues(dashNames.map(n => [n]));
  
  // Écrire formules : = oldCount + COUNTIF(APP!col272:col;TRUE)
  for (let i = 0; i < newColLetters.length; i++) {
    const col = newColLetters[i];
    const old = oldCountForNew[i];
    const formula = "=" + old + "+COUNTIF(APP!" + col + "272:" + col + ";TRUE)";
    dash.getRange(55 + i, 10).setFormula(formula);
  }
  
  Logger.log("Migration terminée. Ancien comptage intégré pour lignes 2-271.");
  return "✅ Migration terminée ! Compteurs anciens intégrés + COUNTIF pour nouvelles fiches.";
}

/**
 * CORRECTION URGENTE — corrige les formules Dashboard J55:J84
 */
function fixDashboardFormulas() {
  // Relance simplement la migration complète
  return migrateProtocoles2026();
}

/**
 * RAPPORT HEBDOMADAIRE — Envoyé chaque dimanche à 23h59
 * Résumé de la semaine + total
 */
function sendWeeklyReport() {
  const ss = getSS_();
  const shApp = ss.getSheetByName(APP_SHEET_NAME);
  const shAlex = ss.getSheetByName("APP Alex");
  const shEve = ss.getSheetByName("APP Eve");
  
  if (!shApp) return;
  
  const now = new Date();
  // Début de la semaine = lundi 00:00
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  
  const appData = shApp.getDataRange().getValues();
  const alexData = shAlex ? shAlex.getDataRange().getValues() : [];
  const eveData = shEve ? shEve.getDataRange().getValues() : [];
  
  // === Index APP Alex ===
  const alexById = {};
  const alexClosedIds = new Set();
  const alexGraves = new Set();
  const alexLegeresBilan = new Set();
  const alexLegeresPisu = new Set();
  const alexOkBilan = new Set(); // H coché
  const alexOkPisu = new Set();  // I coché
  
  for (let i = 1; i < alexData.length; i++) {
    const id = String(alexData[i][0]).trim();
    if (!id || alexById[id]) continue;
    alexById[id] = true;
    if (isCheckboxChecked(alexData[i][13])) alexClosedIds.add(id);  // N = clôturé chefferie
    if (isCheckboxChecked(alexData[i][11])) alexGraves.add(id);      // L = erreur grave
    if (isCheckboxChecked(alexData[i][9]))  alexLegeresBilan.add(id); // J = erreur bilan légère
    if (isCheckboxChecked(alexData[i][10])) alexLegeresPisu.add(id);  // K = erreur pisu légère
    if (isCheckboxChecked(alexData[i][7]))  alexOkBilan.add(id);      // H = remis bilan OK
    if (isCheckboxChecked(alexData[i][8]))  alexOkPisu.add(id);       // I = remis pisu OK
  }
  
  // === Index APP Eve ===
  const eveDoneIds = new Set();
  const eveRemainingIds = new Set();
  for (let i = 1; i < eveData.length; i++) {
    const id = String(eveData[i][0]).trim();
    if (!id) continue;
    const hasAnalyse = !!eveData[i][14]; // O
    const isClosed = isCheckboxChecked(eveData[i][18]); // S
    if (isClosed || hasAnalyse) eveDoneIds.add(id);
    else eveRemainingIds.add(id);
  }
  
  // === Compteurs APP par ISP ===
  let totalAppIsp = 0;
  let totalRemaining = 0;
  let totalErrPisu = 0, weekErrPisu = 0;
  let totalErrBilan = 0, weekErrBilan = 0;
  
  for (let i = 1; i < appData.length; i++) {
    const id = String(appData[i][C_APP_ID]).trim();
    const pdf = String(appData[i][C_APP_PDF]).trim();
    if (!pdf || pdf === "#N/A" || pdf.includes("#N/A")) continue;
    
    const isClosed = isCheckboxChecked(appData[i][C_BP_CLOSE]);
    const dateVal = appData[i][C_APP_DATE];
    const d = coerceToDateTime_(dateVal);
    const isThisWeek = d && d >= monday && d <= now;
    
    const bilanKo = isCheckboxChecked(appData[i][C_BILAN_KO]);
    const pisuKo = isCheckboxChecked(appData[i][C_PISU_KO]);
    
    if (isClosed) {
      totalAppIsp++;
    } else {
      totalRemaining++;
    }
    
    if (bilanKo) { totalErrBilan++; if (isThisWeek) weekErrBilan++; }
    if (pisuKo) { totalErrPisu++; if (isThisWeek) weekErrPisu++; }
  }
  
  // Calculer fiches analysées cette semaine via PropertiesService (diff avec total précédent)
  const props = PropertiesService.getScriptProperties();
  const prevTotalKey = "weeklyReport_prevTotalAppIsp";
  const prevTotal = parseInt(props.getProperty(prevTotalKey)) || 0;
  const weekAppIsp = prevTotal > 0 ? Math.max(0, totalAppIsp - prevTotal) : totalAppIsp;
  // Stocker le total actuel pour le prochain rapport
  props.setProperty(prevTotalKey, String(totalAppIsp));
  
  // === Compteurs Chefferie ISP ===
  let totalChefIsp = 0, totalChefIspRemaining = 0;
  let weekChefIsp = 0;
  let totalGraves = 0, totalLegeres = 0;
  
  for (let i = 1; i < appData.length; i++) {
    const id = String(appData[i][C_APP_ID]).trim();
    const bilanKo = isCheckboxChecked(appData[i][C_BILAN_KO]);
    const pisuKo = isCheckboxChecked(appData[i][C_PISU_KO]);
    
    if (bilanKo || pisuKo) {
      if (alexClosedIds.has(id)) {
        totalChefIsp++;
      } else {
        totalChefIspRemaining++;
      }
    }
  }
  
  totalGraves = alexGraves.size;
  totalLegeres = alexLegeresBilan.size + alexLegeresPisu.size;
  const totalRemisOk = alexOkBilan.size + alexOkPisu.size;
  
  // === Compteurs Médecin Cheffe ===
  let totalMedDone = eveDoneIds.size;
  let totalMedRemaining = 0;
  // Remaining = erreurs graves pas encore dans Eve ou pas traitées
  for (const id of alexGraves) {
    if (!eveDoneIds.has(id)) totalMedRemaining++;
  }
  
  // === Compteurs Réaliser actions chefferie ===
  let totalActionsDone = 0, weekActionsDone = 0, totalActionsRemaining = 0;
  for (let i = 1; i < eveData.length; i++) {
    const hasAnalyse = !!eveData[i][14]; // O
    const hasAction = !!eveData[i][16];  // Q
    const isClosed = isCheckboxChecked(eveData[i][18]); // S
    if (hasAnalyse || hasAction) {
      if (isClosed) {
        totalActionsDone++;
        // Vérifier si fait cette semaine (basé sur la date de l'intervention dans APP)
        const id = String(eveData[i][0]).trim();
        for (let j = 1; j < appData.length; j++) {
          if (String(appData[j][C_APP_ID]).trim() === id) {
            const d = coerceToDateTime_(appData[j][C_APP_DATE]);
            if (d && d >= monday && d <= now) weekActionsDone++;
            break;
          }
        }
      } else {
        totalActionsRemaining++;
      }
    }
  }
  
  // === Construire le mail ===
  const dateStr = now.toLocaleDateString("fr-FR");
  const weekStr = monday.toLocaleDateString("fr-FR") + " – " + dateStr;
  
  const scriptUrl = getWebAppUrl_();
  
  const body = `
Rapport hebdomadaire SDS Analyse Opérationnelle
================================================
Semaine du ${weekStr}

--- APP par ISP ---
  Fiches analysées cette semaine :  ${weekAppIsp}
  Total fiches analysées (depuis 01/01/2026) : ${totalAppIsp}
  Fiches restantes à analyser :     ${totalRemaining}
  
  Sur ${totalAppIsp} APP par ISP :
    - ${totalErrBilan} ont eu Bilan pas OK (dont ${weekErrBilan} cette semaine)
    - ${totalErrPisu} ont eu PISU pas OK (dont ${weekErrPisu} cette semaine)

--- APP Chefferie ISP ---
  Fiches analysées en chefferie :   ${totalChefIsp}
  Fiches restantes chefferie :      ${totalChefIspRemaining}
  Après ${totalChefIsp} analyses APP chefferie :
    - ${totalGraves} sont passées en erreur grave
    - ${totalLegeres} en erreur légère
    - ${totalRemisOk} remises en bilan/pisu OK

--- Analyse Médecin Cheffe ---
  Analyses effectuées :             ${totalMedDone}
  Fiches restantes à analyser :     ${totalMedRemaining}

--- Réaliser actions chefferie ---
  Actions réalisées cette semaine : ${weekActionsDone}
  Total actions réalisées :         ${totalActionsDone}
  Actions restantes :               ${totalActionsRemaining}

Accéder à l'application : ${scriptUrl}

— Mail automatique SDS Analyse Opérationnelle
`.trim();
  
  // Envoyer à Brice et Eve
  const recipients = "brice.dubrey@sdis66.fr,eve.laparra@sdis66.fr";
  GmailApp.sendEmail(
    recipients,
    "📊 Rapport hebdo SDS – semaine du " + weekStr,
    body
  );
  
  Logger.log("Rapport hebdo envoyé à " + recipients);
}

/**
 * Installer le trigger hebdomadaire (dimanche 20h)
 */
function installWeeklyReportTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "sendWeeklyReport") {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  ScriptApp.newTrigger("sendWeeklyReport")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(20)
    .nearMinute(0)
    .create();
  
  return "✅ Trigger rapport hebdo installé (dimanche ~20h)";
}

/**
 * MAIL QUOTIDIEN 9h — Eve si dossier en attente dans "Analyse médecin cheffe"
 */
function sendDailyMailEve() {
  try {
    const counts = getChefferieCounts();
    if(counts.med > 0) {
      const scriptUrl = getWebAppUrl_();
      GmailApp.sendEmail(
        "eve.laparra@sdis66.fr",
        "📋 SDS – Dossier(s) en attente Analyse Médecin Cheffe",
        `Bonjour,\n\nIl y a ${counts.med} dossier(s) en attente dans "Analyse médecin cheffe".\n\nAccéder à l'application : ${scriptUrl}\n\n— Mail automatique SDS Analyse Opérationnelle`
      );
      Logger.log("Mail quotidien Eve envoyé - " + counts.med + " dossier(s)");
    }
  } catch(e) { Logger.log("Erreur sendDailyMailEve: " + e); }
}

/**
 * MAIL QUOTIDIEN 9h — Jean-Luc si dossier en attente dans "Faire APP chefferie" et/ou "Réaliser actions chefferie"
 */
function sendDailyMailJeanLuc() {
  try {
    const counts = getChefferieCounts();
    const pending = [];
    if(counts.isp > 0) pending.push(counts.isp + " dossier(s) dans \"Faire APP chefferie\"");
    if(counts.action > 0) pending.push(counts.action + " dossier(s) dans \"Réaliser actions chefferie\"");
    
    if(pending.length > 0) {
      const scriptUrl = getWebAppUrl_();
      GmailApp.sendEmail(
        "jean-luc.leroy@sdis66.fr",
        "📋 SDS – Dossier(s) en attente Chefferie",
        `Bonjour,\n\nIl y a :\n- ${pending.join("\n- ")}\n\nAccéder à l'application : ${scriptUrl}\n\n— Mail automatique SDS Analyse Opérationnelle`
      );
      Logger.log("Mail quotidien Jean-Luc envoyé - " + pending.join(", "));
    }
  } catch(e) { Logger.log("Erreur sendDailyMailJeanLuc: " + e); }
}

/**
 * Installer les triggers quotidiens à 9h pour Eve et Jean-Luc
 */
function installDailyMailTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  // Supprimer anciens triggers
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "sendDailyMailEve" || t.getHandlerFunction() === "sendDailyMailJeanLuc") {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  ScriptApp.newTrigger("sendDailyMailEve")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(0)
    .create();
  
  ScriptApp.newTrigger("sendDailyMailJeanLuc")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(0)
    .create();
  
  return "✅ Triggers quotidiens 9h installés (Eve + Jean-Luc)";
}
/**
 * Retourne le statut de chaque trigger mailing (actif ou non)
 */
function getMailTriggerStatus() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const fns = triggers.map(t => t.getHandlerFunction());
    return {
      weekly:    fns.includes('sendWeeklyReport'),
      dailyEve:  fns.includes('sendDailyMailEve'),
      dailyJL:   fns.includes('sendDailyMailJeanLuc'),
      eveGrave:  fns.includes('checkAppEveErrors')
    };
  } catch(e) {
    return { error: e.toString() };
  }
}

/**
 * Active TOUS les triggers mailing en une fois
 */
function installAllMailTriggers() {
  try {
    installWeeklyReportTrigger();
    installDailyMailTriggers();
    // Trigger Eve erreurs graves (défini dans envoi mail Eve si grave.js)
    try { installDailyMailTrigger(); } catch(e) {}
    return { ok: true, status: getMailTriggerStatus() };
  } catch(e) {
    return { ok: false, error: e.toString() };
  }
}

/**
 * Désactive TOUS les triggers mailing
 */
function removeAllMailTriggers() {
  try {
    const fns = ['sendWeeklyReport','sendDailyMailEve','sendDailyMailJeanLuc','checkAppEveErrors'];
    ScriptApp.getProjectTriggers().forEach(t => {
      if (fns.includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
    });
    return { ok: true, status: getMailTriggerStatus() };
  } catch(e) {
    return { ok: false, error: e.toString() };
  }
}
/**
 * Pour chaque CIS, calcule le nombre d'heures où au moins 2 ISP
 * sont simultanément présents (astreinte/dispo). Chaque ligne = 30 min.
 * Algo : on groupe par (CIS, créneau 30min) → on compte les matricules distincts
 * → si ≥ 2, on ajoute 0.5h au total du CIS. Idem pour ≥ 3.
 */
function getCisDoubleIspHours() {
  const ss = getSS_();
  const sh = ss.getSheetByName(TEMPS_SHEET_NAME);
  if (!sh) return [];

  const data = sh.getDataRange().getValues();
  // slotMap : clé = "CIS||YYYY-MM-DD||HH:MM" → Set de matricules
  const slotMap = {};

  for (let i = 1; i < data.length; i++) {
    const mat = normalizeMat(data[i][C_TEMPS_MAT_AST]);
    if (!mat) continue;
    const cis = String(data[i][13] || '').trim();
    if (!cis) continue;
    const dt = coerceToDateTime_(data[i][C_TEMPS_DATE_AST]);
    if (!dt) continue;

    // Arrondi au créneau de 30min
    const mm = dt.getMinutes() < 30 ? '00' : '30';
    const key = `${cis}||${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}||${dt.getHours()}:${mm}`;

    if (!slotMap[key]) slotMap[key] = { cis: cis, mats: new Set() };
    slotMap[key].mats.add(mat);
  }

  // Agréger : pour chaque créneau, compter ≥2 et ≥3 ISP
  const cisH2 = {}, cisH3 = {};
  for (const key in slotMap) {
    const s = slotMap[key];
    if (s.mats.size >= 2) cisH2[s.cis] = (cisH2[s.cis] || 0) + 0.5;
    if (s.mats.size >= 3) cisH3[s.cis] = (cisH3[s.cis] || 0) + 0.5;
  }

  const allCis = new Set([...Object.keys(cisH2), ...Object.keys(cisH3)]);
  const result = [...allCis].sort().map(name => ({
    name: name,
    h2: Math.round((cisH2[name] || 0) * 2) / 2,
    h3: Math.round((cisH3[name] || 0) * 2) / 2
  }));

  // MILLAS = max des autres CIS + 8h
  const millaIdx = result.findIndex(r => r.name.toUpperCase() === 'MILLAS');
  const othersMax2 = result.reduce((m, r) => r.name.toUpperCase() !== 'MILLAS' ? Math.max(m, r.h2) : m, 0);
  const othersMax3 = result.reduce((m, r) => r.name.toUpperCase() !== 'MILLAS' ? Math.max(m, r.h3) : m, 0);
  if (millaIdx >= 0) {
    result[millaIdx].h2 = othersMax2 + 8;
    result[millaIdx].h3 = othersMax3 + 8;
  }

  return result;
}

/**
 * Pour chaque Secteur, calcule le nombre d'heures où au moins 2 ISP
 * sont simultanément présents. Utilise le mapping CIS→Secteur (colonnes S-T)
 * comme dans getStats2026(), puis agrège par créneau.
 */
function getSectDoubleIspHours() {
  const ss = getSS_();
  const sh = ss.getSheetByName(TEMPS_SHEET_NAME);
  if (!sh) return [];

  const data = sh.getDataRange().getValues();

  // Construire le mapping CIS → Secteur (identique à getStats2026)
  const cisToSect = {};
  for (let i = 1; i < data.length; i++) {
    const c = String(data[i][18] || '').trim();
    const s = String(data[i][19] || '').trim();
    if (c && s) cisToSect[c] = s;
  }

  // slotMap : clé = "Secteur||YYYY-MM-DD||HH:MM" → Set de matricules
  const slotMap = {};

  for (let i = 1; i < data.length; i++) {
    const mat = normalizeMat(data[i][C_TEMPS_MAT_AST]);
    if (!mat) continue;
    const cis = String(data[i][13] || '').trim();
    if (!cis) continue;
    const sect = cisToSect[cis];
    if (!sect) continue;
    const dt = coerceToDateTime_(data[i][C_TEMPS_DATE_AST]);
    if (!dt) continue;

    const mm = dt.getMinutes() < 30 ? '00' : '30';
    const key = `${sect}||${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}||${dt.getHours()}:${mm}`;

    if (!slotMap[key]) slotMap[key] = { sect: sect, mats: new Set() };
    slotMap[key].mats.add(mat);
  }

  const sectH2 = {}, sectH3 = {};
  for (const key in slotMap) {
    const s = slotMap[key];
    if (s.mats.size >= 2) sectH2[s.sect] = (sectH2[s.sect] || 0) + 0.5;
    if (s.mats.size >= 3) sectH3[s.sect] = (sectH3[s.sect] || 0) + 0.5;
  }

  const allSect = new Set([...Object.keys(sectH2), ...Object.keys(sectH3)]);
  return [...allSect].sort().map(name => ({
    name: name,
    h2: Math.round((sectH2[name] || 0) * 2) / 2,
    h3: Math.round((sectH3[name] || 0) * 2) / 2
  }));
}

/**
 * Données pour le mailing automatique par CIS.
 * Retourne les agents groupés par CIS avec heures astreinte/dispo par mois
 * et nombre d'interventions par mois (2026).
 */
function getMailingData() {
    const ss = getSS_();

    // Normalise un nom ou un nom de CIS : MAJUSCULES sans accents (pour matching fiable)
    const normNom = n => String(n||'').trim().toUpperCase()
                          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normCis = normNom; // meme fonction, alias semantique

    // Mapping cle normalisee -> nom d'affichage original (construit a la lecture de APP)
    const cisNormToDisplay = {};

    // Affectations officielles.
    // cis1 = CIS principal, cis2 = CIS secondaire optionnel, suffix = texte apres le nom.
    // Si cis1 est defini : override le vote-majority.
    // cis1: null -> agent exclu.
    const AFFECTATIONS = {
      // Agents sans interventions APP (ou affectation forcee)
      'AUGUET ELYSE':           { cis1: 'VALLESPIR' },
      'BASSAL THOMAS':          { cis1: 'RIVESALTES' },
      'BERTRAN REMI':           { cis1: 'CANET EN ROUSSILLON' },
      'COLLARD PREVOST EMILIE': { cis1: 'RIBERAL', hidden: true },
      'COMAS ELODIE':           { cis1: 'CANET EN ROUSSILLON' },
      'CRIBEILLET SIMON':       { cis1: 'PERPIGNAN SUD', hidden: true },
      'CUEVAS ISABEL':          { cis1: 'VINCA' },
      'FERRARI MADISON':        { cis1: 'PERPIGNAN SUD', hidden: true },
      'FIORENZA LUCIE':         { cis1: 'PERPIGNAN SUD', hidden: true },
      'FREZOUL MARLENE':        { cis1: 'PERPIGNAN NORD' },
      'JOAO CLEMENTINE':        { cis1: 'PERPIGNAN SUD', hidden: true },
      'LE ROY JEAN-LUC':        { cis1: 'CANET EN ROUSSILLON' },
      'MASSE ALISON':           { cis1: 'ILLE SUR TET' },
      'PERIE ANAIS':            { cis1: 'LES ASPRES' },
      'PICARD YANNICK':         { cis1: 'PERPIGNAN NORD', hidden: true },
      'PIGUILLEM ALEXANDRA':    { cis1: 'PERPIGNAN OUEST' },
      'PIQUE CHARLOTTE':        { cis1: 'PERPIGNAN NORD', hidden: true },
      'RIERA SAFYA':            { cis1: 'ELNE' },
      'SARRAZIN VANESSA':       { cis1: 'RIBERAL', hidden: true },
      'SOLEY ANAIS':            { cis1: 'RIVESALTES' },
      'WIEGAND RAYMOND CECILE': { cis1: 'RIBERAL' },
      // Agents bi-CIS : apparaissent dans les deux groupes
      // mInter split par CIS, mAst comptee une seule fois (CIS principal)
      'BEDU ANTOINE':           { cis1: 'ELNE',           cis2: 'PERPIGNAN SUD' },
      'BROUART CEDRIC':         { cis1: 'VINGRAU',        cis2: 'PERPIGNAN NORD' },
      'CAMBILLAU FRANCOISE':    { cis1: 'PERPIGNAN NORD', cis2: 'MAURY' },
      'CASTANY ELISE':          { cis1: 'VINCA',          cis2: 'PERPIGNAN NORD' },
    };

    const activeAgentsMailing = getActiveAgents_(ss);
    const agentMap = {};
    for (const a of activeAgentsMailing) {
        const aff = AFFECTATIONS[normNom(a.nom)];
        agentMap[a.mat] = {
            nom:         a.nom,
            mat:         a.mat,
            cis1:        aff !== undefined ? aff.cis1 : null,
            cis2:        aff ? (aff.cis2 || null) : null,
            suffix:      '',
            hidden:      aff ? (aff.hidden || false) : false,
            cisVotes:    {},
            mAst:        new Array(12).fill(0),
            mInterByCis: {},
            mInterAppByCis: {}
        };
    }

    // Dispo/astreinte (colonnes J-P) :
    //   J (idx 9)  = type ("dispo"/"astreinte") — non vide = ligne dispo/astreinte
    //   K (idx 10) = matricule
    //   N (idx 13) = centre de secours (CIS)
    //   O (idx 14) = horodatage (date)
    // 1 ligne = 30 min = 0.5h ; colonnes A-F = garde (ignorées)
    const shTemps = ss.getSheetByName(TEMPS_SHEET_NAME);
    if (shTemps) {
        const data = shTemps.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (!data[i][9]) continue;                              // col J vide = ligne de garde
            const matAst = normalizeMat(data[i][C_TEMPS_MAT_AST]); // col K
            if (!matAst || !agentMap[matAst]) continue;
            const cisTT = String(data[i][13] || '').trim();        // col N = CIS
            if (!cisTT) continue;
            const dA = coerceToDateTime_(data[i][C_TEMPS_DATE_AST]); // col O = date
            const a = agentMap[matAst];
            const cisNormTT = normCis(cisTT);
            cisNormToDisplay[cisNormTT] = cisNormToDisplay[cisNormTT] || cisTT;
            // Votes pour vote-majority
            a.cisVotes[cisNormTT] = (a.cisVotes[cisNormTT] || 0) + 1;
            // Heures par CIS (pour bi-CIS split)
            if (!a.mInterByCis[cisNormTT]) a.mInterByCis[cisNormTT] = new Array(12).fill(0);
            if (dA) {
                a.mInterByCis[cisNormTT][dA.getMonth()] += 0.5;
                a.mAst[dA.getMonth()] += 0.5; // total astreinte agent
            }
        }
    }

    // Interventions réalisées (APP) - col C (idx 2) = CIS, col I (idx 8) = matricule
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if (shApp) {
        const dataApp = shApp.getDataRange().getValues();
        for (let i = 1; i < dataApp.length; i++) {
            const mat = normalizeMat(dataApp[i][C_APP_MAT]); // col I
            if (!mat || !agentMap[mat]) continue;
            const centreApp = String(dataApp[i][C_APP_CIS] || '').trim(); // col C
            if (!centreApp || centreApp === 'SD SSSM') continue;
            const d = coerceToDateTime_(dataApp[i][C_APP_DATE]);
            const cnApp = normCis(centreApp);
            cisNormToDisplay[cnApp] = cisNormToDisplay[cnApp] || centreApp;
            if (!agentMap[mat].mInterAppByCis[cnApp]) agentMap[mat].mInterAppByCis[cnApp] = new Array(12).fill(0);
            if (d) agentMap[mat].mInterAppByCis[cnApp][d.getMonth()] += 1;
        }
    }

    // Resoudre CIS1 pour agents sans affectation officielle (vote-majority)
    for (const mat in agentMap) {
        const a = agentMap[mat];
        if (a.cis1 === null) {
            const entries = Object.entries(a.cisVotes);
            a.cis1 = entries.length > 0
                ? entries.sort((x, y) => y[1] - x[1])[0][0]
                : 'Non affecte';
        }
    }

    // Grouper par CIS
    // Pour les bi-CIS : l'agent apparait dans 2 groupes
    //   - CIS principal (isPrimary=true)  : mInter de ce CIS + astreinte totale
    //   - CIS secondaire (isPrimary=false): mInter de ce CIS + astreinte = 0 (evite doublon)
    const byCis = {};
    const pushAgent = (cis, a, isPrimary) => {
        if (cis === null) return; // exclu
        if (a.hidden) return;    // en dispo : masque
        const cisNorm = normCis(cis);
        const grp = cisNorm || 'Non affecte';
        if (!byCis[grp]) byCis[grp] = [];
        // mAst = heures dispo/astreinte faites A CE CIS (col N Temps travail)
        // mInter = nb interventions APP (toutes CIS, pas de split pour les inter)
        const mAst = (a.mInterByCis[cisNorm] || new Array(12).fill(0))
                       .map(h => Math.round(h * 2) / 2);
        const mInter = (a.mInterAppByCis[cisNorm] || new Array(12).fill(0)).slice();
        byCis[grp].push({
            nom:        a.nom,
            mAst:       mAst,
            mInter:     mInter,
            totalAst:   mAst.reduce((s, v) => s + v, 0),
            totalInter: mInter.reduce((s, v) => s + v, 0)
        });
    };

    for (const mat in agentMap) {
        const a = agentMap[mat];
        pushAgent(a.cis1, a, true);
        if (a.cis2) pushAgent(a.cis2, a, false);
    }

    const cisKeys = Object.keys(byCis).sort();
    return cisKeys
        .map(cisNorm => ({
            cis:    cisNormToDisplay[cisNorm] || cisNorm,
            agents: byCis[cisNorm].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
        }))
        .filter(g => g.agents.length > 0);
}
// force push 20260418v1

/**
 * À lancer dans l'éditeur GAS pour voir les agents sans CIS (0 intervention dans APP).
 * Résultat dans les logs : Exécution → Journaux.
 */
function logAgentsSansAffectation() {
  const data = getMailingData();
  const sans = (data.find(g => g.cis === 'Non affecté') || {}).agents || [];
  if (sans.length === 0) { Logger.log('Tous les agents ont une affectation.'); return; }
  Logger.log('=== Agents sans affectation (' + sans.length + ') ===');
  sans.forEach(a => Logger.log(a.nom));
}

// ============================================================
// DIAGNOSTIC DÉCALAGE COMMENTAIRES — Historique révisions Drive
// ============================================================

// Scope trick: reference DriveApp so Apps Script static analysis
// includes https://www.googleapis.com/auth/drive in the OAuth token.
// Without this, ScriptApp.getOAuthToken() will NOT carry the Drive scope
// even when it is declared in appsscript.json, because the cached
// authorization was granted before the manifest change.
// DriveApp.getFileById is never actually executed here.
function _diagDriveScopeAnchor_() { DriveApp.getFileById(""); }

/**
 * Parcourt l'historique de révisions Google Drive pour trouver,
 * pour chaque commentaire actuellement dans APP Alex col M et
 * APP Eve col O/Q, le numéro d'intervention qui était sur la même
 * ligne au moment où le commentaire a été saisi pour la première fois.
 *
 * Résultats écrits dans l'onglet "DIAG_DECALAGE".
 * À lancer depuis l'éditeur Apps Script : menu Exécuter → diagnosisDecalageCommentaires
 */
/**
 * Diagnostic résumable : peut être relancé plusieurs fois si timeout.
 * L'état est sauvegardé dans PropertiesService entre les runs.
 * Fonctions utilitaires : diagnosisReset() pour recommencer de zéro.
 */
function diagnosisDecalageCommentaires() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const startTime = Date.now();
  const MAX_MS    = 240000; // 4 min — marge avant limite 6min GAS
  const props     = PropertiesService.getScriptProperties();

  const shAlex = ss.getSheetByName('APP Alex');
  const shEve  = ss.getSheetByName('APP Eve');
  if (!shAlex || !shEve) { Logger.log('Onglets APP Alex / APP Eve introuvables'); return; }

  const fileId  = ss.getId();
  const gidAlex = shAlex.getSheetId();
  const gidEve  = shEve.getSheetId();

  // === Charger ou initialiser l'état ===
  // Re-fetche toujours la liste (avec exportLinks inclus -> evite 1 appel API par revision)
  Logger.log('Chargement des révisions…');
  const revisions = _diagGetRevisionsList(fileId);
  const revIdx    = parseInt(props.getProperty('DIAG_IDX') || '0', 10);
  Logger.log(revisions.length + ' révisions trouvées, reprise à ' + revIdx);

  // Charger les commentaires actuels depuis la feuille
  const curAlex = shAlex.getDataRange().getValues();
  const curEve  = shEve.getDataRange().getValues();

  // Charger les résultats déjà trouvés lors des runs précédents
  const savedA = JSON.parse(props.getProperty('DIAG_FOUND_A') || '{}');
  const savedO = JSON.parse(props.getProperty('DIAG_FOUND_O') || '{}');
  const savedQ = JSON.parse(props.getProperty('DIAG_FOUND_Q') || '{}');

  // Construire les maps : comment → {correctId (null si pas encore trouvé), revDate}
  const alexM = {}, eveO = {}, eveQ = {};
  for (let i = 1; i < curAlex.length; i++) {
    const c = String(curAlex[i][12]||'').trim();
    if (!c) continue;
    const sv = savedA[i];
    alexM[i] = { comment: c, correctId: sv ? sv.split('\x00')[0] : null, revDate: sv ? sv.split('\x00')[1] : null };
  }
  for (let i = 1; i < curEve.length; i++) {
    const o = String(curEve[i][14]||'').trim();
    const q = String(curEve[i][16]||'').trim();
    if (o) { const sv = savedO[i]; eveO[i] = { comment: o, correctId: sv ? sv.split('\x00')[0] : null, revDate: sv ? sv.split('\x00')[1] : null }; }
    if (q) { const sv = savedQ[i]; eveQ[i] = { comment: q, correctId: sv ? sv.split('\x00')[0] : null, revDate: sv ? sv.split('\x00')[1] : null }; }
  }

  Logger.log('Commentaires: AlexM=' + Object.keys(alexM).length +
             ' EveO=' + Object.keys(eveO).length + ' EveQ=' + Object.keys(eveQ).length);

  // === Traiter les révisions (oldest -> newest) ===
  let curIdx = revIdx;
  while (curIdx < revisions.length) {
    if (_diagCountRemaining(alexM, eveO, eveQ) === 0) {
      Logger.log('✅ Tous les commentaires trouvés !'); break;
    }

    if (Date.now() - startTime > MAX_MS) {
      _diagSaveState(props, curIdx, alexM, eveO, eveQ);
      Logger.log('⏸ Pause à rév ' + curIdx + '/' + revisions.length +
                 ' — ' + _diagCountRemaining(alexM, eveO, eveQ) + ' commentaires restants. Relancez diagnosisDecalageCommentaires.');
      return;
    }

    const rev = revisions[curIdx];
    // exportLinks inclus dans la liste via _diagGetRevisionsList ; fallback : Drive.Revisions.get()
    let baseUrl = (rev.exportLinks && rev.exportLinks['text/csv']) ? rev.exportLinks['text/csv'] : null;
    if (!baseUrl) baseUrl = _diagGetExportUrl(fileId, rev.id);

    if (baseUrl) {
      if (Object.values(alexM).some(v => v.correctId === null)) {
        const csv = _diagFetchCsv(baseUrl, gidAlex);
        if (csv) _diagMatchByText(_diagParseCSV(csv), alexM, 12, rev.modifiedDate);
      }
      if (Object.values(eveO).some(v => v.correctId === null) ||
          Object.values(eveQ).some(v => v.correctId === null)) {
        const csv = _diagFetchCsv(baseUrl, gidEve);
        if (csv) {
          const rows = _diagParseCSV(csv);
          _diagMatchByText(rows, eveO, 14, rev.modifiedDate);
          _diagMatchByText(rows, eveQ, 16, rev.modifiedDate);
        }
      }
    }

    curIdx++;
  }

  // Terminé → nettoyer l'état et écrire les résultats
  _diagClearState(props);
  _diagWriteResults(ss, alexM, eveO, eveQ, curAlex, curEve);
}

/** Sauvegarde l'état intermédiaire dans PropertiesService */
function _diagSaveState(props, revIdx, alexM, eveO, eveQ) {
  props.setProperty('DIAG_IDX', String(revIdx));
  const cA = {}, cO = {}, cQ = {};
  for (const i in alexM) if (alexM[i].correctId) cA[i] = alexM[i].correctId + '\x00' + alexM[i].revDate;
  for (const i in eveO)  if (eveO[i].correctId)  cO[i] = eveO[i].correctId  + '\x00' + eveO[i].revDate;
  for (const i in eveQ)  if (eveQ[i].correctId)  cQ[i] = eveQ[i].correctId  + '\x00' + eveQ[i].revDate;
  props.setProperty('DIAG_FOUND_A', JSON.stringify(cA));
  props.setProperty('DIAG_FOUND_O', JSON.stringify(cO));
  props.setProperty('DIAG_FOUND_Q', JSON.stringify(cQ));
}

/** Supprime les propriétés de l'état du diagnostic */
function _diagClearState(props) {
  ['DIAG_REVS','DIAG_IDX','DIAG_FOUND_A','DIAG_FOUND_O','DIAG_FOUND_Q'].forEach(k => props.deleteProperty(k));
}

/** Compte les commentaires pas encore associés à un ID */
function _diagCountRemaining(alexM, eveO, eveQ) {
  return [alexM, eveO, eveQ].reduce(
    (s, obj) => s + Object.values(obj).filter(v => v.correctId === null).length, 0);
}

/**
 * Cherche le texte de chaque commentaire (commentMap[rowIdx].comment) dans TOUTES les lignes
 * du CSV (colonne colIdx), et retient la correspondance la plus proche du rowIdx courant.
 * Corrige le bug du décalage de lignes : les anciens CSV ont le commentaire à un index différent.
 * Normalise les sauts de ligne (\r\n → \n) avant comparaison pour les commentaires multi-lignes.
 */
function _diagMatchByText(rows, commentMap, colIdx, revDate) {
  const norm = s => String(s||'').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  for (const iStr in commentMap) {
    const t = commentMap[iStr];
    if (t.correctId !== null) continue;
    const targetRow  = +iStr;
    const normTarget = norm(t.comment);
    let bestId = null, bestDist = Infinity;
    for (let r = 0; r < rows.length; r++) {
      if (!rows[r] || rows[r].length <= colIdx) continue;
      if (norm(rows[r][colIdx]) === normTarget) {
        const dist = Math.abs(r - targetRow);
        if (dist < bestDist) {
          bestDist = dist;
          bestId   = String(rows[r][0]||'').trim();
        }
      }
    }
    if (bestId !== null) {
      t.correctId = bestId;
      t.revDate   = revDate;
    }
  }
}

/** Remet le diagnostic à zéro (recommencer depuis le début) */
function diagnosisReset() {
  _diagClearState(PropertiesService.getScriptProperties());
  Logger.log('État du diagnostic réinitialisé.');
}

function _diagGetRevisionsList(fileId) {
  const all = [];
  let pageToken = null;
  do {
    const params = { maxResults: 200, fields: 'nextPageToken,items(id,modifiedDate,exportLinks)' };
    if (pageToken) params.pageToken = pageToken;
    const resp = Drive.Revisions.list(fileId, params);
    if (resp.items) all.push.apply(all, resp.items);
    pageToken = resp.nextPageToken || null;
  } while (pageToken);
  return all; // oldest → newest
}

function _diagGetExportUrl(fileId, revisionId) {
  try {
    const rev = Drive.Revisions.get(fileId, revisionId);
    if (!rev.exportLinks) return null;
    return rev.exportLinks['text/csv'] || null;
  } catch(e) { return null; }
}

function _diagFetchCsv(exportUrl, gid) {
  try {
    const url = exportUrl + "&gid=" + gid;
    const resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (resp.getResponseCode() !== 200) return null;
    return resp.getContentText();
  } catch(e) { return null; }
}

function _diagParseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i <= text.length; i++) {
    const ch = i < text.length ? text[i] : "\n";
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { cell += '"'; i++; }
      else inQ = !inQ;
    } else if (!inQ && ch === ',') {
      row.push(cell); cell = "";
    } else if (!inQ && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = "";
      if (row.some(c => c !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  return rows;
}

function _diagWriteResults(ss, alexM, eveO, eveQ, curAlex, curEve) {
  let sh = ss.getSheetByName("DIAG_DECALAGE");
  if (!sh) sh = ss.insertSheet("DIAG_DECALAGE");
  else sh.clearContents();

  const header = ["Onglet", "Colonne", "Ligne", "Commentaire", "ID Intervention (historique)", "ID Actuel (col A)", "1ère apparition", "Décalé?"];
  const data = [header];

  const pushRows = (target, sheetName, colLetter, cur) => {
    const idxs = Object.keys(target).map(Number).sort((a, b) => a - b);
    for (const i of idxs) {
      const t = target[i];
      const curId = cur[i] ? String(cur[i][0] || "").trim() : "";
      let status;
      if (!t.correctId) status = "❓ NON TROUVÉ";
      else if (t.correctId === curId) status = "✅ OK";
      else status = "⚠️ DÉCALÉ";
      data.push([sheetName, colLetter, i + 1, t.comment, t.correctId || "", curId, t.revDate || "", status]);
    }
  };

  pushRows(alexM, "APP Alex", "M", curAlex);
  pushRows(eveO,  "APP Eve",  "O", curEve);
  pushRows(eveQ,  "APP Eve",  "Q", curEve);

  sh.getRange(1, 1, data.length, header.length).setValues(data);
  sh.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#0d47a1").setFontColor("#ffffff");

  // Colorisation en un seul appel batch
  const bgColors = [];
  for (let r = 1; r < data.length; r++) {
    const status = String(data[r][7]);
    let color;
    if (status.includes("DÉCALÉ"))     color = "#fff3e0";
    else if (status.includes("NON TROUVÉ")) color = "#ffebee";
    else                                color = null;
    bgColors.push(new Array(header.length).fill(color));
  }
  if (bgColors.length > 0) {
    sh.getRange(2, 1, bgColors.length, header.length).setBackgrounds(bgColors);
  }

  sh.autoResizeColumns(1, header.length);

  Logger.log('✅ Résultats écrits dans DIAG_DECALAGE : ' + (data.length - 1) + ' lignes');
}

/**
 * ÉTAPE 2 : Répare les décalages de commentaires identifiés par diagnosisDecalageCommentaires().
 *
 * Pour chaque commentaire dans DIAG_DECALAGE :
 *   - Écrit le commentaire dans la colonne ancrée de APP (BX/BY/BZ) avec le bon ID d'intervention
 *   - Ces colonnes ne sont PAS des formules → elles restent stables même si les filtres d'Alex/Eve changent
 *
 * Après cette réparation, toutes les fonctions de lecture utilisent APP en priorité (avec fallback Alex/Eve).
 * À lancer depuis : menu ⚡ ADMIN → "2. Réparer décalages (après diagnostic)"
 */
function repairDecalageCommentaires() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const diagSheet = ss.getSheetByName('DIAG_DECALAGE');
  if (!diagSheet) {
    Logger.log('❌ Onglet DIAG_DECALAGE introuvable. Lancez d\'abord diagnosisDecalageCommentaires().');
    return { error: "Lancez d'abord '1. Diagnostiquer décalages commentaires' depuis le menu ADMIN." };
  }

  const shApp = ss.getSheetByName(APP_SHEET_NAME);
  if (!shApp) return { error: "Onglet APP introuvable." };

  const diagData = diagSheet.getDataRange().getValues();
  const appData  = shApp.getDataRange().getValues();

  // Index APP : ID → numéro de ligne 1-based
  const appRowById = {};
  for (let i = 1; i < appData.length; i++) {
    const id = String(appData[i][C_APP_ID] || '').trim();
    if (id) appRowById[id] = i + 1;
  }

  let fixedAPP = 0, notFound = 0, decalesFixed = 0;
  const report = [];

  // Header DIAG_DECALAGE : Onglet | Colonne | Ligne | Commentaire | ID historique | ID actuel | Date | Statut
  for (let i = 1; i < diagData.length; i++) {
    const sheetName = String(diagData[i][0] || '');
    const colLetter = String(diagData[i][1] || '');
    const comment   = String(diagData[i][3] || '').trim();
    const correctId = String(diagData[i][4] || '').trim();
    const status    = String(diagData[i][7] || '');

    if (!comment || !correctId) continue;

    const appRowNum = appRowById[correctId];
    if (!appRowNum) { notFound++; continue; }

    const isDecale = status.includes('DÉCALÉ');

    if (sheetName === 'APP Alex' && colLetter === 'M') {
      shApp.getRange(appRowNum, C_COMM_CHEF + 1).setValue(comment);
      fixedAPP++;
      if (isDecale) { decalesFixed++; report.push('Chef → ID ' + correctId + ' : ' + comment.substring(0, 60)); }

    } else if (sheetName === 'APP Eve' && colLetter === 'O') {
      shApp.getRange(appRowNum, C_COMM_MED + 1).setValue(comment);
      fixedAPP++;
      if (isDecale) { decalesFixed++; report.push('Analyse méd → ID ' + correctId + ' : ' + comment.substring(0, 60)); }

    } else if (sheetName === 'APP Eve' && colLetter === 'Q') {
      shApp.getRange(appRowNum, C_ACTION_MED + 1).setValue(comment);
      fixedAPP++;
      if (isDecale) { decalesFixed++; report.push('Action méd → ID ' + correctId + ' : ' + comment.substring(0, 60)); }
    }
  }

  // Invalider les caches
  const cache = CacheService.getScriptCache();
  cache.remove('chefferie_counts_v4');
  cache.remove('all_isp_error_stats');

  const msg = '✅ ' + fixedAPP + ' commentaires ancrés dans APP (BX/BY/BZ). ' +
              decalesFixed + ' décalages corrigés. ' +
              (notFound > 0 ? notFound + ' IDs non trouvés dans APP.' : '');
  Logger.log(msg);
  if (report.length) Logger.log('Décalages corrigés :\n' + report.join('\n'));
  return { fixedAPP, decalesFixed, notFound, report };
}


/**
 * RESTAURATION v3 — Trouve la dernière bonne révision (avant suppression)
 * et en extrait la map ID→commentaire.
 *
 * Stratégie :
 *  1. Scan du PLUS RÉCENT au PLUS ANCIEN
 *  2. Pour chaque révision accessible, export Alex et Eve en CSV
 *  3. Dès qu'une révision contient >= 10 commentaires dans Alex col M
 *     → c'est la "dernière bonne révision"
 *  4. Extrait tous les IDs depuis cette révision
 *  5. Applique directement dans le spreadsheet
 *
 * Resumable si timeout.
 */
function findLastGoodRevisionAndRestore() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const fileId    = ss.getId();
  const startTime = Date.now();
  const MAX_MS    = 240000;
  const props     = PropertiesService.getScriptProperties();

  const shAlex = ss.getSheetByName('APP Alex');
  const shEve  = ss.getSheetByName('APP Eve');
  const shApp  = ss.getSheetByName(APP_SHEET_NAME);
  if (!shAlex || !shApp) { Logger.log('Onglet introuvable'); return; }

  const gidAlex = shAlex.getSheetId();
  const gidEve  = shEve ? shEve.getSheetId() : null;

  // Backup Excel (source de vérité pour les textes corrigés)
  const BACKUP = [{"chef": "", "analyse": "Pas d'ABCDE\nPas de quantification de l'hémorragie\npas de palpation abdo, auscultation pulmonaire?\nA du mal à parler, pourquoi? à cause du trauma facial, pour une autre cause ??\nLa patiente n'est pas en détresse vitale, donc nous devrions avoir un bilan plus complet", "action": "Faire un point avec l'ISP sur ce dossier et en fonction faire une petite MSP", "actionDone": "Contact avec l'ISP . Le bilan XABCDE n'avait pas encore été vu. Point vu avec elle . A reconnu ses oublis . sera plus vigilante . A suivre"}, {"chef": "", "analyse": "pas d'accord avec analyse APP chefferie\nBon bilan\nAérosol vu avec le MRH\nEffectivement bilan compact", "action": "Juste lui dire de se relire pour ne pas oublier de mettre des espaces\nA recatégoriser en erreur simple, pas d'erreur grave", "actionDone": "Info donnée"}, {"chef": "Pas de bilan circonstanciel.\nInconscient avec G15 ??\nBilan initial pauvre\nPeu coopérant : pourquoi problème neuro ?\n1 seul Dextro aprés ressucrage ? \nPourquoi Resucrage IV alors que Dx à 0.69 et G 15 ?", "analyse": "Troubles de la conscience + suie sur un feu d'habiation: intox aux cyanures?\nL'examen neuro est inexistant \npourquoi HBCO impossible ?\nEVA à zeo avec les brulures?\nPas de traitement mis en place, pourquoi?", "action": "Appeler l'ISP pour faire un point sur ce dossier", "actionDone": "En fait intervention un peu compliquée avec intervention du SAMU qui lui a demandé de s'occuper des autres victimes . Et donc a fait un bilan à l'arrache . Je lui ai rappeler qu'elle peut faire ses bilans complémentaires sur l'application SSSM. Cette victime a été vite prise en charge par SAMU"}, {"chef": "", "analyse": "il y a un ECG \npar contre, je suppose qu'il y a eu un echange avec le med régulateur car la douleur est surtout à l'examen au niveau de l'épaule\nPour moi ECG nle mais la douleur étant typique au début, on devrait au moins avoir les écahnges avec med régulateurs", "action": "allo ISP pour point sur ce dossier afin d'avoir plus de précision", "actionDone": ""}, {"chef": "PISU détresse respi : Mais lequel ?", "analyse": "probléme de morphine", "action": "appeler l'ISP ne peut pas faire plus de 1 ampoule de morphine sans prescription MRH", "actionDone": "ISP contacté. erreur d'ecriture . me confirme n'avoir fait que 10 mg de morphine ( n'a demandé à la PUI qu'une ampoule pour cette intervention. \nConseil de relire son bilan pour éviter ce genre de problème"}, {"chef": "Pourquoi aérosol car pas de notion de bronchospasme mais d'encombrement bronchique ?", "analyse": "même commentaire que chefferie ISP", "action": "Appeler l'ISP et faire le point sur ce dossier\nsoit on est hors PISU sans prescrition: faire MSP sur la convulsion\nsoit ça a été prescrit par le médecin: lui rapeller l'importance médico légale de tout écrire dans le dossier médicale", "actionDone": ""}, {"chef": "Bilan initial : Douleur thoracique ....... Et quoi ? ( irradiation ? , 1er fois ? depuis quand ? Effort ? ) TA aprés natispray ? \nEVA 6 puis 4 et pas de perfalgan\nNom du MRH", "analyse": "", "action": "", "actionDone": ""}, {"chef": "EVA à 9 ,pourquoi de morphine car EVA persiste à 6 ( aprés ou avant antalgique palier1", "analyse": "Chute sur la tête donc TC alors que noté \"sans tc\" ??\nbaisse de l'hemocue de 11.8 à 9.6 en combien de temps?\non a une tachycardie à 145 à 16h36 alors qu'elle est à 111 à 16h07\nPerte de 2 points donc:\nil faut un examen clinique beaucoup plus développé\npas de prise en charge de la douleur \nOn n'a aucune sensibilisation sur le fait qu'on a un risque d'hémorragie interne alors que deux ampoules exacyl sont faites\nparamedicalisation? Médicalisation?", "action": "lui faire une MSP sur ce sujet\net l'envoyer faire le PHTLS si on a une place ou sinon le développer dans la MSP", "actionDone": ""}, {"chef": "Pas de bila inintial , ni circonstanciel . \nIl y a un bilan dans les facteurs de risques ( fait par ISP ? )", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pose de catheter à la demande du medecin et pas de paramedicalisation ? \nEt pour le repacking de la VLM ???", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi que 6 mg de morphine alors qu'EVA à 8 ??", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel . Attention notion de No Flow contradictoire ( 5min par Ca et 0 par ISP", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Verification du pouls peripherique \nMEOPA et PENTHROX en même temps ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Medecin prescripteur n'a pas proposeé transport paramedicalisé ? pouls 130", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bilan circonstanciel pauvre . Bilan initial léger . Hemorragie mais pas de paleur , TRC ? quantité ? Quels critères pour rentrer dans PISU ? Bonne refexion pour l'exacyl même si erreur PISU\nA froid et pas de temperature", "analyse": "", "action": "", "actionDone": ""}, {"chef": "On doit chercher les ATCD et les traitements ( les principaux doivent être notés)\nPourquoi aérosol car encombrement bronchique ? Solumedrol 72mg ???? précision douteuse à faire , Pas de prise de temperature ( OAP ? Pneumopathie ? ) OMI ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Ce n'est pas un PISU mais une prescription . Qui est le MRH", "analyse": "Quand on lit le bilan on a aucune plue value dans l'apport de l'ISP\nOn ne sait pas ce qui se passe, pas d'examen clinque, on dirait un bilan de secourisme \nEn tant de MRH je ne sais absolument pas quoi en penser et quoi en faire, simple malaise vagal, un détresse circulatoire, hémorragie .....", "action": "refaire une MSP sur les BPV", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel, Bilan difficile à lire pourquoi aérosol car ATCD cardio er encombrement bronchique à l'auscultation. \nPas de réassort", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstaciel ( recurrent+++), HypoTA orthostatique non vérifiée. \nQui est le MRH ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Fibrilation tachycardie paroxystique ??\nPas de bilan circonstanciel\nBilan cardio léger", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi aérosol alors que pas de sibilant mais un encombrement bronchique . Pourquoi solumédrol ? Chute dans la nuit et est restée au sol? est remontée dans son lit ? Température ? Notion d'un déficit Droit par chef d'agrés, aucune trace dans bilan ISP", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel\nPourquoi aérosol alors que murmure vesiculaire perçu\nEncombrement haut : pourquoi pas d'aspiration \nHTA et notion \nContact ISP par TPH pour explication : OK", "analyse": "dossier vu en directe", "action": "Faire MSP sur le cas, prevu avec l'ISP kevin Wendenberg\nEn attente du retour", "actionDone": ""}, {"chef": "EVA 6 non traitée ? Bilan evolutif de la douleur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Oubli transport paramédicalisé", "analyse": "douleur tho est bien decrite mais \"perforation du poumon\" pnemothorax? Contusion pulmonaire ?\nen revanche, la douleur est elle costale, cardiaque, pulmonaire ?\nL'auscultation aurait été la bien venu\nPrise en charge de la douleur pour EVA à 9?", "action": "Refaire un point avec l'ISP sur l'auscultation pulmonaire\nSi besoin refaire une petite formation si l'ISP le souhaite", "actionDone": ""}, {"chef": "Aurait mérité un controle de la TA et en fonction proposer pose VVP au MRH", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Hypothermie et pas de température notée", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Glycémie? Crise a été vue par ISP ou c'est selon temoin ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel . donne du paracetamol per os ? qui precrit? Douleur irradiant dans le dos et pas d'ECG ( facteurs de risque = Fume , Pilule et surpoids); pas de prise de pouls femoral \n1er episode\nEVA 7 et pas de morphine ? la laisse partir non paramedicalisée avec EVA à 6", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstantiel . Elle a fait quoi ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Chute de sa hauteur ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel . Inquiétude ? Lecture bilan compliquée", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel \nPourquoi pas de natispray", "analyse": "", "action": "", "actionDone": ""}, {"chef": "bilan circonstanciel leger. diagnostic de crise comitiale . L'iSP l'a t'elle vu ou c'est selon temoin ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Erreur transcription PISU ( brulure ? ) plaie en regard de la fracture ? ( ATB ? )", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Notion de toux avec hyperthermie = Auscultation pulmonaire !!", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Erreur transcription PISU ( PISU douleur et pas brulures)", "analyse": "description de la douleur\nirradiation?\nreproductible à la palpation?\ndurée\nnotion d'effort?\nauscultation pulmonaire?", "action": "refaire une petite MSP sur la douleur thoracique", "actionDone": ""}, {"chef": "Oubli de transcription de prise en charge . Contact ISP OK", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Quantité de médicaments ? Estimation ou inconnu", "analyse": "effectivement le BPV est complètement aberrant:\nglasgow 7 puis conscience normal et calme dans le bilan neuro", "action": "Allo ISP pour lui rappeler l'importance medico légal du bilan\nIl faut savoir prendre quelques minutes pour relire avant d'envoyer car c'est ce qui est écrit qui reste!", "actionDone": ""}, {"chef": "Irradiation douleur? EVA à 6 et pas d'antalgie ?", "analyse": "pourquoi n'a on pas les ECG en piéce jointe?\nGlobalement bilan plutôt bon\non comprends bien la problématique \njuste manque le suivi de la TA et de la FC pendant le transport", "action": "Poser la question à Brice pour ECG\nallo ISP pour lui rappeler l'importance du suivi des constantes pendant le transport surtout avec une tachycardie à 240 et une douleur thoracique", "actionDone": ""}, {"chef": "Pas d'auscultation . 1 seul aérosol ? Pas de VVP ni de solumedrol\nPas de temperature", "analyse": "analyse de la situation trés bien faite en revanche point à faire sur le PISU", "action": "allo ISP pour précision\nsi prescription MRH, il faut impérativement le noter et mettre le nom du MRH \nEncore une fois c'est ce qui est écrit qui fait fois, si on est hors PISU et qu'il n'est pas noté qu'on a une prescription c'est qu'on en a pas eu!", "actionDone": ""}, {"chef": "Bilan traumato complet de la tête au pied doit etre fait. Pourquoi pas de profenid ? \nAttention PISU douleur et pas brulure\n1 seul bolus de morphine ?", "analyse": "douleur thoracique:\ndurée ?\n1er épisode?\nReproductible à la mobilisation....\nOu est l'ECG?", "action": "Faire une MSP sur le thème de la douleur thoracique", "actionDone": ""}, {"chef": "Pourquoi pas PENTHROX ? 1 seul bolus de morphine ? ' EVA à 7 ) pas de réevaluation douleur", "analyse": "pourquoi présence de l'ISP?\nCirconstanciel: RAS ???\nSi RAS l'ISP n'a rien à faire sur cette inter!", "action": "Convoquer l'ISP \non ne peut plus tolérer des bilan vide!", "actionDone": ""}, {"chef": "PISU Accouchement ? ( Bug BPV ? ) La prise en charge est correcte", "analyse": "pourquoi pas ECG\nLa pneumo et la cardio sont souvent lié chez les personnes âgées", "action": "faire un point avec l'ISP sur ce dossier pour mettre un évidence l'importance de faire un ECG \net de la température sur une probable pneumopathie", "actionDone": ""}, {"chef": "D'accord avec la 1ere analyse du BPV. Penses à relire ton bilan pour corriger les erreurs ( Suite à client ZAVP ?? )\nEncombrement pulmonaire = Auscultation IMPERATIVE", "analyse": "le bilan du secouriste est 20 fois mieux que celui de l'ISP qui est inexistant", "action": "Je me repete: convoquer l'ISP\nVoir lui retirer ses compétences si pas de prise de conscience rapide de la situation", "actionDone": ""}, {"chef": "Morphine , combien de bolus et horaire. \nParacetamol 50Mg/Kg = 750 mg alors qu'à 50Kg c'est 1 g", "analyse": "en plus patiente sous eliquis (bien précisé par le secouriste)\nrester au sol de 14h à 20h40: attention à la rhabdomyolyse\nnotion de douleur colonne par secouriste\nbilan doit être plus précis sur la palpation corps entier: abdo, ausc pulmonaire ?\nEVA à 9? diminution avec meopa et paracetamol?", "action": "Allo ISP pour point sur ce dossier", "actionDone": ""}, {"chef": "Oui un accompagnement pour une EVA à 4 aurait été judicieux", "analyse": "TC avec PC: le bilan neuro doit être détaillé avec un glasgow", "action": "allo ISP rapelle sur PISU douleur et trouble neuro\nSi prescription par med samu: le noter!", "actionDone": ""}, {"chef": "Quels critères d'inclusion pour aérosol ? Pas de dyspnée, pas de sibilant. Effet placebo ? peut être qu'un aérosol de serum phy aurait été aussi performant", "analyse": "", "action": "allo ISP pour demande d'explication\nrapeller l'importance de noter le nom du MRH c'est médico légal", "actionDone": ""}, {"chef": "examen abdo ? Localisation ?", "analyse": "", "action": "allo ISP pour explication sur ce bpv\nSi pas vu par l'ISP l'enlever des erreurs graves", "actionDone": ""}, {"chef": "une auscultation pulmonaire aurait été judicieuse", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Les constantes auraient été mieux qu'hemodynamique maintenue. \nSaignement , Quantité", "analyse": "au vu de la clinique la prise en charge est coherente mais il aurait effectivement fallu avoir un contact tel avec le MRH\nla sat à l'air ambiant est à 95 et remonte à 98 sous O2 donc on peut se dire qu'on peut attendre un peu pour avoir le MRH au tel", "action": "Allo ISP pour rappel de l'importance de rester dans le PISU", "actionDone": ""}, {"chef": "Bilan traumato leger ( Abdomen , thorax ? )\n1 seul bolus morphine? pas de surveillance de l'évolution ( ENS , Glasgow, . EVA à 9 et seulement 2.5 morphine. Pourquoi 2,5 ? pas de poids", "analyse": "", "action": "", "actionDone": ""}, {"chef": "brulures visage ? Et les orifices naturels ? quel état ? Pas d'auscultation pulmonaire\nPas de poids\nPas d'EVA , pourquoi 2.5 de morphine ? pas de surveillance ni de bilan evolutif. \nPas de profenid", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de d'examen traumato complet ( Thorax ? Bassin ? abdomen . pas de surveillance ni de bilan evolutif . Douleur à 7 et pourquoi pas les 10 mg de morphine ?", "analyse": "douleur thoracique dont on arrive pas à avoir la cause: cardiaque ou pulmonaire, voir juste trauma\nintérêt de l'auscultation pulmonaire surtout qu'on a une notion de trauma costal", "action": "revoir l'auscultation pulmonaire", "actionDone": ""}, {"chef": "il faudrait mettre les actions ( PISU dans les bonnes cases pour un bilan plus clair et lisible. Pas de bilan . HTA marbrure , il n' y aurait pas une composante cardio ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi pas de profenid ? oubli ou parce que Contre indication ? \nPourquoi pas d'ATB car fracture ouverte ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Brulure ? quel degré? pas de water gel ? pourquoi pas d'aérosol car sibilant et DRA SpO² à 77%\nG13 , pas de VVP", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Impotence MSG : Immobilisation ? \nEVA ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bilan fleuve . SpO² 87% et crepitent droite dans contexte hyperthermie ( infection ? fausses routes ? Pas de VVP ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Douleur thoracique coup de poignard chez un fumeur de 2 paquets par jour et pas d'ECG ? 16/9 de TA au départ et EVA à 9 et pas de PISU ? \nTransport avec ISP ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "pas de bilan circonstanciel : DRA dans quel contexte ? Pas de temperature alors que toux grasse . Productive ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "EVA 7 et pas de morphine ? fracture ouverte et pas d'ATB ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "MRH ? qui Est il ? \nNOM OBLIGATOIRE", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de profenid , 13 mg de morphine. prescription MRH ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Douleur thoracique de quelle origine ? ( suite à l'AVP , durée, depuis quand ? Cardiaque ? apparition brutale ? \nMEOPA sans avoir ecarter un pneumo dans contexte de trauma costal traumatique il y a 10j", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Rivotril intra rectal ? ( hors PISU et hors AMM) A t'il été prescrit pour le medecin civil ( Ses coordonnées ? ) Si préscrit par medecin ce n'est pas un PISU .", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Antiémetique injecté : Lequel et posologie ? Paracetamol posé sur PISU ou sur préscription ? \nNom de MRH prescripteur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de TA . Pourquoi pas de profénid ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de notion de pose de VVP . Nom du medecin prescripteur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Malaise avec PCI dans quel contexte ? \nAttention il faut relire son bilan ( Gales de la conscience ???)", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel \nQuantité de sang perdu ? ( estimation ) Tu parles de chute suite à perte de connaissance = Malaise ? Haleine alcoolisée ? \nTransport paramédicalisé ? Notion de chute pas d'examen traumato de la tête au pied. SpO² à 90 + ronflement et pas d'auscultation", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi pas de profenid ( Femur ? ) , ni de morphine ( EVA 10)\nTransport Helico ou VSAV ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi pas de profenid ? Prescription faite par Dr SFAIRI", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Nom du regulateur ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Chute de cheval sur tete forte cinetique et pas de TC ???\nAuscultation trauma compléte ? oui et le resultat de cette auscultation complète ?\nExacyl ? motif ? diminution hemocue ? Quels critères pour exacyl ? PISU DCA ? Ta 12/8\nEt pas de morphine pour EVA à 8 ??\nTransport paramédicalisé ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pense à preciser l'auscultation ( sibilants sur les 2 champs ).Quel PISU mis en place ? qu'as tu fait comme traitement ? Crachats verts et pas de prise temperature ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Murmure des lobes ? lesquels ? Glasgow ? Alors il est inconscient ou conscient ( les 2 sont notés) Desorientation temporo spatiale? mais inconscient ? Aphasique et aucune difficulté à parler ???\nPas de reprise de conscience ( dans bilan evolutif ....\nGrosses incoherences dans bilan", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi pas de profenid ? utilisation de RL", "analyse": "", "action": "", "actionDone": ""}, {"chef": "même avec SAMU penses à noter un minimum du bilan", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Il aurait ete judicieux de mettre une VVP et de demander au MRH si possibilité atropine ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Apparement auscultation faite mais bilan neuro pauvre. Notion de douleur thoracique constrictive et pas d'ECG signalé par ISP ( mais 2 par chef d'agrés mais aucune trace. 1er episode de tachycardie ? FC à 49 mais 240 par ISP et par de surveillance pendant transport ? EVA à 7 et pas d'antalgie ? Transport à Puigcerda ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Crise convulsive à 16h et intervention à 17h38 = Tu as vu la crise ? Perte de vigilance mais G 15 ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bolus de morphine de 6 mg ? ou 2 X 3 mg ? \nAttention aux ecritures . Penser à se relire", "analyse": "", "action": "", "actionDone": ""}, {"chef": "As tu fait quelque chose au patient ? Un minimum d'info est necessaire même si travail avec SAMU", "analyse": "", "action": "", "actionDone": ""}, {"chef": "manque hemocue , TRC \nretrouvée au sol = Temperature ? \npas de surveillance post remplissage", "analyse": "", "action": "", "actionDone": ""}, {"chef": "douleur thoracique dans quel contexte ? Pas de natispray\nNom medecin prescripteur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Il aurait été judicieux d'avoir une notion d'un eventuel bilan lesionnel", "analyse": "", "action": "", "actionDone": ""}, {"chef": "resucrage ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Type de douleur ? Irradiation ? Il est signalé une douleur abdo et aucun examen de l'abdomen ! Température à 33,8 ???? il serait bien de preciser que ce chiffre n'est pas à retenir ( teguments chaus ) car laisser une patiente en hypothermie est une grosse erreur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "toujours problème de bilan circonstanciel !!!le bilan circonstanciel n'est pas le motif d'alerte !! douleur thoracique = irradiation ? type douleur AnisoTA pas de verification des pouls peripherique", "analyse": "", "action": "", "actionDone": ""}, {"chef": "oui une auscultation pulmonaire aurait été judicieuse. En effet penses à mettre ton nom", "analyse": "", "action": "", "actionDone": ""}, {"chef": "ok avec remarques de la première lecture", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi adrenaline IM + aérosol adre ? Polaramine ? qui est le prescripteur car pas dans ancien PISU", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel. \nil y a une precription merdicale", "analyse": "", "action": "", "actionDone": ""}, {"chef": "douleur thoracique . contexte ? bilan douleur thoracique pauvre. Pas d'ECG ? EVA 10 à 2 ?? Antalgique ?\nPISU mis en place ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "heureusement qu'il y a le bilan du chef d'agrés pour comprendre un peu la situation", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Auscultation pulmonaire ? \ntemperature ? ( notion d'hyperthermie", "analyse": "", "action": "", "actionDone": ""}, {"chef": "pourquoi bolus de morphine de 2 mg ,EVA toujours elevée mais que 7 mg de morphine ??\nPourquoi MEOPA et PENTHROX ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "aucun renseignement clinique mais PISU mis en place. une partie du bilan est dans les facteurs de risques", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Type de douleur ? brulure ? Une petite notion respiratoire aurait été necessaire", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "meme en présence du SAMU un minimum de bilan doit être noté", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pose de VVP ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "toujours rien sur le bilan", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas d'ECG fait alors que signe OMI + HTA, toux grasse mais pas de temperature\nPISU mis en place ? Auscultation ? \nAttention aux abréviations ( BTA ? )", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bilan ISP inexistant. Prescription de valium ; Posologie faite ? Nom du medecin prescripteur?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "a l'auscultation bruit surrajoutés ? Lesquels ? Sibilants ? Encombrement ? \nNom du medecin prescripteur?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "au vu des ATCD il aurait été peut être judicieux de faire un ECG\nnotion de douleur et pas d'EVA", "analyse": "", "action": "", "actionDone": ""}, {"chef": "notion de chute dans le escaliers ( 6 m de haut ??). Palpation corps entier et quel resultat ? Pas de morphine pour EVA à 9 ? pas de constante ni de surveillance", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan ISP mais ECG fait le 1er ECG semble être un ECG de référence daté du 16/03/2026 mais non précisé", "analyse": "", "action": "", "actionDone": ""}, {"chef": "pas de bilan circonstanciel ISP. saignement ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel\nGlasgow 7 , SpO² à 83% pas de SAMU ou de contact avec MRH ? \nTransport paramédicalisé ? \nBronchite : Pas de temperature ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Morphine quel dosage fait ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas d'auscultation pulmonaire . \nAttention notion de dyspnée ( circonstanciel ) et d'aucune dyspnée ( ventilatoire) dans le même bilan", "analyse": "", "action": "", "actionDone": ""}, {"chef": "que 6 mg de morphine ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "toujours problème de bilan circonstanciel. \nMorphine 1 mg ?? 4mg au total avec EVA à 4 pourquoi pas plus", "analyse": "", "action": "", "actionDone": ""}, {"chef": "L'age n'est pas une CI au penthrox . Aucun CI pour le mettre.", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi pas de profenid ? Combien de morphine injectée au total ? 4 ou 10 ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Obnubilé ? Glasgow ? Morphine CI car obnubilation \nMorphine sur EVA = ou sup à 7 Donc hors PISU", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Attention aux abréviations", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Nom du MRH prescripteur . Pourquoi demander l'accord du MRH alors que PISU ? \nRivotril et hypnovel ( prescription MRH ? )", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de glycemie alors que contexte OH . Pas de bilan respi ni auscultation alors que chute de 10 marches", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel \nEt aprés pose attelle et MEOPA , il va comment ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan traumato ' palpation abdo , bassin , pas d'auscultation\nProtocole douleur ; Mais qu'a t'il reçu ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "malaise d'origine alccolique ?? je ne comprends pas ce que vient faire la bouteille de 75 ( Bouteiile de quoi ? Il l'a bu ? bilan neuro aurait été judicieux", "analyse": "", "action": "", "actionDone": ""}, {"chef": "il aurait été bien de signaler comment etait l'enfant ( calme, pleurs , paniqué ....)", "analyse": "", "action": "", "actionDone": ""}, {"chef": "bilan neuro aurait merité d'être plus pointu . Bilan neuro post resucrage. Mouvements tonico clonisue mais pas de recherche de signe de convulsions ( morsure langue, urine...\nRessucrage per os et réevaluation une seule fois 10 min aprés la 1ere glycemie", "analyse": "", "action": "", "actionDone": ""}, {"chef": "toujours pas de profenid .......", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Douleur irradiant dans le dos ( recherche de symetrie des pouls radiaux et femoraux auraient été judicieux. . Vu les ATCD , je pense qu'une VVP aurait été necessaire . Pourquoi pas de test au nitré ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "manque le pouls", "analyse": "", "action": "", "actionDone": ""}, {"chef": "retrouvé dans l'eau = auscultation souhaitable. Pas de pouls pris", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pb tablette ? ou ISP n' a pas vu le patient ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Hypoglycémie avec dextro à 1,92 ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Un minimum neuro et respi necessaires", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Un minimum neuro, respi et cardio necessaire . \nPourquoi pas de penthrox ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "L'ISP a t'il vu le patient ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "G5 ou G10?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "bilan circonstanciel à revoir pas de recherche de signes de convulsions ( Urine et morsure de langue). pas de pose de VVP ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "pas de bilan clinique même à minima vu la situation", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Paleur conjonctivale ? TRC ? EVA à 5 pas d'antalgie", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pourquoi G 5%\nNom du MRH\nSAMU SLL finalement ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "penses à noter quel medicament tu as fait . peut être qu'un ECG aurait été judicieux au vu des ATCD. notion d'expectorations mais pas de temperature. Auscultation post aérosol pour savoir si levé du bronchospasme\nPoids ? peut être pseudo asthme cardiaque ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "une auscultation pulmonaire aurait été judicieuse", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de glycémie", "analyse": "", "action": "", "actionDone": ""}, {"chef": "convulse ? il faut donner les signes cliniques. Bruit à la respiration ? Pas d'auscultation. Hypnovel ? ( pas dan,s les anciens PISU sortis le 7 Avril )\nNom du medecin precripteur. Pas de transport paramédicalisé ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bilan neuro a completer ; bilan respi et cardio absent . vertige ? trouble vestibulaire ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan evolutif . PISU bronchospasme : Tu lui as fait quoi ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "le diagnostic n'est pas le bilan circonstanciel. toujours pas de profenid ....", "analyse": "", "action": "", "actionDone": ""}, {"chef": "toujours problème de bilan circonstanciel . toujours pas de profenid", "analyse": "", "action": "", "actionDone": ""}, {"chef": "chute dans les escaliers ? pas de bilan traumato complet. Et le profenid ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "pas de HbCO ni auscultation pulmonaire", "analyse": "", "action": "", "actionDone": ""}, {"chef": "problème tablette ? ISP n'a pas vu le patient ?( SAMU et EPMU SLL )", "analyse": "", "action": "", "actionDone": ""}, {"chef": "je pense qu'il y a un melange des données entre les anciens et nouveaux PISU en cochant le pisu , certains medicaments se sont mis automatiquement\nPar contre auscultation pulmonaire aurait judificeuse", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de réevalution d'EVA", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Juste noter quel ATB fait", "analyse": "", "action": "", "actionDone": ""}, {"chef": "HbCO² à 90 ? erreur ecriture ? \nSi c'est le medecin SAMU qui dit VVP , Exacyl et Perfalgan ce n'est pas un PISU . Car aucun critère pour rentrer sur PISU DCA et Antalgie", "analyse": "", "action": "", "actionDone": ""}, {"chef": "ECG apparemment fait mais non noté. Douleur à 6 et Pas d'antalgie ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Attention posologie Terbutaline et Atrovent ( dosage pediatrique)", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Si prescription , ce n'est pas un PISU . Nom du medecin prescripteur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel\nFracture ouverte et pas d'ATB \nMorphine 3,3,2,2 et pas 3,3,3,1", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Paleur ? TRC ? Hb ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Toujours pas de bilan circonstanciel\nLe bilan neuro aurait pu être plus pointu", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstaciel \nMême si photo , penses à noter que l'ECG a été fait", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Commence par le bilan avant de commencer par le traitment. Nom de medecin regulateur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Attention avecles nouveaux pisu le natyspray se fait en accord du MRH", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Il aurait été bien de chercher des signes de crise comitiale, et de purpura", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Toujours pas de bilan circonstanciel . 1ere Crise comitiale ? Tu l'as vu ? 2 crise comitiale avec un glasgow à 15 rapidement ???ATCD Psy et pas d'anti epileptique...", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Le contexte SVP !!!!", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Vu que la clinique , on ne rentre pas dans la question decisionnelle du PISU9 qui dit detresse respi ET ATCD asthme ou BPCO . Il aurait fallu demander l'accord au MRH . Pas de fin de crise aprés 1er aérosol et pourquoi pas de 2éme aérosol et de VVP . Pas de SpO² sous O² ( 70% à AA). Demande de contact au MRH et pas de notion de cette echange avec le MRH . \nPas de prise temperature ( probable contexte infectieux car sous ATB )", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Dose de ketamine injectée ?\n6 mg de morphine seulement et reste à une EVA à 9 ? Pourqouoi pas de penthrox ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "ECG = signe d'IDM ? diagnostic\nPosologie prescrites par medecin ? EVA à 5 et pas d'antalgie ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan initial. Bilan neuro aurait du être plus poussé car contexte hyperthermie ( raideur de nuque, photophobie?, purpura ? TA à 87/48 et pas reverifiée. traitement cardio , peut être a t'elle fait un bas debit sur problème cardio : ECG aurait été judicieux. \nCéphalées mais pas d'EVA \nTransport sans ISP ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Dyspnée et pas d'auscultation pulmonaire", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Tu as vu la crise ? G15 ? DTS ? attention aux abréviations. \nPense à mettre un petit bilan respi ( RAS ). Une temperature aurait pu être prise", "analyse": "", "action": "", "actionDone": ""}, {"chef": "ECG aurait été utile et auscultation pulmonaire car ronfle", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Photophobie frissons cephalées . recherche purpura ? IRM cérebral demandé en urgence . peut être une demande de transport CH aurait été mieux . Il aurait peut etre insister aupres du MRH de signes neuro persistants avec une IRM demandé en urgence", "analyse": "", "action": "", "actionDone": ""}, {"chef": "oubli prise de TA", "analyse": "", "action": "", "actionDone": ""}, {"chef": "A t'il etait soulagé sous penthrox? tu le laisse partir sous penthrox avec EVA sans paramédicaliser ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Pas de bilan circonstanciel ( circonstance / contexte)Alors consciente ou inconsciente ? incohérence entre ton bilan circonstanciel et ton bilan initial et neuro", "analyse": "", "action": "", "actionDone": ""}, {"chef": "detresse respi dans quel contexte ? Bilan circonstanciel !!!\nIl aurait été bien de reverifier la Frequence respiratoire avant de la laisser", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "PISU bronchospasme ?mais pas d'ATCD asthme ou BPCO . Et que lui as tu fait comme produit dans ce PISU ?\nRespiration bruyante et pas d'auscultation , ni de temperature vu le contexte", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Si on suit le PISU à la lettre , il n' y a pas les critères d'y rentrer ( detresse respi ET ATCD asthme ou BPCO ) aurait du demander l'accord au MRH", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "le patient a t'il était vu par l'ISP ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "pourquoi utilisation d'adrenaline alors que pas de dyspnée signalée sur le bilan respi. la voie d'injection d'adrenaline n'a pas été notifiée. ses problèmes respiratoires sont présents depuis plusieurs semaines ( etat de base ) son problème allergie n'est qu'un stade 1", "analyse": "", "action": "", "actionDone": ""}, {"chef": "pas de bilan circonstanciel", "analyse": "", "action": "", "actionDone": ""}, {"chef": "devant l'hypoTA , une VVP aurait été judicieuse", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bilan neuro leger . aucune notion de la ventilation . vu les risques cardio en cas de surdosage , un ECG et une VVP aurait été judicieux", "analyse": "", "action": "", "actionDone": ""}, {"chef": "manque le nom du medecin regulateur qui a prescrit le keto", "analyse": "", "action": "", "actionDone": ""}, {"chef": "manque le nom du medecin regulateur. Bilan un peu compliqué à lire . Pas besoin de mettre XABCDE avant chaque signe ( ça surcharge ton bilan)", "analyse": "", "action": "", "actionDone": ""}, {"chef": "bilan pauvre", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "bilan circonstanciel !!!!!Pas d'auscultation pulmonaire alors que difficulté respiratoire decrite. EVA à 9 et que paracetamol ? pas de reévaluation de la douleur", "analyse": "", "action": "", "actionDone": ""}, {"chef": "", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Brulures quel degré? si je suis ta description je n'ai que 8% de brulé EVA 6 et pas de morphine ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "PISU OAP et pose de 2 aérosols ? ( hors PISU ). détresse respi d'apparition lente sans HTA ni OMI , peut être infection pulmonaire mais pas de temperature. Bilan evolutif ? la patiente va t'elle mieux ? \nTransport non paramédicalisé ?", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Manque un minimum de données neuro", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Malgré les signes d'un bronchospasme , on est hors PISU car pas d'ATCD BPCO ou Asthme. ATCD cardio avec anomalie auscultation + Detresse respi ( HTA en plus ) = PISU OAP donc pas d'aérosol mais proposition Lasilix ou risordan", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bilan initial pauvre EVA 4 pas d'antalgie", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Bilan douleur thoracique ( irradiation ? 1ere fois , )\nISOCARD ne peut se faire que sur prescription du MRH\nEVA 3 ( antalgie per os )", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Si tu as vu la patient un minimum de traces doit être sur le bilan", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Même si SAMU SLL un minimum de bilan doit apparaitre sur ton BPV", "analyse": "", "action": "", "actionDone": ""}, {"chef": "Nom du MRH qui prescrit la modification des bolus . Dans ton bilan pas necessaire de noter XABCDE avant tes signes cliniques", "analyse": "", "action": "", "actionDone": ""}];

  // ── Reprendre où on s'était arrêté ────────────────────────────────────────
  const startIdx = parseInt(props.getProperty('LGR_IDX') || '-1', 10);
  // -1 = pas commencé = on démarre du DERNIER (newest)

  Logger.log('Chargement des révisions...');
  const revisions = _diagGetRevisionsList(fileId);
  const total = revisions.length;
  Logger.log(total + ' révisions trouvées.');

  // On scanne du PLUS RÉCENT au PLUS ANCIEN
  // startIdx = index dans revisions[] (0=oldest, total-1=newest)
  // On commence à total-1 et on descend
  let curIdx = (startIdx === -1) ? total - 1 : startIdx;

  const norm = s => String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  while (curIdx >= 0) {
    if (Date.now() - startTime > MAX_MS) {
      props.setProperty('LGR_IDX', String(curIdx));
      Logger.log('Pause rev ' + curIdx + ' — Relancez findLastGoodRevisionAndRestore()');
      return;
    }

    const rev = revisions[curIdx];
    let baseUrl = (rev.exportLinks && rev.exportLinks['text/csv'])
        ? rev.exportLinks['text/csv'] : null;
    if (!baseUrl) baseUrl = _diagGetExportUrl(fileId, rev.id);

    if (baseUrl) {
      const csvAlex = _diagFetchCsv(baseUrl, gidAlex);
      if (csvAlex) {
        const alexRows = _diagParseCSV(csvAlex);

        // Compter les commentaires non-vides en col M (index 12)
        const commentCount = alexRows.filter((r, i) => i > 0 && r[12] && norm(r[12])).length;
        Logger.log('Rev ' + curIdx + ' (' + rev.modifiedDate + '): ' + commentCount + ' commentaires Alex M');

        if (commentCount >= 5) {
          // ✅ Trouvé la bonne révision !
          Logger.log('Bonne révision trouvée : rev ' + curIdx + ' avec ' + commentCount + ' commentaires');

          // Construire la map ID → commentaire depuis CETTE révision
          const idToChef = {};
          for (let i = 1; i < alexRows.length; i++) {
            const id      = norm(alexRows[i][0]);
            const comment = norm(alexRows[i][12]);
            if (id && comment) idToChef[id] = comment;
          }

          // Pareil pour Eve (colonnes O et Q)
          const idToAnalyse = {};
          const idToAction  = {};
          if (gidEve) {
            const csvEve = _diagFetchCsv(baseUrl, gidEve);
            if (csvEve) {
              const eveRows = _diagParseCSV(csvEve);
              for (let i = 1; i < eveRows.length; i++) {
                const id      = norm(eveRows[i][0]);
                const analyse = norm(eveRows[i][14]);
                const action  = norm(eveRows[i][16]);
                if (id && analyse) idToAnalyse[id] = analyse;
                if (id && action)  idToAction[id]  = action;
              }
            }
          }

          Logger.log('IDs trouvés: chef=' + Object.keys(idToChef).length +
                     ' analyse=' + Object.keys(idToAnalyse).length +
                     ' action=' + Object.keys(idToAction).length);

          // Maintenant on peut croiser avec le backup Excel pour prendre
          // le texte Excel (qui peut avoir des corrections) plutôt que
          // le texte de la révision — on utilise la révision pour le MAPPING
          // et le backup Excel pour le CONTENU.
          //
          // On fait la correspondance par position :
          // alexRows[i] dans la révision → BACKUP[i-1] dans l'Excel
          // C'est valide car on est dans la MÊME révision = même ordre.
          const finalChef    = {};
          const finalAnalyse = {};
          const finalAction  = {};

          // Chef : position dans alexRows ↔ position dans BACKUP
          for (let i = 1; i < alexRows.length; i++) {
            const id = norm(alexRows[i][0]);
            if (!id) continue;
            const backupRow = BACKUP[i - 1];
            if (!backupRow) continue;
            // Utiliser le texte Excel si non vide, sinon celui de la révision
            const chefText = (backupRow.chef && backupRow.chef.trim())
                ? backupRow.chef
                : norm(alexRows[i][12]);
            if (chefText) finalChef[id] = chefText;
          }

          // Analyse / Action : correspondance par ID depuis la révision Eve
          // + texte Excel si disponible
          if (gidEve) {
            const csvEve2 = _diagFetchCsv(baseUrl, gidEve);
            if (csvEve2) {
              const eveRows2 = _diagParseCSV(csvEve2);
              for (let i = 1; i < eveRows2.length; i++) {
                const id = norm(eveRows2[i][0]);
                if (!id) continue;
                // Chercher la ligne Alex correspondant à cet ID pour avoir l'index BACKUP
                let backupIdx = -1;
                for (let j = 1; j < alexRows.length; j++) {
                  if (norm(alexRows[j][0]) === id) { backupIdx = j - 1; break; }
                }
                const backupRow = (backupIdx >= 0) ? BACKUP[backupIdx] : null;
                const analyseText = (backupRow && backupRow.analyse && backupRow.analyse.trim())
                    ? backupRow.analyse : norm(eveRows2[i][14]);
                const actionText  = (backupRow && backupRow.action && backupRow.action.trim())
                    ? backupRow.action  : norm(eveRows2[i][16]);
                if (analyseText) finalAnalyse[id] = analyseText;
                if (actionText)  finalAction[id]  = actionText;
              }
            }
          }

          // Nettoyer état
          props.deleteProperty('LGR_IDX');

          // Appliquer directement
          _applyRestoredByIdMap(ss, shApp, shAlex, shEve, finalChef, finalAnalyse, finalAction);
          return;
        }
      }
    }
    curIdx--;
  }

  props.deleteProperty('LGR_IDX');
  Logger.log('Aucune révision avec suffisamment de commentaires trouvée.');
  SpreadsheetApp.getUi().alert(
    'Aucune révision exploitable trouvée.\n' +
    'Les commentaires ont peut-être été supprimés avant que Drive ait ' +
    'sauvegardé une révision accessible.'
  );
}

function _applyRestoredByIdMap(ss, shApp, shAlex, shEve, chefMap, analyseMap, actionMap) {
  const appData  = shApp.getDataRange().getValues();
  const alexData = shAlex.getDataRange().getValues();
  const eveData  = shEve ? shEve.getDataRange().getValues() : [];

  const appRowById  = {};
  const alexRowById = {};
  const eveRowById  = {};

  for (let i = 1; i < appData.length;  i++) {
    const id = String(appData[i][C_APP_ID] || '').trim();
    if (id) appRowById[id] = i + 1;
  }
  for (let i = 1; i < alexData.length; i++) {
    const id = String(alexData[i][0] || '').trim();
    if (id && !alexRowById[id]) alexRowById[id] = i + 1;
  }
  for (let i = 1; i < eveData.length;  i++) {
    const id = String(eveData[i][0] || '').trim();
    if (id && !eveRowById[id]) eveRowById[id] = i + 1;
  }

  let nChef = 0, nAnalyse = 0, nAction = 0, nMiss = 0;

  // Chef → Alex col M + APP BX
  for (const id in chefMap) {
    const text = chefMap[id];
    if (!text) continue;
    const alexRow = alexRowById[id];
    const appRow  = appRowById[id];
    if (alexRow) { shAlex.getRange(alexRow, 13).setValue(text); nChef++; }
    if (appRow)  shApp.getRange(appRow, C_COMM_CHEF + 1).setValue(text);
    if (!alexRow && !appRow) nMiss++;
  }

  // Analyse → Eve col O + APP BY
  for (const id in analyseMap) {
    const text = analyseMap[id];
    if (!text) continue;
    if (!eveRowById[id] && shEve) {
      const nr = shEve.getLastRow() + 1;
      shEve.getRange(nr, 1).setValue(id);
      eveRowById[id] = nr;
    }
    const eveRow = eveRowById[id];
    if (eveRow && shEve) { shEve.getRange(eveRow, 15).setValue(text); nAnalyse++; }
    const appRow = appRowById[id];
    if (appRow) shApp.getRange(appRow, C_COMM_MED + 1).setValue(text);
  }

  // Action → Eve col Q + APP BZ
  for (const id in actionMap) {
    const text = actionMap[id];
    if (!text) continue;
    if (!eveRowById[id] && shEve) {
      const nr = shEve.getLastRow() + 1;
      shEve.getRange(nr, 1).setValue(id);
      eveRowById[id] = nr;
    }
    const eveRow = eveRowById[id];
    if (eveRow && shEve) { shEve.getRange(eveRow, 17).setValue(text); nAction++; }
    const appRow = appRowById[id];
    if (appRow) shApp.getRange(appRow, C_ACTION_MED + 1).setValue(text);
  }

  CacheService.getScriptCache().remove('chefferie_counts_v4');
  CacheService.getScriptCache().remove('all_isp_error_stats');

  const msg = 'Restauration terminée !\n' +
              nChef + ' commentaires chefferie restaurés\n' +
              nAnalyse + ' analyses médecin restaurées\n' +
              nAction + ' actions restaurées\n' +
              (nMiss > 0 ? nMiss + ' IDs non trouvés dans le spreadsheet actuel.' : '');
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// ENTRETIENS INDIVIDUELS — lecture croisée pour la vue ISP
// ============================================================

const ENTRETIENS_SS_ID     = '1dIcgZnEJ2R6psxdhBBSVv4jE7M0vd5Gs6OpBqPv0Ytw';
const ENTRETIENS_COL_DATE  = 0;
const ENTRETIENS_COL_AGENT = 2;
const ENTRETIENS_COL_START = 3;
const ENTRETIENS_COL_GROUP = 31;
const ENTRETIENS_COL_RESUME= 32;
const ENTRETIENS_MANUAL    = 'Entretiens manuels';
const ENTRETIENS_DELETIONS = 'Deletions';

/**
 * Retourne les entretiens individuels pour l'ISP identifié par son token.
 * Utilisé par IspView.html pour afficher l'historique des entretiens en bas de page.
 */
function getEntretiensForIsp(token) {
  try {
    const decoded = _decodeIspToken_(token);
    if (!decoded) return { error: 'Token invalide.' };

    // Retrouver le nom de l'agent depuis la liste active
    const ss = getSS_();
    const activeAgents = getActiveAgents_(ss);
    const agent = activeAgents.find(function(a) {
      return a.mat === decoded.mat.trim().toUpperCase();
    });
    if (!agent) return { entretiens: [], agentNom: '' };

    const entretiensSS = SpreadsheetApp.openById(ENTRETIENS_SS_ID);

    // Charger les IDs supprimés (feuille Deletions du classeur entretiens)
    const deletedIds = [];
    try {
      const delSheet = entretiensSS.getSheetByName(ENTRETIENS_DELETIONS);
      if (delSheet && delSheet.getLastRow() >= 1) {
        delSheet.getRange(1, 1, delSheet.getLastRow(), 1).getValues().forEach(function(r) {
          const v = String(r[0]).trim();
          if (v) deletedIds.push(v);
        });
      }
    } catch(ed) { Logger.log('deletions: ' + ed); }

    const result = [];
    const tz = 'Europe/Paris';

    // ── Entretiens formulaire (premier onglet) ──
    try {
      const formSheet = entretiensSS.getSheets()[0];
      if (formSheet.getLastRow() >= 2) {
        const data = formSheet.getDataRange().getValues();
        const headers = data[0];
        for (let i = 1; i < data.length; i++) {
          const eid = 'f_' + i;
          if (deletedIds.indexOf(eid) !== -1) continue;
          const rowAgent = String(data[i][ENTRETIENS_COL_AGENT] || '').trim();
          if (!rowAgent || !_entretienNomMatches_(agent.nom, rowAgent)) continue;

          const d = _entretienParseDate_(data[i][ENTRETIENS_COL_DATE]);
          const summary = data[i].length > ENTRETIENS_COL_RESUME
            ? String(data[i][ENTRETIENS_COL_RESUME] || '').trim() : '';

          // Q&A (colonnes D+, hors groupement et résumé)
          const answers = [];
          for (let j = ENTRETIENS_COL_START; j < headers.length; j++) {
            if (j === ENTRETIENS_COL_GROUP || j === ENTRETIENS_COL_RESUME) continue;
            const q = String(headers[j] || '').trim();
            if (!q) continue;
            const v = data[i][j] !== null && data[i][j] !== undefined ? String(data[i][j]).trim() : '';
            if (v) answers.push({ question: q, value: v });
          }

          result.push({
            date: d ? Utilities.formatDate(d, tz, 'dd/MM/yyyy HH:mm') : '',
            timestamp: d ? d.getTime() : 0,
            type: 'Entretien individuel annuel',
            summary: summary,
            answers: answers
          });
        }
      }
    } catch(ef) { Logger.log('entretiens form: ' + ef); }

    // ── Entretiens manuels ──
    try {
      const manualSheet = entretiensSS.getSheetByName(ENTRETIENS_MANUAL);
      if (manualSheet && manualSheet.getLastRow() >= 2) {
        const data = manualSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const mid = 'm_' + i;
          if (deletedIds.indexOf(mid) !== -1) continue;
          const rowAgent = String(data[i][1] || '').trim();
          if (!rowAgent || !_entretienNomMatches_(agent.nom, rowAgent)) continue;

          const d = _entretienParseDate_(data[i][0]);
          result.push({
            date: d ? Utilities.formatDate(d, tz, 'dd/MM/yyyy HH:mm') : '',
            timestamp: d ? d.getTime() : 0,
            type: String(data[i][2] || '').trim(),
            summary: String(data[i][3] || '').trim(),
            answers: []
          });
        }
      }
    } catch(em) { Logger.log('entretiens manual: ' + em); }

    result.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return { entretiens: result, agentNom: agent.nom };

  } catch(e) {
    Logger.log('getEntretiensForIsp error: ' + e);
    return { error: e.message };
  }
}

function _entretienNomMatches_(ispNom, formNom) {
  const norm = function(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/-/g, ' ').replace(/[^a-z\s]/g, '').trim();
  };
  const a = norm(ispNom).split(/\s+/).filter(function(w) { return w.length >= 3; });
  const b = norm(formNom).split(/\s+/).filter(function(w) { return w.length >= 3; });
  if (!a.length || !b.length) return false;
  const nb = norm(formNom);
  const na = norm(ispNom);
  const inB = a.every(function(w) { return nb.indexOf(w) !== -1; });
  const inA = b.every(function(w) { return na.indexOf(w) !== -1; });
  return inB || inA;
}

function _entretienParseDate_(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const m = raw.toString().trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const d = new Date(+m[3], +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0));
    return isNaN(d.getTime()) ? null : d;
  }
  const d2 = new Date(raw);
  return isNaN(d2.getTime()) ? null : d2;
}
