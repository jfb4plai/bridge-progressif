/**
 * Composant Carte de bridge
 * Props:
 *   card        {suit, rank}
 *   lang        'fr'|'en'
 *   faceDown    bool — dos de carte
 *   selected    bool — carte sélectionnée (surlignée)
 *   playable    bool — la carte peut être jouée
 *   onClick     fn
 *   size        'sm'|'md'|'lg'
 */

import { SUIT_SYMBOLS, RANK_DISPLAY, isRed } from '../engine/cards.js'

const SIZE = {
  sm: 'w-10 h-14 text-xs',
  md: 'w-14 h-20 text-sm',
  lg: 'w-16 h-24 text-base',
}

export default function Card({
  card,
  lang = 'fr',
  faceDown = false,
  selected = false,
  playable = true,
  onClick,
  size = 'md',
}) {
  if (!card) return null

  const rankDisp = RANK_DISPLAY[lang]?.[card.rank] ?? card.rank
  const symbol   = SUIT_SYMBOLS[card.suit]
  const red      = isRed(card)

  const baseClass = `
    relative rounded-lg border select-none font-card
    flex flex-col items-start justify-start p-1
    transition-all duration-150
    ${SIZE[size]}
    ${faceDown
      ? 'bg-blue-900 border-blue-700 cursor-default'
      : selected
        ? 'bg-yellow-50 border-yellow-400 shadow-lg -translate-y-2 cursor-pointer'
        : playable && onClick
          ? 'bg-white border-stone-300 shadow-sm hover:border-stone-400 hover:-translate-y-1 cursor-pointer'
          : 'bg-white border-stone-200 shadow-sm cursor-default opacity-90'
    }
  `

  if (faceDown) {
    return (
      <div className={baseClass}>
        <div className="absolute inset-1 rounded bg-blue-800 opacity-60" />
      </div>
    )
  }

  const color = red ? 'text-red-600' : 'text-stone-900'

  return (
    <div
      className={baseClass}
      onClick={playable && onClick ? onClick : undefined}
      role={onClick ? 'button' : undefined}
    >
      {/* Coin supérieur gauche */}
      <div className={`flex flex-col items-center leading-none ${color}`}>
        <span className="font-semibold">{rankDisp}</span>
        <span>{symbol}</span>
      </div>

      {/* Symbole central */}
      <div className={`absolute inset-0 flex items-center justify-center text-xl ${color} opacity-20`}>
        {symbol}
      </div>

      {/* Coin inférieur droit (retourné) */}
      <div className={`absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180 ${color}`}>
        <span className="font-semibold">{rankDisp}</span>
        <span>{symbol}</span>
      </div>
    </div>
  )
}
