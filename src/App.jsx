import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { supabase, supabaseMisconfigured } from './lib/supabase.js'
import { useProgress }    from './hooks/useProgress.js'

import Auth               from './pages/Auth.jsx'
import Dashboard          from './pages/Dashboard.jsx'
import BiddingPractice    from './pages/BiddingPractice.jsx'
import PlayPractice       from './pages/PlayPractice.jsx'
import Settings           from './pages/Settings.jsx'
import DealDebrief        from './pages/DealDebrief.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)  // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (supabaseMisconfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-sm w-full bg-amber-50 border border-amber-300 rounded-2xl p-6 text-sm text-amber-900 space-y-3">
          <div className="font-bold text-base">Configuration Supabase manquante</div>
          <p>Créez un fichier <code className="bg-amber-100 px-1 rounded">.env</code> à la racine du projet :</p>
          <pre className="bg-amber-100 rounded p-3 text-xs leading-relaxed">
{`VITE_SUPABASE_URL=https://dfoaumjleqtxjeaplnna.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon`}
          </pre>
          <p className="text-xs text-amber-700">Redémarrez <code>npm run dev</code> après avoir créé le fichier.</p>
        </div>
      </div>
    )
  }

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400">…</div>
  }

  if (!session) return <Auth />

  return (
    <BrowserRouter>
      <AppShell userId={session.user.id} />
    </BrowserRouter>
  )
}

function AppShell({ userId }) {
  const { t }   = useTranslation()
  const { profile, loading, addXp, updateSettings } = useProgress(userId)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400">…</div>
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Barre de navigation */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <NavLink to="/" className="font-bold text-emerald-700 text-sm">
            ♠ Bridge Progressif
          </NavLink>
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-500">
              {profile?.xp ?? 0} XP · N{profile?.level ?? 1}
            </span>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-stone-500 hover:text-stone-700'}`
              }
            >
              {t('nav.settings')}
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <main className="flex-1">
        <Routes>
          <Route path="/"         element={<Dashboard profile={profile} />} />
          <Route path="/bidding"  element={<BiddingPractice profile={profile} onXpGain={addXp} />} />
          <Route path="/play"     element={<PlayPractice    profile={profile} onXpGain={addXp} />} />
          <Route path="/full"     element={<BiddingPractice profile={profile} onXpGain={addXp} />} />
          <Route path="/debrief"  element={<DealDebrief  profile={profile} />} />
          <Route path="/settings" element={<Settings profile={profile} onUpdate={updateSettings} />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
