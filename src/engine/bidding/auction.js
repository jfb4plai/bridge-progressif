/**
 * Orchestrateur d'enchères — fonctions pures, sans état React
 * Gère la séquence complète : donneur → 3 passes consécutives
 *
 * Règles :
 *   - Joueur toujours Sud (seat 'S')
 *   - L1 : Nord/Est/Ouest passent toujours (sauf Nord qui répond à l'ouverture de Sud si L1)
 *   - L2+ : enchères compétitives possibles pour Est/Ouest
 */

import {
  recommendOpening, recommendResponse,
  PASS, bid, bidStr,
  OPENING_EXPLANATIONS, RESPONSE_EXPLANATIONS,
} from './standard-francais.js'
import { handHcp, suitLengths, SUITS } from '../cards.js'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEAT_ORDER = ['N', 'E', 'S', 'W']
const PARTNER    = { N: 'S', S: 'N', E: 'W', W: 'E' }

const SUITS_ORDER = ['C', 'D', 'H', 'S', 'NT']
const bidOrdinal  = (level, suit) => (level - 1) * 5 + SUITS_ORDER.indexOf(suit)

// ─── Navigation dans la séquence ─────────────────────────────────────────────

/** Ordre de parole à partir du donneur */
export const seatOrder = (dealer) => {
  const idx = SEAT_ORDER.indexOf(dealer)
  return [...SEAT_ORDER.slice(idx), ...SEAT_ORDER.slice(0, idx)]
}

/** Siège qui parle au tour n (0-indexed) */
export const seatAtTurn = (dealer, turn) =>
  seatOrder(dealer)[turn % 4]

/** La mise est-elle terminée ? */
export const isAuctionComplete = (history) => {
  if (history.length === 0) return false
  // 4 passes = donne passée
  if (history.length >= 4 && history.every(h => h.bid.special === 'pass')) return true
  // 3 passes consécutifs après la dernière vraie enchère
  if (history.length < 4) return false
  const last3 = history.slice(-3)
  return last3.every(h => h.bid.special === 'pass')
}

/** Dernière enchère avec niveau (pas pass/contre/surcontre) */
export const lastRealBid = (history) =>
  [...history].reverse().find(h => h.bid.level != null)

/** Dernière enchère légale minimum (pour griser le BiddingBox) */
export const lastValidBid = (history) =>
  lastRealBid(history)?.bid ?? null

/** Extraire le contrat final de la séquence */
export const extractContract = (history, dealer) => {
  const last = lastRealBid(history)
  if (!last) return null   // donne passée

  const denomination = last.bid.suit
  const winningSide  = ['N', 'S'].includes(last.seat) ? ['N', 'S'] : ['E', 'W']

  // Déclarant = premier du côté gagnant à avoir nommé cette couleur
  const declarerEntry = history.find(h =>
    winningSide.includes(h.seat) && h.bid.suit === denomination
  )

  const afterLast  = history.slice(history.indexOf(last) + 1)
  const doubled    = afterLast.some(h => h.bid.special === 'dbl')    ? 1 : 0
  const redoubled  = afterLast.some(h => h.bid.special === 'rdbl')   ? 2 : 0

  return {
    level:    last.bid.level,
    suit:     denomination,
    declarer: declarerEntry?.seat ?? last.seat,
    doubled:  redoubled || doubled,
  }
}

// ─── IA d'enchères (N / E / W) ───────────────────────────────────────────────

/**
 * Calcule l'enchère de l'IA pour un siège non-joueur
 * @param {string} seat        — 'N'|'E'|'W'
 * @param {Array}  hand        — 13 cartes
 * @param {Array}  history     — [{seat, bid}]
 * @param {Object} opts        — { system, level, vulnerability }
 * @returns {{ bid, key, explanation_fr?, explanation_en? }}
 */
export const computeAiBid = (seat, hand, history, opts = {}) => {
  const { system = 'sf', level = 1, vulnerability = 'none' } = opts

  const partner     = PARTNER[seat]
  const isNS        = ['N', 'S'].includes(seat)
  const opponents   = isNS ? ['E', 'W'] : ['N', 'S']

  const partnerBids   = history.filter(h => h.seat === partner  && h.bid.level != null)
  const myBids        = history.filter(h => h.seat === seat     && h.bid.level != null)
  const opponentBids  = history.filter(h => opponents.includes(h.seat) && h.bid.level != null)

  const anyOpen          = history.some(h => h.bid.level != null)
  const lastPartnerBid   = partnerBids.at(-1)
  const lastOpponentBid  = opponentBids.at(-1)

  // ── Cas 1 : personne n'a ouvert → ouvrir si possible
  if (!anyOpen) {
    const rec = recommendOpening(hand, { system })
    return { bid: rec.bid, key: rec.key, hcp: rec.hcp, context: 'opening' }
  }

  // ── Cas 2 : partenaire a ouvert → répondre (première réponse)
  if (lastPartnerBid && myBids.length === 0) {
    const rec = recommendResponse(hand, lastPartnerBid.bid, { system })
    return { bid: rec.bid, key: rec.key, hcp: rec.hcp, context: 'response' }
  }

  // ── Cas 3 : adversaire a ouvert → contre-enchère (L2+ uniquement)
  if (lastOpponentBid && myBids.length === 0 && level >= 2) {
    const overcall = computeOvercall(hand, lastOpponentBid.bid, history, system)
    if (overcall) return { bid: overcall, key: 'overcall', context: 'overcall' }
  }

  // ── Cas 4 : tout le reste → passe
  return { bid: PASS, key: 'pass_default', context: 'pass' }
}

