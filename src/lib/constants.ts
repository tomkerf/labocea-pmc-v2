export const COLLECTIONS = {
  CLIENTS: 'clients-v2',
  EQUIPEMENTS: 'equipements',
  VERIFICATIONS: 'verifications',
  MAINTENANCES: 'maintenances',
  USERS: 'users',
  TODOS: 'todos',
  EVENEMENTS: 'evenements',
  PRELEVEURS: 'preleveurs-v1',
  VISITES: 'visites',
  DEMANDES: 'demandes',
  BUGS: 'bugs',
  TUYAUX: 'tuyaux',
} as const;

export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 10,
  STICKY: 20,
  OVERLAY: 40,
  MODAL: 50,
  TOAST: 100,
} as const;

export const COLORS = {
  ACCENT: 'var(--color-accent)',
  SUCCESS: 'var(--color-success)',
  WARNING: 'var(--color-warning)',
  DANGER: 'var(--color-danger)',
  TEXT_PRIMARY: 'var(--color-text-primary)',
  TEXT_SECONDARY: 'var(--color-text-secondary)',
  BG_PRIMARY: 'var(--color-bg-primary)',
  BG_SECONDARY: 'var(--color-bg-secondary)',
  BG_TERTIARY: 'var(--color-bg-tertiary)',
  BORDER: 'var(--color-border)',
} as const;
