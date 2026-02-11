/**
 * VISITE INTERMÉDIAIRE - Google Apps Script Backend
 * Version: 1.0
 * Date: 2026-02-04
 */

const SHEET_ID = "1JDH83x04Cc8AFDlTlGvExJIpKBSwVy-p92RpYBhs2fk";
const VISITES_SHEET = "Visites";
const QUESTIONS_SHEET = "Questions";
const STRUCTURE_SHEET = "Structure"; // Parties et sous-parties

// Initialiser/Vérifier les feuilles si nécessaire
function ensureSheets() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheets = ss.getSheets().map(s => s.getName());
    
    if (!sheets.includes(VISITES_SHEET)) {
      const visitesSheet = ss.insertSheet(VISITES_SHEET);
      visitesSheet.appendRow(["ID", "Date Début", "Matricule", "Réponses JSON", "Conclusion"]);
    }
    
    if (!sheets.includes(STRUCTURE_SHEET)) {
      const structureSheet = ss.insertSheet(STRUCTURE_SHEET);
      structureSheet.appendRow(["ID", "Type", "Ordre", "Titre", "ParentID"]);
      // Structure par défaut
      structureSheet.appendRow(["P1", "partie", 1, "Informations générales", ""]);
      structureSheet.appendRow(["SP1", "souspartie", 1, "Informations visite", "P1"]);
      structureSheet.appendRow(["QMAT", "question", 1, "Matricule de l'agent", "SP1"]);
      structureSheet.appendRow(["QDATE", "question", 2, "Date et heure de début de visite", "SP1"]);
      structureSheet.appendRow(["Q1", "question", 3, "État général du site", "SP1"]);
      structureSheet.appendRow(["Q2", "question", 4, "Conformité de sécurité", "SP1"]);
      structureSheet.appendRow(["Q3", "question", 5, "Observations et commentaires", "SP1"]);
    }
    
    if (!sheets.includes(QUESTIONS_SHEET)) {
      const questionsSheet = ss.insertSheet(QUESTIONS_SHEET);
      questionsSheet.appendRow(["ID", "Question", "Type", "Options"]);
      questionsSheet.appendRow(["QMAT", "Matricule de l'agent", "text", ""]);
      questionsSheet.appendRow(["QDATE", "Date et heure de début de visite", "datetime", ""]);
      questionsSheet.appendRow(["Q1", "État général du site", "text", ""]);
      questionsSheet.appendRow(["Q2", "Conformité de sécurité", "radio", "Oui|Non"]);
      questionsSheet.appendRow(["Q3", "Observations et commentaires", "textarea", ""]);
    }
  } catch(e) {
    Logger.log("Erreur ensureSheets: " + e.toString());
  }
}

// Récupérer le contenu HTML
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setWidth(1024)
    .setHeight(768);
}

// Récupérer les questions du questionnaire
function getQuestions() {
  try {
    ensureSheets();
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const questionsSheet = ss.getSheetByName(QUESTIONS_SHEET);
    
    if (!questionsSheet) {
      return [];
    }
    
    const data = questionsSheet.getDataRange().getValues();
    
    const questions = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        questions.push({
          id: data[i][0],
          question: data[i][1],
          type: data[i][2],
          options: data[i][3] || ""
        });
      }
    }
    return questions;
  } catch(e) {
    Logger.log("Erreur getQuestions: " + e.toString());
    return [];
  }
}

// Récupérer la structure complète (parties, sous-parties, questions)
function getStructure() {
  try {
    ensureSheets();
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const structureSheet = ss.getSheetByName(STRUCTURE_SHEET);
    
    if (!structureSheet) {
      return [];
    }
    
    const data = structureSheet.getDataRange().getValues();
    const structure = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        structure.push({
          id: data[i][0],
          type: data[i][1],
          ordre: data[i][2],
          titre: data[i][3],
          parentId: data[i][4] || ""
        });
      }
    }
    
    return structure;
  } catch(e) {
    Logger.log("Erreur getStructure: " + e.toString());
    return [];
  }
}

// Récupérer les visites enregistrées
function getVisites() {
  try {
    ensureSheets();
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const visitesSheet = ss.getSheetByName(VISITES_SHEET);
    
    if (!visitesSheet) {
      Logger.log("Feuille Visites introuvable");
      return [];
    }
    
    const data = visitesSheet.getDataRange().getValues();
    Logger.log("Nombre de lignes dans Visites: " + data.length);
    
    const visites = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Si l'ID existe
        let reponses = {};
        try {
          const reponsesStr = String(data[i][3] || "{}");
          reponses = JSON.parse(reponsesStr);
        } catch(jsonError) {
          Logger.log("Erreur parse JSON pour visite " + data[i][0] + ": " + jsonError);
          reponses = {};
        }
        
        visites.push({
          id: String(data[i][0]),
          dateDebut: String(data[i][1]),
          matricule: String(data[i][2]),
          reponses: reponses,
          conclusion: String(data[i][4] || "")
        });
      }
    }
    Logger.log("Nombre de visites retournées: " + visites.length);
    return visites;
  } catch(e) {
    Logger.log("Erreur getVisites: " + e.toString());
    return [];
  }
}

