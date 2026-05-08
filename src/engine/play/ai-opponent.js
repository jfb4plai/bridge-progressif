/**
 * IA adverse — heuristiques défense et attaque
 * Niveau adapté au niveau de l'apprenant (pas un solver double-dummy)
 */

import { legalCards, trickWinner } from './trick-judge.js'
import { rankValue, suitLengths, handHcp } from '../cards.js'

/**
 * Choisit la carte à jouer pour un adversaire IA
 * @param {Array}  hand       — main de l'IA
 * @param {Array}  trick      — levée en cours [{seat, card}]
 * @param {string} trump      — couleur d'atout
 * @param {string} seat       — siège de l'IA ('N'|'E'|'S'|'W')
 * @param {Object} context    — { contract, tricks_ns, tricks_ew, history }
 * @returns {Object}          — carte choisie
 */
export const aiChooseCard = (hand, trick, trump, seat, context = {}) => {
  const legal = legalCards(hand, trick[0]?.card?.suit)

  if (legal.length === 1) return legal[0]

  const isDefending = isDefender(seat, context.declarer)

  if (trick.length === 0) {
    // Premier à jouer dans la levée (entame ou après avoir remporté)
    return isDefending
      ? bestOpeningLead(legal, context)
      : bestDeclarantLead(legal, trump, context)
  }

  // Suit the trick
  const ledSuit = trick[0].card.suit
  const canFollow = legal.some(c => c.suit === ledSuit)

  if (isDefending) {
    return defenderFollows(legal, trick, trump, canFollow, context)
  } else {
    return declarantFollows(legal, trick, trump, canFollow, context)
  }
}

// ─── Entame (1ère carte d'une levée) ─────────────────────────────────────────

const bestOpeningLead = (legal, context) => {
  // Heuristique : entamer par la tête d'une séquence ou la couleur la plus longue
  const sorted = [...legal].sort((a, b) => rankValue(b.rank) - rankValue(a.rank))

  // Cherche une séquence As-Roi ou Roi-Dame
  const hasSequence = sorted.find((c, i) => {
    const next = sorted[i + 1]
    return next && c.suit === next.suit && rankValue(c.rank) - rankValue(next.rank) === 1
  })
  if (hasSequence) return hasSequence

  // Sinon : couleur la plus longue
  const lens = suitLengths(legal.map(c => c))  // faux — on veut la main complète
  // Fallback : carte la plus basse (entame passive)
  return [...legal].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
}

const bestDeclarantLead = (legal, trump, context) => {
  // Déclarant : joue les maîtresses d'abord
  const sorted = [...legal].sort((a, b) => rankValue(b.rank) - rankValue(a.rank))
  return sorted[0]
}

// ─── Défense ─────────────────────────────────────────────────────────────────

const defenderFollows = (legal, trick, trump, canFollow, context) => {
  const winningCard = currentWinner(trick, trump)
  const ledSuit     = trick[0]?.card?.suit

  // Si partenaire est déjà gagnant → défausser le plus petit
  if (partnerWins(trick, trump)) {
    return [...legal].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
  }

  // Essayer de prendre avec la carte la moins chère qui gagne
  const canWin = legal.some(c => cardBeats(c, winningCard, ledSuit, trump))
  if (canWin) {
    return cheapestWinner(legal, winningCard, ledSuit, trump)
  }

  // Ne peut pas gagner → défausser le plus petit
  return [...legal].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
}

// ─── Déclarant ───────────────────────────────────────────────────────────────

const declarantFollows = (legal, trick, trump, canFollow, context) => {
  const winningCard = currentWinner(trick, trump)
  const canWin = legal.some(c => cardBeats(c, winningCard, trick[0].card.suit, trump))
  if (canWin) return cheapestWinner(legal, winningCard, trick[0].card.suit, trump)
  return [...legal].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]
}

// ─── Utilitaires internes ─────────────────────────────────────────────────────

const isDefender = (seat, declarer) => {
  if (!declarer) return false
  const nsSeats = ['N', 'S']
  const decIsNS = nsSeats.includes(declarer)
  const seatIsNS = nsSeats.includes(seat)
  return decIsNS !== seatIsNS
}

const cardBeats = (a, b, ledSuit, trump) => {
  if (!b) return true
  if (trump !== 'NT') {
    if (a.suit === trump && b.suit !== trump) return true
    if (b.suit === trump && a.suit !== trump) return false
  }
  if (a.suit !== ledSuit) return false
  return rankValue(a.rank) > rankValue(b.rank)
}

const currentWinner = (trick, trump) => {
  if (!trick.length) return null
  let best = trick[0].card
  trick.slice(1).forEach(({ card }) => {
    if (cardBeats(card, best, trick[0].card.suit, trump)) best = card
  })
  return best
}

const partnerWins = (trick, trump) => {
  if (trick.length < 2) return false
  // Le partenaire est 2 positions plus tôt dans la levée
  const partnerIdx = trick.length === 3 ? 1 : 0
  const partnerCard = trick[partnerIdx]?.card
  return partnerCard && cardBeats(partnerCard, currentWinner(trick, trump), trick[0].card.suit, trump)
}

const cheapestWinner = (legal, target, ledSuit, trump) => {
  const winners = legal
    .filter(c => cardBeats(c, target, ledSuit, trump))
    .sort((a, b) => rankValue(a.rank) - rankValue(b.rank))
  return winners[0] ?? legal[0]
}
