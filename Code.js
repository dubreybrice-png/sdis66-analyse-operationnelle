/****************************************************
 * SDIS 66 - SDS | WebApp Dashboard
 * CACHE SÉQUENTIEL + FIXES + LOCK SYSTEM + ANTI-DOUBLE-COUNT
 * Version: v1.34 | 2026-01-29
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
const C_PROTO_START = 21; 
const C_PROTO_END = 48;   
const C_BG_EXAM = 58; 
const C_BH_ABS = 59;  
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

function onEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if(sheet.getName() !== APP_SHEET_NAME) return; // Seulement APP
    
    const row = e.range.getRow();
    const col = e.range.getColumn();
    
    // Vérifier si c'est une édition dans les colonnes BI, BJ, BK, ou BL (60-63)
    if(row < 2 || col < 60 || col > 63) return;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const appSheet = ss.getSheetByName(APP_SHEET_NAME);
    const alexSheet = ss.getSheetByName("APP Alex");
    if(!alexSheet) return;
    
    // Récupérer l'ID de la ligne modifiée
    const id = String(appSheet.getRange(row, C_APP_ID).getValue()).trim();
    if(!id) return;
    
    // Récupérer les valeurs des checkboxes
    const bilanOk = isCheckboxChecked(appSheet.getRange(row, C_BILAN_OK).getValue());
    const bilanKo = isCheckboxChecked(appSheet.getRange(row, C_BILAN_KO).getValue());
    const pisuOk = isCheckboxChecked(appSheet.getRange(row, C_PISU_OK).getValue());
    const pisuKo = isCheckboxChecked(appSheet.getRange(row, C_PISU_KO).getValue());
    
    // Trouver la ligne dans APP Alex
    const alexData = alexSheet.getDataRange().getValues();
    let alexRow = -1;
    for(let i = 1; i < alexData.length; i++) {
      if(String(alexData[i][0]).trim() === id) {
        alexRow = i + 1; // +1 car les indices commencent à 0
        break;
      }
    }
    
    // Si pas trouvé dans APP Alex, créer une nouvelle ligne
    if(alexRow === -1) {
      alexRow = alexSheet.getLastRow() + 1;
      alexSheet.getRange(alexRow, 1).setValue(id); // Mettre l'ID
    }
    
    // Logique de cochage automatique:
    // Si Pisu pas ok (BL) ET Bilan ok (BI) → cocher H (col 8)
    if(pisuKo && bilanOk) {
      alexSheet.getRange(alexRow, 8).setValue(true); // H = Passer bilan en ok
    } else {
      // Décocher si la condition n'est plus remplie
      if(alexSheet.getRange(alexRow, 8).getValue() === true) {
        alexSheet.getRange(alexRow, 8).setValue(false);
      }
    }
    
    // Si Bilan pas ok (BJ) ET Pisu ok (BK) → cocher I (col 9)
    if(bilanKo && pisuOk) {
      alexSheet.getRange(alexRow, 9).setValue(true); // I = Passer pisu en ok
    } else {
      // Décocher si la condition n'est plus remplie
      if(alexSheet.getRange(alexRow, 9).getValue() === true) {
        alexSheet.getRange(alexRow, 9).setValue(false);
      }
    }
    
  } catch(err) {
    // Silent fail pour ne pas bloquer l'édition
    Logger.log("onEdit error: " + err.message);
  }
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

  const counts = getChefferieCounts();

  return {
    date: formatDateFR_(lastDate),
    psud: psud2026, total: total2026, sect: secteur2026, ast: astreintes2026,
    cis: cisNames.map((n, i) => ({ name:n, v26:Number(cisCounts2026[i])||0, v25:Number(cisCounts2025ytd[i])||0, v25tot:Number(cisTotals2025[i])||0 })),
    secteurs: sectNames.map((n, i) => ({ name:n, v26:Number(sectCounts2026[i])||0, v25:Number(sectCounts2025ytd[i])||0, v25tot:Number(sectTotals2025[i])||0 })),
    cntApp: countApp, cntIspG: counts.isp, cntIspR: counts.valid, cntMed: counts.med
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
  
  // Status initial
  cache.put("cache_status", `Synthèse: ${getTime()}`, 21600);
  Logger.log("=== DÉBUT MISE EN CACHE SÉQUENTIEL ===");
  
  // 1. ISP Stats (500ms)
  setTimeout(() => {
    try {
      cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: EN COURS`, 21600);
      getAllIspErrorStats();
      
      setTimeout(() => {
        const endTime = getTime();
        cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime}`, 21600);
        Logger.log("Cache ISP terminé");
        
        // 2. Admin Data (2000ms après ISP)
        setTimeout(() => {
          try {
            cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: EN COURS`, 21600);
            getAdminData("0007");
            
            setTimeout(() => {
              const adminTime = getTime();
              cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: ${adminTime}`, 21600);
              Logger.log("Cache Admin terminé");
              
              // 3. Chefferie Counts (2000ms après Admin)
              setTimeout(() => {
                try {
                  cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: ${adminTime} | Accès APP: EN COURS`, 21600);
                  getChefferieCounts();
                  
                  setTimeout(() => {
                    const appTime = getTime();
                    cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: ${adminTime} | Accès APP: ${appTime}`, 21600);
                    Logger.log("Cache APP terminé");
                    
                    // 4. Chefferie ISP (2000ms après APP)
                    setTimeout(() => {
                      try {
                        cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: ${adminTime} | Accès APP: ${appTime} | Accès chefferie ISP: EN COURS`, 21600);
                        getChefferieNextCase('app_isp');
                        
                        setTimeout(() => {
                          const chefTime = getTime();
                          cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: ${adminTime} | Accès APP: ${appTime} | Accès chefferie ISP: ${chefTime}`, 21600);
                          Logger.log("Cache Chefferie ISP terminé");
                          
                          // 5. Médecin Chef (2000ms après Chefferie)
                          setTimeout(() => {
                            try {
                              cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: ${adminTime} | Accès APP: ${appTime} | Accès chefferie ISP: ${chefTime} | Accès médecin chef: EN COURS`, 21600);
                              getChefferieNextCase('med_chef');
                              
                              setTimeout(() => {
                                const medTime = getTime();
                                cache.put("cache_status", `Synthèse: ${getTime()} | Données par ISP: ${endTime} | Administration: ${adminTime} | Accès APP: ${appTime} | Accès chefferie ISP: ${chefTime} | Accès médecin chef: ${medTime}`, 21600);
                                Logger.log("=== MISE EN CACHE TERMINÉE ===");
                              }, 500);
                            } catch(e) { Logger.log("Erreur cache Médecin: " + e); }
                          }, 2000);
                        }, 500);
                      } catch(e) { Logger.log("Erreur cache Chefferie: " + e); }
                    }, 2000);
                  }, 500);
                } catch(e) { Logger.log("Erreur cache APP: " + e); }
              }, 2000);
            }, 500);
          } catch(e) { Logger.log("Erreur cache Admin: " + e); }
        }, 2000);
      }, 500);
    } catch(e) { Logger.log("Erreur cache ISP: " + e); }
  }, 500);
}

function getCacheStatus() {
  const cache = CacheService.getScriptCache();
  return cache.get("cache_status") || "";
}

function clearIspCache(mat) {
  const cache = CacheService.getScriptCache();
  const normalizedMat = normalizeMat(mat);
  cache.remove("isp_" + normalizedMat); // Cache de getIspStats
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
    const ss = getSS_();
    const dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    const matVals = dash.getRange("T3:T79").getDisplayValues().flat(); 
    const idx = matVals.findIndex(m => normalizeMat(m) === mat);
    if (idx === -1) throw new Error("Matricule non trouvé.");
    if(!checkAuth_(mat, dobInput)) throw new Error("Date de naissance incorrecte.");
    
    const agentName = dash.getRange(3 + idx, 19).getValue(); 
    const myName = String(agentName).trim().toLowerCase();

    // === CHERCHER CACHE D'ABORD ===
    const cache = CacheService.getScriptCache();
    const cacheKey = "isp_" + mat;
    const cached = cache.get(cacheKey);
    if(cached) {
        const result = JSON.parse(cached);
        result.fromCache = true;
        return result;
    }

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
    
    // 1. Construire un index complet APP avec matricule pour recherche rapide
    const idToMat = {}; // Mapping ID -> Matricule pour tous les IDs
    if(shApp) {
        const data = shApp.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            const id = String(data[i][C_APP_ID]).trim();
            const rowMat = normalizeMat(data[i][C_APP_MAT]);
            idToMat[id] = rowMat; // Stocker le matricule de chaque ID
            appDataRef[id] = { // Stocker aussi les données de TOUS les IDs
                motif: String(data[i][C_APP_MOTIF]||"").trim(),
                cis: String(data[i][C_APP_CIS]||"").trim(),
                engin: String(data[i][C_APP_ENGIN]||"").trim(),
                date: formatDateHeureFR_(data[i][C_APP_DATE]),
                status: (String(data[i][C_APP_CIS]||"").trim() === "SD SSSM") ? "De Garde" : "Astreinte / Dispo"
            };
        }
    }
    
    // 2. Parcourir APP pour compter les Bilan OK et Pisu OK du matricule actuel
    if(shApp) {
        const data = shApp.getDataRange().getValues();
        const dAlex = shAlex ? shAlex.getDataRange().getValues() : [];
        let alexTags = {};
        for(let i=1; i<dAlex.length; i++) {
            const id = String(dAlex[i][0]).trim();
            alexTags[id] = { errBilL: dAlex[i][9], errPisuL: dAlex[i][10], errGrave: dAlex[i][11], reqBilOk: dAlex[i][7], reqPisuOk: dAlex[i][8] };
        }
        
        for(let i=1; i<data.length; i++) {
            // Filtrer par MATRICULE, pas par nom
            const rowMat = normalizeMat(data[i][C_APP_MAT]);
            if(rowMat === mat) {
                const id = String(data[i][C_APP_ID]).trim();
                const motif = appDataRef[id].motif;
                const cis = appDataRef[id].cis;
                const engin = appDataRef[id].engin;
                const date = appDataRef[id].date;
                const status = appDataRef[id].status;
                
                const tags = alexTags[id] || {};
                
                // Compter Bilan OK et Pisu OK SÉPARÉMENT
                const bilanOk = data[i][C_BILAN_OK] || tags.reqBilOk;
                const pisuOk = data[i][C_PISU_OK] || tags.reqPisuOk;
                const bilanError = data[i][C_BILAN_KO];
                const pisuError = data[i][C_PISU_KO];
                
                // Compter les OK simplement
                if(bilanOk) {
                    bilanOkCount++;
                    countedIds.add(id + "_bilan");
                    okBilanList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Bilan OK"], errorType: "" });
                }
                if(pisuOk) {
                    pisuOkCount++;
                    countedIds.add(id + "_pisu");
                    okPisuList.push({ id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Pisu OK"], errorType: "" });
                }
                
                // Erreurs légères: faut AVOIR L'ERREUR DANS APP ET LE TAG DANS APP Alex
                if(bilanError && tags.errBilL) {
                    const item = { id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Erreur Bilan Légère"], errorType: "Erreur Bilan Légère" };
                    errLegereBilanList.push(item);
                }
                if(pisuError && tags.errPisuL) {
                    const item = { id:id, motif:motif, centre:cis, engin:engin, date:date, status:status, types: ["Erreur Pisu Légère"], errorType: "Erreur Pisu Légère" };
                    errLegerePisuList.push(item);
                }
            }
        }
    }
    
    // 3. Parcourir APP Alex pour les erreurs graves et corrections
    if(shAlex) {
        const data = shAlex.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            const id = String(data[i][0]).trim();
            
            // Vérifier rapidement si cet ID appartient à notre matricule
            if(idToMat[id] !== mat) continue;
            
            // Récupérer les infos depuis appDataRef (qui contient TOUS les IDs)
            const motif = appDataRef[id].motif || "?";
            const centre = appDataRef[id].cis || "";
            const engin = appDataRef[id].engin || "";
            const date = appDataRef[id].date || "";
            const status = appDataRef[id].status || "";
            
            const hasH = isCheckboxChecked(data[i][7]);  // H = Bilan finalement OK (correction)
            const hasI = isCheckboxChecked(data[i][8]);  // I = Pisu finalement OK (correction)
            const hasJ = isCheckboxChecked(data[i][9]);  // J = Erreur bilan légère
            const hasK = isCheckboxChecked(data[i][10]); // K = Erreur pisu légère
            const hasL = isCheckboxChecked(data[i][11]); // L = Erreur grave
            
            // H ET I cochées = fiche revient à OK complètement
            if(hasH && hasI) {
                okById[id] = { id:id, motif:motif, centre:centre, engin:engin, date:date, status:status, types: ["Bilan OK", "Pisu OK"], errorType: "" };
            }
            // Seulement H OU seulement I = Correction partielle, pas OK
            else if(hasH && !hasI) {
                const item = { id:id, motif:motif, centre:centre, engin:engin, date:date, status:status, types: ["Erreur Pisu Légère"], errorType: "Erreur Pisu Légère" };
                errLegerePisuList.push(item);
            }
            else if(hasI && !hasH) {
                const item = { id:id, motif:motif, centre:centre, engin:engin, date:date, status:status, types: ["Erreur Bilan Légère"], errorType: "Erreur Bilan Légère" };
                errLegereBilanList.push(item);
            }
            
            // J cochée = Erreur bilan légère
            if(hasJ) { 
                const item = { id:id, motif:motif, centre:centre, engin:engin, date:date, status:status, types: ["Erreur Bilan Légère"], errorType: "Erreur Bilan Légère" };
                errLegereBilanList.push(item); 
            } 
            
            // K cochée = Erreur pisu légère
            if(hasK) { 
                const item = { id:id, motif:motif, centre:centre, engin:engin, date:date, status:status, types: ["Erreur Pisu Légère"], errorType: "Erreur Pisu Légère" };
                errLegerePisuList.push(item); 
            } 
            
            // L cochée = Erreur grave
            if(hasL) { 
                const item = { id:id, motif:motif, centre:centre, engin:engin, date:date, status:status, types: ["Erreur Grave"], errorType: "Erreur Grave" };
                errLourdeList.push(item); 
            } 
        }
    }


    // Compter les fiches corrigées dans APP Alex (H ET I cochées) - SEULEMENT si pas déjà comptées
    for(const id in okById) {
        if(!countedIds.has(id + "_bilan")) bilanOkCount++;
        if(!countedIds.has(id + "_pisu")) pisuOkCount++;
    }

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
        errLourde: errLourdeList
    };
    
    // === METTRE EN CACHE ===
    cache.put(cacheKey, JSON.stringify(result), 21600);
    
    return result;
  } catch(e) { return { error: e.message }; }
}

/* --- CHEFFERIE --- */
function getChefferieCounts() {
    const cache = CacheService.getScriptCache();
    const cacheKey = "chefferie_counts";
    const cached = cache.get(cacheKey);
    if(cached) return JSON.parse(cached);
    
    const ss = getSS_();
    let isp = 0, med = 0, valid = 0;
    try {
        const shApp = ss.getSheetByName(APP_SHEET_NAME);
        const shAlex = ss.getSheetByName("APP Alex");
        const shEve = ss.getSheetByName("APP Eve");
        
        const dApp = shApp.getDataRange().getValues();
        const dAlex = shAlex.getDataRange().getValues();
        const dEve = shEve.getDataRange().getValues();
        
        const alexDone = new Set(), alexHeavy = new Set(), eveDone = new Set(), evePending = new Set();
        
        for(let i=1; i<dAlex.length; i++) {
            const id = String(dAlex[i][0]).trim();
            if(isCheckboxChecked(dAlex[i][13])) alexDone.add(id);
            if(isCheckboxChecked(dAlex[i][11])) alexHeavy.add(id);
        }
        for(let i=1; i<dEve.length; i++) {
            const id = String(dEve[i][0]).trim();
            if(dEve[i][14] || dEve[i][16]) eveDone.add(id);
            if((dEve[i][14] || dEve[i][16]) && !dEve[i][18]) evePending.add(id);
        }
        for(let i=1; i<dApp.length; i++) {
            if(isCheckboxChecked(dApp[i][C_BILAN_KO]) || isCheckboxChecked(dApp[i][C_PISU_KO])) {
                if(!alexDone.has(String(dApp[i][C_APP_ID]).trim())) isp++;
            }
        }
        for(let id of alexHeavy) { if(!eveDone.has(id)) med++; }
        valid = evePending.size;
    } catch(e) {}
    
    const result = { isp, med, valid };
    cache.put(cacheKey, JSON.stringify(result), 21600);
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

        for(let i=1; i<dataApp.length; i++) {
            const hasError = (isCheckboxChecked(dataApp[i][C_BILAN_KO]) || isCheckboxChecked(dataApp[i][C_PISU_KO]));
            const id = String(dataApp[i][C_APP_ID]).trim();
            let alreadyDone = false;
            for(let j=1; j<dataAlex.length; j++) {
                if(String(dataAlex[j][0]).trim() === id && isCheckboxChecked(dataAlex[j][13])) { alreadyDone = true; break; }
            }
            if(hasError && !alreadyDone) {
                rowToProcess = i+1;
                const cis = String(dataApp[i][C_APP_CIS]||"").trim();
                const status = (cis === "SD SSSM") ? "De Garde" : "Astreinte / Dispo";
                const info = {
                    interId: id, 
                    motif: dataApp[i][C_APP_MOTIF], 
                    date: formatDateHeureFR_(dataApp[i][C_APP_DATE]),
                    pdf: dataApp[i][C_APP_PDF], 
                    infName: dataApp[i][C_APP_NOM], 
                    status: status,
                    commBN: dataApp[i][C_TXTBILAN_KO], 
                    commBO: dataApp[i][C_TXTPISU_KO]
                };
                const hAlex = shAlex.getRange(1,1,1,20).getValues()[0];
                schema = { mode:'app_isp', info:info, checks:[{id:7, label:hAlex[7]}, {id:8, label:hAlex[8]}, {id:9, label:hAlex[9]}, {id:10, label:hAlex[10]}, {id:11, label:hAlex[11]}] };
                break;
            }
        }
    }
    else if(mode === 'med_chef') {
        const shAlex = ss.getSheetByName("APP Alex");
        const shEve = ss.getSheetByName("APP Eve");
        const dataAlex = shAlex.getDataRange().getValues();
        const dataEve = shEve.getDataRange().getValues();
        for(let i=1; i<dataAlex.length; i++) {
            if(isCheckboxChecked(dataAlex[i][11])) { 
                const id = String(dataAlex[i][0]).trim();
                let alreadyDone = false;
                for(let j=1; j<dataEve.length; j++) {
                    if(String(dataEve[j][0]).trim() === id && (dataEve[j][14] || dataEve[j][16])) { alreadyDone = true; break; }
                }
                if(!alreadyDone) {
                    rowToProcess = i+1;
                    schema = { mode:'med_chef', info:{ interId:id, motif:dataAlex[i][1], date:'', pdf:dataAlex[i][2], infName:dataAlex[i][4], cis:'', engin:'', status:"Erreur Lourde" } };
                    break;
                }
            }
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
    let protoLabels = {};
    let protoMapping = {}; // Mappe colonne APP → index de colonne
    try {
        const ssProto = SpreadsheetApp.openById(ID_PROTOCOLES_CORRESP);
        const shProto = ssProto.getSheets()[0];
        // Charger les 3 lignes : code (1), nom (2), colonne APP (3)
        const header = shProto.getRange(1, 1, 3, shProto.getLastColumn()).getValues();
        for(let i = 0; i < header[0].length; i++) {
            const code = String(header[0][i]).trim();
            const displayName = String(header[1][i]).trim();
            const colRef = String(header[2][i]).trim();
            if(code && displayName && colRef) {
                protoLabels[code] = displayName;
                protoMapping[colRef] = code; // Mappe colonne APP (ex: "V") à code (ex: "1A")
            }
        }
    } catch(e) {
        Logger.log("Erreur chargement protocoles: " + e);
    }
    
    // Construire la liste des protocoles depuis colonnes V (21) à AW (48)
    const protoList = [];
    const sheetHeaders = shApp.getRange(1, 1, 1, shApp.getLastColumn()).getValues()[0];
    
    for(let colIdx = C_PROTO_START; colIdx <= C_PROTO_END; colIdx++) {
        const colHeader = String(sheetHeaders[colIdx] || "").trim();
        if(colHeader) {
            // Utiliser le mapping pour trouver le code du protocole
            const protoCode = protoMapping[colHeader] || colHeader;
            const displayLabel = protoLabels[protoCode] || colHeader;
            // Charger l'état réel de la case depuis la feuille
            const isChecked = row[colIdx] === "✓" || row[colIdx] === true;
            protoList.push({ id: colIdx, label: displayLabel, checked: isChecked });
        }
    }
    
    // Séparer adultes (première moitié) et pédiatriques (seconde moitié)
    const midPoint = Math.ceil(protoList.length / 2);
    const protoAdult = protoList.slice(0, midPoint);
    const protoPedia = protoList.slice(midPoint);
    
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
    const ss = getSS_();
    const shApp = ss.getSheetByName(APP_SHEET_NAME);
    if(!shApp) return { success: false };
    
    const row = form.rowNumber;
    
    // Sauvegarder les données
    shApp.getRange(row, C_ISP_ANALYSE + 1).setValue(form.isp);
    
    // Protocoles
    Object.keys(form.checks).forEach(id => {
        const colIdx = parseInt(id) + 1;
        shApp.getRange(row, colIdx).setValue(form.checks[id] ? "✓" : "");
    });
    
    // Critères
    shApp.getRange(row, 50).setValue(form.criteres.ax);
    shApp.getRange(row, 51).setValue(form.criteres.ay);
    shApp.getRange(row, 52).setValue(form.criteres.az);
    shApp.getRange(row, 53).setValue(form.criteres.ba);
    shApp.getRange(row, 54).setValue(form.criteres.bb);
    shApp.getRange(row, 55).setValue(form.criteres.bc);
    
    // Résultats
    shApp.getRange(row, C_BG_EXAM + 1).setValue(form.resultats.bg);
    shApp.getRange(row, C_BH_ABS + 1).setValue(form.resultats.bh ? true : false);
    shApp.getRange(row, C_BILAN_OK + 1).setValue(form.resultats.bi ? true : false);
    shApp.getRange(row, C_BILAN_KO + 1).setValue(form.resultats.bj ? true : false);
    shApp.getRange(row, C_PISU_OK + 1).setValue(form.resultats.bk ? true : false);
    shApp.getRange(row, C_PISU_KO + 1).setValue(form.resultats.bl ? true : false);
    shApp.getRange(row, C_BM_SURV_TRANSPORT + 1).setValue(form.resultats.bm ? true : false);
    
    // Textes
    shApp.getRange(row, C_TXTBILAN_KO + 1).setValue(form.txtBn);
    shApp.getRange(row, C_TXTPISU_KO + 1).setValue(form.txtBo);
    
    // Clôture
    shApp.getRange(row, C_BP_CLOSE + 1).setValue(true);
    
    // Problème Brice
    shApp.getRange(row, C_BS_PROBLEM + 1).setValue(form.pbCheck ? true : false);
    shApp.getRange(row, C_BT_PROBLEM_TXT + 1).setValue(form.pbTxt || "");
    
    return { success: true };
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
        const alexMap = {};
        for(let i=1; i<dAlex.length; i++) {
            const id = String(dAlex[i][0]).trim();
            alexMap[id] = { reqBilOk: dAlex[i][7] === true, reqPisuOk: dAlex[i][8] === true, errBilL: dAlex[i][9] === true, errPisuL: dAlex[i][10] === true, errGrave: dAlex[i][11] === true };
        }
        for(let i=1; i<dApp.length; i++) {
            const m = normalizeMat(dApp[i][C_APP_MAT]);
            if(stats[m]) {
                const id = String(dApp[i][C_APP_ID]).trim();
                const alex = alexMap[id] || {};
                if(dApp[i][C_BILAN_OK] === true || alex.reqBilOk) stats[m].bilanOk++;
                if(dApp[i][C_PISU_OK] === true || alex.reqPisuOk) stats[m].pisuOk++;
                if(alex.errBilL) stats[m].errBilL++;
                if(alex.errPisuL) stats[m].errPisuL++;
                if(alex.errGrave) stats[m].errGrave++;
            }
        }
    }
    
    const result = Object.values(stats);
    cache.put(cacheKey, JSON.stringify(result), 21600);
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
    let list = [];
    const dApp = shApp.getDataRange().getValues();
    const dAlex = shAlex.getDataRange().getValues();
    const dEve = shEve.getDataRange().getValues();
    let comments = {};
    let alexTags = {}; 
    for(let i=1; i<dAlex.length; i++) {
        const id = String(dAlex[i][0]).trim();
        comments[id] = { chef: dAlex[i][12], med: "" };
        alexTags[id] = { errBilL: dAlex[i][9], errPisuL: dAlex[i][10], errGrave: dAlex[i][11], reqBilOk: dAlex[i][7], reqPisuOk: dAlex[i][8] };
    }
    for(let i=1; i<dEve.length; i++) {
         const id = String(dEve[i][0]).trim();
         if(!comments[id]) comments[id] = { chef: "", med: "" };
         comments[id].med = dEve[i][14];
    }
    for(let i=1; i<dApp.length; i++) {
        if(normalizeMat(dApp[i][C_APP_MAT]) === normalizeMat(mat)) {
            const id = String(dApp[i][C_APP_ID]).trim();
            const cis = String(dApp[i][C_APP_CIS]||"").trim();
            const status = (cis === "SD SSSM") ? "Garde" : "Dispo/Astreinte";
            const date = formatDateHeureFR_(dApp[i][C_APP_DATE]);
            const motif = String(dApp[i][C_APP_MOTIF]||"—").trim();
            const engin = String(dApp[i][C_APP_ENGIN]||"—").trim();
            const tags = alexTags[id] || {};
            let types = [];
            let errorType = "";
            
            const bilanOk = dApp[i][C_BILAN_OK] || tags.reqBilOk;
            const pisuOk = dApp[i][C_PISU_OK] || tags.reqPisuOk;
            const bilanError = dApp[i][C_BILAN_KO] || tags.errBilL || tags.errGrave;
            const pisuError = dApp[i][C_PISU_KO] || tags.errPisuL || tags.errGrave;
            
            // Seul OK complet (BOTH Bilan ET Pisu)
            if(bilanOk && pisuOk) {
                types.push("Bilan OK");
                types.push("Pisu OK");
            }
            // Pisu OK mais pas Bilan = erreur Bilan
            else if(pisuOk && !bilanOk && bilanError) {
                types.push("Erreur Bilan Légère");
                if(!errorType) errorType = "Erreur Bilan Légère";
            }
            // Bilan OK mais pas Pisu = erreur Pisu
            else if(bilanOk && !pisuOk && pisuError) {
                types.push("Erreur Pisu Légère");
                if(!errorType) errorType = "Erreur Pisu Légère";
            }
            
            // Erreurs graves ou légères
            if(tags.errBilL) { types.push("Erreur Bilan Légère"); if(!errorType) errorType = "Erreur Bilan Légère"; }
            if(tags.errPisuL) { types.push("Erreur Pisu Légère"); if(!errorType) errorType = "Erreur Pisu Légère"; }
            if(tags.errGrave) { types.push("Erreur Grave"); errorType = "Erreur Grave"; }
            
            list.push({ 
                id: id, 
                date: date, 
                centre: cis,
                motif: motif, 
                engin: engin,
                pdf: dApp[i][C_APP_PDF], 
                status: status, 
                types: types, 
                errorType: errorType,
                commChef: comments[id] ? comments[id].chef : "", 
                commMed: comments[id] ? comments[id].med : "" 
            });
        }
    }
    
    cache.put(cacheKey, JSON.stringify(list), 21600);
    return list;
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