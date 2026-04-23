# Commande : fin de session

1. Mettre à jour `DEV_LOG.md` :
   - Ajouter une section "Session N" avec la date
   - Résumer ce qui a été fait (bugs corrigés, features ajoutées, décisions prises)
   - Noter les causes racines des bugs si applicable
   - Lister les prochaines étapes identifiées

2. Mettre à jour `ROADMAP.md` :
   - Ajouter une ligne dans le journal de progression
   - Format : `| YYYY-MM-DD | Phase X | Ce qui a été fait |`

3. Committer les fichiers MD :
   ```
   git add DEV_LOG.md ROADMAP.md && git commit -m "docs: mise à jour DEV_LOG et ROADMAP — session N"
   ```

4. Rappeler la commande de déploiement si des modifications de code ont été faites :
   ```
   git push origin main && bash deploy-dev.sh
   ```