/** Contre-enchère simple (L2+) : 5+ cartes, 12-17H, au palier 1 ou 2 */
export const computeOvercall = (hand, opBid, history, system) => {
  const hcp  = handHcp(hand)
  const lens = suitLengths(hand)
  const last = lastRealBid(history)
  const minOrdinal = last ? bidOrdinal(last.bid.level, last.bid.suit) : -1

  for (const suit of ['S', 'H', 'D', 'C']) {
    if (lens[suit] < 5) continue
    if (suit === opBid.suit) continue   // ne pas surenchérir la même couleur

    // Chercher le palier minimum légal
    for (let lvl = 1; lvl <= 3; lvl++) {
      if (bidOrdinal(lvl, suit) > minOrdinal && hcp >= 12 && hcp <= 17) {
        return bid(lvl, suit)
      }
    }
  }
  return null
}

// ─── Évaluation du bid du joueur (Sud) ───────────────────────────────────────

/**
 * Évalue l'enchère de Sud selon sa position dans la séquence
 * @returns {{ correct, expected, played, key, context, xpDelta, explanation }}
 */
export const evaluatePlayerBid = (playerBid, hand, history, { system = 'sf' } = {}) => {
  const partnerBids   = history.filter(h => h.seat === 'N' && h.bid.level != null)
  const mySouthBids   = history.filter(h => h.seat === 'S' && h.bid.level != null)
  const opponentBids  = history.filter(h => ['E', 'W'].includes(h.seat) && h.bid.level != null)
  const anyOpen       = history.some(h => h.bid.level != null)
  const lastPartner   = partnerBids.at(-1)
  const lastOpponent  = opponentBids.at(-1)

  let rec
  let explanations = {}

  if (!anyOpen) {
    // Sud ouvre
    const r = recommendOpening(hand, { system })
    rec = { bid: r.bid, key: r.key }
    explanations = OPENING_EXPLANATIONS[r.key] ?? {}
  } else if (lastPartner && mySouthBids.length === 0) {
    // Sud répond à l'ouverture de Nord (avec ou sans intervention adverse)
    const r = recommendResponse(hand, lastPartner.bid, { system })
    rec = { bid: r.bid, key: r.key }
    explanations = RESPONSE_EXPLANATIONS[r.key] ?? {}
  } else if (lastOpponent && mySouthBids.length === 0 && !lastPartner) {
    // Sud overcalle l'ouverture adverse (N n'a pas encore ouvert)
    const overcall = computeOvercall(hand, lastOpponent.bid, history, system)
    rec = overcall
      ? { bid: overcall, key: 'overcall' }
      : { bid: PASS, key: 'pass_overcall' }
    explanations = OPENING_EXPLANATIONS[rec.key] ?? {}
  } else {
    // Rebid / suite — on accepte tout (pas encore évalué)
    rec = { bid: PASS, key: 'pass_default' }
    explanations = OPENING_EXPLANATIONS['pass_default'] ?? {}
  }

  const correct = bidsEqual(playerBid, rec.bid)

  return {
    correct,
    expected:    rec.bid,
    played:      playerBid,
    key:         rec.key,
    xpDelta:     correct ? 10 : -2,
    explanation_fr: explanations.fr ?? '',
    explanation_en: explanations.en ?? '',
  }
}

// ─── Processeur d'enchères ────────────────────────────────────────────────────

/**
 * Avance la séquence d'enchères jusqu'au prochain tour de Sud OU jusqu'à la fin.
 * Fonction pure — retourne le nouvel état sans muter l'original.
 *
 * @param {Array}  startHistory — historique existant [{seat, bid, ...}]
 * @param {Object} deal         — { north, east, west, south, dealer }
 * @param {Object} opts         — { system, level, vulnerability }
 * @returns {{ history, waitingForPlayer, done, contract }}
 */
export const processAuction = (startHistory, deal, opts = {}) => {
  const { dealer = 'S' } = deal
  let history = [...startHistory]

  // Limite de sécurité (évite boucle infinie)
  let guard = 0

  while (!isAuctionComplete(history) && guard < 52) {
    guard++
    const turn = history.length
    const seat = seatAtTurn(dealer, turn)

    if (seat === 'S') {
      // Tour du joueur → attendre
      return { history, waitingForPlayer: true, done: false, contract: null }
    }

    // Tour de l'IA
    const handKey = { N: 'north', E: 'east', W: 'west' }[seat]
    const hand    = deal[handKey] ?? []
    const result  = computeAiBid(seat, hand, history, opts)

    history = [...history, {
      seat,
      bid:     result.bid,
      aiKey:   result.key,
      context: result.context,
      isAi:    true,
    }]
  }

  // Mise terminée
  const contract = extractContract(history, dealer)
  return { history, waitingForPlayer: false, done: true, contract }
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const bidsEqual = (a, b) => {
  if (!a || !b) return false
  if (a.special && b.special) return a.special === b.special
  return a.level === b.level && a.suit === b.suit
}

export { bidStr, PASS, bid }
