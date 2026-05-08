/**
 * Table de bridge — affiche les 4 positions (N/E/S/W)
 * avec la levée en cours au centre
 *
 * Props:
 *   deal          { north, south, east, west }
 *   revealSeats   array de sièges visibles ex: ['S','N'] (Mort + Déclarant)
 *   currentTrick  [{seat, card}]
 *   playableCards array de cardKey()
 *   selectedCard  cardKey()
 *   onCardClick   fn(card)
 *   lang          'fr'|'en'
 *   declarer      'N'|'E'|'S'|'W'
 *   compact       bool — mains en format texte compact
 */

import Hand from './Hand.jsx'
import Card from './Card.jsx'
import { SUIT_SYMBOLS, cardKey } from '../engine/cards.js'
import { useTranslation } from 'react-i18next'

const SEAT_LABELS = { fr: { N:'Nord', E:'Est', S:'Sud', W:'Ouest' }, en: { N:'North', E:'East', S:'South', W:'West' } }

export default function BridgeTable({
  deal,
  revealSeats = ['S'],
  currentTrick = [],
  playableCards = [],
  selectedCard = null,
  onCardClick,
  lang = 'fr',
  declarer,
  compact = false,
}) {
  const { t } = useTranslation()
  const labels = SEAT_LABELS[lang] ?? SEAT_LABELS.fr

  const getHand = seat => deal?.[{ N:'north', E:'east', S:'south', W:'west' }[seat]] ?? []
  const trickCard = seat => currentTrick.find(tc => tc.seat === seat)?.card

  const renderHand = (seat, orientation = 'horizontal', size = 'md') => {
    const hand     = getHand(seat)
    const visible  = revealSeats.includes(seat)
    const isPlayer = seat === 'S'  // le joueur humain est toujours Sud

    return (
      <Hand
        hand={hand}
        lang={lang}
        faceDown={!visible}
        playableCards={isPlayer ? playableCards : []}
        selectedCard={isPlayer ? selectedCard : null}
        onCardClick={isPlayer ? onCardClick : undefined}
        orientation={orientation}
        size={size}
        label={labels[seat]}
        compact={compact && !isPlayer}
      />
    )
  }

  const TrickCard = ({ seat }) => {
    const card = trickCard(seat)
    if (!card) return <div className="w-14 h-20 rounded-lg border-2 border-dashed border-stone-200" />
    return <Card card={card} lang={lang} size="md" />
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Tapis vert */}
      <div className="absolute inset-8 rounded-full bg-emerald-800 opacity-10 pointer-events-none" />

      {/* Nord */}
      <div className="flex justify-center pb-4">
        {renderHand('N', 'horizontal', compact ? 'sm' : 'md')}
      </div>

      {/* Rangée centrale : Ouest — Levée — Est */}
      <div className="flex items-center justify-between px-4">
        {/* Ouest */}
        <div className="w-32">
          {renderHand('W', 'vertical', 'sm')}
        </div>

        {/* Levée en cours */}
        <div className="flex-1 flex justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-48">
            <div />
            <div className="flex justify-center"><TrickCard seat="N" /></div>
            <div />
            <div className="flex justify-center"><TrickCard seat="W" /></div>
            {/* Centre vide */}
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-emerald-700 opacity-20" />
            </div>
            <div className="flex justify-center"><TrickCard seat="E" /></div>
            <div />
            <div className="flex justify-center"><TrickCard seat="S" /></div>
            <div />
          </div>
        </div>

        {/* Est */}
        <div className="w-32 flex justify-end">
          {renderHand('E', 'vertical', 'sm')}
        </div>
      </div>

      {/* Sud (joueur) */}
      <div className="flex justify-center pt-4">
        {renderHand('S', 'horizontal', 'md')}
      </div>
    </div>
  )
}
