
/**
 * RESTAURATION PAR HISTORIQUE — Etape 1/2 : trouver les IDs
 *
 * Scanne l'historique Drive pour associer chaque commentaire (backup Excel)
 * à son ID d'intervention correct.
 * Resumable si timeout : relancer plusieurs fois jusqu'au message "Terminé".
 * Ensuite lancer restoreApplyFoundIds() pour écrire dans le spreadsheet.
 */
function restoreCommentsFromRevisions() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const fileId    = ss.getId();
  const startTime = Date.now();
  const MAX_MS    = 240000; // 4 min
  const props     = PropertiesService.getScriptProperties();

  const shAlex = ss.getSheetByName('APP Alex');
  const shEve  = ss.getSheetByName('APP Eve');
  if (!shAlex || !shEve) { Logger.log('Onglets introuvables'); return; }

  const gidAlex = shAlex.getSheetId();
  const gidEve  = shEve.getSheetId();

  // ── Données du backup Excel ────────────────────────────────────────────────
  // Clé = texte du commentaire, Valeur = ID intervention trouvé (null = pas encore trouvé)
  const CHEF_MAP    = {"Pas de bilan circonstanciel.\nInconscient avec G15 ??\nBilan initial pauvre\nPeu coopérant : pourquoi problème neuro ?\n1 seul Dextro aprés ressucrage ? \nPourquoi Resucrage IV alors que Dx à 0.69 et G 15 ?": null, "PISU détresse respi : Mais lequel ?": null, "Pourquoi aérosol car pas de notion de bronchospasme mais d'encombrement bronchique ?": null, "Bilan initial : Douleur thoracique ....... Et quoi ? ( irradiation ? , 1er fois ? depuis quand ? Effort ? ) TA aprés natispray ? \nEVA 6 puis 4 et pas de perfalgan\nNom du MRH": null, "EVA à 9 ,pourquoi de morphine car EVA persiste à 6 ( aprés ou avant antalgique palier1": null, "Pas de bila inintial , ni circonstanciel . \nIl y a un bilan dans les facteurs de risques ( fait par ISP ? )": null, "Pose de catheter à la demande du medecin et pas de paramedicalisation ? \nEt pour le repacking de la VLM ???": null, "Pourquoi que 6 mg de morphine alors qu'EVA à 8 ??": null, "Pas de bilan circonstanciel . Attention notion de No Flow contradictoire ( 5min par Ca et 0 par ISP": null, "Verification du pouls peripherique \nMEOPA et PENTHROX en même temps ?": null, "Medecin prescripteur n'a pas proposeé transport paramedicalisé ? pouls 130": null, "Bilan circonstanciel pauvre . Bilan initial léger . Hemorragie mais pas de paleur , TRC ? quantité ? Quels critères pour rentrer dans PISU ? Bonne refexion pour l'exacyl même si erreur PISU\nA froid et pas de temperature": null, "On doit chercher les ATCD et les traitements ( les principaux doivent être notés)\nPourquoi aérosol car encombrement bronchique ? Solumedrol 72mg ???? précision douteuse à faire , Pas de prise de temperature ( OAP ? Pneumopathie ? ) OMI ?": null, "Ce n'est pas un PISU mais une prescription . Qui est le MRH": null, "Pas de bilan circonstanciel, Bilan difficile à lire pourquoi aérosol car ATCD cardio er encombrement bronchique à l'auscultation. \nPas de réassort": null, "Pas de bilan circonstaciel ( recurrent+++), HypoTA orthostatique non vérifiée. \nQui est le MRH ?": null, "Fibrilation tachycardie paroxystique ??\nPas de bilan circonstanciel\nBilan cardio léger": null, "Pourquoi aérosol alors que pas de sibilant mais un encombrement bronchique . Pourquoi solumédrol ? Chute dans la nuit et est restée au sol? est remontée dans son lit ? Température ? Notion d'un déficit Droit par chef d'agrés, aucune trace dans bilan ISP": null, "Pas de bilan circonstanciel\nPourquoi aérosol alors que murmure vesiculaire perçu\nEncombrement haut : pourquoi pas d'aspiration \nHTA et notion \nContact ISP par TPH pour explication : OK": null, "EVA 6 non traitée ? Bilan evolutif de la douleur": null, "Oubli transport paramédicalisé": null, "Aurait mérité un controle de la TA et en fonction proposer pose VVP au MRH": null, "Hypothermie et pas de température notée": null, "Glycémie? Crise a été vue par ISP ou c'est selon temoin ?": null, "Pas de bilan circonstanciel . donne du paracetamol per os ? qui precrit? Douleur irradiant dans le dos et pas d'ECG ( facteurs de risque = Fume , Pilule et surpoids); pas de prise de pouls femoral \n1er episode\nEVA 7 et pas de morphine ? la laisse partir non paramedicalisée avec EVA à 6": null, "Pas de bilan circonstantiel . Elle a fait quoi ?": null, "Chute de sa hauteur ?": null, "Pas de bilan circonstanciel . Inquiétude ? Lecture bilan compliquée": null, "Pas de bilan circonstanciel \nPourquoi pas de natispray": null, "bilan circonstanciel leger. diagnostic de crise comitiale . L'iSP l'a t'elle vu ou c'est selon temoin ?": null, "Erreur transcription PISU ( brulure ? ) plaie en regard de la fracture ? ( ATB ? )": null, "Notion de toux avec hyperthermie = Auscultation pulmonaire !!": null, "Erreur transcription PISU ( PISU douleur et pas brulures)": null, "Oubli de transcription de prise en charge . Contact ISP OK": null, "Quantité de médicaments ? Estimation ou inconnu": null, "Irradiation douleur? EVA à 6 et pas d'antalgie ?": null, "Pas d'auscultation . 1 seul aérosol ? Pas de VVP ni de solumedrol\nPas de temperature": null, "Bilan traumato complet de la tête au pied doit etre fait. Pourquoi pas de profenid ? \nAttention PISU douleur et pas brulure\n1 seul bolus de morphine ?": null, "Pourquoi pas PENTHROX ? 1 seul bolus de morphine ? ' EVA à 7 ) pas de réevaluation douleur": null, "PISU Accouchement ? ( Bug BPV ? ) La prise en charge est correcte": null, "D'accord avec la 1ere analyse du BPV. Penses à relire ton bilan pour corriger les erreurs ( Suite à client ZAVP ?? )\nEncombrement pulmonaire = Auscultation IMPERATIVE": null, "Morphine , combien de bolus et horaire. \nParacetamol 50Mg/Kg = 750 mg alors qu'à 50Kg c'est 1 g": null, "Oui un accompagnement pour une EVA à 4 aurait été judicieux": null, "Quels critères d'inclusion pour aérosol ? Pas de dyspnée, pas de sibilant. Effet placebo ? peut être qu'un aérosol de serum phy aurait été aussi performant": null, "examen abdo ? Localisation ?": null, "une auscultation pulmonaire aurait été judicieuse": null, "Les constantes auraient été mieux qu'hemodynamique maintenue. \nSaignement , Quantité": null, "Bilan traumato leger ( Abdomen , thorax ? )\n1 seul bolus morphine? pas de surveillance de l'évolution ( ENS , Glasgow, . EVA à 9 et seulement 2.5 morphine. Pourquoi 2,5 ? pas de poids": null, "brulures visage ? Et les orifices naturels ? quel état ? Pas d'auscultation pulmonaire\nPas de poids\nPas d'EVA , pourquoi 2.5 de morphine ? pas de surveillance ni de bilan evolutif. \nPas de profenid": null, "Pas de d'examen traumato complet ( Thorax ? Bassin ? abdomen . pas de surveillance ni de bilan evolutif . Douleur à 7 et pourquoi pas les 10 mg de morphine ?": null, "il faudrait mettre les actions ( PISU dans les bonnes cases pour un bilan plus clair et lisible. Pas de bilan . HTA marbrure , il n' y aurait pas une composante cardio ?": null, "Pourquoi pas de profenid ? oubli ou parce que Contre indication ? \nPourquoi pas d'ATB car fracture ouverte ?": null, "Brulure ? quel degré? pas de water gel ? pourquoi pas d'aérosol car sibilant et DRA SpO² à 77%\nG13 , pas de VVP": null, "Impotence MSG : Immobilisation ? \nEVA ?": null, "Bilan fleuve . SpO² 87% et crepitent droite dans contexte hyperthermie ( infection ? fausses routes ? Pas de VVP ?": null, "Douleur thoracique coup de poignard chez un fumeur de 2 paquets par jour et pas d'ECG ? 16/9 de TA au départ et EVA à 9 et pas de PISU ? \nTransport avec ISP ?": null, "pas de bilan circonstanciel : DRA dans quel contexte ? Pas de temperature alors que toux grasse . Productive ?": null, "EVA 7 et pas de morphine ? fracture ouverte et pas d'ATB ?": null, "MRH ? qui Est il ? \nNOM OBLIGATOIRE": null, "Pas de profenid , 13 mg de morphine. prescription MRH ?": null, "Douleur thoracique de quelle origine ? ( suite à l'AVP , durée, depuis quand ? Cardiaque ? apparition brutale ? \nMEOPA sans avoir ecarter un pneumo dans contexte de trauma costal traumatique il y a 10j": null, "Rivotril intra rectal ? ( hors PISU et hors AMM) A t'il été prescrit pour le medecin civil ( Ses coordonnées ? ) Si préscrit par medecin ce n'est pas un PISU .": null, "Antiémetique injecté : Lequel et posologie ? Paracetamol posé sur PISU ou sur préscription ? \nNom de MRH prescripteur": null, "Pas de TA . Pourquoi pas de profénid ?": null, "Pas de notion de pose de VVP . Nom du medecin prescripteur": null, "Malaise avec PCI dans quel contexte ? \nAttention il faut relire son bilan ( Gales de la conscience ???)": null, "Pas de bilan circonstanciel \nQuantité de sang perdu ? ( estimation ) Tu parles de chute suite à perte de connaissance = Malaise ? Haleine alcoolisée ? \nTransport paramédicalisé ? Notion de chute pas d'examen traumato de la tête au pied. SpO² à 90 + ronflement et pas d'auscultation": null, "Pourquoi pas de profenid ( Femur ? ) , ni de morphine ( EVA 10)\nTransport Helico ou VSAV ?": null, "Pourquoi pas de profenid ? Prescription faite par Dr SFAIRI": null, "Nom du regulateur ?": null, "Chute de cheval sur tete forte cinetique et pas de TC ???\nAuscultation trauma compléte ? oui et le resultat de cette auscultation complète ?\nExacyl ? motif ? diminution hemocue ? Quels critères pour exacyl ? PISU DCA ? Ta 12/8\nEt pas de morphine pour EVA à 8 ??\nTransport paramédicalisé ?": null, "Pense à preciser l'auscultation ( sibilants sur les 2 champs ).Quel PISU mis en place ? qu'as tu fait comme traitement ? Crachats verts et pas de prise temperature ?": null, "Murmure des lobes ? lesquels ? Glasgow ? Alors il est inconscient ou conscient ( les 2 sont notés) Desorientation temporo spatiale? mais inconscient ? Aphasique et aucune difficulté à parler ???\nPas de reprise de conscience ( dans bilan evolutif ....\nGrosses incoherences dans bilan": null, "Pourquoi pas de profenid ? utilisation de RL": null, "même avec SAMU penses à noter un minimum du bilan": null, "Il aurait ete judicieux de mettre une VVP et de demander au MRH si possibilité atropine ?": null, "Apparement auscultation faite mais bilan neuro pauvre. Notion de douleur thoracique constrictive et pas d'ECG signalé par ISP ( mais 2 par chef d'agrés mais aucune trace. 1er episode de tachycardie ? FC à 49 mais 240 par ISP et par de surveillance pendant transport ? EVA à 7 et pas d'antalgie ? Transport à Puigcerda ?": null, "Crise convulsive à 16h et intervention à 17h38 = Tu as vu la crise ? Perte de vigilance mais G 15 ?": null, "Bolus de morphine de 6 mg ? ou 2 X 3 mg ? \nAttention aux ecritures . Penser à se relire": null, "As tu fait quelque chose au patient ? Un minimum d'info est necessaire même si travail avec SAMU": null, "manque hemocue , TRC \nretrouvée au sol = Temperature ? \npas de surveillance post remplissage": null, "douleur thoracique dans quel contexte ? Pas de natispray\nNom medecin prescripteur": null, "Il aurait été judicieux d'avoir une notion d'un eventuel bilan lesionnel": null, "resucrage ?": null, "Type de douleur ? Irradiation ? Il est signalé une douleur abdo et aucun examen de l'abdomen ! Température à 33,8 ???? il serait bien de preciser que ce chiffre n'est pas à retenir ( teguments chaus ) car laisser une patiente en hypothermie est une grosse erreur": null, "toujours problème de bilan circonstanciel !!!le bilan circonstanciel n'est pas le motif d'alerte !! douleur thoracique = irradiation ? type douleur AnisoTA pas de verification des pouls peripherique": null, "oui une auscultation pulmonaire aurait été judicieuse. En effet penses à mettre ton nom": null, "ok avec remarques de la première lecture": null, "Pourquoi adrenaline IM + aérosol adre ? Polaramine ? qui est le prescripteur car pas dans ancien PISU": null, "Pas de bilan circonstanciel. \nil y a une precription merdicale": null, "douleur thoracique . contexte ? bilan douleur thoracique pauvre. Pas d'ECG ? EVA 10 à 2 ?? Antalgique ?\nPISU mis en place ?": null, "heureusement qu'il y a le bilan du chef d'agrés pour comprendre un peu la situation": null, "Auscultation pulmonaire ? \ntemperature ? ( notion d'hyperthermie": null, "pourquoi bolus de morphine de 2 mg ,EVA toujours elevée mais que 7 mg de morphine ??\nPourquoi MEOPA et PENTHROX ?": null, "aucun renseignement clinique mais PISU mis en place. une partie du bilan est dans les facteurs de risques": null, "Type de douleur ? brulure ? Une petite notion respiratoire aurait été necessaire": null, "meme en présence du SAMU un minimum de bilan doit être noté": null, "Pose de VVP ?": null, "toujours rien sur le bilan": null, "Pas d'ECG fait alors que signe OMI + HTA, toux grasse mais pas de temperature\nPISU mis en place ? Auscultation ? \nAttention aux abréviations ( BTA ? )": null, "Bilan ISP inexistant. Prescription de valium ; Posologie faite ? Nom du medecin prescripteur?": null, "a l'auscultation bruit surrajoutés ? Lesquels ? Sibilants ? Encombrement ? \nNom du medecin prescripteur?": null, "au vu des ATCD il aurait été peut être judicieux de faire un ECG\nnotion de douleur et pas d'EVA": null, "notion de chute dans le escaliers ( 6 m de haut ??). Palpation corps entier et quel resultat ? Pas de morphine pour EVA à 9 ? pas de constante ni de surveillance": null, "Pas de bilan ISP mais ECG fait le 1er ECG semble être un ECG de référence daté du 16/03/2026 mais non précisé": null, "pas de bilan circonstanciel ISP. saignement ?": null, "Pas de bilan circonstanciel\nGlasgow 7 , SpO² à 83% pas de SAMU ou de contact avec MRH ? \nTransport paramédicalisé ? \nBronchite : Pas de temperature ?": null, "Morphine quel dosage fait ?": null, "Pas d'auscultation pulmonaire . \nAttention notion de dyspnée ( circonstanciel ) et d'aucune dyspnée ( ventilatoire) dans le même bilan": null, "que 6 mg de morphine ?": null, "toujours problème de bilan circonstanciel. \nMorphine 1 mg ?? 4mg au total avec EVA à 4 pourquoi pas plus": null, "L'age n'est pas une CI au penthrox . Aucun CI pour le mettre.": null, "Pourquoi pas de profenid ? Combien de morphine injectée au total ? 4 ou 10 ?": null, "Obnubilé ? Glasgow ? Morphine CI car obnubilation \nMorphine sur EVA = ou sup à 7 Donc hors PISU": null, "Attention aux abréviations": null, "Nom du MRH prescripteur . Pourquoi demander l'accord du MRH alors que PISU ? \nRivotril et hypnovel ( prescription MRH ? )": null, "Pas de glycemie alors que contexte OH . Pas de bilan respi ni auscultation alors que chute de 10 marches": null, "Pas de bilan circonstanciel \nEt aprés pose attelle et MEOPA , il va comment ?": null, "Pas de bilan traumato ' palpation abdo , bassin , pas d'auscultation\nProtocole douleur ; Mais qu'a t'il reçu ?": null, "malaise d'origine alccolique ?? je ne comprends pas ce que vient faire la bouteille de 75 ( Bouteiile de quoi ? Il l'a bu ? bilan neuro aurait été judicieux": null, "il aurait été bien de signaler comment etait l'enfant ( calme, pleurs , paniqué ....)": null, "bilan neuro aurait merité d'être plus pointu . Bilan neuro post resucrage. Mouvements tonico clonisue mais pas de recherche de signe de convulsions ( morsure langue, urine...\nRessucrage per os et réevaluation une seule fois 10 min aprés la 1ere glycemie": null, "toujours pas de profenid .......": null, "Douleur irradiant dans le dos ( recherche de symetrie des pouls radiaux et femoraux auraient été judicieux. . Vu les ATCD , je pense qu'une VVP aurait été necessaire . Pourquoi pas de test au nitré ?": null, "manque le pouls": null, "retrouvé dans l'eau = auscultation souhaitable. Pas de pouls pris": null, "Pb tablette ? ou ISP n' a pas vu le patient ?": null, "Hypoglycémie avec dextro à 1,92 ?": null, "Un minimum neuro et respi necessaires": null, "Un minimum neuro, respi et cardio necessaire . \nPourquoi pas de penthrox ?": null, "L'ISP a t'il vu le patient ?": null, "G5 ou G10?": null, "bilan circonstanciel à revoir pas de recherche de signes de convulsions ( Urine et morsure de langue). pas de pose de VVP ?": null, "pas de bilan clinique même à minima vu la situation": null, "Paleur conjonctivale ? TRC ? EVA à 5 pas d'antalgie": null, "Pourquoi G 5%\nNom du MRH\nSAMU SLL finalement ?": null, "penses à noter quel medicament tu as fait . peut être qu'un ECG aurait été judicieux au vu des ATCD. notion d'expectorations mais pas de temperature. Auscultation post aérosol pour savoir si levé du bronchospasme\nPoids ? peut être pseudo asthme cardiaque ?": null, "Pas de glycémie": null, "convulse ? il faut donner les signes cliniques. Bruit à la respiration ? Pas d'auscultation. Hypnovel ? ( pas dan,s les anciens PISU sortis le 7 Avril )\nNom du medecin precripteur. Pas de transport paramédicalisé ?": null, "Bilan neuro a completer ; bilan respi et cardio absent . vertige ? trouble vestibulaire ?": null, "Pas de bilan evolutif . PISU bronchospasme : Tu lui as fait quoi ?": null, "le diagnostic n'est pas le bilan circonstanciel. toujours pas de profenid ....": null, "toujours problème de bilan circonstanciel . toujours pas de profenid": null, "chute dans les escaliers ? pas de bilan traumato complet. Et le profenid ?": null, "pas de HbCO ni auscultation pulmonaire": null, "problème tablette ? ISP n'a pas vu le patient ?( SAMU et EPMU SLL )": null, "je pense qu'il y a un melange des données entre les anciens et nouveaux PISU en cochant le pisu , certains medicaments se sont mis automatiquement\nPar contre auscultation pulmonaire aurait judificeuse": null, "Pas de réevalution d'EVA": null, "Juste noter quel ATB fait": null, "HbCO² à 90 ? erreur ecriture ? \nSi c'est le medecin SAMU qui dit VVP , Exacyl et Perfalgan ce n'est pas un PISU . Car aucun critère pour rentrer sur PISU DCA et Antalgie": null, "ECG apparemment fait mais non noté. Douleur à 6 et Pas d'antalgie ?": null, "Attention posologie Terbutaline et Atrovent ( dosage pediatrique)": null, "Si prescription , ce n'est pas un PISU . Nom du medecin prescripteur": null, "Pas de bilan circonstanciel\nFracture ouverte et pas d'ATB \nMorphine 3,3,2,2 et pas 3,3,3,1": null, "Paleur ? TRC ? Hb ?": null, "Toujours pas de bilan circonstanciel\nLe bilan neuro aurait pu être plus pointu": null, "Pas de bilan circonstaciel \nMême si photo , penses à noter que l'ECG a été fait": null, "Commence par le bilan avant de commencer par le traitment. Nom de medecin regulateur": null, "Attention avecles nouveaux pisu le natyspray se fait en accord du MRH": null, "Il aurait été bien de chercher des signes de crise comitiale, et de purpura": null, "Toujours pas de bilan circonstanciel . 1ere Crise comitiale ? Tu l'as vu ? 2 crise comitiale avec un glasgow à 15 rapidement ???ATCD Psy et pas d'anti epileptique...": null, "Le contexte SVP !!!!": null, "Vu que la clinique , on ne rentre pas dans la question decisionnelle du PISU9 qui dit detresse respi ET ATCD asthme ou BPCO . Il aurait fallu demander l'accord au MRH . Pas de fin de crise aprés 1er aérosol et pourquoi pas de 2éme aérosol et de VVP . Pas de SpO² sous O² ( 70% à AA). Demande de contact au MRH et pas de notion de cette echange avec le MRH . \nPas de prise temperature ( probable contexte infectieux car sous ATB )": null, "Dose de ketamine injectée ?\n6 mg de morphine seulement et reste à une EVA à 9 ? Pourqouoi pas de penthrox ?": null, "ECG = signe d'IDM ? diagnostic\nPosologie prescrites par medecin ? EVA à 5 et pas d'antalgie ?": null, "Pas de bilan initial. Bilan neuro aurait du être plus poussé car contexte hyperthermie ( raideur de nuque, photophobie?, purpura ? TA à 87/48 et pas reverifiée. traitement cardio , peut être a t'elle fait un bas debit sur problème cardio : ECG aurait été judicieux. \nCéphalées mais pas d'EVA \nTransport sans ISP ?": null, "Dyspnée et pas d'auscultation pulmonaire": null, "Tu as vu la crise ? G15 ? DTS ? attention aux abréviations. \nPense à mettre un petit bilan respi ( RAS ). Une temperature aurait pu être prise": null, "ECG aurait été utile et auscultation pulmonaire car ronfle": null, "Photophobie frissons cephalées . recherche purpura ? IRM cérebral demandé en urgence . peut être une demande de transport CH aurait été mieux . Il aurait peut etre insister aupres du MRH de signes neuro persistants avec une IRM demandé en urgence": null, "oubli prise de TA": null, "A t'il etait soulagé sous penthrox? tu le laisse partir sous penthrox avec EVA sans paramédicaliser ?": null, "Pas de bilan circonstanciel ( circonstance / contexte)Alors consciente ou inconsciente ? incohérence entre ton bilan circonstanciel et ton bilan initial et neuro": null, "detresse respi dans quel contexte ? Bilan circonstanciel !!!\nIl aurait été bien de reverifier la Frequence respiratoire avant de la laisser": null, "PISU bronchospasme ?mais pas d'ATCD asthme ou BPCO . Et que lui as tu fait comme produit dans ce PISU ?\nRespiration bruyante et pas d'auscultation , ni de temperature vu le contexte": null, "Si on suit le PISU à la lettre , il n' y a pas les critères d'y rentrer ( detresse respi ET ATCD asthme ou BPCO ) aurait du demander l'accord au MRH": null, "le patient a t'il était vu par l'ISP ?": null, "pourquoi utilisation d'adrenaline alors que pas de dyspnée signalée sur le bilan respi. la voie d'injection d'adrenaline n'a pas été notifiée. ses problèmes respiratoires sont présents depuis plusieurs semaines ( etat de base ) son problème allergie n'est qu'un stade 1": null, "pas de bilan circonstanciel": null, "devant l'hypoTA , une VVP aurait été judicieuse": null, "Bilan neuro leger . aucune notion de la ventilation . vu les risques cardio en cas de surdosage , un ECG et une VVP aurait été judicieux": null, "manque le nom du medecin regulateur qui a prescrit le keto": null, "manque le nom du medecin regulateur. Bilan un peu compliqué à lire . Pas besoin de mettre XABCDE avant chaque signe ( ça surcharge ton bilan)": null, "bilan pauvre": null, "bilan circonstanciel !!!!!Pas d'auscultation pulmonaire alors que difficulté respiratoire decrite. EVA à 9 et que paracetamol ? pas de reévaluation de la douleur": null, "Brulures quel degré? si je suis ta description je n'ai que 8% de brulé EVA 6 et pas de morphine ?": null, "PISU OAP et pose de 2 aérosols ? ( hors PISU ). détresse respi d'apparition lente sans HTA ni OMI , peut être infection pulmonaire mais pas de temperature. Bilan evolutif ? la patiente va t'elle mieux ? \nTransport non paramédicalisé ?": null, "Manque un minimum de données neuro": null, "Malgré les signes d'un bronchospasme , on est hors PISU car pas d'ATCD BPCO ou Asthme. ATCD cardio avec anomalie auscultation + Detresse respi ( HTA en plus ) = PISU OAP donc pas d'aérosol mais proposition Lasilix ou risordan": null, "Bilan initial pauvre EVA 4 pas d'antalgie": null, "Bilan douleur thoracique ( irradiation ? 1ere fois , )\nISOCARD ne peut se faire que sur prescription du MRH\nEVA 3 ( antalgie per os )": null, "Si tu as vu la patient un minimum de traces doit être sur le bilan": null, "Même si SAMU SLL un minimum de bilan doit apparaitre sur ton BPV": null, "Nom du MRH qui prescrit la modification des bolus . Dans ton bilan pas necessaire de noter XABCDE avant tes signes cliniques": null};
  const ANALYSE_MAP = {"Pas d'ABCDE\nPas de quantification de l'hémorragie\npas de palpation abdo, auscultation pulmonaire?\nA du mal à parler, pourquoi? à cause du trauma facial, pour une autre cause ??\nLa patiente n'est pas en détresse vitale, donc nous devrions avoir un bilan plus complet": null, "pas d'accord avec analyse APP chefferie\nBon bilan\nAérosol vu avec le MRH\nEffectivement bilan compact": null, "Troubles de la conscience + suie sur un feu d'habiation: intox aux cyanures?\nL'examen neuro est inexistant \npourquoi HBCO impossible ?\nEVA à zeo avec les brulures?\nPas de traitement mis en place, pourquoi?": null, "il y a un ECG \npar contre, je suppose qu'il y a eu un echange avec le med régulateur car la douleur est surtout à l'examen au niveau de l'épaule\nPour moi ECG nle mais la douleur étant typique au début, on devrait au moins avoir les écahnges avec med régulateurs": null, "probléme de morphine": null, "même commentaire que chefferie ISP": null, "Chute sur la tête donc TC alors que noté \"sans tc\" ??\nbaisse de l'hemocue de 11.8 à 9.6 en combien de temps?\non a une tachycardie à 145 à 16h36 alors qu'elle est à 111 à 16h07\nPerte de 2 points donc:\nil faut un examen clinique beaucoup plus développé\npas de prise en charge de la douleur \nOn n'a aucune sensibilisation sur le fait qu'on a un risque d'hémorragie interne alors que deux ampoules exacyl sont faites\nparamedicalisation? Médicalisation?": null, "Quand on lit le bilan on a aucune plue value dans l'apport de l'ISP\nOn ne sait pas ce qui se passe, pas d'examen clinque, on dirait un bilan de secourisme \nEn tant de MRH je ne sais absolument pas quoi en penser et quoi en faire, simple malaise vagal, un détresse circulatoire, hémorragie .....": null, "dossier vu en directe": null, "douleur tho est bien decrite mais \"perforation du poumon\" pnemothorax? Contusion pulmonaire ?\nen revanche, la douleur est elle costale, cardiaque, pulmonaire ?\nL'auscultation aurait été la bien venu\nPrise en charge de la douleur pour EVA à 9?": null, "description de la douleur\nirradiation?\nreproductible à la palpation?\ndurée\nnotion d'effort?\nauscultation pulmonaire?": null, "effectivement le BPV est complètement aberrant:\nglasgow 7 puis conscience normal et calme dans le bilan neuro": null, "pourquoi n'a on pas les ECG en piéce jointe?\nGlobalement bilan plutôt bon\non comprends bien la problématique \njuste manque le suivi de la TA et de la FC pendant le transport": null, "analyse de la situation trés bien faite en revanche point à faire sur le PISU": null, "douleur thoracique:\ndurée ?\n1er épisode?\nReproductible à la mobilisation....\nOu est l'ECG?": null, "pourquoi présence de l'ISP?\nCirconstanciel: RAS ???\nSi RAS l'ISP n'a rien à faire sur cette inter!": null, "pourquoi pas ECG\nLa pneumo et la cardio sont souvent lié chez les personnes âgées": null, "le bilan du secouriste est 20 fois mieux que celui de l'ISP qui est inexistant": null, "en plus patiente sous eliquis (bien précisé par le secouriste)\nrester au sol de 14h à 20h40: attention à la rhabdomyolyse\nnotion de douleur colonne par secouriste\nbilan doit être plus précis sur la palpation corps entier: abdo, ausc pulmonaire ?\nEVA à 9? diminution avec meopa et paracetamol?": null, "TC avec PC: le bilan neuro doit être détaillé avec un glasgow": null, "au vu de la clinique la prise en charge est coherente mais il aurait effectivement fallu avoir un contact tel avec le MRH\nla sat à l'air ambiant est à 95 et remonte à 98 sous O2 donc on peut se dire qu'on peut attendre un peu pour avoir le MRH au tel": null, "douleur thoracique dont on arrive pas à avoir la cause: cardiaque ou pulmonaire, voir juste trauma\nintérêt de l'auscultation pulmonaire surtout qu'on a une notion de trauma costal": null};
  const ACTION_MAP  = {"Faire un point avec l'ISP sur ce dossier et en fonction faire une petite MSP": null, "Juste lui dire de se relire pour ne pas oublier de mettre des espaces\nA recatégoriser en erreur simple, pas d'erreur grave": null, "Appeler l'ISP pour faire un point sur ce dossier": null, "allo ISP pour point sur ce dossier afin d'avoir plus de précision": null, "appeler l'ISP ne peut pas faire plus de 1 ampoule de morphine sans prescription MRH": null, "Appeler l'ISP et faire le point sur ce dossier\nsoit on est hors PISU sans prescrition: faire MSP sur la convulsion\nsoit ça a été prescrit par le médecin: lui rapeller l'importance médico légale de tout écrire dans le dossier médicale": null, "lui faire une MSP sur ce sujet\net l'envoyer faire le PHTLS si on a une place ou sinon le développer dans la MSP": null, "refaire une MSP sur les BPV": null, "Faire MSP sur le cas, prevu avec l'ISP kevin Wendenberg\nEn attente du retour": null, "Refaire un point avec l'ISP sur l'auscultation pulmonaire\nSi besoin refaire une petite formation si l'ISP le souhaite": null, "refaire une petite MSP sur la douleur thoracique": null, "Allo ISP pour lui rappeler l'importance medico légal du bilan\nIl faut savoir prendre quelques minutes pour relire avant d'envoyer car c'est ce qui est écrit qui reste!": null, "Poser la question à Brice pour ECG\nallo ISP pour lui rappeler l'importance du suivi des constantes pendant le transport surtout avec une tachycardie à 240 et une douleur thoracique": null, "allo ISP pour précision\nsi prescription MRH, il faut impérativement le noter et mettre le nom du MRH \nEncore une fois c'est ce qui est écrit qui fait fois, si on est hors PISU et qu'il n'est pas noté qu'on a une prescription c'est qu'on en a pas eu!": null, "Faire une MSP sur le thème de la douleur thoracique": null, "Convoquer l'ISP \non ne peut plus tolérer des bilan vide!": null, "faire un point avec l'ISP sur ce dossier pour mettre un évidence l'importance de faire un ECG \net de la température sur une probable pneumopathie": null, "Je me repete: convoquer l'ISP\nVoir lui retirer ses compétences si pas de prise de conscience rapide de la situation": null, "Allo ISP pour point sur ce dossier": null, "allo ISP rapelle sur PISU douleur et trouble neuro\nSi prescription par med samu: le noter!": null, "allo ISP pour demande d'explication\nrapeller l'importance de noter le nom du MRH c'est médico légal": null, "allo ISP pour explication sur ce bpv\nSi pas vu par l'ISP l'enlever des erreurs graves": null, "Allo ISP pour rappel de l'importance de rester dans le PISU": null, "revoir l'auscultation pulmonaire": null};

  // ── Reprendre état précédent ───────────────────────────────────────────────
  const savedChef    = JSON.parse(props.getProperty('RST_CHEF')    || '{}');
  const savedAnalyse = JSON.parse(props.getProperty('RST_ANALYSE') || '{}');
  const savedAction  = JSON.parse(props.getProperty('RST_ACTION')  || '{}');
  const startIdx     = parseInt(props.getProperty('RST_IDX') || '0', 10);

  // Fusionner les résultats trouvés lors des runs précédents
  Object.keys(savedChef).forEach(k    => { if (k in CHEF_MAP)    CHEF_MAP[k]    = savedChef[k];    });
  Object.keys(savedAnalyse).forEach(k => { if (k in ANALYSE_MAP) ANALYSE_MAP[k] = savedAnalyse[k]; });
  Object.keys(savedAction).forEach(k  => { if (k in ACTION_MAP)  ACTION_MAP[k]  = savedAction[k];  });

  const countRemaining = () =>
    [CHEF_MAP, ANALYSE_MAP, ACTION_MAP]
      .reduce((s, m) => s + Object.values(m).filter(v => v === null).length, 0);

  // ── Récupérer la liste des révisions ──────────────────────────────────────
  Logger.log('Chargement des révisions...');
  const revisions = _diagGetRevisionsList(fileId);
  Logger.log(revisions.length + ' révisions, reprise à ' + startIdx);

  const norm = s => String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  function matchInRows(csvRows, map, colIdx) {
    for (const text in map) {
      if (map[text] !== null) continue;
      const normText = norm(text);
      for (let r = 1; r < csvRows.length; r++) {
        if (csvRows[r] && csvRows[r].length > colIdx &&
            norm(csvRows[r][colIdx]) === normText) {
          map[text] = String(csvRows[r][0] || '').trim();
          break;
        }
      }
    }
  }

  // ── Parcourir les révisions (oldest → newest) ──────────────────────────────
  let curIdx = startIdx;
  while (curIdx < revisions.length) {
    if (countRemaining() === 0) {
      Logger.log('Tous les commentaires trouvés !');
      break;
    }
    if (Date.now() - startTime > MAX_MS) {
      // Sauvegarder et pauser
      const foundChef = {}, foundAnalyse = {}, foundAction = {};
      Object.keys(CHEF_MAP).forEach(k    => { if (CHEF_MAP[k]    !== null) foundChef[k]    = CHEF_MAP[k]; });
      Object.keys(ANALYSE_MAP).forEach(k => { if (ANALYSE_MAP[k] !== null) foundAnalyse[k] = ANALYSE_MAP[k]; });
      Object.keys(ACTION_MAP).forEach(k  => { if (ACTION_MAP[k]  !== null) foundAction[k]  = ACTION_MAP[k]; });
      props.setProperty('RST_IDX',     String(curIdx));
      props.setProperty('RST_CHEF',    JSON.stringify(foundChef));
      props.setProperty('RST_ANALYSE', JSON.stringify(foundAnalyse));
      props.setProperty('RST_ACTION',  JSON.stringify(foundAction));
      Logger.log('Pause rev ' + curIdx + '/' + revisions.length +
                 ' — ' + countRemaining() + ' restants. Relancez restoreCommentsFromRevisions().');
      return;
    }

    const rev = revisions[curIdx];
    let baseUrl = (rev.exportLinks && rev.exportLinks['text/csv'])
        ? rev.exportLinks['text/csv'] : null;
    if (!baseUrl) baseUrl = _diagGetExportUrl(fileId, rev.id);

    if (baseUrl) {
      const needAlex = Object.values(CHEF_MAP).some(v => v === null);
      const needEve  = Object.values(ANALYSE_MAP).some(v => v === null) ||
                       Object.values(ACTION_MAP).some(v => v === null);

      if (needAlex) {
        const csv = _diagFetchCsv(baseUrl, gidAlex);
        if (csv) matchInRows(_diagParseCSV(csv), CHEF_MAP, 12);
      }
      if (needEve) {
        const csv = _diagFetchCsv(baseUrl, gidEve);
        if (csv) {
          const rows = _diagParseCSV(csv);
          matchInRows(rows, ANALYSE_MAP, 14);
          matchInRows(rows, ACTION_MAP,  16);
        }
      }
    }
    curIdx++;
  }

  // ── Terminé — nettoyer état et appliquer ──────────────────────────────────
  ['RST_IDX','RST_CHEF','RST_ANALYSE','RST_ACTION'].forEach(k => props.deleteProperty(k));

  const notFound = countRemaining();
  if (notFound > 0) {
    Logger.log(notFound + ' commentaires non trouvés dans l\'historique.');
  }

  // Sauvegarder les résultats dans PropertiesService pour restoreApplyFoundIds()
  const allFound = {};
  Object.keys(CHEF_MAP).forEach(k    => { if (CHEF_MAP[k])    allFound['C_' + k] = CHEF_MAP[k]; });
  Object.keys(ANALYSE_MAP).forEach(k => { if (ANALYSE_MAP[k]) allFound['A_' + k] = ANALYSE_MAP[k]; });
  Object.keys(ACTION_MAP).forEach(k  => { if (ACTION_MAP[k])  allFound['Q_' + k] = ACTION_MAP[k]; });

  // Diviser en chunks (PropertiesService: 9Ko max par clé)
  const entries = Object.entries(allFound);
  const chunkSize = 50;
  let chunkIdx = 0;
  for (let i = 0; i < entries.length; i += chunkSize) {
    props.setProperty('RST_FOUND_' + chunkIdx, JSON.stringify(Object.fromEntries(entries.slice(i, i+chunkSize))));
    chunkIdx++;
  }
  props.setProperty('RST_FOUND_N', String(chunkIdx));

  Logger.log('Recherche terminée. ' + entries.length + ' IDs trouvés, ' + notFound + ' non trouvés.');
  Logger.log('Lancez maintenant restoreApplyFoundIds() depuis le menu.');
  SpreadsheetApp.getUi().alert(
    'Recherche terminée !\n' +
    entries.length + ' commentaires associés à leurs IDs.\n' +
    (notFound > 0 ? notFound + ' non trouvés dans l\'historique.\n' : '') +
    'Lancez maintenant "Appliquer restauration" depuis le menu ADMIN.'
  );
}

