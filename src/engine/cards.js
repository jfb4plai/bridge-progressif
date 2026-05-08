/**
 * Bridge card engine — représentation et utilitaires de base
 * Système français : A R D V x  (Ace King Queen Jack small)
 */

export const SUITS = ['S', 'H', 'D', 'C']       // Pique Coeur Carreau Trèfle
export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
export const SEATS = ['N', 'E', 'S', 'W']        // Nord Est Sud Ouest

// Valeur HCP de chaque rank
export const HCP_VALUE = { A: 4, K: 3, Q: 2, J: 1, T: 0, '9': 0, '8': 0, '7': 0, '6': 0, '5': 0, '4': 0, '3': 0, '2': 0 }

// Symboles unicode des couleurs
export const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' }

// Noms français des couleurs
export const SUIT_NAMES = {
  fr: { S: 'Pique', H: 'Cœur', D: 'Carreau', C: 'Trèfle' },
  en: { S: 'Spade', H: 'Heart', D: 'Diamond', C: 'Club' },
}

// Noms français des rangs (affichage sur carte)
export const RANK_DISPLAY = {
  fr: { A: 'A', K: 'R', Q: 'D', J: 'V', T: '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2' },
  en: { A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2' },
}

/** Crée une carte {suit, rank} */
export const makeCard = (suit, rank) => ({ suit, rank })

/** Crée le jeu de 52 cartes */
export const makeDeck = () =>
  SUITS.flatMap(suit => RANKS.map(rank => makeCard(suit, rank)))

/** Valeur HCP d'une carte */
export const cardHcp = card => HCP_VALUE[card.rank] ?? 0

/** Valeur HCP d'une main (array de cartes) */
export const handHcp = hand => hand.reduce((sum, c) => sum + cardHcp(c), 0)

/** Points de distribution (longueur) — méthode standard */
export const handDistPoints = hand => {
  const lengths = suitLengths(hand)
  return Object.values(lengths).reduce((sum, len) => {
    if (len >= 7) return sum + 3
    if (len === 6) return sum + 2
    if (len === 5) return sum + 1
    return sum
  }, 0)
}

/** Points de distribution (chicane/singleton/doubleton) */
export const handShortPoints = hand => {
  const lengths = suitLengths(hand)
  return Object.values(lengths).reduce((sum, len) => {
    if (len === 0) return sum + 3  // chicane
    if (len === 1) return sum + 2  // singleton
    if (len === 2) return sum + 1  // doubleton
    return sum
  }, 0)
}

/** Longueur de chaque couleur dans une main */
export const suitLengths = hand => {
  const out = { S: 0, H: 0, D: 0, C: 0 }
  hand.forEach(c => { out[c.suit]++ })
  return out
}

/** Trie les cartes d'une main par couleur puis rang décroissant */
export const sortHand = hand =>
  [...hand].sort((a, b) => {
    const si = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    if (si !== 0) return si
    return RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank)
  })

/** Clé unique d'une carte  ex: "AS" "KH" "TD" */
export const cardKey = card => `${card.rank}${card.suit}`

/** Reconstruire une carte depuis sa clé */
export const fromKey = key => ({ rank: key.slice(0, -1), suit: key.slice(-1) })

/** Rang numérique (2=0 … A=12) pour comparaison */
export const rankValue = rank => RANKS.indexOf(rank)

/** Couleur rouge ? */
export const isRed = card => card.suit === 'H' || card.suit === 'D'

/** Jeu régulier ? (4333 / 4432 / 5332) */
export const isBalanced = hand => {
  const lens = Object.values(suitLengths(hand)).sort((a, b) => a - b)
  const [a, b, c, d] = lens
  return (
    (a === 3 && b === 3 && c === 3 && d === 4) || // 4333
    (a === 2 && b === 3 && c === 4 && d === 4) || // 4432
    (a === 2 && b === 3 && c === 3 && d === 5)    // 5332
  )
}

/** Couleur la plus longue (retourne 'S'|'H'|'D'|'C') */
export const longestSuit = hand => {
  const lens = suitLengths(hand)
  return SUITS.reduce((best, s) => lens[s] > lens[best] ? s : best, 'S')
}

/** Affichage condensé d'une main pour debug */
export const handStr = (hand, lang = 'fr') => {
  const disp = RANK_DISPLAY[lang]
  return SUITS.map(suit => {
    const cards = hand.filter(c => c.suit === suit).sort((a, b) => rankValue(b.rank) - rankValue(a.rank))
    return `${SUIT_SYMBOLS[suit]} ${cards.map(c => disp[c.rank]).join('')}`
  }).join(' | ')
}
