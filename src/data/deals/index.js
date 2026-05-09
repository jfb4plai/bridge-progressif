/**
 * Registre de toutes les donnes pré-construites + générateur
 * import.meta.glob charge automatiquement tous les JSON — pas d'import manuel nécessaire
 */
import { generateRandomDeal } from './generator.js'

// Chargement automatique de tous les fichiers JSON dans level1/ et level2/
const l1Raw = import.meta.glob('./level1/*.json', { eager: true })
const l2Raw = import.meta.glob('./level2/*.json', { eager: true })

function sortedDeals(raw) {
  return Object.entries(raw)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, mod]) => mod.default ?? mod)
}

export const ALL_DEALS = [...sortedDeals(l1Raw), ...sortedDeals(l2Raw)]

/** Donnes disponibles pour un niveau donné */
export const dealsForLevel = (level) =>
  ALL_DEALS.filter(d => d.level <= level)

/**
 * Sélectionne la prochaine donne à jouer.
 * - Premier cycle : toutes les donnes pré-construites dans l'ordre
 * - Cycles suivants : alternance 50/50 entre pré-construit et généré
 * @param {number} level  — niveau du joueur (1-5)
 * @param {string} system — système d'enchères
 * @returns {Object}      — deal object
 */
export const nextDeal = (level = 1, system = 'sf') => {
  const pool = dealsForLevel(level)
  if (pool.length === 0) return generateRandomDeal(level, system)

  const lastKey  = `bridge_last_deal_l${level}`
  const countKey = `bridge_deal_count_l${level}`
  const lastIdx  = parseInt(localStorage.getItem(lastKey) ?? '-1', 10)
  const count    = parseInt(localStorage.getItem(countKey) ?? '0', 10)

  // Après le premier cycle complet : 50% de chance d'avoir une donne générée
  if (count >= pool.length && Math.random() < 0.5) {
    localStorage.setItem(countKey, String(count + 1))
    return generateRandomDeal(level, system)
  }

  const nextIdx = (lastIdx + 1) % pool.length
  localStorage.setItem(lastKey, String(nextIdx))
  localStorage.setItem(countKey, String(count + 1))
  return pool[nextIdx]
}

/**
 * Sélectionne une donne au hasard (différente de la précédente si possible)
 */
export const randomDeal = (level = 1) => {
  const pool = dealsForLevel(level)
  if (pool.length === 0) return ALL_DEALS[0]
  if (pool.length === 1) return pool[0]

  const lastKey  = `bridge_last_deal_l${level}`
  const lastIdx  = parseInt(localStorage.getItem(lastKey) ?? '-1', 10)
  let idx        = Math.floor(Math.random() * pool.length)

  if (idx === lastIdx && pool.length > 1) {
    idx = (idx + 1) % pool.length
  }

  localStorage.setItem(lastKey, String(idx))
  return pool[idx]
}
