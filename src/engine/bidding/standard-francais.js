/**
 * Standard Français — règles d'ouverture et de réponse
 * Couvre SF de base + variante SAF (Sans Atout Fort)
 *
 * Structure d'un bid : { level: 1-7, suit: 'S'|'H'|'D'|'C'|'NT', special: 'pass'|'dbl'|'rdbl' }
 */

import {
  handHcp, handDistPoints, handShortPoints,
  suitLengths, isBalanced, longestSuit, SUITS
} from '../cards.js'

// ─── Types de bids ───────────────────────────────────────────────────────────

export const PASS   = { special: 'pass' }
export const DBL    = { special: 'dbl' }
export const RDBL   = { special: 'rdbl' }
export const bid    = (level, suit) => ({ level, suit })
export const bidStr = b => b.special ? b.special.toUpperCase()
  : `${b.level}${b.suit === 'NT' ? 'SA' : b.suit}`  // affichage français: 1SA

// ─── Évaluation de la main ───────────────────────────────────────────────────

export const evaluateHand = (hand, { system = 'sf' } = {}) => {
  const hcp       = handHcp(hand)
  const dist      = handDistPoints(hand)
  const lengths   = suitLengths(hand)
  const balanced  = isBalanced(hand)
  const totalHL   = hcp + dist  // HL = honneurs + longueur

  // 5+ cartes en majeure ?
  const fiveSpades  = lengths.S >= 5
  const fiveHearts  = lengths.H >= 5
  const hasMajor5   = fiveSpades || fiveHearts
  const majorSuit   = fiveSpades ? 'S' : fiveHearts ? 'H' : null

  // Mineure la plus longue
  const minorSuit = lengths.D >= lengths.C ? 'D' : 'C'
  const minorLen  = lengths[minorSuit]

  return { hcp, dist, totalHL, lengths, balanced, hasMajor5, majorSuit, minorSuit, minorLen }
}

// ─── Ouvertures Standard Français ────────────────────────────────────────────

/**
 * Calcule l'ouverture recommandée
 * @param {Array}  hand   — 13 cartes
 * @param {Object} opts   — { system: 'sf'|'saf' }
 * @returns {{ bid, explanation_fr, explanation_en, hcp, ... }}
 */
export const recommendOpening = (hand, { system = 'sf' } = {}) => {
  const ev = evaluateHand(hand, { system })
  const { hcp, totalHL, balanced, hasMajor5, majorSuit, minorSuit, minorLen, lengths } = ev

  // Pas assez de points
  if (hcp < 12 && totalHL < 13) {
    return { bid: PASS, key: 'pass_weak', hcp, ev }
  }

  // Main très forte : 2♣ forcing (SF + SAF)
  if (hcp >= 22 || (hcp >= 19 && !balanced)) {
    return { bid: bid(2, 'C'), key: 'open_2c_forcing', hcp, ev }
  }

  // 20-21H jeu régulier → 2SA
  if (hcp >= 20 && hcp <= 21 && balanced) {
    return { bid: bid(2, 'NT'), key: 'open_2nt', hcp, ev }
  }

  // 18-19H jeu régulier → 1 mineure puis rebid 2SA
  // (ici on annonce juste l'ouverture)

  // 15-17H jeu régulier → 1SA (SF) | 1SA 15-17H (SAF identique)
  const ntRange = system === 'saf' ? (hcp >= 15 && hcp <= 17) : (hcp >= 15 && hcp <= 17)
  if (ntRange && balanced) {
    return { bid: bid(1, 'NT'), key: 'open_1nt', hcp, ev }
  }

  // 5+ cartes en majeure (12-21H)
  if (hasMajor5 && hcp >= 12) {
    return { bid: bid(1, majorSuit), key: 'open_1major', hcp, ev }
  }

  // Jeu irrégulier ou trop faible pour 1SA → mineure
  if (hcp >= 12 && hcp <= 21) {
    // 4+ cartes en Carreau → 1♦, sinon 1♣
    if (lengths.D >= 4 && lengths.D >= lengths.C) {
      return { bid: bid(1, 'D'), key: 'open_1d', hcp, ev }
    }
    return { bid: bid(1, 'C'), key: 'open_1c', hcp, ev }
  }

  return { bid: PASS, key: 'pass_default', hcp, ev }
}

// ─── Réponses à 1 d'une couleur ──────────────────────────────────────────────

/**
 * Réponse du répondant à une ouverture de 1 couleur
 * @param {Array}  hand       — main du répondant
 * @param {Object} openBid    — bid de l'ouvreur ex: {level:1, suit:'S'}
 * @param {Object} opts       — { system }
 */
