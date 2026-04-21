// ============================================================
// TYPES — Labocea PMC V2
// Interfaces TypeScript pour toutes les collections Firestore
// ============================================================

import { Timestamp } from 'firebase/firestore'

// --- Utilisateurs ---

export type UserRole = 'technicien' | 'charge_mission' | 'admin'

export interface AppUser {
  uid: string
  prenom: string
  nom: string
  initiales: string
  email: string
  role: UserRole
  avatarColor?: string
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

// --- Clients / Missions ---

export type NouvelleDemandeType = 'Annuelle' | 'Avenant' | 'Ponctuelle'
export type SegmentType =
  | 'SRA'
  | 'Réseau de mesure'
  | 'RSDE'

export type SamplingStatus = 'planned' | 'done' | 'overdue' | 'non_effectue'
export type FrequenceType = 'Mensuel' | 'Bimensuel' | 'Trimestriel' | 'Semestriel' | 'Annuel'
export type NatureEauType = 'Eau usée' | 'Rivière' | 'Souterraine' | 'Eau pluviale' | 'Eau saline' | 'Boues' | 'Autre'
export type MethodeType = 'Ponctuel' | 'Composite' | 'Automatique'
export type NappeType = 'haute' | 'basse' | ''

export interface ReportHistory {
  from: string
  to: string
  by: string       // uid
  reason: string
  at: string       // ISO timestamp
}

/** Entrée du journal d'audit d'un prélèvement */
export interface SamplingHistoryEntry {
  at: string        // ISO timestamp (new Date().toISOString())
  by: string        // uid du technicien connecté
  byNom: string     // nom dénormalisé pour affichage sans lookup
  field: string     // champ modifié (ex: "status", "doneDate"…)
  from: string      // ancienne valeur en texte lisible
  to: string        // nouvelle valeur en texte lisible
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface Sampling {
  id: string
  num: number
  plannedMonth: number    // 0-11
  plannedDay: number
  plannedTime?: string    // "HH:MM"
  status: SamplingStatus
  doneDate: string        // "2026-03-25" | ""
  comment: string
  nappe: NappeType
  rapportPrevu: boolean
  rapportDate: string
  tente: boolean
  reportHistory: ReportHistory[]
  doneBy: string          // uid
  checklist?: ChecklistItem[]
  /** Motif de non-réalisation ou de report (visible si status = non_effectue | overdue) */
  motif?: string
  /** Journal d'audit : chaque modification de champ sensible est tracée ici */
  history?: SamplingHistoryEntry[]
}

export interface Plan {
  id: string
  nom: string
  siteNom: string
  frequence: FrequenceType
  meteo: string
  nature: NatureEauType
  methode: MethodeType
  lat: string
  lng: string
  gpsApprox: boolean
  customMonths: number[]
  bimensuelMonths: number[]
  defaultDay: number
  customDays: Record<string, number>
  samplings: Sampling[]
}

export interface Client {
  id: string
  annee: string
  nom: string
  numClient: string
  nouvelleDemande: NouvelleDemandeType
  interlocuteur: string
  telephone: string
  mobile: string
  email: string
  fonction: string
  mission: string
  segment: SegmentType
  numDevis: string
  numConvention: string
  preleveur: string
  dureeContrat: string
  periodeIntervention: string
  sites: string[]
  montantTotal: number
  partPMC: number
  partSousTraitance: number
  plans: Plan[]
  _v2ts?: Timestamp
  createdBy: string
  updatedBy: string
  updatedAt: Timestamp
}

// --- Équipements ---

export type CategorieEquipement =
  | 'preleveur'
  | 'debitmetre'
  | 'multiparametre'
  | 'glaciere'
  | 'enregistreur'
  | 'thermometre'
  | 'reglet'
  | 'eprouvette'
  | 'flacon'
  | 'pompe_pz'
  | 'sonde_niveau'
  | 'chronometre'

export type CategorieType = CategorieEquipement
export type EtatEquipement = 'operationnel' | 'en_maintenance' | 'hors_service' | 'prete'
export type EtatType = EtatEquipement
export type LocalisationEquipement = 'labo' | 'terrain' | 'externe'
export type LocalisationType = LocalisationEquipement

export type MateriauFlacon = 'plastique' | 'verre' | ''

export interface FicheDeVieNote {
  id: string
  date: string       // ISO date
  titre: string
  notes: string
  auteur?: string    // initiales ou nom
}

export interface Equipement {
  id: string
  nom: string
  marque: string
  modele: string
  numSerie: string
  categorie: CategorieEquipement
  dateAcquisition: string  // ISO date
  etat: EtatEquipement
  localisation: LocalisationEquipement
  notes: string
  prochainEtalonnage: string  // ISO date
  ficheDeVieNotes?: FicheDeVieNote[]
  // Champs spécifiques aux flacons
  volume?: string             // ex: "20L", "1L"
  poids?: string              // ex: "0.570 kg" (stocké en string pour flexibilité)
  materiau?: MateriauFlacon
  createdBy: string
  updatedAt: Timestamp
}

// --- Demandes clients (pipeline commercial) ---

export type DemandeStatut =
  | 'attente_devis'
  | 'devis_envoye'
  | 'visite_prelim'
  | 'devis_signe'
  | 'refuse'
  | 'converti'

export interface Demande {
  id: string
  contactNom: string
  contactSociete: string
  contactEmail: string
  contactTel: string
  lieu: string
  segment: string
  description: string
  frequence: string
  nbPoints: string
  montantDevis: string
  dateDevis: string
  statut: DemandeStatut
  preleveurUid: string   // uid V2 du technicien assigné
  notes: string
  dateReception: string  // ISO date
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// --- Événements personnels (planning) ---

export type TypeEvenement = 'rappel' | 'reunion' | 'rapport' | 'autre'

export interface EvenementPersonnel {
  id: string
  titre: string
  date: string           // "2026-04-20" — date début
  dateFin?: string       // "2026-04-24" — date fin (undefined = jour unique)
  heure?: string         // "09:00"
  type: TypeEvenement
  notes?: string
  createdBy: string
  createdByInitiales?: string   // dénormalisé — initiales du créateur (ex: "THK")
  createdAt: Timestamp
}

// --- Vérifications métrologiques ---

export type TypeVerification = 'etalonnage_interne' | 'verification_externe' | 'controle_terrain'
export type ResultatVerification = 'conforme' | 'non_conforme' | 'a_reprendre'

export interface Verification {
  id: string
  equipementId: string
  equipementNom: string
  type: TypeVerification
  date: string              // ISO date
  resultat: ResultatVerification
  remarques: string
  prochainControle: string  // ISO date
  technicienUid: string
  technicienNom: string
  documentUrl: string
  createdAt: Timestamp
}

// --- Maintenances ---

export type TypeMaintenance = 'preventive' | 'corrective' | 'panne'
export type StatutMaintenance = 'planifiee' | 'en_cours' | 'realisee' | 'abandonnee'

export interface Maintenance {
  id: string
  equipementId: string
  equipementNom: string
  type: TypeMaintenance
  statut: StatutMaintenance
  datePrevue: string        // ISO date
  dateRealisee: string | null
  dureeHeures: number | null
  description: string
  travauxRealises: string
  piecesRemplacees: string
  technicienUid: string
  technicienNom: string
  cout: number | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
