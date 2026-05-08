/**
 * Historique des enchères affiché en tableau classique
 * Props:
 *   history   [{seat, bid}]
 *   dealer    'N'|'E'|'S'|'W'
 *   lang      'fr'|'en'
 */

import { SUIT_SYMBOLS } from '../engine/cards.js'
import { bidStr } from '../engine/bidding/standard-francais.js'
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
