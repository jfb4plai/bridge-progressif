/**
 * Page bilan post-donne d'annonces
 * Reçoit via useLocation().state :
 *   deal, contract, evaluations, auctionHistory, totalXpDelta, lang
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { SUIT_SYMBOLS } from '../engine/cards.js'
import { bidStr } from '../engine/bidding/auction.js'
import BiddingHistory, { AiBidReadout } from '../components/BiddingHistory.jsx'
import Hand from '../components/Hand.jsx'
import BridgeTable from '../components/BridgeTable.jsx'
import { handHcp } from '../engine/cards.js'
import { supabase } from '../lib/supabase.js'
import { saveBiddingSession } from '../lib/sessions.js'

export default function DealDebrief({ profile }) {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const { t }      = useTranslation()
  const lang       = profile?.lang ?? state?.lang ?? 'fr'
  const system     = profile?.system ?? 'sf'
  const saved      = useRef(false)

  // Sauvegarde Supabase — une seule fois au montage
  useEffect(() => {
    if (!state?.deal || saved.current) return
    saved.current = true
    saveBiddingSession(supabase, {
      deal:         state.deal,
      contract:     state.contract,
      evaluations:  state.evaluations ?? [],
      hintsUsed:    state.hintsUsed   ?? 0,
      totalXpDelta: state.totalXpDelta ?? 0,
      system,
    }).catch(() => {})  // silencieux — ne pas bloquer l'UI
  }, []) // eslint-disable-line

  // Garde-fou : si on arrive ici sans état (accès direct à l'URL)
  if (!state?.deal) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-stone-400">
        <p>{lang === 'fr' ? 'Aucune donne à afficher.' : 'No deal to display.'}</p>
        <button onClick={() => navigate('/bidding')} className="mt-4 text-sm text-emerald-600 underline">
          {lang === 'fr' ? 'Commencer une donne' : 'Start a deal'}
        </button>
      </div>
    )
  }

  const { deal, contract, evaluations = [], auctionHistory = [], totalXpDelta = 0 } = state

  // ─── Contrat ────────────────────────────────────────────────────────────────
  const contractStr = contract
    ? `${contract.level}${contract.suit === 'NT' ? (lang === 'fr' ? 'SA' : 'NT') : SUIT_SYMBOLS[contract.suit]}`
    : (lang === 'fr' ? 'Tous passent' : 'All pass')

  const optimal     = deal.optimal_contract
  const optimalStr  = optimal
    ? `${optimal.level}${optimal.suit === 'NT' ? (lang === 'fr' ? 'SA' : 'NT') : SUIT_SYMBOLS[optimal.suit]}`
    : null

  // Contrat atteint = même niveau + même couleur que l'optimal
  const contractOk = optimal && contract
    && contract.level === optimal.level
    && contract.suit  === optimal.suit

  // ─── Score enchères (rebids non évalués exclus) ──────────────────────────────
  const scoredEvals = evaluations.filter(e => !e.isRebid)
  const nbCorrect   = scoredEvals.filter(e => e.correct).length
  const nbTotal     = scoredEvals.length
  const xpSign    = totalXpDelta >= 0 ? '+' : ''

  // ─── Concept pédagogique ────────────────────────────────────────────────────
  const concept = deal.concept ?? null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">
            {lang === 'fr' ? 'Bilan de la donne' : 'Deal Summary'}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {lang === 'fr' ? deal.title_fr : deal.title_en}
          </p>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-stone-400 hover:text-stone-600">
          ← {t('nav.dashboard')}
        </button>
      </div>

      {/* Toutes les mains (table fictive) */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
        <div className="text-xs text-stone-500 mb-3 font-semibold uppercase tracking-wide">
          {lang === 'fr' ? 'Les 4 mains' : 'All 4 hands'}
        </div>
        <BridgeTable
          deal={deal}
          revealSeats={['N', 'S', 'E', 'W']}
          currentTrick={[]}
          lang={lang}
          compact
        />
      </div>

      {/* Main de Sud (vraies cartes) */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm overflow-x-auto">
        <div className="text-xs text-stone-500 mb-3 font-semibold uppercase tracking-wide">
          {lang === 'fr' ? 'Votre main (Sud)' : 'Your hand (South)'} — {handHcp(deal.south)} H
        </div>
        <Hand hand={deal.south} lang={lang} size="sm" />
      </div>

      {/* Contrat final */}
      <div className={`rounded-xl border p-4 ${contractOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
          {lang === 'fr' ? 'Contrat final' : 'Final contract'}
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-2xl font-bold text-stone-800">{contractStr}</span>
          {contract && (
            <span className="text-sm text-stone-500">
              {lang === 'fr' ? 'par' : 'by'} {contract.declarer}
            </span>
          )}
          {optimalStr && (
            <span className="ml-auto text-xs text-stone-400">
              {lang === 'fr' ? 'Optimal' : 'Optimal'} : <strong>{optimalStr}</strong>
            </span>
          )}
        </div>
        {contractOk && (
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            {lang === 'fr' ? 'Contrat optimal atteint !' : 'Optimal contract reached!'}
          </p>
        )}
      </div>

      {/* Score enchères + XP */}
      {nbTotal > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-3">
            {lang === 'fr' ? 'Vos enchères' : 'Your bids'}
          </div>
          <div className="flex items-center gap-6">
            {/* Jauge visuelle (rebids exclus) */}
            <div className="flex gap-1.5">
              {scoredEvals.map((e, i) => (
                <div
                  key={i}
                  title={`${bidStr(e.played)} → ${e.correct ? '✓' : '✗ ' + bidStr(e.expected)}`}
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white
                    ${e.correct ? 'bg-emerald-500' : 'bg-red-400'}`}
                >
                  {e.correct ? '✓' : '✗'}
                </div>
              ))}
            </div>
            <div className="text-sm text-stone-700">
              <strong>{nbCorrect}/{nbTotal}</strong>{' '}
              {lang === 'fr' ? 'correctes' : 'correct'}
            </div>
            <div className={`ml-auto text-sm font-semibold ${totalXpDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {xpSign}{totalXpDelta} XP
            </div>
          </div>

          {/* Détail des erreurs */}
          {scoredEvals.some(e => !e.correct) && (
            <div className="mt-3 space-y-1 border-t border-stone-100 pt-3">
              {scoredEvals.filter(e => !e.correct).map((e, i) => (
                <div key={i} className="text-xs text-stone-500">
                  <span className="text-red-500 font-medium">{bidStr(e.played)}</span>
                  {' → '}
                  {lang === 'fr' ? 'attendu' : 'expected'}{' '}
                  <span className="text-emerald-600 font-medium">{bidStr(e.expected)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Séquence complète + lecture des bids IA */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
          {lang === 'fr' ? 'Séquence complète' : 'Full auction'}
        </div>
        {auctionHistory.length > 0
          ? <>
              <BiddingHistory history={auctionHistory} dealer={deal.dealer} lang={lang} />
              <AiBidReadout history={auctionHistory} lang={lang} />
            </>
          : <p className="text-xs text-stone-400">{lang === 'fr' ? 'Aucune enchère enregistrée.' : 'No bids recorded.'}</p>
        }
      </div>

      {/* Concept pédagogique */}
      {concept && (
        <div className="bg-stone-800 text-stone-100 rounded-xl p-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            {lang === 'fr' ? 'Concept clé' : 'Key concept'}
          </div>
          <div className="font-bold text-base text-white">
            {lang === 'fr' ? concept.title_fr : concept.title_en}
          </div>
          <p className="text-sm text-stone-300 leading-relaxed">
            {lang === 'fr' ? concept.body_fr : concept.body_en}
          </p>
          <div className="bg-stone-700 rounded-lg px-4 py-2 text-sm font-mono text-emerald-300">
            {lang === 'fr' ? concept.key_rule_fr : concept.key_rule_en}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-1">
        {/* Jouer la donne — seulement si contrat valide (pas tous passent) */}
        {contract && (
          <button
            onClick={() => navigate('/play', { state: { deal, contract } })}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            {lang === 'fr' ? 'Jouer cette donne' : 'Play this hand'}
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/bidding')}
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
      </div>
    </div>
  )
}
