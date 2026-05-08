import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Settings({ profile, onUpdate }) {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()

  const [lang,   setLang]   = useState(profile?.lang   ?? 'fr')
  const [system, setSystem] = useState(profile?.system ?? 'sf')
  const [saved,  setSaved]  = useState(false)

  const handleSave = async () => {
    await onUpdate?.({ lang, system })
    i18n.changeLanguage(lang)
    localStorage.setItem('bridge_lang', lang)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">{t('settings.title')}</h1>
        <button onClick={() => navigate('/')} className="text-sm text-stone-400 hover:text-stone-600">
          ← {t('nav.dashboard')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-5 shadow-sm">
        {/* Langue */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t('settings.language')}</label>
          <div className="flex gap-2">
            {['fr', 'en'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  lang === l
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                }`}
              >
                {l === 'fr' ? 'Français' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* Système */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t('settings.system')}</label>
          <div className="flex flex-col gap-2">
            {[
              { key: 'sf',  label: t('settings.system_sf') },
              { key: 'saf', label: t('settings.system_saf') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSystem(key)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border text-left transition-colors ${
                  system === key
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                }`}
              >
                {key === system ? '● ' : '○ '}{label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
        >
          {saved ? (lang === 'fr' ? '✓ Enregistré' : '✓ Saved') : t('settings.save')}
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        {t('nav.logout')}
      </button>
    </div>
  )
}
