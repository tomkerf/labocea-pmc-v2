#!/bin/bash
# Déploiement staging — Labocea PMC V2
# URL : labocea-pmc-v2-dev.tomkerf.workers.dev

set -e

echo "🔨 Build..."
npm run build

echo "🚀 Déploiement staging..."
npx wrangler deploy --name labocea-pmc-v2-dev

echo "✅ Staging déployé : https://labocea-pmc-v2-dev.tomkerf.workers.dev"
