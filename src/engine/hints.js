/**
 * Système d'indices adaptatifs
 * Le niveau XP détermine ce qui est disponible et combien ça coûte
 */

import { recommendOpening, recommendResponse, bidStr } from './bidding/standard-francais.js'
import { OPENING_EXPLANATIONS, RESPONSE_EXPLANATIONS } from './bidding/standard-francais.js'

// ─── Niveaux XP ──────────────────────────────────────────────────────────────

export const LEVELS = [
  { level: 1, name_fr: 'Débutant',   name_en: 'Beginner',     xpMin: 0,    xpMax: 200  },
  { level: 2, name_fr: 'Apprenti',   name_en: 'Apprentice',   xpMin: 200,  xpMax: 500  },
  { level: 3, name_fr: 'Confirmé',   name_en: 'Intermediate', xpMin: 500,  xpMax: 1000 },
  { level: 4, name_fr: 'Avancé',     name_en: 'Advanced',     xpMin: 1000, xpMax: 2000 },
  { level: 5, name_fr: 'Expert',     name_en: 'Expert',       xpMin: 2000, xpMax: Infinity },
]

export const levelFromXp = xp =>
  LEVELS.findLast(l => xp >= l.xpMin) ?? LEVELS[0]

// ─── Politique d'indices par niveau ──────────────────────────────────────────

const HINT_POLICY = {
  1: { biddingFree: true,  biddingCost: 0,  playFree: true,  playCost: 0,  maxPlayHints: Infinity },
  2: { biddingFree: true,  biddingCost: 0,  playFree: false, playCost: 0,  maxPlayHints: 2 },
  3: { biddingFree: false, biddingCost: 5,  playFree: false, playCost: 10, maxPlayHints: 1 },
  4: { biddingFree: false, biddingCost: 15, playFree: false, playCost: 20, maxPlayHints: 0 },
  5: { biddingFree: false, biddingCost: 30, playFree: false, playCost: 30, maxPlayHints: 0 },
}

export const hintPolicy = xp => {
  const { level } = levelFromXp(xp)
  return HINT_POLICY[level] ?? HINT_POLICY[5]
}

// ─── Génération d'indices annonces ───────────────────────────────────────────

/**
 * Indice pour l'ouverture
 * @param {Array}  hand
 * @param {number} xp
 * @param {string} system
 * @returns {{ available, cost, hint_fr, hint_en, showFlowchart, recommended }}
 */
export const biddingHint = (hand, xp, { system = 'sf', lang = 'fr' } = {}) => {
  const policy = hintPolicy(xp)
  const rec    = recommendOpening(hand, { system })
  const expl   = OPENING_EXPLANATIONS[rec.key]

  return {
    available:     policy.biddingFree,
    cost:          policy.biddingCost,
    showFlowchart: levelFromXp(xp).level <= 2,
    recommended:   rec.bid,
    hint_fr: expl?.fr ?? '',
    hint_en: expl?.en ?? '',
    hcp:           rec.hcp,
    ev:            rec.ev,
  }
}

/**
 * Indice pour jouer une carte
 * @param {Array}  legalCards   — cartes jouables
 * @param {string} suggestion   — cardKey() de la carte recommandée
 * @param {number} xp
 * @returns {{ available, cost, remaining, direction_fr, direction_en }}
 */
export const playHint = (legalCards, suggestion, xp, hintsUsedThisDeal = 0) => {
  const policy   = hintPolicy(xp)
  const lvl      = levelFromXp(xp).level
  const remaining = policy.maxPlayHints - hintsUsedThisDeal

  if (remaining <= 0 && policy.maxPlayHints !== Infinity) {
    return { available: false, cost: 0, remaining: 0, direction_fr: '', direction_en: '' }
  }

  // Niveau 1-2 : carte précise suggérée
  // Niveau 3   : direction seulement
  const detail = lvl <= 2

  return {
    available:     policy.playFree || remaining > 0,
    cost:          policy.playCost,
    remaining:     policy.maxPlayHints === Infinity ? '∞' : remaining,
    suggestedCard: detail ? suggestion : null,
    direction_fr:  detail
      ? `Jouez cette carte.`
      : `Jouez dans la bonne direction — considérez vos maîtresses.`,
    direction_en:  detail
      ? `Play this card.`
      : `Play in the right direction — consider your winners.`,
  }
}

// ─── XP ──────────────────────────────────────────────────────────────────────

export const XP = {
  CORRECT_BID:      10,
  CORRECT_BID_HARD: 15,  // sans indice au niveau 3+
  WRONG_BID:        -2,
  HINT_USED:        -5,
  CONTRACT_MADE:    20,
  CONTRACT_OVERTRICK: 5,
  CONTRACT_DOWN:    -10,
  FULL_DEAL_BONUS:  10,  // bonus si donne complète sans indice
}

export const computeXpGain = ({ bidsCorrect, totalBids, hintsBidding, contractMade, overtricks, hintsPlay, noHintBonus }) => {
  let xp = 0
  xp += bidsCorrect  * XP.CORRECT_BID
  xp += (totalBids - bidsCorrect) * XP.WRONG_BID
  xp += hintsBidding * XP.HINT_USED
  xp += hintsPlay    * XP.HINT_USED
  if (contractMade) {
    xp += XP.CONTRACT_MADE
    xp += (overtricks ?? 0) * XP.CONTRACT_OVERTRICK
  } else {
    xp += XP.CONTRACT_DOWN
  }
  if (noHintBonus) xp += XP.FULL_DEAL_BONUS
  return Math.max(0, xp)
}
