/**
 * Générateur de donnes aléatoires pédagogiques
 * Produit des objets deal compatibles avec processAuction et DealDebrief
 */

import { dealRandom }         from '../../engine/dealer.js'
import { handHcp, suitLengths, isBalanced } from '../../engine/cards.js'
import { recommendOpening }   from '../../engine/bidding/standard-francais.js'
import { computeOvercall }    from '../../engine/bidding/auction.js'

// ─── Concepts pédagogiques pour donnes générées ──────────────────────────────

const GENERATED_CONCEPTS = {
  pass_weak: {
    slug: 'pass_weak',
    title_fr: 'Main faible — passer',
    title_en: 'Weak hand — pass',
    body_fr: 'Avec moins de 12H (et moins de 13 HL), la main est trop faible pour ouvrir. On passe et on attend que le partenaire ouvre.',
    body_en: 'With fewer than 12 HCP (and fewer than 13 HL), the hand is too weak to open. Pass and wait for partner to open.',
    key_rule_fr: '< 12H (ou < 13 HL) → passer.',
    key_rule_en: '< 12 HCP (or < 13 HL) → pass.',
  },
  open_1nt: {
    slug: 'nt_opening',
    title_fr: 'Ouverture 1SA (15-17H)',
    title_en: 'Opening 1NT (15-17 HCP)',
    body_fr: 'Avec 15-17H et un jeu régulier (pas de chicane, pas de cinq-cartes majeure), on ouvre 1SA. Cette enchère précise permet au partenaire de calculer immédiatement si la manche est possible.',
    body_en: 'With 15-17 HCP and a balanced hand (no void/singleton, no 5-card major), open 1NT. This precise bid lets partner immediately calculate game prospects.',
    key_rule_fr: '15-17H + jeu régulier → 1SA.',
    key_rule_en: '15-17 HCP + balanced → 1NT.',
  },
  open_1major: {
    slug: 'major_opening',
    title_fr: 'Ouverture d\'une majeure',
    title_en: 'Major suit opening',
    body_fr: 'Avec 5+ cartes dans une majeure et 12-21H, on ouvre cette majeure au palier 1. Les majeures sont prioritaires car trouver un fit en majeure permet d\'atteindre la manche à 4 niveaux (plus facile que 5♣/5♦ ou 3SA).',
    body_en: 'With 5+ cards in a major and 12-21 HCP, open that major at the 1-level. Majors are prioritized because a major fit reaches game at the 4-level (easier than 5♣/5♦ or 3NT).',
    key_rule_fr: '5+ cartes en majeure, 12-21H → ouvrir la majeure.',
    key_rule_en: '5+ cards in a major, 12-21 HCP → open the major.',
  },
  open_1d: {
    slug: 'minor_opening',
    title_fr: 'Ouverture 1♦',
    title_en: 'Opening 1♦',
    body_fr: 'Avec 12-21H, pas de 5-cartes majeure et pas de jeu régulier pour 1SA, on ouvre la mineure la plus longue. Si Carreau ≥ Trèfle (en nombre de cartes), on ouvre 1♦.',
    body_en: 'With 12-21 HCP, no 5-card major, and not balanced for 1NT, open the longest minor. If diamonds ≥ clubs (in card count), open 1♦.',
    key_rule_fr: '12-21H, 4+ carreaux ≥ trèfles → 1♦.',
    key_rule_en: '12-21 HCP, 4+ diamonds ≥ clubs → 1♦.',
  },
  open_1c: {
    slug: 'minor_opening',
    title_fr: 'Ouverture 1♣',
    title_en: 'Opening 1♣',
    body_fr: 'Avec 12-21H, pas de 5-cartes majeure et plus de trèfles que de carreaux (ou égalité), on ouvre 1♣.',
    body_en: 'With 12-21 HCP, no 5-card major, and more clubs than diamonds (or equal), open 1♣.',
    key_rule_fr: '12-21H, trèfles > carreaux → 1♣.',
    key_rule_en: '12-21 HCP, clubs > diamonds → 1♣.',
  },
  open_2nt: {
    slug: 'nt_opening_strong',
    title_fr: 'Ouverture 2SA (20-21H)',
    title_en: 'Opening 2NT (20-21 HCP)',
    body_fr: 'Avec 20-21H et un jeu régulier, on ouvre 2SA. C\'est une enchère très précise : le partenaire peut calculer directement si la manche (25H) ou le chelem (33H) est possible.',
    body_en: 'With 20-21 HCP and a balanced hand, open 2NT. This precise bid lets partner directly calculate whether game (25 HCP) or slam (33 HCP) is possible.',
    key_rule_fr: '20-21H + jeu régulier → 2SA.',
    key_rule_en: '20-21 HCP + balanced → 2NT.',
  },
  open_2c_forcing: {
    slug: 'strong_2c',
    title_fr: 'Ouverture 2♣ forcing',
    title_en: '2♣ forcing opening',
    body_fr: 'Avec ≥22H (ou ≥19H et main très irrégulière), on ouvre 2♣. Forcing absolu : le partenaire ne peut pas passer avant 2SA. Cette enchère réserve 2♥/2♦/2♠ pour des barrages.',
    body_en: 'With ≥22 HCP (or ≥19 HCP and very unbalanced), open 2♣. Absolute force: partner cannot pass before 2NT. This reserves 2♥/2♦/2♠ for weak preempts.',
    key_rule_fr: '≥22H → 2♣ forcing. Partenaire NE PEUT PAS passer.',
    key_rule_en: '≥22 HCP → 2♣ forcing. Partner CANNOT pass.',
  },
  overcall: {
    slug: 'overcall',
    title_fr: 'Contre-enchère simple',
    title_en: 'Simple overcall',
    body_fr: 'Quand un adversaire a ouvert, vous pouvez contre-enchérir avec 5+ cartes dans une couleur et 12-17H. Annoncez au palier minimum légal.',
    body_en: 'When an opponent has opened, you can overcall with 5+ cards in a suit and 12-17 HCP. Bid at the minimum legal level.',
    key_rule_fr: '5+ cartes, 12-17H → contre-enchérir au palier minimum.',
    key_rule_en: '5+ cards, 12-17 HCP → overcall at the minimum level.',
  },
  pass_default: {
    slug: 'pass_default',
    title_fr: 'Passer',
    title_en: 'Pass',
    body_fr: 'La main ne remplit pas les critères pour ouvrir ni pour contre-enchérir. On passe.',
    body_en: 'The hand does not meet the criteria to open or overcall. Pass.',
    key_rule_fr: 'Conditions non remplies → passer.',
    key_rule_en: 'Conditions not met → pass.',
  },
}