/**
 * RESTAURATION — Etape 2/2 : écrire les commentaires dans le spreadsheet
 * À lancer après restoreCommentsFromRevisions().
 */
function restoreApplyFoundIds() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();

  const nChunks = parseInt(props.getProperty('RST_FOUND_N') || '0', 10);
  if (nChunks === 0) {
    SpreadsheetApp.getUi().alert('Aucun résultat trouvé. Lancez d\'abord restoreCommentsFromRevisions().');
    return;
  }

  // Reconstituer la map (type_text: id)
  const allFound = {};
  for (let i = 0; i < nChunks; i++) {
    const chunk = JSON.parse(props.getProperty('RST_FOUND_' + i) || '{}');
    Object.assign(allFound, chunk);
  }

  const shApp  = ss.getSheetByName(APP_SHEET_NAME);
  const shAlex = ss.getSheetByName('APP Alex');
  const shEve  = ss.getSheetByName('APP Eve');

  const appData  = shApp.getDataRange().getValues();
  const alexData = shAlex.getDataRange().getValues();
  const eveData  = shEve ? shEve.getDataRange().getValues() : [];

  // Index par ID
  const appRowById  = {};
  const alexRowById = {};
  const eveRowById  = {};
  for (let i = 1; i < appData.length;  i++) { const id = String(appData[i][C_APP_ID]||'').trim(); if(id) appRowById[id]  = i+1; }
  for (let i = 1; i < alexData.length; i++) { const id = String(alexData[i][0]||'').trim();      if(id && !alexRowById[id]) alexRowById[id] = i+1; }
  for (let i = 1; i < eveData.length;  i++) { const id = String(eveData[i][0]||'').trim();       if(id && !eveRowById[id])  eveRowById[id]  = i+1; }

  let nChef = 0, nAnalyse = 0, nAction = 0, nMiss = 0;

  for (const key in allFound) {
    const id   = String(allFound[key] || '').trim();
    const text = key.substring(2);  // retirer préfixe C_, A_, Q_
    const type = key.substring(0, 2);
    if (!id || !text) continue;

    const appRow = appRowById[id];

    if (type === 'C_') {
      const alexRow = alexRowById[id];
      if (alexRow) shAlex.getRange(alexRow, 13).setValue(text);
      if (appRow)  shApp.getRange(appRow, C_COMM_CHEF + 1).setValue(text);
      if (alexRow || appRow) nChef++; else nMiss++;

    } else if (type === 'A_') {
      if (!eveRowById[id]) {
        const nr = shEve.getLastRow() + 1;
        shEve.getRange(nr, 1).setValue(id);
        eveRowById[id] = nr;
      }
      shEve.getRange(eveRowById[id], 15).setValue(text);
      if (appRow) shApp.getRange(appRow, C_COMM_MED + 1).setValue(text);
      nAnalyse++;

    } else if (type === 'Q_') {
      if (!eveRowById[id]) {
        const nr = shEve.getLastRow() + 1;
        shEve.getRange(nr, 1).setValue(id);
        eveRowById[id] = nr;
      }
      shEve.getRange(eveRowById[id], 17).setValue(text);
      if (appRow) shApp.getRange(appRow, C_ACTION_MED + 1).setValue(text);
      nAction++;
    }
  }

  // Nettoyer les propriétés
  for (let i = 0; i < nChunks; i++) props.deleteProperty('RST_FOUND_' + i);
  props.deleteProperty('RST_FOUND_N');

  CacheService.getScriptCache().remove('chefferie_counts_v4');
  CacheService.getScriptCache().remove('all_isp_error_stats');

  const msg = 'Restauration appliquee !\n' +
              nChef + ' commentaires chefferie\n' +
              nAnalyse + ' analyses médecin\n' +
              nAction + ' actions\n' +
              (nMiss > 0 ? nMiss + ' non trouvés dans APP (ID absent).' : '');
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
}

function restoreReset() {
  const props = PropertiesService.getScriptProperties();
  ['RST_IDX','RST_CHEF','RST_ANALYSE','RST_ACTION'].forEach(k => props.deleteProperty(k));
  const n = parseInt(props.getProperty('RST_FOUND_N') || '0');
  for (let i = 0; i < n; i++) props.deleteProperty('RST_FOUND_' + i);
  props.deleteProperty('RST_FOUND_N');
  Logger.log('État restauration réinitialisé.');
}
