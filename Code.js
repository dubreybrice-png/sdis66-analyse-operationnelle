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
const C_PROTO_START = 22;  // V = 22 (0-indexed)
const C_PROTO_END = 49;    // AW = 49 (0-indexed)
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
const C_BM_SURV_TRANSPORT = 64; // Absence de traçabilité de la surveillance pendant le transport (checkbox)
const C_TXTBILAN_KO = 65;   // BN: Motif bilan incomplet (texte)
const C_TXTPISU_KO = 66;    // BO: Motif pisu pas ok (texte)
const C_BP_CLOSE = 67;      // BP: Case clôturée (ne plus afficher dans APP) 
const C_BS_PROBLEM = 70; // Signaler problème à Brice (checkbox)
const C_BT_PROBLEM_TXT = 71; // Texte du problème pour Brice
const C_BU_LOCK = 72; // Timestamp de verrouillage pour éviter doublons     

// === HELPER FUNCTIONS ===
function isCheckboxChecked(val) {
  // Google Sheets checkboxes can return: true (boolean), "TRUE" (string), "✓" (checkmark), or other truthy values
  if(!val) return false;
  return val === true || String(val).toUpperCase() === "TRUE" || val === "✓";
}

function onOpen() { 
  SpreadsheetApp.getUi().createMenu('⚡ ADMIN').addItem('Mettre à jour Cache', 'updateHistoryCache').addToUi(); 
}

