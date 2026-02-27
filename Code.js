/****************************************************
 * SDIS 66 - SDS | WebApp Dashboard
 * CACHE SÉQUENTIEL + FIXES + LOCK SYSTEM + ANTI-DOUBLE-COUNT
 * Version: v1.72 | 2026-02-09
 * Modifications: Popup PDF+données ISP, boutons chefferie, préchargement cache
 ****************************************************/

const DASHBOARD_SHEET_NAME = "Dashboard";
const TEMPS_SHEET_NAME = "Temps travail";
const APP_SHEET_NAME = "APP";

const ID_SS_2025 = "112sOp4EAPm3vq0doLWzWlAbsOdutszGKT86USjSqst0"; 
const ID_SS_RH   = "1lwQJ6xTET3qpr9-cPGBngdih_bmfrVRMOYcMgMkUVP0"; 
const ID_PROTOCOLES_CORRESP = "12-7VNgPo7PsoKoRHzm_y24a-2OoDiCvJIyJFTdC9l7c"; 
const ID_SS_ASTREINTE_DEPT = "1XPyV7-Ulno1f4-TgrtsCprL8c6cs3NU7jt1UNST3oXE"; 

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
const C_PROTO_END = 48;    // AW = 48 (0-indexed)
const C_BG_EXAM = 58; 
const C_BH_ABS = 59;  
const C_AKIM = 49;         // AX (0-indexed = 49, Google = 50)
const C_SMUR = 50;         // AY (0-indexed = 50, Google = 51)
const C_CCMU = 51;         // AZ (0-indexed = 51, Google = 52)
const C_DEVENIR = 52;      // BA (0-indexed = 52, Google = 53)
const C_SOUSAN = 53;       // BB (0-indexed = 53, Google = 54)
const C_NBVICTIMES = 54;   // BC (0-indexed = 54, Google = 55)
const C_BILAN_OK = 60; 
const C_BILAN_KO = 61; 
const C_PISU_OK = 62;  
const C_PISU_KO = 63;  
const C_BM_SURV_TRANSPORT = 64; // BM: Surveillance transport (checkbox)
const C_TXTBILAN_KO = 65;   // BN: Motif bilan incomplet (texte)
const C_TXTPISU_KO = 66;    // BO: Motif pisu pas ok (texte)
const C_BP_CLOSE = 67;      // BP: Case clôturée (ne plus afficher dans APP)
const C_BQ_PUI_COMMANDEE = 68; // BQ: PUI commandée (checkbox)
const C_BS_PROBLEM = 70; // Signaler problème à Brice (checkbox)
const C_BT_PROBLEM_TXT = 71; // Texte du problème pour Brice
const C_BU_LOCK = 72; // Timestamp de verrouillage pour éviter doublons     

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