// ─── Approximation du contrat optimal ────────────────────────────────────────

const approximateContract = (south, north) => {
  const nsHcp = handHcp(south) + handHcp(north)
  const sLens = suitLengths(south)
  const nLens = suitLengths(north)

  // Fit dans chaque couleur
  const fit = {}
  for (const s of ['S', 'H', 'D', 'C']) {
    fit[s] = (sLens[s] || 0) + (nLens[s] || 0)
  }

  // Meilleur fit majeure / mineure
  const bestMajor = fit.S >= fit.H ? 'S' : 'H'
  const bestMinor = fit.D >= fit.C ? 'D' : 'C'
  const hasMajorFit = fit[bestMajor] >= 8
  const hasMinorFit = fit[bestMinor] >= 8

  // Déclarant = celui qui a le plus de cartes dans la meilleure couleur
  const dominantSuit = hasMajorFit ? bestMajor : (hasMinorFit ? bestMinor : 'NT')
  const declarer = dominantSuit !== 'NT'
    ? (sLens[dominantSuit] >= nLens[dominantSuit] ? 'S' : 'N')
    : (handHcp(south) >= handHcp(north) ? 'S' : 'N')

  if (nsHcp >= 33) {
    const suit = hasMajorFit ? bestMajor : 'NT'
    return { level: 6, suit, declarer, doubled: 0 }
  }
  if (nsHcp >= 25) {
    if (hasMajorFit) return { level: 4, suit: bestMajor, declarer, doubled: 0 }
    return { level: 3, suit: 'NT', declarer, doubled: 0 }
  }
  if (nsHcp >= 22) {
    if (hasMajorFit) return { level: 3, suit: bestMajor, declarer, doubled: 0 }
    if (hasMinorFit) return { level: 3, suit: bestMinor, declarer, doubled: 0 }
    return { level: 2, suit: 'NT', declarer, doubled: 0 }
  }
  // Manche partielle
  if (hasMajorFit) return { level: 2, suit: bestMajor, declarer, doubled: 0 }
  if (hasMinorFit) return { level: 2, suit: bestMinor, declarer, doubled: 0 }
  return { level: 1, suit: 'NT', declarer, doubled: 0 }
}