function doGet(e) {
  const t = HtmlService.createTemplateFromFile("Home");
  t.scriptUrl = ScriptApp.getService().getUrl();
  return t.evaluate().setTitle("SDIS 66 - SDS").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSS_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function getDropdownList_(sheet, colIndex) { const rule = sheet.getRange(2, colIndex + 1).getDataValidation(); return rule ? rule.getCriteriaValues()[0] : []; }

/* --- 1. STATS 2026 (RAPIDE) --- */
function getStats2026() {
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

  return {
    date: formatDateFR_(lastDate),
    psud: psud2026, total: total2026, sect: secteur2026, ast: astreintes2026,
    cis: cisNames.map((n, i) => ({ name:n, v26:Number(cisCounts2026[i])||0, v25:Number(cisCounts2025ytd[i])||0, v25tot:Number(cisTotals2025[i])||0 })),
    secteurs: sectNames.map((n, i) => ({ name:n, v26:Number(sectCounts2026[i])||0, v25:Number(sectCounts2025ytd[i])||0, v25tot:Number(sectTotals2025[i])||0 })),
    cntApp: countApp, cntIspG: counts.isp, cntIspR: counts.med
  };
}

/* --- 2. STATS 2025 (CACHE) --- */
function getStats2025() {
  const cache = CacheService.getScriptCache();
  const now = new Date();
  const cacheKey = "stats2025_vFinal_" + now.getDate(); 
  const cached = cache.get(cacheKey);
  
  if (cached) { return JSON.parse(cached); }

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
  cache.put(cacheKey, JSON.stringify(result), 21600);
  return result;
}

/* === CACHE SÉQUENTIEL === */
function preCacheAllData() {
  const cache = CacheService.getScriptCache();
  
  function getTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  }
  
  console.log("=== DÉBUT MISE EN CACHE SÉQUENTIEL ===");
  
  try {
    // 1. ISP Stats globales
    cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: EN COURS`, 21600);
    getAllIspErrorStats();
    const ispTime = getTime();
    console.log("Cache ISP Stats terminé: " + ispTime);
    
    // 2. Pré-charger les données ISP individuelles pour tous les agents
    cache.put("cache_status", `Synthèse: ${ispTime} | Pré-chargement ISP agents: EN COURS`, 21600);
    const ss = getSS_();
    const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    const rawAgents = dash.getRange("S3:AQ79").getValues();
    let agentCount = 0;
    
    for (let i = 0; i < rawAgents.length; i++) {
      const mat = normalizeMat(rawAgents[i][1]);
      const dob = rawAgents[i][2]; // Colonne date de naissance
      if (mat && dob) {
        try {
          getIspStats(mat, dob); // Force le calcul et mise en cache
          agentCount++;
        } catch(e) {
          console.log(`Erreur pré-cache ISP pour ${mat}: ${e}`);
        }
      }
    }
    const ispAgentTime = getTime();
    console.log(`Cache ISP agents terminé (${agentCount} agents): ${ispAgentTime}`);
    
    // 3. Admin Data
    cache.put("cache_status", `Synthèse: ${ispTime} | ISP agents (${agentCount}): ${ispAgentTime} | Administration: EN COURS`, 21600);
    getAdminData("0007");
    const adminTime = getTime();
    console.log("Cache Admin terminé: " + adminTime);
    
    // 4. Chefferie Counts
    cache.put("cache_status", `Synthèse: ${ispTime} | ISP agents: ${ispAgentTime} | Administration: ${adminTime} | Accès APP: EN COURS`, 21600);
    getChefferieCounts();
    const appTime = getTime();
    console.log("Cache APP terminé: " + appTime);
    
    // 5. Chefferie ISP
    cache.put("cache_status", `Synthèse: ${ispTime} | ISP agents: ${ispAgentTime} | Administration: ${adminTime} | Accès APP: ${appTime} | Accès chefferie ISP: EN COURS`, 21600);
    getChefferieNextCase('app_isp');
    const chefTime = getTime();
    console.log("Cache Chefferie ISP terminé: " + chefTime);
    
    // 6. Médecin Chef
    cache.put("cache_status", `Synthèse: ${ispTime} | ISP agents: ${ispAgentTime} | Administration: ${adminTime} | Accès APP: ${appTime} | Accès chefferie ISP: ${chefTime} | Accès médecin chef: EN COURS`, 21600);
    getChefferieNextCase('med_chef');
    const medTime = getTime();
    console.log("Cache Médecin Chef terminé: " + medTime);
    
    // Statut final
    cache.put("cache_status", `✅ Terminé - Synthèse: ${ispTime} | ISP agents (${agentCount}): ${ispAgentTime} | Admin: ${adminTime} | APP: ${appTime} | Chef ISP: ${chefTime} | Med: ${medTime}`, 21600);
    console.log("=== MISE EN CACHE TERMINÉE ===");
    
  } catch(e) {
    console.log("Erreur dans preCacheAllData: " + e.toString());
    cache.put("cache_status", `Erreur: ${e.toString()}`, 21600);
  }
}

function getCacheStatus() {
  const cache = CacheService.getScriptCache();
  return cache.get("cache_status") || "";
}

function clearIspCache(mat) {
  const cache = CacheService.getScriptCache();
  const normalizedMat = normalizeMat(mat);
  cache.remove("isp_v2_" + normalizedMat); // Cache de getIspStats (v2)
  cache.remove("isp_detail_" + normalizedMat); // Cache de getIspDetailsAdmin
  return true;
}

/* --- ADMIN --- */
function getAdminData(password) {
  if (password && String(password).trim() !== "0007") throw new Error("Mot de passe incorrect.");
  
  // === CHERCHER CACHE ===
  const cache = CacheService.getScriptCache();
  const adminCached = cache.get("admin_data_full");
  if(adminCached) {
    const result = JSON.parse(adminCached);
    result.fromCache = true;
    return result;
  }
  
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
        txSoll: Number(rawAgents[i][24]) || 0 
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
      if (matAst && agentMap[matAst]) agentMap[matAst].hAst26 += 0.5;
      if (matGarde && agentMap[matGarde]) agentMap[matGarde].hGarde26 += 0.5;
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
  
  const result = { activity: stats, sollicitation: soll };
  
  // === METTRE EN CACHE ===
  cache.put("admin_data_full", JSON.stringify(result), 21600);
  
  return result;
}

/* --- ISP DATA --- */
function getIspStats(matriculeInput, dobInput) {
  try {
    const mat = normalizeMat(matriculeInput);
    
    // === CHERCHER CACHE D'ABORD ===
    const cache = CacheService.getScriptCache();
    const cacheKey = "isp_v2_" + mat;
    const cached = cache.get(cacheKey);
    if(cached) {
        const result = JSON.parse(cached);
        result.fromCache = true;
        return result;
    }
    
    const ss = getSS_();
    const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    const matVals = dash.getRange("T3:T79").getDisplayValues().flat(); 
    const idx = matVals.findIndex(m => normalizeMat(m) === mat);
    if (idx === -1) throw new Error("Matricule non trouvé.");
    if(!checkAuth_(mat, dobInput)) throw new Error("Date de naissance incorrecte.");
    
    const agentName = dash.getRange(3 + idx, 19).getValue(); 
    const myName = String(agentName).trim().toLowerCase();

    // 2026
    let hAst26=0, hGarde26=0, interHg26=0, inter26=0;
    let bilanConf=0, pisuConf=0;
    const shTemps = ss.getSheetByName(TEMPS_SHEET_NAME);
    if(shTemps) {
        const data = shTemps.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            if(normalizeMat(data[i][C_TEMPS_MAT_AST]) === mat) hAst26 += 0.5;
            if(normalizeMat(data[i][C_TEMPS_MAT_GARDE]) === mat) hGarde26 += 0.5;
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
        
        if(tags.hasJ) {
            // Erreur Bilan Légère (J coché)
            const item = { id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Erreur Bilan Légère"], errorType: "Erreur Bilan Légère" };
            errLegereBilanList.push(item);
            console.log(`DEBUG ISP ${mat}: ID ${id} → ✅ Ajouté à errLegereBilanList`);
        }
        
        if(tags.hasK) {
            // Erreur Pisu Légère (K coché)
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
        bilanConf, pisuConf,
        bilanOkCount: bilanOkCount,
        pisuOkCount: pisuOkCount,
        okBilanList: okBilanList,
        okPisuList: okPisuList,
        errLegereBilan: errLegereBilanList,
        errLegerePisu: errLegerePisuList,
        errLourde: errLourdeList,
        debugInfo: {
            totalIds: thisAgentIds.size,
            idsWithTags: Object.keys(alexTags).length,
            sampleIds: Array.from(thisAgentIds).slice(0, 5)
        }
    };
    
    cache.put(cacheKey, JSON.stringify(result), 3600); // Cache 1h - données ISP individuelles
    result.fromCache = false;
    
    return result;
  } catch(e) { return { error: e.message }; }
}

/* --- CHEFFERIE --- */
function getChefferieCounts() {
    const cache = CacheService.getScriptCache();
    const cacheKey = "chefferie_counts_v2";
    const cached = cache.get(cacheKey);
    if(cached) return JSON.parse(cached);
    
    const ss = getSS_();
    let isp = 0, med = 0;
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
    } catch(e) {}
    
    const result = { isp, med };
    cache.put(cacheKey, JSON.stringify(result), 60);
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
        CacheService.getScriptCache().remove("chefferie_counts_v2");
        
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
        CacheService.getScriptCache().remove("chefferie_counts_v2");
        
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
        22: "VVP (1A)", 23: "Hypoglycémie (2A)", 24: "Détr. Circu (3A)", 25: "Brulures (4A)",
        26: "Dlr Aigue (5A)", 27: "Penthrox (5A2)", 28: "Dlr Iade (5A3)", 29: "ACR (6A)",
        30: "Allergie (7A)", 31: "DRA (8A)", 32: "Intox Fumées (9A)", 33: "Convulsions (10A)",
        34: "Accouchement (11A)", 35: "Dlr Tho (12A)", 36: "Coup chaleur (13A)", 37: "Fracture fem'/bassin (14A)",
        38: "Hors Protocole (HPA)", 39: "VVP (1E)", 40: "Hypoglycémie (2E)", 41: "Brulures (4E)",
        42: "Dlr Aigue (5E)", 43: "ACR (6E)", 44: "Allergie (7E)", 45: "DRA (8E)",
        46: "Intox Fumées (9E)", 47: "Convulsions (10E)", 48: "Nouveau Né (11E)", 49: "Hors Protocole (HPE)"
    };
    
    // Construire la liste des protocoles depuis colonnes V à AW
    const protoList = [];
    for(let colIdx = C_PROTO_START; colIdx <= C_PROTO_END; colIdx++) {
        const label = PROTOCOLS_MAP[colIdx] || "";
        if(label) {
            // Charger l'état réel de la case depuis la feuille
            const isChecked = row[colIdx] === true || row[colIdx] === "TRUE";
            protoList.push({ 
                colIdx: colIdx, 
                label: label, 
                checked: isChecked 
            });
        }
    }
    
    // Séparer adultes (V-AL = 22-38) et pédiatriques (AM-AW = 39-49)
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
        ax: { label: "AKIM", opts: getDropdownList_(shApp, 49), val: row[49] },
        ay: { label: "SMUR", opts: getDropdownList_(shApp, 50), val: row[50] },
        az: { label: "CCMU", opts: getDropdownList_(shApp, 51), val: row[51] },
        ba: { label: "DEVENIR", opts: getDropdownList_(shApp, 52), val: row[52] },
        bb: { label: "SOUSAN", opts: getDropdownList_(shApp, 53), val: row[53] },
        bc: { label: "NB VICTIMES", opts: [], val: row[54] },
        bg: { label: "Examen clinique", opts: getDropdownList_(shApp, C_BG_EXAM), val: row[C_BG_EXAM] }
    };
    
    const resultats = {
        bh: { label: "Absence / erreur commande PUI", checked: isCheckboxChecked(row[C_BH_ABS]) },
        checksBiBm: [
            { id: "bm", label: "Absence traçabilité surveillance transport", checked: isCheckboxChecked(row[C_BM_SURV_TRANSPORT]), color: "" },
            { id: "bi", label: "Bilan OK", checked: isCheckboxChecked(row[C_BILAN_OK]), color: "ok" },
            { id: "bk", label: "Pisu OK", checked: isCheckboxChecked(row[C_PISU_OK]), color: "ok" },
            { id: "bj", label: "Bilan incomplet", checked: isCheckboxChecked(row[C_BILAN_KO]), color: "orange" },
            { id: "bl", label: "Pisu pas ok", checked: isCheckboxChecked(row[C_PISU_KO]), color: "orange" }
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
        
        // Protocoles
        Object.keys(form.checks).forEach(colIdxStr => {
            const colIdx = parseInt(colIdxStr);
            updates.push([row, colIdx + 1, form.checks[colIdxStr] ? true : false]);
        });
        
        // Critères
        updates.push([row, C_AKIM + 1, form.criteres.ax]);
        updates.push([row, C_SMUR + 1, form.criteres.ay]);
        updates.push([row, C_CCMU + 1, form.criteres.az]);
        updates.push([row, C_DEVENIR + 1, form.criteres.ba]);
        updates.push([row, C_SOUSAN + 1, form.criteres.bb]);
        updates.push([row, C_NBVICTIMES + 1, form.criteres.bc]);
        
        // Résultats
        updates.push([row, C_BG_EXAM + 1, form.resultats.bg]);
        updates.push([row, C_BH_ABS + 1, form.resultats.bh ? true : false]);
        updates.push([row, C_BILAN_OK + 1, form.resultats.bi ? true : false]);
        updates.push([row, C_BILAN_KO + 1, form.resultats.bj ? true : false]);
        updates.push([row, C_PISU_OK + 1, form.resultats.bk ? true : false]);
        updates.push([row, C_PISU_KO + 1, form.resultats.bl ? true : false]);
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
        
        // Clear cache
        CacheService.getScriptCache().remove("chefferie_counts_v2");
        
        return { success: true };
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
    cache.put(cacheKey, JSON.stringify(result), 60); // Cache 60s - données ISP changent souvent
    return result;
}

function getIspDetailsAdmin(mat) {
    const cache = CacheService.getScriptCache();
    const cacheKey = "isp_detail_" + normalizeMat(mat);
    const cached = cache.get(cacheKey);
    if(cached) return JSON.parse(cached);
    
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
    
    cache.put(cacheKey, JSON.stringify(list), 21600);
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
        CacheService.getScriptCache().remove("chefferie_counts_v2");
        
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
function checkAuth_(m, d) { if(d==="admin_override") return true; try { const s = SpreadsheetApp.openById(ID_SS_RH).getSheets()[0]; const data = s.getDataRange().getDisplayValues(); return data.some(r => normalizeMat(r[0]) === normalizeMat(m) && r[1].includes(String(d).substring(0,5))); } catch(e) { return true; } }
function coerceToDate_(v){if(!v)return null;if(Object.prototype.toString.call(v)==="[object Date]")return v;let m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?new Date(m[3],m[2]-1,m[1]):null;}
function coerceToDateTime_(v){if(!v)return null;if(Object.prototype.toString.call(v)==="[object Date]")return v;const s=String(v).trim();let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2})[:\/](\d{2})(?:[:\/](\d{2}))?)?$/);if(m)return new Date(m[3],m[2]-1,m[1],m[4]||0,m[5]||0);return coerceToDate_(v);}
function formatDateFR_(d){return d?`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`:"";}
function formatDateHeureFR_(v){ const d = coerceToDateTime_(v); if(!d) return "—"; return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function updateHistoryCache() {} 
function getDashboardData(){ return getStats2026(); }
// force push 20260209234130