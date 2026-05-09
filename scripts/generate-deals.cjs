#!/usr/bin/env node
/**
 * Générateur de donnes bridge L1 (009-050) et L2 (004-020)
 * Usage : node scripts/generate-deals.cjs
 */
'use strict'
const fs   = require('fs')
const path = require('path')

// ── Constantes ────────────────────────────────────────────────────────────────
const SUITS    = ['S','H','D','C']
const RANKS    = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const HCP_MAP  = { A:4, K:3, Q:2, J:1 }
const SUIT_SYM = { S:'♠', H:'♥', D:'♦', C:'♣', NT:'SA' }

// ── Utilitaires cartes ────────────────────────────────────────────────────────
function createDeck() {
  const d = []
  for (const s of SUITS) for (const r of RANKS) d.push({ suit:s, rank:r })
  return d
}
function shuffle(a) {
  const b = [...a]
  for (let i = b.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
function dealHands() {
  const d = shuffle(createDeck())
  return { south:d.slice(0,13), west:d.slice(13,26), north:d.slice(26,39), east:d.slice(39,52) }
}
function hcp(hand)  { return hand.reduce((s,c) => s + (HCP_MAP[c.rank]||0), 0) }
function lens(hand) { const l={S:0,H:0,D:0,C:0}; for (const c of hand) l[c.suit]++; return l }
function isBalanced(hand) {
  const v = Object.values(lens(hand))
  return !v.includes(0) && v.filter(x => x<=1).length <= 1
}
function distPts(hand) {
  return Object.values(lens(hand)).reduce((s,l) => s + (l===0?3:l===1?2:l===2?1:0), 0)
}
function bStr(bid) {
  if (!bid || bid.special) return 'PASSE'
  return `${bid.level}${SUIT_SYM[bid.suit] ?? bid.suit}`
}
function bestLead(hand) {
  const l = lens(hand)
  let best = 'C', bestLen = 0
  for (const s of ['S','H','D','C']) { if (l[s] > bestLen) { best=s; bestLen=l[s] } }
  const cards = hand.filter(c => c.suit===best)
  const ord   = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
  cards.sort((a,b) => ord.indexOf(a.rank)-ord.indexOf(b.rank))
  return cards[0]
}

// ── Logique d'enchères (miroir de standard-francais.js) ───────────────────────
function recommendOpening(hand) {
  const h  = hcp(hand), l = lens(hand), b = isBalanced(hand)
  const hl = h + distPts(hand)
  if (h < 12 && hl < 13)         return { key:'pass',     bid:null }
  if (h >= 22 || (h>=19 && !b))  return { key:'open_2c',  bid:{level:2,suit:'C'} }
  if (h>=20 && h<=21 && b)       return { key:'open_2nt', bid:{level:2,suit:'NT'} }
  if (h>=15 && h<=17 && b)       return { key:'open_1nt', bid:{level:1,suit:'NT'} }
  if (l.S >= 5)                  return { key:'open_1s',  bid:{level:1,suit:'S'} }
  if (l.H >= 5)                  return { key:'open_1h',  bid:{level:1,suit:'H'} }
  if (h >= 12) {
    if (l.D>=4 && l.D>=l.C)     return { key:'open_1d',  bid:{level:1,suit:'D'} }
                                 return { key:'open_1c',  bid:{level:1,suit:'C'} }
  }
  return { key:'pass', bid:null }
}

function recommendResponse(hand, openBid) {
  const h  = hcp(hand), l = lens(hand), b = isBalanced(hand)
  const os = openBid.suit
  if (h < 6) return { key:'resp_pass', bid:null }
  if ((os==='S'||os==='H') && l[os]>=4) {
    if (h>=13) return { key:'resp_3major', bid:{level:3,suit:os} }
    return       { key:'resp_2major', bid:{level:2,suit:os} }
  }
  if (os!=='S' && l.S>=4)              return { key:'resp_1s',  bid:{level:1,suit:'S'} }
  if (os!=='S'&&os!=='H' && l.H>=4)   return { key:'resp_1h',  bid:{level:1,suit:'H'} }
  if (h>=6 && h<=10 && b)             return { key:'resp_1nt', bid:{level:1,suit:'NT'} }
  if (h>=10) {
    const ns = SUITS.find(s => s!==os && l[s]>=4)
    if (ns) return { key:'resp_new', bid:{level:2,suit:ns} }
  }
  return { key:'resp_1nt', bid:{level:1,suit:'NT'} }
}

// ── Estimation contrat optimal ────────────────────────────────────────────────
function estimateContractL1(d, openRec) {
  if (openRec.key === 'pass') {
    const nr = recommendOpening(d.north)
    if (nr.key === 'pass') return null
    return estimateNS(d, nr.bid?.suit ?? 'NT', 'N')
  }
  return estimateNS(d, openRec.bid?.suit ?? 'NT', 'S')
}

function estimateNS(d, openSuit, declarant) {
  const sh = hcp(d.south), nh = hcp(d.north)
  const ns = sh + nh
  const sl = lens(d.south), nl = lens(d.north)
  const fitS = sl.S + nl.S, fitH = sl.H + nl.H
  const bm = fitS>=fitH ? (fitS>=8?'S':null) : (fitH>=8?'H':null)

  if (ns>=33 && bm) return { level:6, suit:bm,   declarer:declarant, doubled:0 }
  if (ns>=33)       return { level:6, suit:'NT',  declarer:declarant, doubled:0 }
  if (ns>=25 && bm) return { level:4, suit:bm,    declarer:declarant, doubled:0 }
  if (ns>=25)       return { level:3, suit:'NT',  declarer:declarant, doubled:0 }
  if (ns>=23 && bm) return { level:3, suit:bm,    declarer:declarant, doubled:0 }
  if (ns>=22 && isBalanced(d.south) && isBalanced(d.north))
                    return { level:2, suit:'NT',  declarer:declarant, doubled:0 }
  const suit = bm ?? openSuit
  return { level:ns>=19?2:1, suit, declarer:declarant, doubled:0 }
}

function estimateContractL2(d, eastOpenBid, southOcBid) {
  if (!southOcBid) return { level:1, suit:eastOpenBid.suit, declarer:'E', doubled:0 }
  const ns = hcp(d.south) + hcp(d.north)
  const sl = lens(d.south), nl = lens(d.north)
  const fit = sl[southOcBid.suit] + nl[southOcBid.suit]
  if (ns>=25 && fit>=8) return { level:4, suit:southOcBid.suit, declarer:'S', doubled:0 }
  if (ns>=23 && fit>=8) return { level:3, suit:southOcBid.suit, declarer:'S', doubled:0 }
  return { level:southOcBid.level, suit:southOcBid.suit, declarer:'S', doubled:0 }
}

// ── Contre-enchère (overcall) ─────────────────────────────────────────────────
const SUITS_ORD = ['C','D','H','S','NT']
function bidOrd(bid) { return (bid.level-1)*5 + SUITS_ORD.indexOf(bid.suit) }

function computeOvercall(hand, opBid) {
  const h = hcp(hand), l = lens(hand)
  const minOrd = bidOrd(opBid)
  for (const suit of ['S','H','D','C']) {
    if (l[suit]<5 || suit===opBid.suit) continue
    for (let lvl=1; lvl<=3; lvl++) {
      const ord = (lvl-1)*5 + SUITS_ORD.indexOf(suit)
      if (ord > minOrd && h>=12 && h<=17) return { bid:{level:lvl,suit}, key:'overcall' }
    }
  }
  return { bid:null, key:'pass_overcall' }
}

// ── Construction séquences ────────────────────────────────────────────────────
function seqL1(d, openRec, northResp, contract) {
  const sh = hcp(d.south), nh = hcp(d.north)
  const seq = []

  if (openRec.key === 'pass') {
    seq.push({ seat:'S', bid:{special:'pass'},
      note_fr:`Passe : ${sh}H, minimum 12H requis pour ouvrir`,
      note_en:`Pass: ${sh} HCP, need 12+ HCP to open` })
    const nr = recommendOpening(d.north)
    if (nr.key === 'pass') {
      seq.push({ seat:'W', bid:{special:'pass'} })
      seq.push({ seat:'N', bid:{special:'pass'} })
      seq.push({ seat:'E', bid:{special:'pass'} })
    } else {
      seq.push({ seat:'W', bid:{special:'pass'} })
      seq.push({ seat:'N', bid:nr.bid,
        note_fr:`${bStr(nr.bid)} : Nord ouvre, ${nh}H`,
        note_en:`${bStr(nr.bid)}: North opens, ${nh} HCP` })
      seq.push({ seat:'E', bid:{special:'pass'} })
      const sr = recommendResponse(d.south, nr.bid)
      if (sr.bid) {
        seq.push({ seat:'S', bid:sr.bid,
          note_fr:`${bStr(sr.bid)} : Sud répond, ${sh}H`,
          note_en:`${bStr(sr.bid)}: South responds, ${sh} HCP` })
      } else {
        seq.push({ seat:'S', bid:{special:'pass'} })
      }
      seq.push({ seat:'W', bid:{special:'pass'} })
      seq.push({ seat:'N', bid:{special:'pass'} })
      seq.push({ seat:'E', bid:{special:'pass'} })
    }
    return seq
  }

  seq.push({ seat:'S', bid:openRec.bid,
    note_fr:`${bStr(openRec.bid)} : ${sh}H — ${openNote(openRec, d.south, 'fr')}`,
    note_en:`${bStr(openRec.bid)}: ${sh} HCP — ${openNote(openRec, d.south, 'en')}` })
  seq.push({ seat:'W', bid:{special:'pass'} })

  if (northResp?.bid) {
    seq.push({ seat:'N', bid:northResp.bid,
      note_fr:`${bStr(northResp.bid)} : ${nh}H — ${respNote(northResp, 'fr')}`,
      note_en:`${bStr(northResp.bid)}: ${nh} HCP — ${respNote(northResp, 'en')}` })
    seq.push({ seat:'E', bid:{special:'pass'} })
    const rebid = computeRebid(openRec, northResp, contract)
    if (rebid) {
      seq.push({ seat:'S', bid:rebid,
        note_fr:`${bStr(rebid)} : Sud confirme`,
        note_en:`${bStr(rebid)}: South confirms` })
      seq.push({ seat:'W', bid:{special:'pass'} })
      seq.push({ seat:'N', bid:{special:'pass'} })
      seq.push({ seat:'E', bid:{special:'pass'} })
    } else {
      seq.push({ seat:'S', bid:{special:'pass'} })
      seq.push({ seat:'W', bid:{special:'pass'} })
    }
  } else {
    seq.push({ seat:'N', bid:{special:'pass'} })
    seq.push({ seat:'E', bid:{special:'pass'} })
    seq.push({ seat:'W', bid:{special:'pass'} })
  }
  return seq
}

function seqL2(d, eastOpenBid, southOc) {
  const sh = hcp(d.south), eh = hcp(d.east), nh = hcp(d.north)
  const el = lens(d.east)
  const seq = []
  // Order when E is dealer: E, S, W, N
  seq.push({ seat:'E', bid:eastOpenBid,
    note_fr:`${bStr(eastOpenBid)} : Est ouvre, ${eh}H, ${el[eastOpenBid.suit]}+ cartes`,
    note_en:`${bStr(eastOpenBid)}: East opens, ${eh} HCP` })
  if (southOc.bid) {
    seq.push({ seat:'S', bid:southOc.bid,
      note_fr:`${bStr(southOc.bid)} : ${sh}H, 5+ cartes → contre-enchère`,
      note_en:`${bStr(southOc.bid)}: ${sh} HCP, 5+ cards → overcall` })
  } else {
    seq.push({ seat:'S', bid:{special:'pass'},
      note_fr:`Passe : ${sh}H, pas les conditions pour contre-enchérir`,
      note_en:`Pass: ${sh} HCP, no overcall conditions` })
  }
  seq.push({ seat:'W', bid:{special:'pass'} })
  if (southOc.bid) {
    const nr = recommendResponse(d.north, southOc.bid)
    if (nr.bid) {
      seq.push({ seat:'N', bid:nr.bid,
        note_fr:`${bStr(nr.bid)} : Nord soutient, ${nh}H`,
        note_en:`${bStr(nr.bid)}: North supports, ${nh} HCP` })
      seq.push({ seat:'E', bid:{special:'pass'} })
      seq.push({ seat:'S', bid:{special:'pass'} })
      seq.push({ seat:'W', bid:{special:'pass'} })
    } else {
      seq.push({ seat:'N', bid:{special:'pass'} })
    }
  } else {
    seq.push({ seat:'N', bid:{special:'pass'} })
  }
  return seq
}

function computeRebid(openRec, northResp, contract) {
  if (!contract || !northResp?.bid) return null
  const os = openRec.bid?.suit, nb = northResp.bid
  if (!os) return null
  // N a soutenu la majeure de S au palier 2 → S enchérit la manche si >=25H combinés
  if (nb.level===2 && nb.suit===os && contract.level>=4) return { level:4, suit:os }
  // N a sauté à 3M (13+H force) → S confirme la manche
  if (nb.level===3 && nb.suit===os && contract.level>=4) return { level:4, suit:os }
  // N a répondu SA → S rebid manche SA si contrat l'indique
  if (nb.suit==='NT' && contract.suit==='NT' && contract.level>=3 && nb.level<3)
    return { level:contract.level, suit:'NT' }
  return null
}

function openNote(rec, hand, lang) {
  const l = lens(hand)
  const notes = {
    open_1s: { fr:`5+ ♠, priorité majeure`, en:`5+ ♠, major first` },
    open_1h: { fr:`5+ ♥, priorité majeure`, en:`5+ ♥, major first` },
    open_1d: { fr:`${l.D} ♦ ≥ ${l.C} ♣, mineure la plus longue`, en:`${l.D} ♦ ≥ ${l.C} ♣, longest minor` },
    open_1c: { fr:`${l.C} ♣ ≥ ♦, mineure la plus longue`, en:`${l.C} ♣ ≥ ♦, longest minor` },
    open_1nt:{ fr:`jeu régulier 15-17H`, en:`balanced 15-17 HCP` },
    open_2nt:{ fr:`jeu régulier 20-21H`, en:`balanced 20-21 HCP` },
    open_2c: { fr:`main très forte → forcing absolu`, en:`very strong → absolute force` },
  }
  return notes[rec.key]?.[lang] ?? ''
}

function respNote(resp, lang) {
  const notes = {
    resp_2major:{ fr:`4+ cartes dans la majeure, soutien simple`, en:`4+ card fit, simple raise` },
    resp_3major:{ fr:`4+ cartes + 13H, forcing manche`, en:`4+ card fit + 13 HCP, game force` },
    resp_1s:    { fr:`4+ ♠, nouvelle couleur`, en:`4+ ♠, new suit` },
    resp_1h:    { fr:`4+ ♥, nouvelle couleur`, en:`4+ ♥, new suit` },
    resp_1nt:   { fr:`6-10H jeu régulier, limitatif`, en:`6-10 HCP balanced, limit bid` },
    resp_new:   { fr:`10+H, nouvelle couleur forcing`, en:`10+ HCP, new suit force` },
  }
  return notes[resp.key]?.[lang] ?? ''
}

// ── Concepts ──────────────────────────────────────────────────────────────────
const CONCEPTS = {
  open_1c: {
    slug:'ouverture-1c', title_fr:'Ouverture 1♣', title_en:'Opening 1♣',
    body_fr:'Avec 12-21H, pas de majeure 5ème et pas de jeu régulier pour 1SA : on ouvre 1♣ quand les trèfles sont au moins aussi longs que les carreaux. La règle : mineure la plus longue d\'abord.',
    body_en:'With 12-21 HCP, no 5-card major, not balanced for 1NT: open 1♣ when clubs are at least as long as diamonds. Rule: bid your longest minor first.',
    key_rule_fr:'12-21H, 4+ ♣ (ou ♣ ≥ ♦), pas de majeure 5e → 1♣.',
    key_rule_en:'12-21 HCP, 4+ ♣ (or ♣ ≥ ♦), no 5-card major → 1♣.',
  },
  open_1d: {
    slug:'ouverture-1d', title_fr:'Ouverture 1♦', title_en:'Opening 1♦',
    body_fr:'Avec 12-21H, pas de majeure 5ème et pas de jeu régulier pour 1SA : on ouvre 1♦ quand les carreaux sont strictement plus nombreux que les trèfles.',
    body_en:'With 12-21 HCP, no 5-card major, not balanced for 1NT: open 1♦ when diamonds strictly outnumber clubs.',
    key_rule_fr:'12-21H, 4+ ♦, ♦ > ♣, pas de majeure 5e → 1♦.',
    key_rule_en:'12-21 HCP, 4+ ♦, ♦ > ♣, no 5-card major → 1♦.',
  },
  open_1h: {
    slug:'ouverture-1h', title_fr:'Ouverture 1♥', title_en:'Opening 1♥',
    body_fr:'En Standard Français, la règle des majeures 5ème est la priorité absolue. Avec 5+ cœurs et 12-21H, on ouvre 1♥ — avant même de vérifier les mineures ou le sans-atout.',
    body_en:'In Standard Français, the 5-card major rule has absolute priority. With 5+ hearts and 12-21 HCP, open 1♥ — before checking minors or no-trump.',
    key_rule_fr:'12-21H, 5+ ♥ (pas 5+ ♠) → 1♥.',
    key_rule_en:'12-21 HCP, 5+ ♥ (not 5+ ♠) → 1♥.',
  },
  open_1s: {
    slug:'ouverture-1s', title_fr:'Ouverture 1♠', title_en:'Opening 1♠',
    body_fr:'Avec 5+ piques et 12-21H, on ouvre 1♠. En cas de 5♠ et 5♥, on ouvre 1♠ (la plus haute). La règle des majeures 5ème prime toujours sur les mineures.',
    body_en:'With 5+ spades and 12-21 HCP, open 1♠. With both 5♠ and 5♥, open 1♠ (the higher suit). The 5-card major rule always beats the minors.',
    key_rule_fr:'12-21H, 5+ ♠ → 1♠ (la plus haute si doublement bicolore majeure).',
    key_rule_en:'12-21 HCP, 5+ ♠ → 1♠ (higher suit if 5-5 in majors).',
  },
  open_1nt: {
    slug:'ouverture-1sa', title_fr:'Ouverture 1SA', title_en:'Opening 1NT',
    body_fr:'Avec 15-17H et un jeu régulier (pas de chicane, pas de singleton, au plus un doubleton) : on ouvre 1SA. C\'est l\'annonce la plus précise du bridge — partenaire connaît votre force à 2H près.',
    body_en:'With 15-17 HCP and a balanced hand (no void, no singleton, at most one doubleton): open 1NT. The most precise bid in bridge — partner knows your strength within 2 HCP.',
    key_rule_fr:'15-17H, jeu régulier → 1SA.',
    key_rule_en:'15-17 HCP, balanced → 1NT.',
  },
  pass: {
    slug:'main-faible', title_fr:'Main trop faible — Passe', title_en:'Weak hand — Pass',
    body_fr:'Il faut au minimum 12H (ou 13 points HL avec la distribution) pour ouvrir. En dessous, on passe sans hésiter. Passer n\'est pas un échec : c\'est laisser l\'initiative à qui a la force.',
    body_en:'You need at least 12 HCP (or 13 HL with distribution) to open. Below this, pass without hesitation. Passing is not a failure: it gives the initiative to whoever has the strength.',
    key_rule_fr:'< 12H (ou < 13 HL) → PASSE obligatoire.',
    key_rule_en:'< 12 HCP (or < 13 HL) → PASS required.',
  },
  open_2c: {
    slug:'ouverture-2t-forcing', title_fr:'2♣ Forcing — Main très forte', title_en:'2♣ Forcing — Very strong hand',
    body_fr:'Avec 22H+ (ou 19H+ en jeu très irrégulier), on ouvre 2♣ — convention forcing absolu. Le partenaire ne peut jamais passer : il doit toujours répondre, même avec une main sans honneurs.',
    body_en:'With 22+ HCP (or 19+ with a highly distributional hand), open 2♣ — the absolute forcing convention. Partner can never pass: they must always respond, even with a worthless hand.',
    key_rule_fr:'≥ 22H (ou ≥ 19H très irrégulier) → 2♣ forcing absolu.',
    key_rule_en:'≥ 22 HCP (or ≥ 19 HCP very distributional) → 2♣ absolute force.',
  },
  open_2nt: {
    slug:'ouverture-2sa', title_fr:'Ouverture 2SA', title_en:'Opening 2NT',
    body_fr:'Avec 20-21H et jeu régulier : on ouvre directement 2SA. Zone intermédiaire entre 1SA (15-17H) et 2♣ (22H+). Partenaire peut passer avec 0-3H ou enchérir la manche avec 4H+.',
    body_en:'With 20-21 HCP and a balanced hand: open 2NT directly. Intermediate zone between 1NT (15-17) and 2♣ (22+). Partner can pass with 0-3 HCP or bid game with 4+ HCP.',
    key_rule_fr:'20-21H, jeu régulier → 2SA directement.',
    key_rule_en:'20-21 HCP, balanced → open 2NT directly.',
  },
  overcall: {
    slug:'contre-enchere', title_fr:'La contre-enchère simple', title_en:'Simple Overcall',
    body_fr:'Quand un adversaire ouvre et que vous avez une belle couleur 5ème avec 12-17H, vous pouvez contre-enchérir au palier minimum. Règle : 5 cartes dans la couleur, 12-17H, et de préférence l\'As ou le Roi dans cette couleur pour la solidité.',
    body_en:'When an opponent opens and you hold a good 5-card suit with 12-17 HCP, you can overcall at the minimum level. Rule: 5 cards in your suit, 12-17 HCP, and ideally the Ace or King in that suit for solidity.',
    key_rule_fr:'5+ cartes, 12-17H → contre-enchérir au palier minimum légal.',
    key_rule_en:'5+ cards, 12-17 HCP → overcall at the minimum legal level.',
  },
  pass_overcall: {
    slug:'passe-competition', title_fr:'Passe en compétition', title_en:'Pass in competition',
    body_fr:'Si vous n\'avez pas les conditions pour contre-enchérir (moins de 12H ou pas de couleur 5ème solide), passez. Une contre-enchère insuffisante met toute l\'équipe en danger.',
    body_en:'If you don\'t meet overcall conditions (less than 12 HCP or no solid 5-card suit), pass. An insufficient overcall endangers your whole partnership.',
    key_rule_fr:'< 12H ou pas de couleur 5e solide → PASSE en compétition.',
    key_rule_en:'< 12 HCP or no solid 5-card suit → PASS in competition.',
  },
}

// ── Titres ────────────────────────────────────────────────────────────────────
const TITLES = {
  open_1c: [
    {fr:'Ouverture 1♣ — main irrégulière',         en:'Opening 1♣ — unbalanced hand'},
    {fr:'Ouverture 1♣ — les trèfles dominent',      en:'Opening 1♣ — clubs dominate'},
    {fr:'Ouverture 1♣ — bicolore mineur',           en:'Opening 1♣ — minor two-suiter'},
    {fr:'Ouverture 1♣ — main de 12H',              en:'Opening 1♣ — 12 HCP hand'},
    {fr:'Ouverture 1♣ — main de 14H',              en:'Opening 1♣ — 14 HCP hand'},
    {fr:'Ouverture 1♣ — soutien de Nord',           en:'Opening 1♣ — North raises'},
    {fr:'Ouverture 1♣ — réponse en SA',             en:'Opening 1♣ — NT response'},
  ],
  open_1d: [
    {fr:'Ouverture 1♦ — les carreaux dominent',     en:'Opening 1♦ — diamonds dominate'},
    {fr:'Ouverture 1♦ — bicolore mineur',           en:'Opening 1♦ — minor two-suiter'},
    {fr:'Ouverture 1♦ — 5 carreaux',               en:'Opening 1♦ — 5-card diamonds'},
    {fr:'Ouverture 1♦ — main de 13H',              en:'Opening 1♦ — 13 HCP hand'},
    {fr:'Ouverture 1♦ — main de 16H',              en:'Opening 1♦ — 16 HCP hand'},
    {fr:'Ouverture 1♦ — soutien de Nord',           en:'Opening 1♦ — North raises'},
    {fr:'Ouverture 1♦ — réponse majeure',           en:'Opening 1♦ — major response'},
  ],
  open_1h: [
    {fr:'Ouverture 1♥ — 5 cœurs',                  en:'Opening 1♥ — 5-card hearts'},
    {fr:'Ouverture 1♥ — soutien de Nord',           en:'Opening 1♥ — North raises'},
    {fr:'Ouverture 1♥ — bicolore cœur-trèfle',     en:'Opening 1♥ — hearts-clubs'},
    {fr:'Ouverture 1♥ — 6 cœurs',                  en:'Opening 1♥ — 6-card hearts'},
    {fr:'Ouverture 1♥ — soutien fort (13H)',        en:'Opening 1♥ — strong raise (13 HCP)'},
    {fr:'Ouverture 1♥ — bicolore majeure',          en:'Opening 1♥ — major two-suiter'},
    {fr:'Ouverture 1♥ — réponse 1SA',              en:'Opening 1♥ — 1NT response'},
  ],
  open_1s: [
    {fr:'Ouverture 1♠ — 5 piques',                 en:'Opening 1♠ — 5-card spades'},
    {fr:'Ouverture 1♠ — soutien de Nord',           en:'Opening 1♠ — North raises'},
    {fr:'Ouverture 1♠ — bicolore pique-cœur',      en:'Opening 1♠ — spades-hearts'},
    {fr:'Ouverture 1♠ — 6 piques',                 en:'Opening 1♠ — 6-card spades'},
    {fr:'Ouverture 1♠ — soutien à la manche',       en:'Opening 1♠ — game raise'},
    {fr:'Ouverture 1♠ — bicolore pique-carreau',    en:'Opening 1♠ — spades-diamonds'},
    {fr:'Ouverture 1♠ — réponse 1SA',              en:'Opening 1♠ — 1NT response'},
  ],
  open_1nt: [
    {fr:'1SA — jeu régulier 15H',                  en:'1NT — 15 HCP balanced'},
    {fr:'1SA — jeu régulier 16H',                  en:'1NT — 16 HCP balanced'},
    {fr:'1SA — jeu régulier 17H',                  en:'1NT — 17 HCP balanced'},
    {fr:'1SA — réponse de Nord',                   en:'1NT — North responds'},
    {fr:'1SA — manche en SA',                      en:'1NT — game in NT'},
  ],
  pass: [
    {fr:'Main faible — on passe',                  en:'Weak hand — pass'},
    {fr:'Passe — Nord prend l\'initiative',         en:'Pass — North takes action'},
    {fr:'Main légère, pas d\'ouverture',            en:'Light hand, no opening'},
  ],
  open_2c: [
    {fr:'2♣ Forcing — main très forte',            en:'2♣ Forcing — very strong hand'},
    {fr:'2♣ Forcing — 23 honneurs',               en:'2♣ Forcing — 23 HCP'},
    {fr:'2♣ Forcing — slam possible',              en:'2♣ Forcing — slam possible'},
  ],
  open_2nt: [
    {fr:'2SA — 20 honneurs régulier',              en:'2NT — 20 HCP balanced'},
    {fr:'2SA — 21 honneurs régulier',              en:'2NT — 21 HCP balanced'},
    {fr:'2SA — manche directe',                    en:'2NT — direct game'},
  ],
  e1h_s1s: [
    {fr:'Contre-enchère 1♠ sur ouverture 1♥',     en:'Overcall 1♠ over 1♥ opening'},
    {fr:'Piques après l\'ouverture cœur adverse',  en:'Spades over opponent\'s heart opening'},
    {fr:'Compétition majeure : 1♠ sur 1♥',        en:'Major competition: 1♠ over 1♥'},
    {fr:'Contre-enchère au palier 1',              en:'Overcall at the 1-level'},
  ],
  e1s_s2h: [
    {fr:'Contre-enchère 2♥ sur ouverture 1♠',     en:'Overcall 2♥ over 1♠ opening'},
    {fr:'Cœurs après l\'ouverture pique adverse',  en:'Hearts over opponent\'s spade opening'},
    {fr:'Compétition : 2♥ sur 1♠',               en:'Competition: 2♥ over 1♠'},
  ],
  e1c_soc: [
    {fr:'Contre-enchère sur ouverture 1♣',         en:'Overcall over 1♣ opening'},
    {fr:'Couleur longue après 1♣ adverse',         en:'Long suit after opponent\'s 1♣'},
    {fr:'Compétition sur ouverture mineure',        en:'Competition over minor opening'},
  ],
  e1d_soc: [
    {fr:'Contre-enchère sur ouverture 1♦',         en:'Overcall over 1♦ opening'},
    {fr:'Couleur longue après 1♦ adverse',         en:'Long suit after opponent\'s 1♦'},
    {fr:'Compétition sur ouverture 1♦',            en:'Competition over 1♦ opening'},
  ],
  e1h_spass: [
    {fr:'Passe sur ouverture 1♥ adverse',          en:'Pass over opponent\'s 1♥'},
    {fr:'Trop faible pour contre-enchérir',         en:'Too weak to overcall'},
  ],
  e1s_spass: [
    {fr:'Passe sur ouverture 1♠ adverse',          en:'Pass over opponent\'s 1♠'},
    {fr:'Pas les conditions pour contre-enchérir',  en:'No overcall conditions'},
  ],
}

// ── Catégories L1 ─────────────────────────────────────────────────────────────
// cond reçoit (openRec, hand) pour filtrer sur HCP bruts en plus de la clé
const L1_CATS = [
  { key:'open_1c',  count:7, cond:(r,h) => r.key==='open_1c'  && hcp(h)>=12 && hcp(h)<=18 },
  { key:'open_1d',  count:7, cond:(r,h) => r.key==='open_1d'  && hcp(h)>=12 && hcp(h)<=18 },
  { key:'open_1h',  count:7, cond:(r,h) => r.key==='open_1h'  && hcp(h)>=12 && hcp(h)<=18 },
  { key:'open_1s',  count:7, cond:(r,h) => r.key==='open_1s'  && hcp(h)>=12 && hcp(h)<=18 },
  { key:'open_1nt', count:5, cond:(r,h) => r.key==='open_1nt' && hcp(h)>=15 && hcp(h)<=17 },
  { key:'pass',     count:3, cond:(r,h) => r.key==='pass'     && hcp(h)<=10 },
  { key:'open_2c',  count:3, cond:(r,h) => r.key==='open_2c'  && hcp(h)>=22 },
  { key:'open_2nt', count:3, cond:(r,h) => r.key==='open_2nt' && hcp(h)>=20 && hcp(h)<=21 },
]

// ── Catégories L2 ─────────────────────────────────────────────────────────────
const L2_CATS = [
  { key:'e1h_s1s',  openSuit:'H', count:4,
    cond:d => { const er=recommendOpening(d.east); if(er.key!=='open_1h') return false
      return computeOvercall(d.south,{level:1,suit:'H'}).bid!==null } },
  { key:'e1s_s2h',  openSuit:'S', count:3,
    cond:d => { const er=recommendOpening(d.east); if(er.key!=='open_1s') return false
      return computeOvercall(d.south,{level:1,suit:'S'}).bid!==null } },
  { key:'e1c_soc',  openSuit:'C', count:3,
    cond:d => { const er=recommendOpening(d.east); if(er.key!=='open_1c') return false
      return computeOvercall(d.south,{level:1,suit:'C'}).bid!==null } },
  { key:'e1d_soc',  openSuit:'D', count:3,
    cond:d => { const er=recommendOpening(d.east); if(er.key!=='open_1d') return false
      return computeOvercall(d.south,{level:1,suit:'D'}).bid!==null } },
  { key:'e1h_spass',openSuit:'H', count:2,
    cond:d => { const er=recommendOpening(d.east); if(er.key!=='open_1h') return false
      return computeOvercall(d.south,{level:1,suit:'H'}).bid===null } },
  { key:'e1s_spass',openSuit:'S', count:2,
    cond:d => { const er=recommendOpening(d.east); if(er.key!=='open_1s') return false
      return computeOvercall(d.south,{level:1,suit:'S'}).bid===null } },
]

// ── Génération ────────────────────────────────────────────────────────────────
function generateL1() {
  const files = []
  let num = 9
  for (const cat of L1_CATS) {
    let done=0, attempts=0, vi=0
    while (done < cat.count && attempts < 60000) {
      attempts++
      const d = dealHands()
      const openRec = recommendOpening(d.south)
      if (!cat.cond(openRec, d.south)) continue
      const northResp = openRec.bid ? recommendResponse(d.north, openRec.bid) : null
      const contract  = estimateContractL1(d, openRec)
      const title     = (TITLES[cat.key] ?? [])[vi % (TITLES[cat.key]?.length||1)]
      vi++
      const lead = bestLead(d.west)
      const padNum = String(num).padStart(3,'0')
      const slug   = `${cat.key.replace(/_/g,'-')}`
      files.push({
        filename: `${padNum}-${slug}.json`,
        dir: 'level1',
        data: {
          slug:              `l1-${padNum}-${slug}`,
          level:             1,
          title_fr:          title?.fr ?? `Donne L1 ${num}`,
          title_en:          title?.en ?? `Deal L1 ${num}`,
          concepts:          [cat.key],
          south:             d.south,
          north:             d.north,
          east:              d.east,
          west:              d.west,
          dealer:            'S',
          vulnerability:     'none',
          optimal_contract:  contract,
          optimal_tricks:    contract ? contract.level + 6 : 0,
          bidding_sequence:  seqL1(d, openRec, northResp, contract),
          play_line: {
            opening_lead: lead,
            notes_fr: contract
              ? [`Ouest entame ${SUIT_SYM[lead.suit]}${lead.rank}. ${contract.declarer==='S'?'Sud':'Nord'} déclare ${bStr(contract)}.`]
              : ['Tous les joueurs passent.'],
            notes_en: contract
              ? [`West leads ${SUIT_SYM[lead.suit]}${lead.rank}. ${contract.declarer==='S'?'South':'North'} declares ${contract.level}${contract.suit==='NT'?'NT':SUIT_SYM[contract.suit]}.`]
              : ['All players pass.'],
          },
          concept: CONCEPTS[cat.key],
        }
      })
      num++; done++
    }
    if (done < cat.count) console.warn(`⚠ L1 ${cat.key}: ${done}/${cat.count} (${attempts} essais)`)
  }
  return files
}

function generateL2() {
  const files = []
  let num = 4
  for (const cat of L2_CATS) {
    let done=0, attempts=0, vi=0
    while (done < cat.count && attempts < 60000) {
      attempts++
      const d = dealHands()
      if (!cat.cond(d)) continue
      const eastOpenBid = { level:1, suit:cat.openSuit }
      const southOc     = computeOvercall(d.south, eastOpenBid)
      const contract    = estimateContractL2(d, eastOpenBid, southOc.bid)
      const title       = (TITLES[cat.key] ?? [])[vi % (TITLES[cat.key]?.length||1)]
      vi++
      const lead        = bestLead(d.west)
      const ck          = southOc.bid ? 'overcall' : 'pass_overcall'
      const padNum      = String(num).padStart(3,'0')
      const slug        = cat.key.replace(/_/g,'-')
      files.push({
        filename: `${padNum}-${slug}.json`,
        dir: 'level2',
        data: {
          slug:             `l2-${padNum}-${slug}`,
          level:            2,
          title_fr:         title?.fr ?? `Donne L2 ${num}`,
          title_en:         title?.en ?? `Deal L2 ${num}`,
          concepts:         [ck],
          south:            d.south,
          north:            d.north,
          east:             d.east,
          west:             d.west,
          dealer:           'E',
          vulnerability:    'none',
          optimal_contract: contract,
          optimal_tricks:   contract ? contract.level + 6 : 0,
          bidding_sequence: seqL2(d, eastOpenBid, southOc),
          play_line: {
            opening_lead: lead,
            notes_fr: [`Ouest entame ${SUIT_SYM[lead.suit]}${lead.rank}.`],
            notes_en: [`West leads ${SUIT_SYM[lead.suit]}${lead.rank}.`],
          },
          concept: CONCEPTS[ck],
        }
      })
      num++; done++
    }
    if (done < cat.count) console.warn(`⚠ L2 ${cat.key}: ${done}/${cat.count} (${attempts} essais)`)
  }
  return files
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const base = path.join(__dirname, '..', 'src', 'data', 'deals')
  const l1   = generateL1()
  const l2   = generateL2()

  let written = 0
  for (const { filename, dir, data } of [...l1, ...l2]) {
    const fp = path.join(base, dir, filename)
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8')
    console.log(`✓ ${dir}/${filename}  [${data.concepts[0]}]  ${hcp(data.south)}H Sud`)
    written++
  }
  console.log(`\n${written} donnes générées (L1: ${l1.length}, L2: ${l2.length})`)
}

main()