export const recommendResponse = (hand, openBid, { system = 'sf' } = {}) => {
  const ev = evaluateHand(hand, { system })
  const { hcp, totalHL, balanced, lengths, hasMajor5, majorSuit } = ev

  if (hcp < 6) return { bid: PASS, key: 'resp_pass_weak', hcp, ev }

  const os = openBid.suit  // suit ouverte

  // Fit 4+ cartes dans la majeure ouverte
  if ((os === 'S' || os === 'H') && lengths[os] >= 4) {
    if (hcp >= 13)       return { bid: bid(3, os), key: 'resp_3major_inv', hcp, ev }
    if (hcp >= 10)       return { bid: bid(3, os), key: 'resp_3major_force', hcp, ev }
    return                      { bid: bid(2, os), key: 'resp_2major_fit', hcp, ev }
  }

  // Autre majeure non ouverte 4+
  const otherMajor = os === 'S' ? 'H' : 'S'
  if (lengths[otherMajor] >= 4 && hcp >= 6) {
    return { bid: bid(1, otherMajor), key: 'resp_1major', hcp, ev }
  }

  // 1SA (6-10H régulier)
  if (hcp >= 6 && hcp <= 10 && balanced) {
    return { bid: bid(1, 'NT'), key: 'resp_1nt', hcp, ev }
  }

  // Nouvelle couleur au palier 2
  if (hcp >= 10) {
    const newSuit = SUITS.find(s => s !== os && lengths[s] >= 4)
    if (newSuit) return { bid: bid(2, newSuit), key: 'resp_new_suit_2', hcp, ev }
  }

  // Défaut
  return { bid: bid(1, 'NT'), key: 'resp_1nt_default', hcp, ev }
}

// ─── Table des explications (clés → textes) ──────────────────────────────────
// Utilisées par hints.js et le bilan de donne

export const OPENING_EXPLANATIONS = {
  pass_weak: {
    fr: 'Main trop faible (< 12H). On passe.',
    en: 'Hand too weak (< 12 HCP). Pass.',
  },
  open_2c_forcing: {
    fr: 'Main très forte (≥22H) — 2♣ forcing (partenaire doit répondre).',
    en: 'Very strong hand (≥22 HCP) — 2♣ forcing.',
  },
  open_2nt: {
    fr: '20-21H, jeu régulier → 2SA directement.',
    en: '20-21 HCP, balanced hand → open 2NT.',
  },
  open_1nt: {
    fr: '15-17H, jeu régulier → 1SA. Partenaire sait immédiatement la force.',
    en: '15-17 HCP, balanced → 1NT. Partner knows your strength exactly.',
  },
  open_1major: {
    fr: '5+ cartes dans la majeure, 12-21H → on annonce la majeure au palier 1.',
    en: '5+ cards in the major, 12-21 HCP → open the major at the 1-level.',
  },
  open_1d: {
    fr: '12-21H, jeu irrégulier ou faible pour 1SA, 4+ cartes à Carreau → 1♦.',
    en: '12-21 HCP, 4+ diamonds, no 5-card major → 1♦.',
  },
  open_1c: {
    fr: '12-21H, 4+ cartes à Trèfle (ou mineure la plus longue) → 1♣.',
    en: '12-21 HCP, 4+ clubs (or best minor) → 1♣.',
  },
  pass_default: {
    fr: 'Main ne remplit pas les critères d\'ouverture.',
    en: 'Hand does not meet opening criteria.',
  },
  overcall: {
    fr: '5+ cartes dans une couleur, 12-17H → contre-enchère simple au palier minimum.',
    en: '5+ cards in a suit, 12-17 HCP → simple overcall at the lowest level.',
  },
  pass_overcall: {
    fr: 'Main insuffisante pour contre-enchérir (< 12H ou pas de couleur 5ème).',
    en: 'Hand too weak to overcall (< 12 HCP or no 5-card suit).',
  },
}

export const RESPONSE_EXPLANATIONS = {
  resp_pass_weak: {
    fr: 'Moins de 6H — on ne peut pas répondre.',
    en: 'Fewer than 6 HCP — cannot respond.',
  },
  resp_2major_fit: {
    fr: '4+ cartes dans la majeure de l\'ouvreur, 6-9H → soutien simple.',
    en: '4+ card fit, 6-9 HCP → simple raise.',
  },
  resp_3major_inv: {
    fr: '4+ cartes dans la majeure, 13+H → soutien sautant, forcing manche.',
    en: '4+ card fit, 13+ HCP → jump raise, game forcing.',
  },
  resp_1major: {
    fr: '4+ cartes dans l\'autre majeure, 6+H → réponse économique au palier 1.',
    en: '4+ cards in the other major, 6+ HCP → bid it cheaply at the 1-level.',
  },
  resp_1nt: {
    fr: '6-10H, jeu régulier, pas de couleur 4ème → 1SA limitatif.',
    en: '6-10 HCP, balanced, no 4-card suit to show → 1NT limit bid.',
  },
  resp_new_suit_2: {
    fr: '10+H, nouvelle couleur au palier 2 — forcing pour un tour.',
    en: '10+ HCP, new suit at the 2-level — one-round force.',
  },
}
