#!/bin/bash
# Déploiement production — Labocea PMC V2
# URL : labocea-pmc-v2.tomkerf.workers.dev
# ⚠️  Toujours valider sur staging avant de lancer ce script

set -e

echo "⚠️  Déploiement PRODUCTION"
read -p "Tu as validé sur staging ? (oui/non) : " confirm
if [ "$confirm" != "oui" ]; then
  echo "Annulé. Valide d'abord sur staging avec bash deploy-dev.sh"
  exit 1
fi

echo "🔨 Build..."
npm run build

echo "🚀 Déploiement production..."
npx wrangler deploy --name labocea-pmc-v2

echo "✅ Production déployée : https://labocea-pmc-v2.tomkerf.workers.dev"
