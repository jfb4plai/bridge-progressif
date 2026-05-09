/**
 * Page d'entraînement au jeu de la carte
 * Déclarant = Sud, Mort = Nord visible
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'

import BridgeTable from '../components/BridgeTable.jsx'
import { cardKey, SUIT_SYMBOLS } from '../engine/cards.js'
import { legalCards, trickWinner, contractResult } from '../engine/play/trick-judge.js'
import { aiChooseCard } from '../engine/play/ai-opponent.js'
import { playHint, hintPolicy } from '../engine/hints.js'

import dealData from '../data/deals/level1/001-impasse-pique.json'

const ORDER = ['W', 'N', 'E', 'S']

export default function PlayPractice({ profile, onXpGain }) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const lang     = profile?.lang ?? 'fr'
  const xp       = profile?.xp  ?? 0

  // Accepte deal+contract depuis le bilan d'enchères, sinon démo par défaut
  const deal     = location.state?.deal     ?? dealData
  const contract = location.state?.contract ?? deal.optimal_contract
  const trump    = contract.suit

  // État des mains (cartes retirées au fil du jeu)
  const [hands, setHands] = useState({
    N: [...deal.north], E: [...deal.east], S: [...deal.south], W: [...deal.west],
  })
  const [trick, setTrick]       = useState([])    // levée en cours
  const [tricksNS, setNS]       = useState(0)
  const [tricksEW, setEW]       = useState(0)
  const [total, setTotal]       = useState(0)
  const [phase, setPhase]       = useState('play')  // 'play'|'done'
  const [hintsUsed, setHintsU]  = useState(0)
  const [hintData, setHintData] = useState(null)
  const [message, setMessage]   = useState(null)
  const [selected, setSelected] = useState(null)

  // Cartes légales pour le joueur (Sud)
  const ledSuit  = trick[0]?.card?.suit ?? null
  const legalSud = legalCards(hands.S, ledSuit).map(cardKey)

  // L'IA joue une carte pour un siège donné
  const aiPlay = useCallback((seat, currentTrick, currentHands) => {
    const led   = currentTrick[0]?.card?.suit ?? null
    const legal = legalCards(currentHands[seat], led)
    return aiChooseCard(legal, currentTrick, trump, seat, { declarer: 'S' })
  }, [trump])

  // Avancer la levée après que le joueur a joué
  const advance = useCallback((newTrick, newHands) => {
    let t = newTrick
    let h = { ...newHands }

    // L'IA joue les sièges restants dans l'ordre
    while (t.length < 4) {
      const lastSeat = t[t.length - 1].seat
      const nextSeat = ORDER[(ORDER.indexOf(lastSeat) + 1) % 4]
      if (nextSeat === 'S') break  // joueur humain → attendre

      const card  = aiPlay(nextSeat, t, h)
      t = [...t, { seat: nextSeat, card }]
      h = { ...h, [nextSeat]: h[nextSeat].filter(c => cardKey(c) !== cardKey(card)) }
    }

    setTrick(t)
    setHands(h)

    if (t.length === 4) {
      // Levée complète
      const winner = trickWinner(t, trump)
      const isNS   = winner === 'N' || winner === 'S'
      const newNS  = tricksNS + (isNS ? 1 : 0)
      const newEW  = tricksEW + (!isNS ? 1 : 0)
      const newTotal = total + 1

      setNS(newNS)
      setEW(newEW)
      setTotal(newTotal)
      setMessage(isNS ? (lang === 'fr' ? '✓ Levée N-S' : '✓ N-S trick') : (lang === 'fr' ? '✗ Levée E-O' : '✗ E-W trick'))

      if (newTotal >= 13) {
        setPhase('done')
        const result = contractResult(newNS, contract, deal.vulnerability)
        onXpGain?.(result.made ? 20 + result.overtricks * 5 : -10)
        return
      }

      // Prochaine levée : le gagnant entame
      setTimeout(() => {
        setMessage(null)
        if (winner !== 'S') {
          // L'IA entame
          const card  = aiPlay(winner, [], h)
          const first = [{ seat: winner, card }]
          const nh    = { ...h, [winner]: h[winner].filter(c => cardKey(c) !== cardKey(card)) }
          setTrick(first)
          setHands(nh)
          advance(first, nh)
        } else {
          setTrick([])
        }
      }, 800)
    }
  }, [trick, hands, tricksNS, tricksEW, total, trump, contract, deal, lang, onXpGain, aiPlay])

  // Joueur joue une carte
  const handleCardClick = useCallback((card) => {
    if (phase !== 'play') return
    const key = cardKey(card)
    if (!legalSud.includes(key)) return

    const newTrick = [...trick, { seat: 'S', card }]
    const newHands = { ...hands, S: hands.S.filter(c => cardKey(c) !== key) }
    setSelected(null)
    advance(newTrick, newHands)
  }, [phase, legalSud, trick, hands, advance])

  // Initialiser : Ouest entame (lead défini ou IA)
  useEffect(() => {
    const westLead = deal.play_line?.opening_lead
    let lead = westLead
      ? deal.west.find(c => c.suit === westLead.suit && c.rank === westLead.rank)
      : null

    // Si pas d'entame définie, l'IA choisit pour Ouest
    if (!lead) {
      lead = aiPlay('W', [], hands)
    }
    if (!lead) return

    const firstTrick = [{ seat: 'W', card: lead }]
    const h0 = { ...hands, W: hands.W.filter(c => cardKey(c) !== cardKey(lead)) }
    setHands(h0)
    setTrick(firstTrick)
    advance(firstTrick, h0)
  }, []) // eslint-disable-line

  const contractStr = `${contract.level}${contract.suit === 'NT' ? (lang === 'fr' ? 'SA' : 'NT') : SUIT_SYMBOLS[contract.suit]}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">{t('play.title')}</h1>
          <p className="text-sm text-stone-500">
            {t('play.contract')} : <strong>{contractStr}</strong> — {t('play.declarer')} : Sud
          </p>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-stone-400 hover:text-stone-600">
          ← {t('nav.dashboard')}
        </button>
      </div>

      {/* Score levées */}
      <div className="flex gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-center">
          <div className="text-xs text-emerald-700">N-S</div>
          <div className="text-2xl font-bold text-emerald-700">{tricksNS}</div>
        </div>
        <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
          {message ?? (lang === 'fr' ? 'Jouez une carte' : 'Play a card')}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-center">
          <div className="text-xs text-red-700">E-W</div>
          <div className="text-2xl font-bold text-red-700">{tricksEW}</div>
        </div>
      </div>

      {/* Table */}
      <BridgeTable
        deal={deal}
        revealSeats={['S', 'N']}   // Mort + Déclarant visibles
        currentTrick={trick}
        playableCards={phase === 'play' ? legalSud : []}
        selectedCard={selected}
        onCardClick={handleCardClick}
        lang={lang}
        declarer="S"
        compact
      />

      {/* Notes pédagogiques */}
      {deal.play_line?.notes_fr && phase === 'play' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <div className="font-semibold mb-1">{lang === 'fr' ? 'Conseils' : 'Tips'}</div>
          <ul className="space-y-1 list-disc list-inside">
            {(lang === 'fr' ? deal.play_line.notes_fr : deal.play_line.notes_en)
              .slice(0, 3).map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      {/* Fin de donne */}
      {phase === 'done' && (
        <div className={`rounded-xl border p-4 text-center ${tricksNS >= contract.level + 6 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
          <div className="text-lg font-bold mb-1">
            {tricksNS >= contract.level + 6
              ? (lang === 'fr' ? '✓ Contrat réalisé !' : '✓ Contract made!')
              : (lang === 'fr' ? '✗ Contrat chuté' : '✗ Contract down')}
          </div>
          <div className="text-sm text-stone-600">
            {lang === 'fr' ? `${tricksNS} levées N-S sur ${contract.level + 6} requises` : `${tricksNS} N-S tricks, ${contract.level + 6} needed`}
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            {t('debrief.back_dashboard')}
          </button>
        </div>
      )}
    </div>
  )
}
