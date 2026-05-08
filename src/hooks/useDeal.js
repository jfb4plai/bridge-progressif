/**
 * Hook — état d'une donne en cours (annonces + jeu)
 */
import { useState, useCallback } from 'react'
import { cardKey, legalCards as getLegal } from '../engine/cards.js'
import { trickWinner, legalCards } from '../engine/play/trick-judge.js'
import { aiChooseCard } from '../engine/play/ai-opponent.js'

export function useDeal(deal, contract) {
  const [phase, setPhase]           = useState('bidding')  // 'bidding'|'play'|'done'
  const [bidsHistory, setBids]      = useState([])
  const [currentTrick, setTrick]    = useState([])
  const [completedTricks, setDone]  = useState([])
  const [tricksNS, setTricksNS]     = useState(0)
  const [tricksEW, setTricksEW]     = useState(0)
  const [hands, setHands]           = useState(null)  // état actuel des mains (cartes jouées retirées)
  const [hintsUsed, setHintsUsed]   = useState(0)

  // Initialiser les mains depuis la donne
  const initHands = useCallback(() => {
    if (!deal) return
    setHands({
      N: [...deal.north],
      E: [...deal.east],
      S: [...deal.south],
      W: [...deal.west],
    })
    setTricksNS(0)
    setTricksEW(0)
    setTrick([])
    setDone([])
  }, [deal])

  // Enregistrer un bid humain
  const placeBid = useCallback((bid) => {
    setBids(prev => [...prev, { seat: 'S', bid, is_hint: false }])
  }, [])

  // Jouer une carte (joueur humain = Sud)
  const playCard = useCallback((card) => {
    if (!hands || phase !== 'play') return
    const ledSuit = currentTrick[0]?.card?.suit ?? null
    const legal   = legalCards(hands.S, ledSuit)

    if (!legal.some(c => cardKey(c) === cardKey(card))) return  // illégal

    const newTrick = [...currentTrick, { seat: 'S', card }]
    const newHands = { ...hands, S: hands.S.filter(c => cardKey(c) !== cardKey(card)) }

    setHands(newHands)
    advanceTrick(newTrick, newHands)
  }, [hands, currentTrick, phase])

  // Avancer la levée — IA joue les autres sièges
  const advanceTrick = useCallback((trick, currentHands) => {
    const trump     = contract?.suit ?? 'NT'
    const declarer  = contract?.declarer ?? 'S'
    const ledSuit   = trick[0]?.card?.suit ?? null

    // Déterminer l'ordre de jeu à partir du dernier siège
    const ORDER     = ['N', 'E', 'S', 'W']
    const lastSeat  = trick[trick.length - 1].seat
    const nextIdx   = (ORDER.indexOf(lastSeat) + 1) % 4

    let updatedTrick = trick
    let updatedHands = { ...currentHands }

    // L'IA joue les cartes manquantes (pas Sud — joueur humain)
    let idx = nextIdx
    while (updatedTrick.length < 4) {
      const seat = ORDER[idx % 4]
      if (seat === 'S') break  // le joueur humain joue son tour

      const hand   = updatedHands[seat]
      const led    = updatedTrick[0]?.card?.suit ?? null
      const legal  = legalCards(hand, led)
      const card   = aiChooseCard(legal, updatedTrick, trump, seat, { declarer })

      updatedTrick = [...updatedTrick, { seat, card }]
      updatedHands = { ...updatedHands, [seat]: hand.filter(c => cardKey(c) !== cardKey(card)) }
      idx++
    }

    setTrick(updatedTrick)
    setHands(updatedHands)

    if (updatedTrick.length === 4) {
      // Levée complète
      const winner = trickWinner(updatedTrick, trump)
      const isNS   = winner === 'N' || winner === 'S'

      setDone(prev => [...prev, { cards: updatedTrick, winner }])
      if (isNS) setTricksNS(n => n + 1)
      else      setTricksEW(n => n + 1)

      // Prochaine levée ou fin
      const total = completedTricks.length + 1
      if (total >= 13) {
        setPhase('done')
      } else {
        setTrick([{ seat: winner }])  // le gagnant entame
        // Si le gagnant n'est pas Sud, l'IA entame
        if (winner !== 'S') {
          setTimeout(() => aiLead(winner, updatedHands, trump, declarer), 300)
        }
      }
    }
  }, [contract, completedTricks])

  const aiLead = (seat, currentHands, trump, declarer) => {
    const hand  = currentHands[seat]
    const card  = aiChooseCard(hand, [], trump, seat, { declarer })
    const newTrick = [{ seat, card }]
    const newHands = { ...currentHands, [seat]: hand.filter(c => cardKey(c) !== cardKey(card)) }
    setTrick(newTrick)
    setHands(newHands)
    advanceTrick(newTrick, newHands)
  }

  const startPlay = useCallback(() => {
    initHands()
    setPhase('play')
  }, [initHands])

  // Cartes légales pour le joueur (Sud)
  const legalForPlayer = () => {
    if (!hands || phase !== 'play') return []
    const ledSuit = currentTrick[0]?.card?.suit ?? null
    return legalCards(hands.S, ledSuit).map(cardKey)
  }

  return {
    phase, bidsHistory, currentTrick, completedTricks,
    tricksNS, tricksEW, hands, hintsUsed,
    placeBid, playCard, startPlay,
    legalForPlayer,
    incrementHints: () => setHintsUsed(n => n + 1),
  }
}
