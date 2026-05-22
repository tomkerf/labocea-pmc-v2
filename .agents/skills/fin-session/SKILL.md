---
name: fin-session
description: "Clôturer la session de développement Labocea PMC V2. Met à jour DEV_LOG.md et ROADMAP.md, puis fournit les commandes git. Utiliser en fin de session."
---

1. Mettre à jour `DEV_LOG.md` :
   - Ajouter une section "Session N" avec la date du jour
   - Résumer ce qui a été fait (bugs corrigés, features ajoutées, décisions prises)
   - Noter les causes racines des bugs si applicable
   - Lister les prochaines étapes identifiées

2. Mettre à jour `ROADMAP.md` :
   - Ajouter une ligne dans le journal de progression
   - Format : `| YYYY-MM-DD | Thème | Ce qui a été fait |`

3. Fournir la commande git à lancer depuis le terminal :
   ```
   git add DEV_LOG.md ROADMAP.md && git commit -m "docs: mise à jour DEV_LOG et ROADMAP — session N"
   ```

4. Si des modifications de code ont été faites dans la session, rappeler :
   ```
   git push origin main && bash deploy-dev.sh
   ```
