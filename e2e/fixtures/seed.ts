// Seed Firestore Emulator pour les tests E2E — utilise firebase-admin, qui
// bypass les règles de sécurité et se connecte automatiquement à l'emulator
// via les variables d'env FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
// (positionnées par playwright.config.ts avant le lancement des tests).
import { initializeApp, getApps, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export const E2E_PROJECT_ID = 'pmc-v2-e2e'
export const E2E_TECH_EMAIL = 'e2e-tech@labocea.test'
export const E2E_TECH_PASSWORD = 'e2e-test-password'
export const E2E_TECH_INITIALES = 'E2E'

// Contre l'emulator, aucun credential réel n'est requis — FIRESTORE_EMULATOR_HOST
// et FIREBASE_AUTH_EMULATOR_HOST (positionnées par playwright.config.ts) suffisent.
function adminApp(): App {
  return getApps()[0] ?? initializeApp({ projectId: E2E_PROJECT_ID })
}

function todayParts() {
  const now = new Date()
  return { plannedMonth: now.getMonth(), plannedDay: now.getDate() }
}

/** Crée un user technicien (Auth + Firestore) et un client avec un plan
 *  ponctuel planifié aujourd'hui + un plan Automatique (Bilan 24h) J1 aujourd'hui.
 *  Retourne les ids utiles aux specs pour construire les URLs / assertions. */
export async function seedE2eData() {
  const app = adminApp()
  const auth = getAuth(app)
  const db = getFirestore(app)

  // Repart d'un état propre à chaque run
  await auth.listUsers().then((r) => Promise.all(r.users.map((u) => auth.deleteUser(u.uid)))).catch(() => {})
  const collections = ['clients-v2', 'users']
  for (const col of collections) {
    const snap = await db.collection(col).get()
    await Promise.all(snap.docs.map((d) => d.ref.delete()))
  }

  const user = await auth.createUser({
    email: E2E_TECH_EMAIL,
    password: E2E_TECH_PASSWORD,
    emailVerified: true,
  })

  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    prenom: 'E2E',
    nom: 'Test',
    initiales: E2E_TECH_INITIALES,
    email: E2E_TECH_EMAIL,
    role: 'technicien',
    createdAt: new Date(),
    lastLoginAt: new Date(),
  })

  const { plannedMonth, plannedDay } = todayParts()
  const clientId = 'e2e-client-1'
  const planPonctuelId = 'e2e-plan-ponctuel'
  const samplingPonctuelId = 'e2e-sampling-ponctuel'
  const planBilan24Id = 'e2e-plan-bilan24'
  const samplingBilan24Id = 'e2e-sampling-bilan24'

  await db.collection('clients-v2').doc(clientId).set({
    id: clientId,
    annee: String(new Date().getFullYear()),
    nom: 'Client E2E',
    numClient: 'E2E-001',
    nouvelleDemande: 'Annuelle',
    interlocuteur: '', telephone: '', mobile: '', email: '', fonction: '',
    mission: '', segment: 'A', numDevis: '', numConvention: '',
    preleveur: E2E_TECH_INITIALES,
    dureeContrat: '', periodeIntervention: '',
    sites: ['Quimper'],
    montantTotal: 0, partPMC: 0, partSousTraitance: 0,
    plans: [
      {
        id: planPonctuelId,
        nom: 'Point E2E ponctuel',
        siteNom: 'Site E2E',
        frequence: 'Mensuel',
        meteo: '',
        nature: 'Eau usée',
        methode: 'Ponctuel',
        lat: '', lng: '', gpsApprox: false,
        customMonths: [], bimensuelMonths: [], defaultDay: plannedDay,
        customDays: {}, defaultWeeklyDay: 0,
        samplings: [{
          id: samplingPonctuelId,
          num: 1,
          plannedMonth, plannedDay,
          status: 'planned',
          doneDate: '', comment: '', nappe: '', rapportPrevu: false,
          rapportDate: '', tente: false, reportHistory: [], doneBy: '',
        }],
      },
      {
        id: planBilan24Id,
        nom: 'Point E2E Bilan 24h',
        siteNom: 'Site E2E',
        frequence: 'Mensuel',
        meteo: '',
        nature: 'Eau usée',
        methode: 'Automatique',
        lat: '', lng: '', gpsApprox: false,
        customMonths: [], bimensuelMonths: [], defaultDay: plannedDay,
        customDays: {}, defaultWeeklyDay: 0,
        samplings: [{
          id: samplingBilan24Id,
          num: 1,
          plannedMonth, plannedDay,
          status: 'planned',
          doneDate: '', comment: '', nappe: '', rapportPrevu: false,
          rapportDate: '', tente: false, reportHistory: [], doneBy: '',
        }],
      },
    ],
  })

  return {
    uid: user.uid,
    clientId, planPonctuelId, samplingPonctuelId, planBilan24Id, samplingBilan24Id,
  }
}
