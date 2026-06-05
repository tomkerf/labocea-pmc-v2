import type { Demande, DemandeStatut } from '@/types'
import { COLORS } from '@/lib/constants'

export const STATUTS: { key: DemandeStatut; label: string; color: string }[] = [
  { key: 'attente_devis', label: 'En attente de devis', color: COLORS.WARNING  },
  { key: 'devis_envoye',  label: 'Devis envoyé',        color: COLORS.ACCENT   },
  { key: 'visite_prelim', label: 'Visite préliminaire', color: 'var(--color-neutral)'  },
  { key: 'devis_signe',   label: 'Devis signé',         color: COLORS.SUCCESS  },
]

export const STATUTS_ARCHIVES: { key: DemandeStatut; label: string; color: string }[] = [
  { key: 'refuse',   label: 'Refusé',        color: '#ff3b30' },
  { key: 'converti', label: 'Mission créée', color: '#34c759' },
]

export function statutCfg(key: string) {
  return STATUTS.find(s => s.key === key) ?? STATUTS_ARCHIVES.find(s => s.key === key) ?? STATUTS[0]
}

export function joursEcoules(dateStr: string) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export const SEGMENTS = ['SRA', 'AEP', 'STEP', 'TAR', 'Réseau de mesure', 'RSDE']
export const FREQUENCES = ['', 'Mensuel', 'Bimensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Ponctuel']

export const EMPTY: Omit<Demande, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  contactNom: '', contactSociete: '', contactEmail: '', contactTel: '',
  lieu: '', segment: 'SRA', description: '', frequence: '',
  nbPoints: '', montantDevis: '', dateDevis: '',
  statut: 'attente_devis', preleveurUid: '', notes: '',
  dateReception: new Date().toISOString().slice(0, 10),
}
