import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'labocea-pmc-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

// Régression pour l'audit firestore.rules du 2026-08-05 (project_audit_firestore_rules_2026_08_05.md)

describe('chat-messages — create (fix senderUid, commit dfc037f)', () => {
  it('refuse un message dont senderUid ne correspond pas à l’auteur', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      addDoc(collection(alice, 'chat-messages'), {
        senderUid: 'mallory',
        chatId: 'general',
        text: 'usurpation',
        createdAt: serverTimestamp(),
      })
    )
  })

  it('autorise un message dont senderUid correspond à l’auteur', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(
      addDoc(collection(alice, 'chat-messages'), {
        senderUid: 'alice',
        chatId: 'general',
        text: 'bonjour',
        createdAt: serverTimestamp(),
      })
    )
  })

  it('refuse un createdAt fourni par le client (doit être serverTimestamp())', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      addDoc(collection(alice, 'chat-messages'), {
        senderUid: 'alice',
        chatId: 'general',
        text: 'antidaté',
        createdAt: new Date('2020-01-01'),
      })
    )
  })
})

describe('todos — update (fix immutableOn createdBy, commit ed82cdd)', () => {
  const todoId = 'todo-1'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'todos', todoId), {
        titre: 'Tâche',
        createdBy: 'alice',
        done: false,
      })
    })
  })

  it('refuse de réassigner createdBy à un autre utilisateur', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'todos', todoId), { createdBy: 'bob' }))
  })

  it('autorise une mise à jour qui ne touche pas createdBy', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(updateDoc(doc(bob, 'todos', todoId), { done: true }))
  })
})

describe('clients-v2 — update (fix hasRequiredClientFields, commit ed82cdd)', () => {
  const clientId = 'client-1'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'clients-v2', clientId), {
        nom: 'Client A',
        annee: '2026',
        createdBy: 'alice',
      })
    })
  })

  it('refuse de vider le champ nom', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'clients-v2', clientId), { nom: '' }))
  })

  it('autorise une mise à jour qui conserve nom/annee valides', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(updateDoc(doc(bob, 'clients-v2', clientId), { notes: 'RAS' }))
  })
})

describe('chat-messages — pollVotes (fix selfOnlyKeyDiff, audit point 5)', () => {
  const messageId = 'poll-1'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'chat-messages', messageId), {
        chatId: 'general',
        senderUid: 'alice',
        pollQuestion: 'Sondage',
        pollOptions: ['A', 'B'],
        pollVotes: { '0': ['alice'] },
      })
    })
  })

  it('refuse de dupliquer son propre vote (fix selfOnlyKeyDiff)', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      updateDoc(doc(alice, 'chat-messages', messageId), {
        pollVotes: { '0': ['alice', 'alice', 'alice', 'alice', 'alice'] },
      })
    )
  })

  it('autorise de retirer son propre vote', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(
      updateDoc(doc(alice, 'chat-messages', messageId), {
        pollVotes: { '0': [] },
      })
    )
  })

  it('autorise un autre utilisateur à ajouter son propre vote sans toucher celui d’alice', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertSucceeds(
      updateDoc(doc(bob, 'chat-messages', messageId), {
        pollVotes: { '0': ['alice', 'bob'] },
      })
    )
  })

  it('refuse qu’un utilisateur retire le vote d’un tiers', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(
      updateDoc(doc(bob, 'chat-messages', messageId), {
        pollVotes: { '0': [] },
      })
    )
  })
})

describe('visites — update (fix immutableOn technicienUid)', () => {
  const visiteId = 'visite-1'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'visites', visiteId), {
        technicienUid: 'alice',
        technicienNom: 'Alice',
        notes: '',
      })
    })
  })

  it('refuse au créateur de réassigner technicienUid à un autre utilisateur', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'visites', visiteId), { technicienUid: 'bob' }))
  })

  it('autorise le créateur à modifier un autre champ (technicienNom)', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'visites', visiteId), { technicienNom: 'Alice T.' }))
  })

  it('refuse à un tiers non-admin de modifier la visite', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(bob, 'visites', visiteId), { technicienNom: 'Bob' }))
  })
})
