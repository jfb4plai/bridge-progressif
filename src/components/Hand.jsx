/**
 * Affiche une main de bridge (13 cartes)
 * Props:
 *   hand          array de cartes
 *   lang          'fr'|'en'
 *   faceDown      bool — toutes les cartes dos visible
 *   playableCards array de cardKey() — cartes jouables
 *   selectedCard  cardKey()
 *   onCardClick   fn(card)
 *   orientation   'horizontal'|'vertical'
 *   size          'sm'|'md'|'lg'
 *   label         string — étiquette de position (Nord, Sud…)
 */

import { sortHand, cardKey, SUITS, SUIT_SYMBOLS, RANK_DISPLAY } from '../engine/cards.js'
import Card from './Card.jsx'

export default function Hand({
  hand = [],
  lang = 'fr',
  faceDown = false,
  playableCards = [],
  selectedCard = null,
  onCardClick,
  orientation = 'horizontal',
  size = 'md',
  label,
  compact = false,  // affichage compact : juste les symboles + rangs en ligne
}) {
  const sorted = sortHand(hand)

  if (compact) {
    return <CompactHand hand={sorted} lang={lang} label={label} />
  }

  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col items-center gap-1">
        {label && <span className="text-xs font-semibold text-stone-500 mb-1">{label}</span>}
        <div className="flex flex-col gap-1">
          {sorted.map(card => (
            <Card
              key={cardKey(card)}
              card={card}
              lang={lang}
              faceDown={faceDown}
              selected={selectedCard === cardKey(card)}
              playable={playableCards.includes(cardKey(card))}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
              size={size}
            />
          ))}
        </div>
      </div>
    )
  }

  // Horizontal — cartes superposées légèrement
  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-xs font-semibold text-stone-500 mb-1">{label}</span>}
      <div className="flex flex-row" style={{ gap: size === 'sm' ? '-8px' : '-12px' }}>
        {sorted.map((card, i) => (
          <div key={cardKey(card)} style={{ marginLeft: i > 0 ? (size === 'sm' ? '-20px' : '-28px') : 0 }}>
            <Card
              card={card}
              lang={lang}
              faceDown={faceDown}
              selected={selectedCard === cardKey(card)}
              playable={playableCards.includes(cardKey(card))}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
              size={size}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Affichage compact d'une main — comme dans les livres de bridge */
function CompactHand({ hand, lang, label }) {
  const disp = RANK_DISPLAY[lang] ?? RANK_DISPLAY.fr
  const bySuit = SUITS.map(suit => ({
    suit,
    cards: hand.filter(c => c.suit === suit).sort((a, b) => {
      const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
      return ranks.indexOf(a.rank) - ranks.indexOf(b.rank)
    }),
  }))

  return (
    <div className="font-card text-sm leading-snug">
      {label && <div className="text-xs font-semibold text-stone-500 mb-1 font-ui">{label}</div>}
      {bySuit.map(({ suit, cards }) => {
        const red = suit === 'H' || suit === 'D'
        return (
          <div key={suit} className="flex gap-1">
            <span className={red ? 'text-red-600' : 'text-stone-900'}>{SUIT_SYMBOLS[suit]}</span>
            <span className="text-stone-800">
              {cards.length > 0 ? cards.map(c => disp[c.rank]).join(' ') : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
