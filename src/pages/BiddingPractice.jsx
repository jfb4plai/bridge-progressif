/**
 * Page d'entraînement aux enchères
 * Charge une donne L1/L2 ou génère aléatoirement selon le niveau
 * Évalue chaque enchère de l'utilisateur et donne un feedback
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Hand from '../components/Hand.jsx'
import BiddingBox from '../components/BiddingBox.jsx'
import BiddingHistory from '../components/BiddingHistory.jsx'
import HintPanel from '../components/HintPanel.jsx'

import { recommendOpening, bidStr, OPENING_EXPLANATIONS } from '../engine/bidding/standard-francais.js'
import { evaluateOpening } from '../engine/bidding/evaluator.js'
import { biddingHint } from '../engine/hints.js'
import { handHcp, sortHand } from '../engine/cards.js'

import dealData from '../data/deals/level1/001-impasse-pique.json'

export default function BiddingPractice({ profile, onXpGain }) {
  const { t }     = useTranslation()
  const navigate  = useNavigate()
  const lang      = profile?.lang ?? 'fr'
  const system    = profile?.system ?? 'sf'
  const xp        = profile?.xp ?? 0

  const deal       = dealData
  const playerHand = deal.south   // Sud = joueur
  const hcp        = handHcp(playerHand)

  const [bidsHistory, setBids]   = useState([])
  const [feedback, setFeedback]  = useState(null)   // {correct, expected, key, ...}
  const [hintRevealed, setHintR] = useState(false)
  const [hintsUsed, setHintsU]   = useState(0)
  const [done, setDone]          = useState(false)

  // Dernier bid valide (pour griser le tableau)
  const lastValidBid = bidsHistory
    .filter(h => !h.bid.special)
    .slice(-1)[0]?.bid ?? null

  const hint = biddingHint(playerHand, xp, { system, lang })

  const handleBid = (bid) => {
    if (done) return

    const result = evaluateOpening(bid, playerHand, { system, lang })
    setBids(prev => [...prev, { seat: 'S', bid }])
    setFeedback(result)

    // Si c'est la 1ère annonce de l'ouvreur → fin de la phase simplifiée
    setDone(true)

    // XP
    const xpGain = result.correct
      ? (hintsUsed === 0 ? 15 : 10)
      : -2
    onXpGain?.(xpGain)
  }

  const handleHintRequest = () => {
    setHintR(true)
    setHintsU(n => n + 1)
    if (hint.cost > 0) onXpGain?.(-hint.cost)
  }

  const expl = feedback?.key ? OPENING_EXPLANATIONS[feedback.key] : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">{t('bidding.title')}</h1>
        <button onClick={() => navigate('/')} className="text-sm text-stone-400 hover:text-stone-600">
          ← {t('nav.dashboard')}
        </button>
      </div>

      {/* Contexte donne */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
        <div className="text-xs text-stone-500 mb-3 font-semibold uppercase tracking-wide">
          {t('bidding.your_hand')} — {hcp} H
        </div>
        <Hand hand={playerHand} lang={lang} compact size="md" />
      </div>

      {/* Historique enchères */}
      {bidsHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <BiddingHistory history={bidsHistory} dealer={deal.dealer} lang={lang} />
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl border p-4 text-sm ${feedback.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="font-semibold mb-1">
            {feedback.correct ? `✓ ${t('bidding.correct')}` : `✗ ${t('bidding.incorrect')}`}
          </div>
          <div className="text-stone-700">
            {t('bidding.expected')} : <strong>{bidStr(feedback.expected)}</strong>
          </div>
          {expl && (
            <p className="mt-2 text-stone-600 leading-relaxed">
              {lang === 'fr' ? expl.fr : expl.en}
            </p>
          )}
        </div>
      )}

      {/* Indice */}
      {!done && (
        <HintPanel
          hint={hint}
          onRequest={handleHintRequest}
          revealed={hintRevealed}
          lang={lang}
          xp={xp}
        />
      )}

      {/* Tableau d'enchères */}
      {!done && (
        <div>
          <div className="text-xs text-stone-500 font-semibold uppercase tracking-wide mb-2">
            {t('bidding.bidding_box')}
          </div>
          <BiddingBox onBid={handleBid} lastBid={lastValidBid} lang={lang} />
        </div>
      )}

      {/* Navigation après feedback */}
      {done && (
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/full')}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
          >
            {t('dashboard.start_full')}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-colors"
          >
            {t('debrief.back_dashboard')}
          </button>
        </div>
      )}
    </div>
  )
}
