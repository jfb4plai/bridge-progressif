/**
 * Historique des enchères affiché en tableau classique
 * Props:
 *   history   [{seat, bid}]
 *   dealer    'N'|'E'|'S'|'W'
 *   lang      'fr'|'en'
 *
 * Exporte aussi AiBidReadout — annotations des bids IA sous la table
 */

import { SUIT_SYMBOLS } from '../engine/cards.js'
import { bidStr } from '../engine/bidding/standard-francais.js'
import { OPENING_EXPLANATIONS, RESPONSE_EXPLANATIONS } from '../engine/bidding/standard-francais.js'
import { useTranslation } from 'react-i18next'

const SEAT_ORDER = ['W', 'N', 'E', 'S']  // ordre standard tableau enchères

const SUIT_COLORS_INLINE = { S: '', H: 'text-red-600', D: 'text-red-600', C: '', NT: 'text-blue-700' }

const BidDisplay = ({ bid, lang }) => {
  if (!bid) return <span className="text-stone-300">—</span>
  if (bid.special === 'pass') return <span className="text-stone-500">Passe</span>
  if (bid.special === 'dbl')  return <span className="text-red-600 font-bold">X</span>
  if (bid.special === 'rdbl') return <span className="text-blue-600 font-bold">XX</span>
  const suitStr = bid.suit === 'NT' ? (lang === 'fr' ? 'SA' : 'NT') : SUIT_SYMBOLS[bid.suit]
  return (
    <span className={`font-semibold ${SUIT_COLORS_INLINE[bid.suit] ?? ''}`}>
      {bid.level}{suitStr}
    </span>
  )
}

const SEAT_LABELS = { fr: { N:'Nord', E:'Est', W:'Ouest', S:'Sud' }, en: { N:'North', E:'East', W:'West', S:'South' } }

// Couleurs par camp : partenaire (N) = emerald, adversaires (E/W) = amber
const SEAT_COLOR = { N: 'text-emerald-700', S: 'text-emerald-700', E: 'text-amber-700', W: 'text-amber-700' }

/**
 * Annotations pédagogiques sous la table — explique chaque bid IA (N/E/W)
 * Props: history (avec aiKey), lang
 */
export function AiBidReadout({ history = [], lang = 'fr' }) {
  const labels = SEAT_LABELS[lang] ?? SEAT_LABELS.fr
  const aiBids = history.filter(h => h.isAi && h.aiKey)
  if (aiBids.length === 0) return null

  return (
    <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
      {aiBids.map((h, i) => {
        const expl = (OPENING_EXPLANATIONS[h.aiKey] ?? RESPONSE_EXPLANATIONS[h.aiKey])?.[lang]
        if (!expl) return null
        return (
          <div key={i} className="flex gap-2 items-baseline text-xs">
            <span className={`font-semibold w-10 shrink-0 ${SEAT_COLOR[h.seat]}`}>
              {labels[h.seat]}
            </span>
            <span className="font-card font-bold text-stone-800 w-8 shrink-0">
              {bidStr(h.bid)}
            </span>
            <span className="text-stone-400 shrink-0">—</span>
            <span className="text-stone-500 leading-snug">{expl}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function BiddingHistory({ history = [], dealer = 'S', lang = 'fr' }) {
  const { t } = useTranslation()
  const dealerIdx = SEAT_ORDER.indexOf(dealer)

  // Rembourrage pour aligner sur la bonne colonne
  const padded = Array(dealerIdx).fill(null).concat(history.map(h => h.bid))

  // Découpe en rangées de 4
  const rows = []
  for (let i = 0; i < padded.length; i += 4) {
    rows.push(padded.slice(i, i + 4))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-center font-card border-collapse">
        <thead>
          <tr>
            {SEAT_ORDER.map(seat => (
              <th key={seat} className="px-3 py-1 text-xs font-semibold text-stone-500 border-b border-stone-200">
                {t(`seats.${seat}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {Array(4).fill(null).map((_, ci) => (
                <td key={ci} className="px-3 py-1.5 border-b border-stone-100">
                  {row[ci] !== undefined
                    ? <BidDisplay bid={row[ci]} lang={lang} />
                    : null}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-stone-400 text-xs italic">
                {lang === 'fr' ? 'Aucune enchère encore' : 'No bids yet'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
