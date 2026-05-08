/**
 * Registre de toutes les donnes pré-construites
 * Utilisé pour la rotation et la sélection par niveau
 */

import deal001 from './level1/001-impasse-pique.json'
import deal002 from './level1/002-ouverture-1sa.json'
import deal003 from './level1/003-ouverture-1pique.json'
import deal004 from './level1/004-ouverture-1trefle.json'
import deal005 from './level1/005-passe-main-faible.json'
import deal006 from './level1/006-ouverture-2trefle.json'
import deal007 from './level1/007-ouverture-2sa.json'
import deal008 from './level1/008-ouverture-1carreau.json'

export const ALL_DEALS = [
  deal001, deal002, deal003, deal004,
  deal005, deal006, deal007, deal008,
]

/** Donnes disponibles pour un niveau donné */
export const dealsForLevel = (level) =>
  ALL_DEALS.filter(d => d.level <= level)

/**
 * Sélectionne la prochaine donne à jouer.
 * Utilise localStorage pour éviter les répétitions.
 * @param {number} level  — niveau du joueur (1-5)
 * @returns {Object}      — deal JSON
 */
export const nextDeal = (level = 1) => {
  const pool    = dealsForLevel(level)
  if (pool.length === 0) return ALL_DEALS[0]

  const lastKey = `bridge_last_deal_l${level}`
  const lastIdx = parseInt(localStorage.getItem(lastKey) ?? '-1', 10)
  const nextIdx = (lastIdx + 1) % pool.length

  localStorage.setItem(lastKey, String(nextIdx))
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

  // Éviter la répétition immédiate
  if (idx === lastIdx && pool.length > 1) {
    idx = (idx + 1) % pool.length
  }

  localStorage.setItem(lastKey, String(idx))
  return pool[idx]
}
