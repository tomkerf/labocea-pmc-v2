import { useMemo } from 'react'
import type { Client, Plan } from '@/types'
import { normalize } from '@/lib/textUtils'

const MAX_RESULTS_PER_CATEGORY = 6

export interface SpotlightPlanResult {
  plan: Plan
  client: Client
}

export interface SpotlightResults {
  clients: Client[]
  plans: SpotlightPlanResult[]
}

export function useSpotlightResults(clients: Client[], query: string): SpotlightResults {
  return useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return { clients: [], plans: [] }

    const matchedClients: Client[] = []
    const matchedPlans: SpotlightPlanResult[] = []

    for (const client of clients) {
      const clientHaystack = [client.nom, client.numClient, client.segment, client.preleveur]
        .filter(Boolean)
        .map(normalize)
      if (clientHaystack.some((field) => field.includes(q))) {
        matchedClients.push(client)
      }

      for (const plan of client.plans) {
        const planHaystack = [plan.nom, plan.siteNom].filter(Boolean).map(normalize)
        if (planHaystack.some((field) => field.includes(q))) {
          matchedPlans.push({ plan, client })
        }
      }
    }

    return {
      clients: matchedClients.slice(0, MAX_RESULTS_PER_CATEGORY),
      plans: matchedPlans.slice(0, MAX_RESULTS_PER_CATEGORY),
    }
  }, [clients, query])
}
