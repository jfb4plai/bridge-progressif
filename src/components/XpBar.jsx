/**
 * Barre XP + niveau
 */
import { levelFromXp, LEVELS } from '../engine/hints.js'
import { useTranslation } from 'react-i18next'

export default function XpBar({ xp = 0, lang = 'fr' }) {
  const { t } = useTranslation()
  const current = levelFromXp(xp)
  const nextLvl = LEVELS.find(l => l.level === current.level + 1)

  const pct = nextLvl
    ? Math.round(((xp - current.xpMin) / (nextLvl.xpMin - current.xpMin)) * 100)
    : 100

  const levelName = lang === 'fr' ? current.name_fr : current.name_en

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center min-w-[48px]">
        <span className="text-xs text-stone-500">{t('dashboard.level')}</span>
        <span className="text-xl font-bold text-emerald-700">{current.level}</span>
        <span className="text-xs text-stone-600">{levelName}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-stone-500 mb-1">
          <span>{xp} XP</span>
          {nextLvl && <span>{nextLvl.xpMin} XP</span>}
        </div>
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
