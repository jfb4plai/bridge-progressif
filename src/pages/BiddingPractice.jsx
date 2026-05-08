/**
 * Page d'entraînement aux enchères — séquence complète
 * - Rotation automatique des donnes pré-construites
 * - L'IA annonce pour N / E / O (E/O passent au niveau 1)
 * - Évaluation de chaque bid de Sud avec feedback et XP
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Hand from '../components/Hand.jsx'
import BiddingBox from '../components/BiddingBox.jsx'
import BiddingHistory from '../components/BiddingHistory.jsx'
import HintPanel from '../components/HintPanel.jsx'

import {
  processAuction, evaluatePlayerBid,
  lastValidBid, extractContract, bidStr,
} from '../engine/bidding/auction.js'
import { biddingHint } from '../engine/hints.js'
import { handHcp, SUIT_SYMBOLS } from '../engine/cards.js'
import { OPENING_EXPLANATIONS, RESPONSE_EXPLANATIONS } from '../engine/bidding/standard-francais.js'
import { nextDeal } from '../data/deals/index.js'

export default function BiddingPractice({ profile, onXpGain }) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const lang     = profile?.lang   ?? 'fr'
  const system   = profile?.system ?? 'sf'
  const xp       = profile?.xp    ?? 0
  const level    = profile?.level  ?? 1

  // ─── Donne courante ─────────────────────────────────────────────────────────
  const [deal, setDeal] = useState(null)

  useEffect(() => {
    const d = nextDeal(level)
    setDeal(d)
  }, [level])

  // ─── Enchères ────────────────────────────────────────────────────────────────
  const [auctionHistory,  setHistory]    = useState([])
  const [waitingForPlayer, setWaiting]  = useState(false)
  const [auctionDone,      setDone]     = useState(false)
  const [contract,         setContract] = useState(null)

  // Évaluations de chaque bid de Sud
  const [evaluations, setEvals]   = useState([])  // [{correct, expected, played, ...}]
  const [lastEval,    setLastEval] = useState(null)

  // Indices
  const [hintRevealed, setHintR] = useState(false)
  const [hintsUsed,    setHintsU] = useState(0)

  // ─── Démarrer / redémarrer ──────────────────────────────────────────────────
  const startAuction = useCallback((currentDeal) => {
    if (!currentDeal) return
    setHistory([])
    setEvals([])
    setLastEval(null)
    setDone(false)
    setContract(null)
    setHintR(false)
    setHintsU(0)
    setWaiting(false)

    // Avancer jusqu'au premier tour de Sud (ou fin si tout le monde passe avant)
    const result = processAuction([], currentDeal, { system, level })
    setHistory(result.history)
    setWaiting(result.waitingForPlayer)
    if (result.done) { setDone(true); setContract(result.contract) }
  }, [system, level])

  useEffect(() => {
    if (deal) startAuction(deal)
  }, [deal]) // eslint-disable-line

  // ─── Bid du joueur ──────────────────────────────────────────────────────────
  const handleBid = useCallback((bid) => {
    if (!deal || !waitingForPlayer || auctionDone) return

    // Évaluer
    const eval_ = evaluatePlayerBid(bid, deal.south, auctionHistory, { system })
    const newHistory = [...auctionHistory, { seat: 'S', bid, isPlayer: true }]

    setEvals(prev => [...prev, eval_])
    setLastEval(eval_)
    setHintR(false)  // reset indice pour la prochaine enchère

    // XP
    onXpGain?.(eval_.xpDelta)

    // Continuer la séquence
    const result = processAuction(newHistory, deal, { system, level })
    setHistory(result.history)
    setWaiting(result.waitingForPlayer)
    if (result.done) { setDone(true); setContract(result.contract) }
  }, [deal, waitingForPlayer, auctionDone, auctionHistory, system, level, onXpGain])

  // ─── Indice ─────────────────────────────────────────────────────────────────
  const hint = deal ? biddingHint(deal.south, xp, { system, lang }) : null

  const handleHintRequest = useCallback(() => {
    setHintR(true)
    setHintsU(n => n + 1)
    if (hint?.cost > 0) onXpGain?.(-hint.cost)
  }, [hint, onXpGain])

  // ─── Donne suivante ─────────────────────────────────────────────────────────
  const handleNextDeal = () => {
    const d = nextDeal(level)
    setDeal(d)
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  if (!deal) return (
    <div className="flex items-center justify-center min-h-screen text-stone-400">…</div>
  )

  const hcp         = handHcp(deal.south)
  const lastBid     = lastValidBid(auctionHistory)
  const contractStr = contract
    ? `${contract.level}${contract.suit === 'NT' ? (lang === 'fr' ? 'SA' : 'NT') : SUIT_SYMBOLS[contract.suit]}`
    : null

  // Explication du dernier eval
  const expl = lastEval?.key
    ? (OPENING_EXPLANATIONS[lastEval.key] ?? RESPONSE_EXPLANATIONS[lastEval.key])
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">{t('bidding.title')}</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {lang === 'fr' ? deal.title_fr : deal.title_en}
          </p>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-stone-400 hover:text-stone-600">
          ← {t('nav.dashboard')}
        </button>
      </div>

      {/* Main de Sud */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
        <div className="text-xs text-stone-500 mb-3 font-semibold uppercase tracking-wide">
          {t('bidding.your_hand')} — {hcp} H
        </div>
        <Hand hand={deal.south} lang={lang} compact size="md" />
      </div>

      {/* Rappel comptage HCP */}
      <HcpReminder lang={lang} />

      {/* Historique enchères */}
      {auctionHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="text-xs text-stone-500 mb-2 font-semibold uppercase tracking-wide">
            {t('bidding.history')}
          </div>
          <BiddingHistory history={auctionHistory} dealer={deal.dealer} lang={lang} />
        </div>
      )}

      {/* Feedback dernier bid de Sud */}
      {lastEval && (
        <div className={`rounded-xl border p-4 text-sm ${lastEval.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="font-semibold mb-1">
            {lastEval.correct ? `✓ ${t('bidding.correct')}` : `✗ ${t('bidding.incorrect')}`}
          </div>
          <div className="text-stone-700 text-sm">
            {t('bidding.expected')} : <strong>{bidStr(lastEval.expected)}</strong>
            {lastEval.played && !lastEval.correct && (
              <span className="ml-2 text-stone-400">
                ({lang === 'fr' ? 'vous' : 'you'} : {bidStr(lastEval.played)})
              </span>
            )}
          </div>
          {expl && (
            <p className="mt-2 text-stone-600 leading-relaxed text-xs border-t border-stone-200 pt-2">
              {lang === 'fr' ? expl.fr : expl.en}
            </p>
          )}
        </div>
      )}

      {/* Contrat final */}
      {auctionDone && contract && (
        <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-sm">
          <div className="font-semibold text-stone-700 mb-1">
            {lang === 'fr' ? 'Contrat final' : 'Final contract'} : <span className="text-emerald-700 text-base">{contractStr}</span>
            {' '}— {lang === 'fr' ? 'déclarant' : 'declarer'} : {contract.declarer}
          </div>
          {evaluations.length > 0 && (
            <div className="text-xs text-stone-500 mt-1">
              {evaluations.filter(e => e.correct).length}/{evaluations.length}{' '}
              {lang === 'fr' ? 'enchères correctes' : 'correct bids'}
            </div>
          )}
        </div>
      )}

      {/* Indice (seulement si c'est le tour de Sud et pas fini) */}
      {waitingForPlayer && !auctionDone && hint && (
        <HintPanel
          hint={hint}
          onRequest={handleHintRequest}
          revealed={hintRevealed}
          lang={lang}
          xp={xp}
        />
      )}

      {/* Tableau d'enchères (seulement si c'est le tour de Sud) */}
      {waitingForPlayer && !auctionDone && (
        <div>
          <div className="text-xs text-stone-500 font-semibold uppercase tracking-wide mb-2">
            {t('bidding.bidding_box')}
          </div>
          <BiddingBox onBid={handleBid} lastBid={lastBid} lang={lang} />
        </div>
      )}

      {/* Navigation après fin de mise */}
      {auctionDone && (
        <div className="flex gap-3">
          <button
            onClick={handleNextDeal}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
          >
            {lang === 'fr' ? 'Donne suivante' : 'Next deal'}
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

// ─── Rappel comptage HCP ──────────────────────────────────────────────────────

function HcpReminder({ lang }) {
  const [open, setOpen] = useState(false)

  const honors = lang === 'fr'
    ? [{ r: 'A', v: 4 }, { r: 'R', v: 3 }, { r: 'D', v: 2 }, { r: 'V', v: 1 }]
    : [{ r: 'A', v: 4 }, { r: 'K', v: 3 }, { r: 'Q', v: 2 }, { r: 'J', v: 1 }]

  const label     = lang === 'fr' ? 'Comptage des honneurs' : 'Honor count'
  const threshold = lang === 'fr'
    ? '12 H minimum pour ouvrir · 25 H pour la manche'
    : '12 HCP minimum to open · 25 HCP for game'

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 text-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-stone-600 hover:bg-stone-100 transition-colors"
      >
        <span className="font-semibold text-xs uppercase tracking-wide">{label}</span>
        <span className="text-stone-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex gap-3">
            {honors.map(({ r, v }) => (
              <div key={r} className="flex items-center gap-1">
                <span className="font-bold text-stone-800 font-card text-base">{r}</span>
                <span className="text-stone-400">=</span>
                <span className="font-semibold text-emerald-700">{v} H</span>
              </div>
            ))}
            <div className="flex items-center gap-1 text-stone-400 text-xs ml-auto">
              {lang === 'fr' ? 'les autres = 0' : 'others = 0'}
            </div>
          </div>
          <p className="text-xs text-stone-500 border-t border-stone-200 pt-2">{threshold}</p>
        </div>
      )}
    </div>
  )
}