// ─── Titres dynamiques ────────────────────────────────────────────────────────

const SUIT_NAMES_FR = { S: 'Pique', H: 'Cœur', D: 'Carreau', C: 'Trèfle', NT: 'SA' }
const SUIT_NAMES_EN = { S: 'Spade', H: 'Heart', D: 'Diamond', C: 'Club', NT: 'NT' }
const SUIT_SYM      = { S: '♠', H: '♥', D: '♦', C: '♣', NT: 'SA' }

const dealTitle = (rec, lang) => {
  const hcp = rec.hcp
  if (rec.key === 'pass_weak')       return lang === 'fr' ? `Main faible (${hcp}H) — passer`           : `Weak hand (${hcp} HCP) — pass`
  if (rec.key === 'open_2c_forcing') return lang === 'fr' ? `Main très forte (${hcp}H) — 2♣ forcing`    : `Very strong hand (${hcp} HCP) — 2♣ forcing`
  if (rec.key === 'open_2nt')        return lang === 'fr' ? `Ouverture 2SA (${hcp}H)`                   : `Opening 2NT (${hcp} HCP)`
  if (rec.key === 'open_1nt')        return lang === 'fr' ? `Ouverture 1SA (${hcp}H)`                   : `Opening 1NT (${hcp} HCP)`
  if (rec.key === 'open_1major') {
    const sym = SUIT_SYM[rec.ev?.majorSuit ?? 'S']
    return lang === 'fr' ? `Ouverture 1${sym} (${hcp}H)` : `Opening 1${sym} (${hcp} HCP)`
  }
  if (rec.key === 'open_1d') return lang === 'fr' ? `Ouverture 1♦ (${hcp}H)` : `Opening 1♦ (${hcp} HCP)`
  if (rec.key === 'open_1c') return lang === 'fr' ? `Ouverture 1♣ (${hcp}H)` : `Opening 1♣ (${hcp} HCP)`
  return lang === 'fr' ? `Donne générée (${hcp}H)` : `Generated deal (${hcp} HCP)`
}

// ─── Générateur principal ────────────────────────────────────────────────────

/**
 * Génère une donne aléatoire compatible avec le reste de l'app.
 * @param {number} level — niveau joueur (1-5)
 * @param {string} system — 'sf' | 'saf'
 * @returns {Object} — deal object
 */
export const generateRandomDeal = (level = 1, system = 'sf') => {
  // Dealer : L1 = toujours S, L2+ = aléatoire
  const DEALERS = level >= 2 ? ['N', 'E', 'S', 'W'] : ['S']
  const dealer  = DEALERS[Math.floor(Math.random() * DEALERS.length)]

  // Générer des mains jusqu'à obtenir une main de Sud intéressante (7-22H)
  let rawDeal, southRec
  let attempts = 0
  do {
    rawDeal  = dealRandom(dealer)
    southRec = recommendOpening(rawDeal.south, { system })
    attempts++
  } while (attempts < 100 && (southRec.hcp < 7 || southRec.hcp > 22))

  const optimal = approximateContract(rawDeal.south, rawDeal.north)
  const concept = GENERATED_CONCEPTS[southRec.key] ?? GENERATED_CONCEPTS.pass_default

  return {
    slug:    `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    level,
    title_fr: dealTitle({ ...southRec, hcp: southRec.hcp }, 'fr'),
    title_en: dealTitle({ ...southRec, hcp: southRec.hcp }, 'en'),
    concepts: [concept.slug],
    isGenerated: true,

    south: rawDeal.south,
    north: rawDeal.north,
    east:  rawDeal.east,
    west:  rawDeal.west,

    dealer,
    vulnerability: 'none',

    optimal_contract: optimal,
    optimal_tricks:  Math.round(6 + optimal.level + Math.random() * 0.5),

    bidding_sequence: [],  // non utilisé par processAuction
    play_line: { opening_lead: null, notes_fr: [], notes_en: [] },

    concept,
  }
}
