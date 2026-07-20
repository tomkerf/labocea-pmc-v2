export async function generateRegulatorySummary(rawText: string, customApiKey?: string): Promise<string> {
  const apiKey = customApiKey || localStorage.getItem('pmc_gemini_api_key')
  if (!apiKey) {
    throw new Error('Aucune clé API Gemini configurée')
  }

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const prompt = `Tu es un assistant expert en environnement et en réglementation de l'eau.
Analyse le texte réglementaire brut suivant et produit une synthèse claire, structurée en Markdown (avec des listes à puces et du gras) et facile à lire pour des techniciens de terrain et chargés de mission.

Le résumé doit obligatoirement respecter la structure suivante :
### 📋 Contexte & Objet
(Résumé court en 2-3 phrases de quoi il s'agit)

### ⚠️ Principales Obligations
(Liste à puces des obligations concrètes introduites par le texte)

### 📅 Calendrier & Échéances
(Dates limites importantes ou périodicités à respecter)

### 🔧 Impact pour Labocea PMC
(Que doit-on faire sur le terrain ou dans le suivi du matériel/missions ?)

Voici le texte brut :
${rawText}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
      }
    })
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const msg = errData?.error?.message || `Erreur serveur (${response.status})`
    throw new Error(msg)
  }

  const data = await response.json()
  const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!resultText) {
    throw new Error('Aucun contenu généré')
  }

  return resultText
}
