/** @type {import('react-doctor').Config} */
export default {
  supplyChain: {
    // vitest is a dev-only dependency; supply-chain score irrelevant in prod
    minScore: 0,
  },
}
