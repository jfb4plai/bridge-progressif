/**
 * Page d'entraînement aux enchères — séquence complète
 * - Rotation automatique des donnes pré-construites
 * - L'IA annonce pour N / E / O (E/O passent au niveau 1)
 * - Évaluation de chaque bid de Sud avec feedback et XP
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Hand from '../components/Hand.jsx'
import BridgeTable from '../components/BridgeTable.jsx'
import BiddingBox from '../components/BiddingBox.jsx'
import BiddingHistory, { AiBidReadout } from '../components/BiddingHistory.jsx'
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
    const d = nextDeal(level, system)
    setDeal(d)
  }, [level, system])

  // ─── Enchères ────────────────────────────────────────────────────────────────
  const [auctionHistory,  setHistory]    = useState([])
  const [waitingForPlayer, setWaiting]  = useState(false)
  const [auctionDone,      setDone]     = useState(false)
  const [contract,         setContract] = useState(null)

  // Évaluations de chaque bid de Sud
  const [evaluations, setEvals]   = useState([])  // [{correct, expected, played, ...}]
  const [lastEval,    setLastEval] = useState(null)
  const totalXpRef = useRef(0)  // cumul XP de la donne en cours

  // Indices
  const [hintRevealed, setHintR] = useState(false)
  const [hintsUsed,    setHintsU] = useState(0)

  // Affichage table
  const [showTable, setShowTable] = useState(false)

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
    totalXpRef.current = 0

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
    totalXpRef.current += eval_.xpDelta ?? 0

    // Continuer la séquence
    const result = processAuction(newHistory, deal, { system, level })
    setHistory(result.history)
    setWaiting(result.waitingForPlayer)
    if (result.done) {
      setDone(true)
      setContract(result.contract)
      // Navigation vers le bilan (légère pause pour laisser le state se mettre à jour)
      setTimeout(() => {
        navigate('/debrief', {
          state: {
            deal,
            contract: result.contract,
            evaluations: [...evaluations, eval_],
            auctionHistory: result.history,
            totalXpDelta: totalXpRef.current,
            hintsUsed: hintsUsed,
            lang,
          }
        })
      }, 800)
    }
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
    const d = nextDeal(level, system)
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
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm overflow-x-auto">
        <div className="text-xs text-stone-500 mb-3 font-semibold uppercase tracking-wide">
          {t('bidding.your_hand')} — {hcp} H
        </div>
        <Hand hand={deal.south} lang={lang} size="sm" />
      </div>

      {/* Rappel comptage HCP */}
      <HcpReminder lang={lang} />

      {/* Règles des annonces */}
      <BiddingRules lang={lang} level={level} />

      {/* Table fictive (toggle) */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 overflow-hidden">
        <button
          onClick={() => setShowTable(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <span className="font-semibold text-xs uppercase tracking-wide">
            {lang === 'fr' ? 'Table de bridge' : 'Bridge table'}
          </span>
          <span className="text-stone-400 text-xs">{showTable ? '▲' : '▼'}</span>
        </button>
        {showTable && (
          <div className="pb-4">
            <BridgeTable
              deal={deal}
              revealSeats={['S']}
              currentTrick={[]}
              lang={lang}
              compact
            />
          </div>
        )}
      </div>

      {/* Historique enchères + lecture des bids IA */}
      {auctionHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="text-xs text-stone-500 mb-2 font-semibold uppercase tracking-wide">
            {t('bidding.history')}
          </div>
          <BiddingHistory history={auctionHistory} dealer={deal.dealer} lang={lang} />
          <AiBidReadout history={auctionHistory} lang={lang} />
        </div>
      )}

      {/* Feedback dernier bid de Sud (masqué pour les rebids non évalués) */}
      {lastEval && !lastEval.isRebid && (
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

      {/* Transition vers le bilan */}
      {auctionDone && (
        <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-sm text-stone-500 text-center animate-pulse">
          {lang === 'fr' ? 'Redirection vers le bilan…' : 'Loading summary…'}
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

    </div>
  )
}

// ─── Règles des annonces ──────────────────────────────────────────────────────

function BiddingRules({ lang, level }) {
  const [open, setOpen] = useState(false)

  const label = lang === 'fr' ? 'Règles des annonces' : 'Bidding rules'

  const rules = lang === 'fr' ? [
    { bid: 'PASS',  cond: '< 12H',                           note: 'main trop faible' },
    { bid: '1♣',   cond: '12-21H, ♣ > ♦ (ou ♣ = ♦)',       note: 'pas de majeure 5e, pas 15-17H régulier' },
    { bid: '1♦',   cond: '12-21H, ♦ ≥ ♣',                  note: 'pas de majeure 5e, pas 15-17H régulier' },
    { bid: '1♥',   cond: '12-21H, 5+ ♥',                    note: 'priorité à la majeure' },
    { bid: '1♠',   cond: '12-21H, 5+ ♠',                    note: 'priorité à la majeure' },
    { bid: '1SA',  cond: '15-17H, jeu régulier',             note: 'pas de chicane, pas de singleton' },
    { bid: '2SA',  cond: '20-21H, jeu régulier',             note: '' },
    { bid: '2♣',   cond: '≥ 22H  — ou ≥ 19H irrégulier',   note: 'forcing absolu' },
  ] : [
    { bid: 'PASS',  cond: '< 12 HCP',                           note: 'hand too weak' },
    { bid: '1♣',   cond: '12-21 HCP, ♣ > ♦ (or ♣ = ♦)',       note: 'no 5-card major, not 15-17 balanced' },
    { bid: '1♦',   cond: '12-21 HCP, ♦ ≥ ♣',                  note: 'no 5-card major, not 15-17 balanced' },
    { bid: '1♥',   cond: '12-21 HCP, 5+ ♥',                    note: 'major first' },
    { bid: '1♠',   cond: '12-21 HCP, 5+ ♠',                    note: 'major first' },
    { bid: '1NT',  cond: '15-17 HCP, balanced',                 note: 'no void/singleton' },
    { bid: '2NT',  cond: '20-21 HCP, balanced',                 note: '' },
    { bid: '2♣',   cond: '≥ 22 HCP  — or ≥ 19 HCP unbalanced', note: 'absolute force' },
  ]

  const overcallRules = lang === 'fr'
    ? [{ bid: 'Contre-enchère', cond: '5+ cartes, 12-17H', note: 'au palier minimum légal' }]
    : [{ bid: 'Overcall',       cond: '5+ cards, 12-17 HCP', note: 'at the minimum legal level' }]

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
        <div className="px-4 pb-3">
          {/* Ouvertures */}
          <div className="space-y-1">
            {rules.map(({ bid, cond, note }) => (
              <div key={bid} className="flex items-baseline gap-2 text-xs">
                <span className="font-bold text-stone-800 w-10 shrink-0 font-card">{bid}</span>
                <span className="text-emerald-700 font-medium">{cond}</span>
                {note && <span className="text-stone-400 ml-auto text-right hidden sm:block">{note}</span>}
              </div>
            ))}
          </div>

          {/* Contre-enchères (L2+) */}
          {level >= 2 && (
            <>
              <div className="border-t border-stone-200 mt-2 pt-2 text-xs text-stone-500 font-semibold uppercase tracking-wide mb-1">
                {lang === 'fr' ? 'Compétition' : 'Competition'}
              </div>
              <div className="space-y-1">
                {overcallRules.map(({ bid, cond, note }) => (
                  <div key={bid} className="flex items-baseline gap-2 text-xs">
                    <span className="font-bold text-stone-800 w-24 shrink-0">{bid}</span>
                    <span className="text-emerald-700 font-medium">{cond}</span>
                    {note && <span className="text-stone-400 ml-auto text-right hidden sm:block">{note}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
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
