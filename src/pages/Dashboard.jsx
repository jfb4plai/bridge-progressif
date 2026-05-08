import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import XpBar from '../components/XpBar.jsx'

export default function Dashboard({ profile }) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const lang     = profile?.lang ?? 'fr'
  const xp       = profile?.xp  ?? 0

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">{t('app.title')}</h1>
        <p className="text-stone-500 text-sm mt-1">{t('app.tagline')}</p>
      </div>

      {/* Barre XP */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
        <XpBar xp={xp} lang={lang} />
      </div>

      {/* Modes d'entraînement */}
      <div className="grid gap-3">
        <ModeCard
          icon="🃏"
          title={t('dashboard.start_bidding')}
          desc={lang === 'fr'
            ? 'Entraînez-vous aux enchères. Indices adaptatifs selon votre niveau.'
            : 'Practice bidding. Adaptive hints based on your level.'}
          color="emerald"
          onClick={() => navigate('/bidding')}
        />
        <ModeCard
          icon="♠"
          title={t('dashboard.start_play')}
          desc={lang === 'fr'
            ? 'Jouez une donne carte par carte en tant que déclarant.'
            : 'Play a deal card by card as declarer.'}
          color="blue"
          onClick={() => navigate('/play')}
        />
        <ModeCard
          icon="★"
          title={t('dashboard.start_full')}
          desc={lang === 'fr'
            ? 'Enchères + jeu complet. Bilan détaillé à la fin.'
            : 'Full deal: bidding + play. Detailed debrief at the end.'}
          color="amber"
          onClick={() => navigate('/full')}
        />
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('dashboard.stats_deals'), value: profile?.stats_deals ?? 0 },
          { label: t('dashboard.stats_contracts'), value: profile?.stats_contracts ?? 0 },
          { label: t('dashboard.stats_hints'), value: profile?.stats_hints ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-stone-800">{value}</div>
            <div className="text-xs text-stone-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModeCard({ icon, title, desc, color, onClick }) {
  const colors = {
    emerald: 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300',
    blue:    'border-blue-200 hover:bg-blue-50 hover:border-blue-300',
    amber:   'border-amber-200 hover:bg-amber-50 hover:border-amber-300',
  }
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-4 p-4 bg-white rounded-xl border shadow-sm text-left transition-colors ${colors[color]}`}
    >
      <span className="text-2xl mt-0.5">{icon}</span>
      <div>
        <div className="font-semibold text-stone-800">{title}</div>
        <div className="text-sm text-stone-500 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}
