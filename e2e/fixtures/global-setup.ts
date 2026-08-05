// Lance une fois avant tous les tests (après le démarrage des webServer
// firebase emulators + vite dev, cf. playwright.config.ts). Seed les données
// via firebase-admin, qui se connecte à l'emulator grâce à ces variables d'env.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199'

import { seedE2eData } from './seed'

export default async function globalSetup() {
  await seedE2eData()
}
