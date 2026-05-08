/**
 * Sauvegarde d'une session d'annonces dans Supabase
 * Tables : bridge_deals + bridge_sessions
 */

/**
 * Sauvegarde une session de mise complète.
 * - Upsert de la donne dans bridge_deals
 * - Insert de la session dans bridge_sessions
 *
 * @param {Object} supabase   — client Supabase
 * @param {Object} payload    — { deal, contract, evaluations, hintsUsed, totalXpDelta, system }
 * @returns {Promise<void>}
 */
export const saveBiddingSession = async (supabase, payload) => {
  const { deal, contract, evaluations = [], hintsUsed = 0, totalXpDelta = 0, system = 'sf' } = payload

  // ── 1. Utilisateur connecté ────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // ── 2. Upsert de la donne ──────────────────────────────────────────────────
  //    - pré-construite : slug unique → upsert idempotent
  //    - générée       : slug = gen-xxx (toujours unique) → insert
  const dealPayload = {
    slug:     deal.isGenerated ? null : (deal.slug ?? null),
    source:   deal.isGenerated ? 'generated' : 'preset',
    level:    deal.level   ?? 1,
    title_fr: deal.title_fr ?? '',
    title_en: deal.title_en ?? '',
    concepts: deal.concepts ?? [],
    data: {
      south:            deal.south,
      north:            deal.north,
      east:             deal.east,
      west:             deal.west,
      dealer:           deal.dealer,
      vulnerability:    deal.vulnerability ?? 'none',
      optimal_contract: deal.optimal_contract ?? null,
    },
  }

  let dealId = null
  try {
    const { data, error } = await supabase
      .from('bridge_deals')
      .upsert(dealPayload, { onConflict: 'slug', ignoreDuplicates: false })
      .select('id')
      .single()
    if (!error && data) dealId = data.id
  } catch (_) {
    // Non-bloquant : on continue sans deal_id
  }

  // ── 3. Insert de la session ────────────────────────────────────────────────
  const bidsPlayed = evaluations.map(e => ({
    bid:      e.played,
    expected: e.expected,
    correct:  e.correct,
  }))

  await supabase.from('bridge_sessions').insert({
    user_id:      user.id,
    deal_id:      dealId,
    mode:         'bidding',
    system,
    bids_played:  bidsPlayed,
    hints_used:   hintsUsed,
    xp_earned:    totalXpDelta,
    result: {
      contract,
      bids_correct: evaluations.filter(e => e.correct).length,
      bids_total:   evaluations.length,
    },
    completed_at: new Date().toISOString(),
  })
}
