/**
 * Générateur de donnes aléatoires
 * Retourne {north, south, east, west} chacun = array de 13 cartes
 */

import { makeDeck, SEATS, handHcp } from './cards.js'

/** Mélange Fisher-Yates */
const shuffle = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Génère une donne aléatoire complète */
export const dealRandom = (dealer = 'S', vulnerability = 'none') => {
  const deck = shuffle(makeDeck())
  return {
    north:         deck.slice(0, 13),
    east:          deck.slice(13, 26),
    south:         deck.slice(26, 39),
    west:          deck.slice(39, 52),
    dealer,
    vulnerability, // 'none' | 'ns' | 'ew' | 'all'
  }
}

/**
 * Génère une donne avec contraintes HCP approximatives
 * Ex: generateWithHcp({ south: { min: 12, max: 21 } })
 */
export const dealWithConstraints = (constraints = {}, maxAttempts = 200) => {
  for (let i = 0; i < maxAttempts; i++) {
    const deal = dealRandom()
    if (meetsConstraints(deal, constraints)) return deal
  }
  // Retourne une donne non contrainte si impossible après maxAttempts
  return dealRandom()
}

const meetsConstraints = (deal, constraints) => {
  return Object.entries(constraints).every(([seat, { min = 0, max = 37 }]) => {
    const hand = deal[seat.toLowerCase()]
    if (!hand) return true
    const hcp = handHcp(hand)
    return hcp >= min && hcp <= max
  })
}

/** Charge une donne pré-construite depuis JSON */
export const loadPresetDeal = async (slug) => {
  // Les donnes pré-construites sont importées statiquement en data/deals/
  const modules = import.meta.glob('../data/deals/**/*.json')
  const key = Object.keys(modules).find(k => k.includes(slug))
  if (!key) throw new Error(`Deal not found: ${slug}`)
  const mod = await modules[key]()
  return mod.default
}