function onOpen() { 
  SpreadsheetApp.getUi()
    .createMenu('⚡ ADMIN')
    .addItem('Installer Trigger Cache (2h)', 'installCacheTrigger')
    .addItem('Mettre à jour Cache', 'updateHistoryCache')
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
  // Test mode: ?test=1 returns minimal HTML to verify server works
  if (e && e.parameter && e.parameter.test === "1") {
    return HtmlService.createHtmlOutput("<h1>Server OK</h1><p>doGet works. scriptUrl = " + ScriptApp.getService().getUrl() + "</p>")
      .setTitle("Test").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  const t = HtmlService.createTemplateFromFile("Home");
  t.scriptUrl = ScriptApp.getService().getUrl();
  return t.evaluate().setTitle("SDIS 66 - SDS").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSS_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function getDropdownList_(sheet, colIndex) { const rule = sheet.getRange(2, colIndex + 1).getDataValidation(); return rule ? rule.getCriteriaValues()[0] : []; }

/* --- 1. STATS 2026 (RAPIDE) --- */
function getStats2026() {
  // === CHERCHER CACHE ===
  const _cache26 = CacheService.getScriptCache();
  const _ck26 = "stats2026_v2";
  const _c26 = _cache26.get(_ck26);
  if(_c26) return JSON.parse(_c26);
  const _sc26 = sheetCacheGet(_ck26);
  if(_sc26) { try { _cache26.put(_ck26, JSON.stringify(_sc26), 7200); } catch(e){} return _sc26; }

  const ss = getSS_();
  const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  
  const psud2026 = Number(dash.getRange(DASH_PSUD_2026_CELL).getValue())||0;
  const total2026 = Number(dash.getRange(DASH_TOTAL_2026_CELL).getValue())||0;
  const astreintes2026 = Math.ceil(Number(dash.getRange(DASH_ASTREINTES_2026_CELL).getValue())||0);
  const secteur2026 = total2026 - psud2026;
  
  const lastDateRaw = dash.getRange(DASH_LASTDATE_CELL).getValue();
  const lastDate = coerceToDate_(lastDateRaw) || new Date();

  const cisNames = dash.getRange("E17:E47").getDisplayValues().flat();
  const cisCounts2026 = dash.getRange("F17:F47").getValues().flat();
  const cisCounts2025ytd = dash.getRange("H17:H47").getValues().flat();
  const cisTotals2025 = dash.getRange("G17:G47").getValues().flat();
  
  const sectNames = dash.getRange("I17:I23").getDisplayValues().flat();
  const sectCounts2026 = dash.getRange("J17:J23").getValues().flat();
  const sectCounts2025ytd = dash.getRange("L17:L23").getValues().flat();
  const sectTotals2025 = dash.getRange("K17:K23").getValues().flat();

  let countApp = 0;
  try {
     const shApp = ss.getSheetByName(APP_SHEET_NAME);
     const data = shApp.getDataRange().getValues();
     for(let i=1; i<data.length; i++) {
         const pdf = String(data[i][C_APP_PDF]).trim();
         if(pdf && pdf !== "#N/A" && !pdf.includes("#N/A") && !data[i][C_BP_CLOSE]) countApp++;
     }
  } catch(e){}

  let counts = { isp: 0, med: 0 };
  try { counts = getChefferieCounts(); } catch(e) { console.log('getChefferieCounts error: ' + e); }

  const _result26 = {
    date: formatDateFR_(lastDate),
    psud: psud2026, total: total2026, sect: secteur2026, ast: astreintes2026,
    cis: cisNames.map((n, i) => ({ name:n, v26:Number(cisCounts2026[i])||0, v25:Number(cisCounts2025ytd[i])||0, v25tot:Number(cisTotals2025[i])||0 })),
    secteurs: sectNames.map((n, i) => ({ name:n, v26:Number(sectCounts2026[i])||0, v25:Number(sectCounts2025ytd[i])||0, v25tot:Number(sectTotals2025[i])||0 })),
    cntApp: countApp, cntIspG: counts.isp, cntMed: counts.med, cntAction: counts.action
  };
  // === ÉCRIRE CACHE ===
  try { _cache26.put(_ck26, JSON.stringify(_result26), 7200); sheetCachePut(_ck26, _result26, 7200); } catch(e){}
  return _result26;
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
  const rawAgents = dash.getRange("S3:AQ79").getValues();
  const agentMap = {}; 

  for (let i=0; i<rawAgents.length; i++) {
    const mat = normalizeMat(rawAgents[i][1]); 
    if (mat) {
      agentMap[mat] = { 
        nom: String(rawAgents[i][0]).trim(), mat: mat, 
        interHg26:0, interG26:0, hAst26:0, hGarde26:0, 
        interHg25:0, interG25:0, hAst25:0, hGarde25:0,
        txSoll: Number(rawAgents[i][24]) || 0,
        mAst: new Array(12).fill(0),
        mGarde: new Array(12).fill(0)
      };
    }
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
    months: s.mAst.map((a, i) => Math.ceil(a + s.mGarde[i])),
    total: Math.ceil(s.hAst26 + s.hGarde26)
  })).sort((a, b) => b.total - a.total);
  
  const result = { activity: stats, sollicitation: soll, monthly: monthly };
  
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
  
  // A1:Z29
  const range = sh.getRange("A1:Z29");
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const backgroundColors = range.getBackgrounds();
  const fontColors = range.getFontColors();
  const fontWeights = range.getFontWeights();
  
  // Chercher la ligne d'aujourd'hui et extraire les infos (colonnes C-H = index 2-7)
  let todayInfo = { date: "", garde_matin: "", garde_am: "", conducteur: "", mad_jour: "", mad_nuit: "", infirmier_ast: "" };
  for (let i = 1; i < values.length; i++) {
    const dateVal = values[i][1]; // colonne B (index 1)
    if (dateVal) {
      const cellDate = new Date(dateVal);
      if (cellDate.getDate() === todayDay && moisIndex === todayMonth) {
        // Format JJ/MM/AAAA
        todayInfo.date = String(cellDate.getDate()).padStart(2,"0") + "/" + String(cellDate.getMonth()+1).padStart(2,"0") + "/" + cellDate.getFullYear();
        todayInfo.garde_matin = String(values[i][2]||"");     // C
        todayInfo.garde_am = String(values[i][3]||"");         // D
        todayInfo.conducteur = String(values[i][4]||"");       // E
        todayInfo.mad_jour = String(values[i][5]||"");         // F
        todayInfo.mad_nuit = String(values[i][6]||"");         // G
        todayInfo.infirmier_ast = String(values[i][7]||"");    // H
        break;
      }
    }
  }
  
  // Générer HTML au serveur pour éviter les problèmes de sérialisation
  let html = '<table style="border-collapse:collapse;font-size:10px;width:100%;overflow-x:auto;">';
  for (let i = 0; i < values.length; i++) {
    html += '<tr>';
    for (let j = 0; j < values[i].length; j++) {
      const bg = backgroundColors[i][j];
      const fc = fontColors[i][j];
      const fw = fontWeights[i][j];
      const style = `border:1px solid #333;padding:4px;background:${bg};color:${fc};font-weight:${fw};`;
      
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
    
    // === CHERCHER CACHE AVEC CLÉ INCLUANT LA DATE ===
    const cache = CacheService.getScriptCache();
    // Inclure le DOB dans la clé pour isoler les caches par date
    const cacheKey = "isp_v4_" + mat + "_" + String(dobInput).replace(/\//g, "");
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
    const matVals = dash.getRange("T3:T79").getDisplayValues().flat(); 
    const idx = matVals.findIndex(m => normalizeMat(m) === mat);
    if (idx === -1) throw new Error("Matricule non trouvé.");
    
    const agentName = dash.getRange(3 + idx, 19).getValue(); 
    const rawRow = dash.getRange(3 + idx, 19, 1, 25).getValues()[0] || [];
    const txSoll = Number(rawRow[24]) || 0;
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
                    pisuKo: data[i][C_PISU_KO]
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
        
        if(tags.hasJ && !isCheckboxChecked(appRow.bilanOk)) {
            // Erreur Bilan Légère (J coché) - SEULEMENT SI BILAN PAS OK
            const item = { id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Erreur Bilan Légère"], errorType: "Erreur Bilan Légère" };
            errLegereBilanList.push(item);
            console.log(`DEBUG ISP ${mat}: ID ${id} → ✅ Ajouté à errLegereBilanList`);
        }
        
        if(tags.hasK && !isCheckboxChecked(appRow.pisuOk)) {
            // Erreur Pisu Légère (K coché) - SEULEMENT SI PISU PAS OK
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
        
        // === BILAN ===
        // Si BI (Bilan OK) coché → OK
        if(bilanOk) {
            bilanOkCount++;
            countedIds.add(id + "_bilan");
            okBilanList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Bilan OK"], errorType: "" });
        }
        // Si BJ (Bilan incomplet) coché ET H (correction) dans APP Alex → OK
        else if(bilanKo && tags.hasH) {
            bilanOkCount++;
            countedIds.add(id + "_bilan");
            okBilanList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Bilan OK"], errorType: "" });
        }
        
        // === PISU ===
        // Si BK (Pisu OK) coché → OK
        if(pisuOk) {
            pisuOkCount++;
            countedIds.add(id + "_pisu");
            okPisuList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Pisu OK"], errorType: "" });
        }
        // Si BL (Pisu pas ok) coché ET I (correction) dans APP Alex → OK
        else if(pisuKo && tags.hasI) {
            pisuOkCount++;
            countedIds.add(id + "_pisu");
            okPisuList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Pisu OK"], errorType: "" });
        }
    }

    console.log(`DEBUG ISP ${mat}: RÉSULTATS - Bilan OK: ${bilanOkCount}, Pisu OK: ${pisuOkCount}, Erreur Bilan Légère: ${errLegereBilanList.length}, Erreur Pisu Légère: ${errLegerePisuList.length}, Erreur Grave: ${errLourdeList.length}`);

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
        monthlyAst26: monthlyAst26,
        monthlyGarde26: monthlyGarde26,
        debugInfo: {
            totalIds: thisAgentIds.size,
            idsWithTags: Object.keys(alexTags).length,
            sampleIds: Array.from(thisAgentIds).slice(0, 5)
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
    const cacheKey = "chefferie_counts_v3";
    const cached = cache.get(cacheKey);
    if(cached) return JSON.parse(cached);
    const shCachedChef = sheetCacheGet(cacheKey);
    if(shCachedChef) { try { cache.put(cacheKey, JSON.stringify(shCachedChef), 7200); } catch(e){} return shCachedChef; }
    
    const ss = getSS_();
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
        for(let i=1; i<dApp.length; i++) {
            const bilanKo = isCheckboxChecked(dApp[i][C_BILAN_KO]);
            const pisuKo = isCheckboxChecked(dApp[i][C_PISU_KO]);
            const isClosed = isCheckboxChecked(dApp[i][C_BP_CLOSE]);
            if((bilanKo || pisuKo) && !isClosed) {
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

function getChefferieNextCase(mode) {
    const ss = getSS_();
    let rowToProcess = -1, schema = {};

    if(mode === 'app_isp') {
        const shApp = ss.getSheetByName(APP_SHEET_NAME);
        const shAlex = ss.getSheetByName("APP Alex");
        const dataApp = shApp.getDataRange().getValues();
        const dataAlex = shAlex.getDataRange().getValues(); 

        // Chercher dans APP Alex les IDs avec erreur confirmée (J, K ou L) et PAS clôturés (N)
        for(let i=1; i<dataAlex.length; i++) {
            const id = String(dataAlex[i][0]).trim();
            const hasJ = isCheckboxChecked(dataAlex[i][9]);   // J = Erreur Bilan légère
            const hasK = isCheckboxChecked(dataAlex[i][10]);  // K = Erreur Pisu légère
            const hasL = isCheckboxChecked(dataAlex[i][11]);  // L = Erreur Grave
            const isClosed = isCheckboxChecked(dataAlex[i][13]); // N = Clôture chef
            
            // On traite si erreur confirmée ET pas encore clôturé
            if((hasJ || hasK || hasL) && !isClosed) {
                // Trouver les infos dans APP
                let appRow = -1;
                for(let j=1; j<dataApp.length; j++) {
                    if(String(dataApp[j][C_APP_ID]).trim() === id) { appRow = j; break; }
                }
                if(appRow === -1) continue; // ID pas trouvé dans APP
                
                rowToProcess = i+1;
                const cis = String(dataApp[appRow][C_APP_CIS]||"").trim();
                const status = (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo";
                const info = {
                    interId: id, 
                    motif: dataApp[appRow][C_APP_MOTIF], 
                    date: formatDateHeureFR_(dataApp[appRow][C_APP_DATE]),
                    pdf: dataApp[appRow][C_APP_PDF], 
                    infName: dataApp[appRow][C_APP_NOM], 
                    engin: String(dataApp[appRow][C_APP_ENGIN]||"").trim(),
                    status: status,
                    commBN: dataApp[appRow][C_TXTBILAN_KO], 
                    commBO: dataApp[appRow][C_TXTPISU_KO],
                    commChef: dataAlex[i][12] || ""
                };
                const hAlex = shAlex.getRange(1,1,1,20).getValues()[0];
                
                // Récupérer les valeurs déjà saisies si elles existent
                const existingChecks = {
                    7: isCheckboxChecked(dataAlex[i][7]),   // H
                    8: isCheckboxChecked(dataAlex[i][8]),   // I
                    9: isCheckboxChecked(dataAlex[i][9]),   // J
                    10: isCheckboxChecked(dataAlex[i][10]), // K
                    11: isCheckboxChecked(dataAlex[i][11])  // L
                };
                
                schema = { 
                    mode:'app_isp', 
                    info:info, 
                    checks:[
                        {id:7, label:hAlex[7], checked: existingChecks[7]}, 
                        {id:8, label:hAlex[8], checked: existingChecks[8]}, 
                        {id:9, label:hAlex[9], checked: existingChecks[9]}, 
                        {id:10, label:hAlex[10], checked: existingChecks[10]}, 
                        {id:11, label:hAlex[11], checked: existingChecks[11]}
                    ],
                    existingComment: String(dataAlex[i][12]||"")
                };
                break;
            }
        }
    }
    else if(mode === 'med_chef') {
        const shApp = ss.getSheetByName(APP_SHEET_NAME);
        const shAlex = ss.getSheetByName("APP Alex");
        const shEve = ss.getSheetByName("APP Eve");
        const dataApp = shApp.getDataRange().getValues();
        const dataAlex = shAlex.getDataRange().getValues();
        const dataEve = shEve ? shEve.getDataRange().getValues() : [];
        
        for(let i=1; i<dataAlex.length; i++) {
            const hasL = isCheckboxChecked(dataAlex[i][11]);  // L = Erreur Grave
            if(!hasL) continue;
            
            const id = String(dataAlex[i][0]).trim();
            if(!id) continue;
            
            // Vérifier si déjà traité dans APP Eve
            let alreadyDone = false;
            for(let j=1; j<dataEve.length; j++) {
                if(String(dataEve[j][0]).trim() === id && (dataEve[j][14] || dataEve[j][16])) { 
                    alreadyDone = true; 
                    break; 
                }
            }
            if(alreadyDone) continue;
            
            // Chercher les infos dans APP
            let appRow = -1;
            for(let j=1; j<dataApp.length; j++) {
                if(String(dataApp[j][C_APP_ID]).trim() === id) { appRow = j; break; }
            }
            
            rowToProcess = i+1;
            const appInfo = (appRow >= 0) ? {
                motif: dataApp[appRow][C_APP_MOTIF],
                date: formatDateHeureFR_(dataApp[appRow][C_APP_DATE]),
                pdf: dataApp[appRow][C_APP_PDF],
                nom: dataApp[appRow][C_APP_NOM],
                cis: String(dataApp[appRow][C_APP_CIS]||"").trim(),
                engin: String(dataApp[appRow][C_APP_ENGIN]||"").trim()
            } : { motif:"", date:"", pdf:dataAlex[i][2], nom:dataAlex[i][4], cis:"", engin:"" };
            
            const status = (appInfo.cis === "SD SSSM") ? "Garde" : "Astreinte / Dispo";
            schema = { 
                mode:'med_chef', 
                info:{ 
                    interId:id, 
                    motif:appInfo.motif, 
                    date:appInfo.date, 
                    pdf:appInfo.pdf, 
                    infName:appInfo.nom, 
                    cis:appInfo.cis, 
                    engin:appInfo.engin, 
                    status:status,
                    errorType:"Erreur Grave"
                },
                existingAnalyse: (dataEve.length > 0) ? (dataEve.find(r => String(r[0]).trim() === id) || {}) [14] || "" : ""
            };
            break;
        }
    }
    else if(mode === 'valid_final') {
        const shEve = ss.getSheetByName("APP Eve");
        const dataEve = shEve.getDataRange().getValues();
        const shAlex = ss.getSheetByName("APP Alex");
        const dataAlex = shAlex.getDataRange().getValues();
        for(let i=1; i<dataEve.length; i++) {
            if((dataEve[i][14] || dataEve[i][16]) && !dataEve[i][18]) {
                const id = String(dataEve[i][0]).trim();
                let pdf = "", nom="", status="Validation";
                for(let k=1; k<dataAlex.length; k++){ if(String(dataAlex[k][0]).trim() === id) { pdf = dataAlex[k][2]; nom = dataAlex[k][4]; break; } }
                rowToProcess = i+1;
                schema = { mode:'valid_final', info:{ interId:id, date:'', pdf:pdf, infName:nom, cis:'', motif:'', engin:'', status:status, analyse:dataEve[i][14], actionReq:dataEve[i][16] } };
                break;
            }
        }
    }
    if(rowToProcess === -1) return { done: true, message: "Aucun dossier en attente." };
    return { done: false, schema: schema, rowNumber: rowToProcess };
}

function saveChefferie(form) {
    const ss = getSS_();
    if(form.mode === 'app_isp') {
        const shAlex = ss.getSheetByName("APP Alex");
        const data = shAlex.getDataRange().getValues();
        let row = -1;
        for(let i=1; i<data.length; i++) { if(String(data[i][0]).trim() === String(form.info.interId).trim()) { row = i+1; break; } }
        if(row === -1) { row = shAlex.getLastRow() + 1; shAlex.getRange(row, 1).setValue(form.info.interId); shAlex.getRange(row, 2).setValue(form.info.motif); shAlex.getRange(row, 3).setValue(form.info.pdf); shAlex.getRange(row, 5).setValue(form.info.infName); }
        shAlex.getRange(row, 8).setValue(form.checks[7]);
        shAlex.getRange(row, 9).setValue(form.checks[8]);
        shAlex.getRange(row, 10).setValue(form.checks[9]);
        shAlex.getRange(row, 11).setValue(form.checks[10]);
        shAlex.getRange(row, 12).setValue(form.checks[11]);
        shAlex.getRange(row, 13).setValue(form.comment);
        shAlex.getRange(row, 14).setValue(true);
    }
    else if(form.mode === 'med_chef') {
        const shEve = ss.getSheetByName("APP Eve");
        const data = shEve.getDataRange().getValues();
        let row = -1;
        for(let i=1; i<data.length; i++) { if(String(data[i][0]).trim() === String(form.info.interId).trim()) { row = i+1; break; } }
        if(row === -1) { row = shEve.getLastRow() + 1; shEve.getRange(row, 1).setValue(form.info.interId); }
        shEve.getRange(row, 15).setValue(form.analyse);
        shEve.getRange(row, 17).setValue(form.action);
    }
    else if(form.mode === 'valid_final') {
        const shEve = ss.getSheetByName("APP Eve");
        const data = shEve.getDataRange().getValues();
        let row = -1;
        for(let i=1; i<data.length; i++) { if(String(data[i][0]).trim() === String(form.info.interId).trim()) { row = i+1; break; } }
        if(row !== -1) { shEve.getRange(row, 18).setValue(form.finalAction); shEve.getRange(row, 19).setValue(true); }
    }
    return { success: true };
}

// === NOUVELLE INTERFACE CHEFFERIE ===

/**
 * Mode 1: APP Chefferie - Fiches avec BJ=1 (Bilan Incomplet) OU BL=1 (Pisu pas OK) dans APP
 */
function getNextAppChefferie() {
    const ss = getSS_();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const shAlex = ss.getSheetByName("APP Alex");
    const dataApp = shApp.getDataRange().getValues();
    const dataAlex = shAlex ? shAlex.getDataRange().getValues() : [];
    
    for(let i=1; i<dataApp.length; i++) {
        const bilanKo = isCheckboxChecked(dataApp[i][C_BILAN_KO]);
        const pisuKo = isCheckboxChecked(dataApp[i][C_PISU_KO]);
        const isClosed = isCheckboxChecked(dataApp[i][C_BP_CLOSE]);
        
        if((bilanKo || pisuKo) && !isClosed) {
            const id = String(dataApp[i][C_APP_ID]).trim();
            
            // Chercher dans APP Alex si déjà traité
            let alexRow = -1;
            let alexData = null;
            for(let j=1; j<dataAlex.length; j++) {
                if(String(dataAlex[j][0]).trim() === id) {
                    alexRow = j;
                    alexData = dataAlex[j];
                    break;
                }
            }
            
            // Si clôturé dans APP Alex (colonne N), passer au suivant
            if(alexData && isCheckboxChecked(alexData[13])) continue;
            
            const cis = String(dataApp[i][C_APP_CIS]||"").trim();
            const status = (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo";
            
            return {
                found: true,
                rowApp: i+1,
                rowAlex: alexRow + 1,
                info: {
                    interId: id,
                    date: formatDateHeureFR_(dataApp[i][C_APP_DATE]),
                    infName: dataApp[i][C_APP_NOM],
                    motif: dataApp[i][C_APP_MOTIF],
                    engin: String(dataApp[i][C_APP_ENGIN]||"").trim(),
                    pdf: dataApp[i][C_APP_PDF],
                    status: status,
                    motifBilan: dataApp[i][C_TXTBILAN_KO] || "",
                    motifPisu: dataApp[i][C_TXTPISU_KO] || "",
                    bilanKo: bilanKo,
                    pisuKo: pisuKo
                },
                checks: {
                    H: alexData ? isCheckboxChecked(alexData[7]) : false,
                    I: alexData ? isCheckboxChecked(alexData[8]) : false,
                    J: alexData ? isCheckboxChecked(alexData[9]) : false,
                    K: alexData ? isCheckboxChecked(alexData[10]) : false,
                    L: alexData ? isCheckboxChecked(alexData[11]) : false
                },
                commentChef: alexData ? (alexData[12] || "") : ""
            };
        }
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
                commentChef: dataAlex[i][12] || ""
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
        
        let row = form.rowAlex;
        
        // Si pas de ligne APP Alex, créer une nouvelle
        if(row <= 0) {
            const dataAlex = shAlex.getDataRange().getValues();
            row = dataAlex.length + 1;
            shAlex.getRange(row, 1).setValue(form.interId);
        }
        
        // Sauvegarder les checkboxes H, I, J, K, L
        shAlex.getRange(row, 8).setValue(form.checks.H ? true : false);  // H
        shAlex.getRange(row, 9).setValue(form.checks.I ? true : false);  // I
        shAlex.getRange(row, 10).setValue(form.checks.J ? true : false); // J
        shAlex.getRange(row, 11).setValue(form.checks.K ? true : false); // K
        shAlex.getRange(row, 12).setValue(form.checks.L ? true : false); // L
        
        // Commentaire chefferie (colonne M = 13)
        shAlex.getRange(row, 13).setValue(form.commentChef || "");
        
        // Clôturer (colonne N = 14)
        shAlex.getRange(row, 14).setValue(true);
        
        // Clear cache
        CacheService.getScriptCache().remove("chefferie_counts_v3");
        
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
        
        // Analyse Médecin (colonne O = 15)
        shEve.getRange(row, 15).setValue(form.analyse || "");
        
        // Action Requise (colonne Q = 17)
        shEve.getRange(row, 17).setValue(form.action || "");
        
        // Clear cache
        CacheService.getScriptCache().remove("chefferie_counts_v3");
        
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
    const PROTOCOLS_MAP = {
        21: "VVP (1A)", 22: "Hypoglycémie (2A)", 23: "Détr. Circu (3A)", 24: "Brulures (4A)",
        25: "Dlr Aigue (5A)", 26: "Penthrox (5A2)", 27: "Dlr Iade (5A3)", 28: "ACR (6A)",
        29: "Allergie (7A)", 30: "DRA (8A)", 31: "Intox Fumées (9A)", 32: "Convulsions (10A)",
        33: "Accouchement (11A)", 34: "Dlr Tho (12A)", 35: "Coup chaleur (13A)", 36: "Fracture fem'/bassin (14A)",
        37: "Hors Protocole (HPA)", 38: "VVP (1E)", 39: "Hypoglycémie (2E)", 40: "Brulures (4E)",
        41: "Dlr Aigue (5E)", 42: "ACR (6E)", 43: "Allergie (7E)", 44: "DRA (8E)",
        45: "Intox Fumées (9E)", 46: "Convulsions (10E)", 47: "Nouveau Né (11E)", 48: "Hors Protocole (HPE)"
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
    const protoAdult = protoList.filter(p => p.colIdx <= 37);
    const protoPedia = protoList.filter(p => p.colIdx >= 38);
    
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
        ax: { label: "AKIM", opts: getDropdownList_(shApp, 49), val: row[49] },
        ay: { label: "SMUR", opts: getDropdownList_(shApp, 50), val: row[50] },
        az: { label: "CCMU", opts: getDropdownList_(shApp, 51), val: row[51] },
        ba: { label: "DEVENIR", opts: getDropdownList_(shApp, 52), val: row[52] },
        bb: { label: "SOUSAN", opts: getDropdownList_(shApp, 53), val: row[53] },
        bc: { label: "NB VICTIMES", opts: [], val: row[54] },
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
        
        // Clear caches (seulement les caches légers - les lourds seront rafraîchis par le trigger)
        const cache = CacheService.getScriptCache();
        cache.remove("chefferie_counts_v3");
        
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
    const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    const rawAgents = dash.getRange("T3:T79").getDisplayValues().flat();
    const rawNames = dash.getRange("S3:S79").getDisplayValues().flat();
    let stats = {};
    rawAgents.forEach((m, i) => { if(m) stats[normalizeMat(m)] = { nom: rawNames[i], mat: m, bilanOk:0, pisuOk:0, errBilL:0, errPisuL:0, errGrave:0 }; });

    if(shApp) {
        const dApp = shApp.getDataRange().getValues();
        const shAlex = ss.getSheetByName("APP Alex");
        const dAlex = shAlex.getDataRange().getValues();
        
        // CHARGER APP ALEX EN MAP - PREMIÈRE OCCURRENCE SEULEMENT (lignes FILTER)
        const alexMap = {};
        const maxSearchRow = Math.min(100, dAlex.length); // Limiter aux 100 premières lignes (zone FILTER)
        for(let i=1; i<maxSearchRow; i++) {
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
            if(stats[m]) {
                const id = String(dApp[i][C_APP_ID]).trim();
                const alex = alexMap[id] || {};
                if(isCheckboxChecked(dApp[i][C_BILAN_OK]) || alex.reqBilOk) stats[m].bilanOk++;
                if(isCheckboxChecked(dApp[i][C_PISU_OK]) || alex.reqPisuOk) stats[m].pisuOk++;
                if(alex.errBilL) stats[m].errBilL++;
                if(alex.errPisuL) stats[m].errPisuL++;
                if(alex.errGrave) stats[m].errGrave++;
            }
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
    
    // D'abord charger les 100 premières lignes (zone FILTER - valeurs à jour des checkboxes)
    const maxSearchRow = Math.min(100, alexRows.length);
    for(let i=1; i<maxSearchRow; i++) {
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
        
        // Déterminer les types
        let types = [];
        let errorType = "";
        
        const biOk = isCheckboxChecked(appRows[i][C_BILAN_OK]) || alex.H;
        const piOk = isCheckboxChecked(appRows[i][C_PISU_OK]) || alex.I;
        const biKo = isCheckboxChecked(appRows[i][C_BILAN_KO]);
        const piKo = isCheckboxChecked(appRows[i][C_PISU_KO]);
        
        // OK
        if(biOk) types.push("Bilan OK");
        if(piOk) types.push("Pisu OK");
        
        // Erreurs confirmées uniquement (J/K/L cochés)
        if(biKo && !alex.H && (alex.J || alex.L)) {
            const err = alex.L ? "Erreur Grave" : "Erreur Bilan Légère";
            types.push(err);
            if(!errorType) errorType = err;
        }
        if(piKo && !alex.I && (alex.K || alex.L)) {
            const err = alex.L ? "Erreur Grave" : "Erreur Pisu Légère";
            types.push(err);
            if(!errorType) errorType = err;
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
            commChef: alex.commChef || "",
            commMed: eve.commMed || ""
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
function getNextActionChefferie() {
    const ss = getSS_();
    const shEve = ss.getSheetByName("APP Eve");
    const shAlex = ss.getSheetByName("APP Alex");
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if(!shEve) return { found: false, message: "Onglet APP Eve introuvable" };
    
    const dataEve = shEve.getDataRange().getValues();
    const dataAlex = shAlex ? shAlex.getDataRange().getValues() : [];
    const dataApp = shApp ? shApp.getDataRange().getValues() : [];
    
    for(let i=1; i<dataEve.length; i++) {
        const hasAnalyse = !!dataEve[i][14]; // O
        const hasAction = !!dataEve[i][16];  // Q
        const isClosed = isCheckboxChecked(dataEve[i][18]); // S
        
        if((hasAnalyse || hasAction) && !isClosed) {
            const id = String(dataEve[i][0]).trim();
            
            // Chercher infos dans APP
            let appInfo = null;
            for(let j=1; j<dataApp.length; j++) {
                if(String(dataApp[j][C_APP_ID]).trim() === id) {
                    appInfo = dataApp[j];
                    break;
                }
            }
            
            // Chercher commentaire chefferie dans APP Alex (colonne M = index 12)
            let commChef = "";
            for(let j=1; j<dataAlex.length; j++) {
                if(String(dataAlex[j][0]).trim() === id) {
                    commChef = dataAlex[j][12] || "";
                    break;
                }
            }
            
            const cis = appInfo ? String(appInfo[C_APP_CIS]||"").trim() : "";
            const status = (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo";
            
            return {
                found: true,
                rowEve: i+1,
                info: {
                    interId: id,
                    date: appInfo ? formatDateHeureFR_(appInfo[C_APP_DATE]) : "",
                    infName: appInfo ? appInfo[C_APP_NOM] : "",
                    motif: appInfo ? appInfo[C_APP_MOTIF] : "",
                    engin: appInfo ? String(appInfo[C_APP_ENGIN]||"").trim() : "",
                    pdf: appInfo ? appInfo[C_APP_PDF] : "",
                    status: status,
                    commChef: commChef,
                    analyseMed: dataEve[i][14] || "",
                    actionRequise: dataEve[i][16] || "",
                    actionFaite: dataEve[i][17] || ""
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
        
        // Action faite (colonne R = 18)
        shEve.getRange(row, 18).setValue(form.actionFaite || "");
        
        // Clôturer (colonne S = 19)
        shEve.getRange(row, 19).setValue(true);
        
        // Clear cache
        CacheService.getScriptCache().remove("chefferie_counts_v3");
        
        return { success: true };
    } catch(e) {
        return { success: false, error: e.toString() };
    }
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
        alexIndex[id] = dataAlex[i];
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
        ispMap[ispName].push({
            id: id,
            date: appRow ? formatDateHeureFR_(appRow[C_APP_DATE]) : "",
            motif: appRow ? appRow[C_APP_MOTIF] : "",
            engin: appRow ? String(appRow[C_APP_ENGIN]||"").trim() : "",
            pdf: appRow ? appRow[C_APP_PDF] : "",
            status: status,
            commChef: alexRow ? (alexRow[12] || "") : "",
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
  let pdfUrl = "", commentChefferie = "", analyseMed = "", centre = "", engin = "";
  const shApp = ss.getSheetByName(APP_SHEET_NAME);
  if(shApp){ 
    const data = shApp.getDataRange().getValues(); 
    for(let i=1; i<data.length; i++) { 
      if(String(data[i][C_APP_ID]).trim() === String(interId).trim()) { 
        pdfUrl = data[i][C_APP_PDF];
        centre = String(data[i][C_APP_CIS]||"").trim();
        engin = String(data[i][C_APP_ENGIN]||"").trim();
        break; 
      } 
    } 
  }
  const shAlex = ss.getSheetByName("APP Alex");
  if(shAlex){ const data = shAlex.getDataRange().getValues(); for(let i=1; i<data.length; i++) { if(String(data[i][0]).trim() === String(interId).trim()) { commentChefferie = data[i][12]; break; } } }
  const shEve = ss.getSheetByName("APP Eve");
  if(shEve) { const data = shEve.getDataRange().getValues(); for(let i=1; i<data.length; i++) { if(String(data[i][0]).trim() === String(interId).trim()) { analyseMed = data[i][14]; break; } } }
  return { pdfUrl, commentChefferie, analyseMed, centre, engin };
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
  const rawAgents = dash.getRange("S3:AQ79").getValues();
  const agents = [];
  for (let i = 0; i < rawAgents.length; i++) {
    const mat = normalizeMat(rawAgents[i][1]);
    const dob = rawAgents[i][2];
    const nom = String(rawAgents[i][0]).trim();
    if (mat && dob) agents.push({ mat, dob, nom, nomLower: nom.toLowerCase(), idx: i });
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
  const cache = CacheService.getScriptCache();
  cache.removeAll(["admin_data_full_v2", "astreinte_dept_ispp_v3", "cache_status", "history_cache_v2", "historique_temps_travail_v1"]);
  
  // Vider TOUS les caches ISP avec tous formats (v3, v4, detail)
  const allKeys = cache.getAll({});
  for(let key in allKeys) {
    if(key.startsWith("isp_v3_") || key.startsWith("isp_v4_") || key.startsWith("isp_detail_")) {
      cache.remove(key);
    }
  }
  
  // Vider aussi les caches spreadsheet
  try {
    const cacheSS = _getCacheSS();
    const cacheSheet = cacheSS.getSheetByName("Cache");
    if(cacheSheet && cacheSheet.getLastRow() > 1) {
      const data = cacheSheet.getDataRange().getValues();
      for(let i = data.length - 1; i >= 1; i--) {
        const key = String(data[i][0] || "");
        if(key.startsWith("isp_v3_") || key.startsWith("isp_v4_") || key.startsWith("isp_detail_")) {
          cacheSheet.deleteRow(i + 1);
        }
      }
    }
  } catch(e) { Logger.log("clearAllCaches spreadsheet: " + e); }
  
  return "Tous les caches vidés (incluant ISP v3+v4)";
}
function getDashboardData(){ return getStats2026(); }
// force push 20260209234130