// Sauvegarder une nouvelle visite
function saveVisite(reponses, conclusion) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Initialiser les feuilles si nécessaire
    ensureSheets();
    
    const visitesSheet = ss.getSheetByName(VISITES_SHEET);
    
    if (!visitesSheet) {
      return {
        success: false,
        message: "Erreur: feuille 'Visites' introuvable"
      };
    }
    
    const id = "VISITE_" + Utilities.getUuid();
    
    // Extraire le matricule et la date des réponses
    const matricule = reponses.QMAT || "";
    const dateDebut = reponses.QDATE || "";
    
    visitesSheet.appendRow([
      id,
      dateDebut,
      matricule,
      JSON.stringify(reponses),
      conclusion || ""
    ]);
    
    return {
      success: true,
      id: id,
      message: "Visite enregistrée avec succès"
    };
  } catch(e) {
    Logger.log("Erreur saveVisite: " + e.toString());
    return {
      success: false,
      message: "Erreur lors de la sauvegarde: " + e.toString()
    };
  }
}

// Mettre à jour la conclusion d'une visite
function updateConclusion(id, conclusion) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const visitesSheet = ss.getSheetByName(VISITES_SHEET);
    const data = visitesSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        visitesSheet.getRange(i + 1, 5).setValue(conclusion);
        return { success: true };
      }
    }
    
    return { success: false, message: "Visite non trouvée" };
  } catch(e) {
    Logger.log("Erreur updateConclusion: " + e);
    return { success: false, message: "Erreur: " + e };
  }
}

// ===== FONCTIONS ADMIN =====

// Sauvegarder la structure complète
function saveStructure(structure) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const structureSheet = ss.getSheetByName(STRUCTURE_SHEET);
    
    if (!structureSheet) {
      return { success: false, message: "Feuille Structure introuvable" };
    }
    
    // Effacer tout sauf l'en-tête
    structureSheet.getRange(2, 1, structureSheet.getLastRow() - 1, 5).clear();
    
    // Insérer les nouvelles données
    structure.forEach(item => {
      structureSheet.appendRow([item.id, item.type, item.ordre, item.titre, item.parentId || ""]);
    });
    
    return { success: true };
  } catch(e) {
    Logger.log("Erreur saveStructure: " + e.toString());
    return { success: false, message: e.toString() };
  }
}

// Sauvegarder une question
function saveQuestion(question) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const questionsSheet = ss.getSheetByName(QUESTIONS_SHEET);
    
    if (!questionsSheet) {
      return { success: false, message: "Feuille Questions introuvable" };
    }
    
    const data = questionsSheet.getDataRange().getValues();
    let found = false;
    
    // Chercher si la question existe déjà
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === question.id) {
        // Mettre à jour
        questionsSheet.getRange(i + 1, 1, 1, 4).setValues([[
          question.id,
          question.question,
          question.type,
          question.options || ""
        ]]);
        found = true;
        break;
      }
    }
    
    // Si pas trouvée, ajouter
    if (!found) {
      questionsSheet.appendRow([question.id, question.question, question.type, question.options || ""]);
    }
    
    return { success: true };
  } catch(e) {
    Logger.log("Erreur saveQuestion: " + e.toString());
    return { success: false, message: e.toString() };
  }
}

// Supprimer une question
function deleteQuestion(questionId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const questionsSheet = ss.getSheetByName(QUESTIONS_SHEET);
    
    if (!questionsSheet) {
      return { success: false, message: "Feuille Questions introuvable" };
    }
    
    const data = questionsSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === questionId) {
        questionsSheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    
    return { success: false, message: "Question non trouvée" };
  } catch(e) {
    Logger.log("Erreur deleteQuestion: " + e.toString());
    return { success: false, message: e.toString() };
  }
}

// Supprimer une visite
function deleteVisite(visiteId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const visitesSheet = ss.getSheetByName(VISITES_SHEET);
    
    if (!visitesSheet) {
      return { success: false, message: "Feuille Visites introuvable" };
    }
    
    const data = visitesSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === visiteId) {
        visitesSheet.deleteRow(i + 1);
        return { success: true, message: "Visite supprimée" };
      }
    }
    
    return { success: false, message: "Visite non trouvée" };
  } catch(e) {
    Logger.log("Erreur deleteVisite: " + e.toString());
    return { success: false, message: e.toString() };
  }
}
