/**
 * Arbitre des levées
 * Détermine le gagnant d'une levée en fonction de l'atout
 */

import { rankValue, SUITS } from '../cards.js'

/**
 * Détermine qui gagne la levée
 * @param {Array}  trick   — [{seat, card}, ...] dans l'ordre du jeu (4 éléments)
 * @param {string} trump   — 'S'|'H'|'D'|'C'|'NT'
 * @returns {string}       — siège gagnant 'N'|'E'|'S'|'W'
 */
export const trickWinner = (trick, trump) => {
  const ledSuit = trick[0].card.suit
  let winner    = trick[0]

  trick.slice(1).forEach(({ seat, card }) => {
    if (beats(card, winner.card, ledSuit, trump)) {
      winner = { seat, card }
    }
  })

  return winner.seat
}

/**
 * challenger bat-il defender ?
 */
const beats = (challenger, defender, ledSuit, trump) => {
  const isAtout = s => trump !== 'NT' && s === trump

  // Les deux sont atout → compare rang
  if (isAtout(challenger.suit) && isAtout(defender.suit)) {
    return rankValue(challenger.rank) > rankValue(defender.rank)
  }
  // Seul challenger est atout → gagne
  if (isAtout(challenger.suit)) return true
  // Seul defender est atout → perd
  if (isAtout(defender.suit)) return false
  // Aucun atout : challenger doit suivre la couleur d'entame pour battre
  if (challenger.suit !== ledSuit) return false
  if (defender.suit !== ledSuit) return true
  return rankValue(challenger.rank) > rankValue(defender.rank)
}

/**
 * Vérifie si un joueur peut suivre la couleur demandée
 * (pour forcer le jeu réaliste)
 */
export const mustFollow = (hand, ledSuit) =>
  hand.some(c => c.suit === ledSuit)

/**
 * Cartes jouables dans la main en respectant les règles
 */
export const legalCards = (hand, ledSuit) => {
  if (!ledSuit) return hand  // premier à jouer dans la levée
  const followers = hand.filter(c => c.suit === ledSuit)
  return followers.length > 0 ? followers : hand
}

/**
 * Calcule le résultat final d'un contrat
 * @param {number} tricksWon       — levées réalisées par N-S (ou E-W selon déclarant)
 * @param {Object} contract        — { level, suit, doubled: 0|1|2, declarer }
 * @param {string} vulnerability   — 'none'|'ns'|'ew'|'all'
 * @returns {{ made, overtricks, undertricks, score }}
 */
export const contractResult = (tricksWon, contract, vulnerability) => {
  const { level, suit, doubled = 0, declarer } = contract
  const target   = level + 6  // levées à réaliser
  const diff     = tricksWon - target
  const made     = diff >= 0
  const isNS     = declarer === 'N' || declarer === 'S'
  const vul      = vulnerability === 'all' ||
                   (isNS  && vulnerability === 'ns') ||
                   (!isNS && vulnerability === 'ew')

  let score = 0

  if (made) {
    // Points de manche et partielles
    const trickScore = suitTrickValue(suit, level, doubled)
    const gameMade   = trickScore >= 100
    const bonus      = gameMade
      ? (vul ? 500 : 300)
      : 50  // partielle
    score = trickScore + bonus

    // Surlevées
    if (diff > 0) score += overtrickScore(suit, diff, doubled, vul)
  } else {
    score = undertrickScore(Math.abs(diff), doubled, vul)
    score = -score
  }

  return {
    made,
    overtricks:  Math.max(0, diff),
    undertricks: Math.max(0, -diff),
    score,
  }
}

const suitTrickValue = (suit, level, doubled) => {
  const base = suit === 'NT'
    ? (40 + (level - 1) * 30)          // 1SA=40, 2SA=70…
    : (suit === 'S' || suit === 'H')
      ? level * 30                       // majeures
      : level * 20                       // mineures
  if (doubled === 1) return base * 2
  if (doubled === 2) return base * 4
  return base
}

const overtrickScore = (suit, n, doubled, vul) => {
  if (doubled === 0) {
    return n * (suit === 'S' || suit === 'H' || suit === 'NT' ? 30 : 20)
  }
  return n * (vul ? 200 : 100) * (doubled === 2 ? 2 : 1)
}

const undertrickScore = (n, doubled, vul) => {
  if (doubled === 0) return n * (vul ? 100 : 50)
  // Contré
  const base = vul
    ? [200, 300, 300]     // 1e, 2e, suivantes
    : [100, 200, 300]
  let total = 0
  for (let i = 0; i < n; i++) {
    const idx = Math.min(i, 2)
    total += base[idx]
  }
  return total * (doubled === 2 ? 2 : 1)
}
