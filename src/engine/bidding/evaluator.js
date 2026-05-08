/**
 * Évalue la séquence d'enchères jouée par l'utilisateur
 * Compare avec la recommandation et génère un score + feedback
 */

import { recommendOpening, recommendResponse, bidStr, PASS } from './standard-francais.js'

/**
 * Évalue un bid d'ouverture
 * @returns {{ correct: bool, expected, played, feedback_fr, feedback_en, xpDelta }}
 */
export const evaluateOpening = (playedBid, hand, { system = 'sf', lang = 'fr' } = {}) => {
  const rec = recommendOpening(hand, { system })
  const correct = bidsEqual(playedBid, rec.bid)

  return {
    correct,
    expected: rec.bid,
    played:   playedBid,
    key:      rec.key,
    hcp:      rec.hcp,
    ev:       rec.ev,
    xpDelta:  correct ? 10 : -2,
  }
}

/**
 * Évalue une réponse
 */
export const evaluateResponse = (playedBid, hand, openBid, { system = 'sf' } = {}) => {
  const rec = recommendResponse(hand, openBid, { system })
  const correct = bidsEqual(playedBid, rec.bid)

  return {
    correct,
    expected: rec.bid,
    played:   playedBid,
    key:      rec.key,
    hcp:      rec.hcp,
    ev:       rec.ev,
    xpDelta:  correct ? 8 : -2,
  }
}

/**
 * Score global d'une séquence d'enchères complète
 * evaluations = tableau de résultats evaluateOpening / evaluateResponse
 */
export const sequenceScore = (evaluations) => {
  const total   = evaluations.length
  const correct = evaluations.filter(e => e.correct).length
  const xp      = evaluations.reduce((sum, e) => sum + (e.xpDelta ?? 0), 0)
  return { total, correct, pct: total ? Math.round(correct / total * 100) : 0, xp }
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const bidsEqual = (a, b) => {
  if (!a || !b) return false
  if (a.special && b.special) return a.special === b.special
  return a.level === b.level && a.suit === b.suit
}
