#!/bin/bash
# Export Firestore vers Google Cloud Storage.
# Prérequis : gcloud CLI installé et authentifié (gcloud auth login).
# Bucket GCS à créer une seule fois : gcloud storage buckets create gs://labocea-pmc-backups --location=europe-west1
#
# Usage :
#   ./backup-firestore.sh           → export de toutes les collections
#   ./backup-firestore.sh --dry-run → affiche la commande sans l'exécuter

set -euo pipefail

PROJECT_ID="labocea-pmc"
BUCKET="gs://labocea-pmc-backups"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
EXPORT_PATH="${BUCKET}/exports/${TIMESTAMP}"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "[dry-run] gcloud firestore export ${EXPORT_PATH} --project=${PROJECT_ID}"
  exit 0
fi

echo "→ Export Firestore vers ${EXPORT_PATH}..."
gcloud firestore export "${EXPORT_PATH}" --project="${PROJECT_ID}"
echo "✓ Export terminé : ${EXPORT_PATH}"

# Nettoyage : garder seulement les 12 exports les plus récents
echo "→ Nettoyage des exports anciens (garde les 12 derniers)..."
EXPORTS=$(gcloud storage ls "${BUCKET}/exports/" --project="${PROJECT_ID}" | sort -r)
COUNT=0
while IFS= read -r export_dir; do
  COUNT=$((COUNT + 1))
  if [[ $COUNT -gt 12 ]]; then
    echo "  Suppression : ${export_dir}"
    gcloud storage rm -r "${export_dir}" --project="${PROJECT_ID}"
  fi
done <<< "$EXPORTS"

echo "✓ Backup terminé."
