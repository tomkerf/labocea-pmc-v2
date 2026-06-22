export const CHANGELOG_VERSION = '127'

export type ChangelogEntry = {
  version: string
  date: string
  items: { type: 'feat' | 'fix'; label: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '127',
    date: '22 juin 2026',
    items: [
      { type: 'feat', label: 'Navigation : Organisation des menus en sections thématiques (Activité, Matériel, Outils, Espace) inspirée du style Apple.' },
      { type: 'feat', label: 'Tournée : Accès direct aux détails et consignes du point de mesure (Mémoire du point) depuis la liste des sites à visiter.' },
      { type: 'feat', label: 'Planning : La colonne des techniciens reste fixe lors du défilement horizontal dans la matrice de charge.' },
    ],
  },
  {
    version: '126',
    date: '21 juin 2026',
    items: [
      { type: 'fix', label: 'Avatars & Couleurs : Dégradés linéaires vibrants Apple-style (plus joyeux, texte blanc contrasté) et ajustement automatique de la taille du texte pour les initiales de plus de 2 lettres.' },
    ],
  },
  {
    version: '125',
    date: '18 juin 2026',
    items: [
      { type: 'feat', label: 'Matériel : Ajout d\'un bouton d\'export PDF direct de la fiche de vie sur chaque équipement depuis la liste' },
    ],
  },
  {
    version: '124',
    date: '14 juin 2026',
    items: [
      { type: 'fix', label: 'Planning : Les Bilans 24h ne sont plus décalés d\'un jour en arrière si la date réalisée est utilisée comme brouillon' },
    ],
  },
  {
    version: '123',
    date: '13 juin 2026',
    items: [
      { type: 'fix', label: 'Planning : La colonne d\'un jour de congé se grise uniquement pour le technicien concerné' },
    ],
  },
  {
    version: '122',
    date: '12 juin 2026',
    items: [
      { type: 'fix', label: 'Planning : Rétablissement de la météo pour les semaines avec interventions non géolocalisées' },
      { type: 'feat', label: 'Planning : Extension des prévisions météo jusqu\'à 16 jours (maximum de l\'API)' },
    ],
  },
  {
    version: '121',
    date: '12 juin 2026',
    items: [
      { type: 'feat', label: 'Planning : Refonte visuelle des pastilles de mission pour une meilleure lisibilité (design épuré)' },
      { type: 'feat', label: 'Planning : Réorganisation des boutons de vue en deux groupes (Calendrier / Analytique)' },
      { type: 'feat', label: 'Plan de charge : La capacité maximale théorique s\'adapte désormais dynamiquement au filtre par site' },
    ],
  },
  {
    version: '120',
    date: '11 juin 2026',
    items: [
      { type: 'feat', label: 'Dashboard : Ajout d\'un badge d\'alerte orange/rouge sur le widget "Temps de pluie" si des prélèvements sont en retard' },
    ],
  },
  {
    version: '119',
    date: '9 juin 2026',
    items: [
      { type: 'feat', label: 'Garde-fou : Le matériel déjà réservé sur un autre prélèvement le même jour est désormais grisé et non cliquable' },
      { type: 'feat', label: 'Assignation plus rapide : La liste des équipements à assigner pour un Bilan 24h ne propose plus que les débitmètres, préleveurs automatiques et flacons' },
      { type: 'feat', label: 'Clarté : Le matériel assigné à un prélèvement est désormais visible directement sur le planning, la modale et la fiche mission' },
    ],
  },
  {
    version: '118',
    date: '7 juin 2026',
    items: [
      { type: 'feat', label: 'La météo de votre zone d\'intervention s\'affiche désormais même sur les semaines creuses du planning' },
      { type: 'feat', label: 'Ajout de la température maximale sur les pastilles des jours de pluie prévus' },
      { type: 'fix', label: 'Amélioration visuelle du texte des prévisions pour éviter les césures' },
    ],
  },
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
