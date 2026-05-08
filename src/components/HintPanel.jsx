/**
 * Panneau d'indices adaptatifs
 * Props:
 *   hint        { available, cost, hint_fr, hint_en, showFlowchart, recommended }
 *   onRequest   fn() — l'utilisateur demande l'indice
 *   revealed    bool — indice déjà révélé
 *   lang        'fr'|'en'
 *   xp          number
 */

import { useTranslation } from 'react-i18next'
import { bidStr } from '../engine/bidding/standard-francais.js'
import { SUIT_SYMBOLS } from '../engine/cards.js'

export default function HintPanel({ hint, onRequest, revealed = false, lang = 'fr', xp }) {
  const { t } = useTranslation()

  if (!hint) return null

  const text = lang === 'fr' ? hint.hint_fr : hint.hint_en

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-amber-800">{t('bidding.hint')}</span>
        {hint.cost > 0
          ? <span className="text-xs text-amber-600">{t('bidding.hint_cost', { cost: hint.cost })}</span>
          : <span className="text-xs text-emerald-600">{t('bidding.hint_free')}</span>
        }
      </div>

      {!revealed ? (
        <button
          onClick={onRequest}
          disabled={!hint.available}
          className="w-full py-2 rounded-lg bg-amber-400 text-amber-900 font-semibold hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {hint.available ? '? ' + t('bidding.hint') : t('play.hint_remaining', { n: 0 })}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Points comptés */}
          {hint.hcp !== undefined && (
            <div className="flex items-center gap-2 text-amber-900">
              <span className="font-mono bg-amber-100 px-2 py-0.5 rounded">{hint.hcp} H</span>
              {hint.ev?.balanced && <span className="text-xs">• jeu régulier</span>}
              {hint.ev?.hasMajor5 && hint.ev?.majorSuit && (
                <span className="text-xs">• 5+ {SUIT_SYMBOLS[hint.ev.majorSuit]}</span>
              )}
            </div>
          )}

          {/* Enchère recommandée */}
          {hint.recommended && (
            <div className="flex items-center gap-2">
              <span className="text-amber-700 text-xs">Annonce :</span>
              <span className="font-bold text-emerald-700 text-base">
                {bidStr(hint.recommended)}
              </span>
            </div>
          )}

          {/* Explication textuelle */}
          {text && (
            <p className="text-amber-900 text-xs leading-relaxed border-t border-amber-200 pt-2">
              {text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
