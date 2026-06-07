export const CHANGELOG_VERSION = '117'

export type ChangelogEntry = {
  version: string
  date: string
  items: { type: 'feat' | 'fix'; label: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '117',
    date: '7 juin 2026',
    items: [
      { type: 'feat', label: 'Météo du planning augmentée de 3 à 14 jours' },
      { type: 'feat', label: 'Ajout du condensé météo (ex: 8h-12h) sur les vues Semaine, Mois, et Jour du planning' },
    ],
  },
  {
    version: '114',
    date: '6 juin 2026',
    items: [
      { type: 'feat', label: 'Guidage GPS : Lancement de l\'itinéraire Google Maps depuis la vue Tournée (avec découpage dynamique)' },
      { type: 'feat', label: 'Tournée : Alerte visuelle (⚠️) pour les points de prélèvement sans coordonnées GPS configurées' },
      { type: 'fix', label: 'Dashboard : Correction du total et des segments mutuellement exclusifs sur le graphique du parc matériel' },
    ],
  },
  {
    version: '111',
    date: '6 juin 2026',
    items: [
      { type: 'fix', label: 'Correction du chargement météo dans les tests unitaires' },
      { type: 'fix', label: 'Ajout du support reduced-motion pour l\'accessibilité visuelle (WCAG 2.3.3)' },
      { type: 'fix', label: 'Stabilisation de la configuration de tests Vitest / Storybook' },
    ],
  },
  {
    version: '106',
    date: '5 juin 2026',
    items: [
      { type: 'fix', label: 'Améliorations techniques et corrections de bugs invisibles (React Doctor, Typage strict)' },
    ],
  },
  {
    version: '105',
    date: '5 juin 2026',
    items: [
      { type: 'feat', label: 'Améliorations techniques et de performance sous le capot (page mission)' },
    ],
  },
  {
    version: '104',
    date: '5 juin 2026',
    items: [
      { type: 'feat', label: 'Modale d\'événement : Nouveau bouton de validation plus visible' },
      { type: 'feat', label: 'Modale d\'événement : Le formulaire de retrait est désormais masqué dans un accordéon pour alléger l\'interface' },
      { type: 'feat', label: 'Planning : Ajout du bouton "Bilan du mois"' },
    ],
  },
  {
    version: '96',
    date: '2 juin 2026',
    items: [
      { type: 'fix',  label: 'Filtre Brest/Quimper appliqué aux événements et bilans 24h du planning' },
      { type: 'feat', label: 'Matrice annuelle : décomptes Fait / Planifié / En retard / Non effectué dans la légende' },
      { type: 'fix',  label: 'Pastilles rouges pour les prélèvements planifiés dont la date est dépassée' },
      { type: 'fix',  label: 'Dashboard Suivi équipe filtré sur l\'année courante (cohérence avec la matrice)' },
    ],
  },
  {
    version: '95',
    date: '2 juin 2026',
    items: [
      { type: 'feat', label: 'Mode d\'emploi : filtre par profil (technicien / CM / admin)' },
      { type: 'fix',  label: 'Mode d\'emploi : corrections des inexactitudes (filtres planning, KPIs dashboard)' },
    ],
  },
  {
    version: '94',
    date: '2 juin 2026',
    items: [
      { type: 'feat', label: 'Fiche client : champs sous-traitance (hasSousTraitance, nomSousTraitant)' },
      { type: 'feat', label: 'Fiche client : champ interlocuteurCommercial (commercial interne)' },
      { type: 'feat', label: 'Fiche client : réorganisation en 5 sections logiques' },
    ],
  },
]
