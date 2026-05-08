/**
 * Tableau d'enchères interactif
 * Props:
 *   onBid         fn(bid)
 *   lastBid       {level, suit} | null — dernière enchère valide (pour griser les bids inférieurs)
 *   disabled      bool
 *   lang          'fr'|'en'
 */

import { SUIT_SYMBOLS } from '../engine/cards.js'
import { useTranslation } from 'react-i18next'

const SUITS_ORDER = ['C', 'D', 'H', 'S', 'NT']
const LEVELS      = [1, 2, 3, 4, 5, 6, 7]

const SUIT_COLORS = {
  S: 'text-stone-800',
  H: 'text-red-600',
  D: 'text-red-600',
  C: 'text-stone-800',
  NT:'text-blue-700',
}

// Valeur ordinale d'un bid pour comparer
const bidOrdinal = (level, suit) => {
  const suitIdx = SUITS_ORDER.indexOf(suit)
  return (level - 1) * 5 + suitIdx
}

const isBidLegal = (level, suit, lastBid) => {
  if (!lastBid) return true
  return bidOrdinal(level, suit) > bidOrdinal(lastBid.level, lastBid.suit)
}

export default function BiddingBox({ onBid, lastBid, disabled = false, lang = 'fr' }) {
  const { t } = useTranslation()

  const handleBid = (level, suit) => {
    if (disabled) return
    if (!isBidLegal(level, suit, lastBid)) return
    onBid?.({ level, suit })
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-sm">
      {/* Tableau niveau × couleur */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${SUITS_ORDER.length}, 1fr)` }}>
        {/* En-tête couleurs */}
        <div /> {/* cellule vide coin */}
        {SUITS_ORDER.map(suit => (
          <div key={suit} className={`text-center text-sm font-semibold ${SUIT_COLORS[suit]}`}>
            {suit === 'NT' ? (lang === 'fr' ? 'SA' : 'NT') : SUIT_SYMBOLS[suit]}
          </div>
        ))}

        {/* Lignes niveaux */}
        {LEVELS.map(level => (
          <>
            <div key={`l${level}`} className="flex items-center justify-center text-xs text-stone-400 pr-1">
              {level}
            </div>
            {SUITS_ORDER.map(suit => {
              const legal = isBidLegal(level, suit, lastBid)
              return (
                <button
                  key={`${level}${suit}`}
                  onClick={() => handleBid(level, suit)}
                  disabled={disabled || !legal}
                  className={`
                    rounded text-sm font-semibold py-1 transition-colors
                    ${legal && !disabled
                      ? `${SUIT_COLORS[suit]} bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 cursor-pointer`
                      : 'text-stone-300 bg-stone-50 border border-stone-100 cursor-not-allowed'
                    }
                  `}
                >
                  {level}{suit === 'NT' ? (lang === 'fr' ? 'SA' : 'NT') : SUIT_SYMBOLS[suit]}
                </button>
              )
            })}
          </>
        ))}
      </div>

      {/* Actions spéciales */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
        <button
          onClick={() => !disabled && onBid?.({ special: 'pass' })}
          disabled={disabled}
          className="flex-1 py-1.5 rounded bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200 disabled:opacity-40 transition-colors"
        >
          {t('bidding.pass')}
        </button>
        <button
          onClick={() => !disabled && onBid?.({ special: 'dbl' })}
          disabled={disabled}
          className="flex-1 py-1.5 rounded bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors"
        >
          {t('bidding.double')}
        </button>
        <button
          onClick={() => !disabled && onBid?.({ special: 'rdbl' })}
          disabled={disabled}
          className="flex-1 py-1.5 rounded bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 disabled:opacity-40 transition-colors"
        >
          {t('bidding.redouble')}
        </button>
      </div>
    </div>
  )
}
