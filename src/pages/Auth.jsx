import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useTranslation } from 'react-i18next'

export default function Auth({ lang = 'fr' }) {
  const { t }   = useTranslation()
  const [mode, setMode]     = useState('login')  // 'login'|'register'
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [name, setName]     = useState('')
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { display_name: name } },
        })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800">{t('app.title')}</h1>
          <p className="text-stone-500 mt-1">{t('app.tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth.name')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth.password')}</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '…' : mode === 'login' ? t('auth.login_btn') : t('auth.register_btn')}
          </button>

          <p className="text-center text-sm text-stone-500">
            {mode === 'login' ? t('auth.no_account') : t('auth.has_account')}{' '}
            <button
              type="button"
              onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
              className="text-emerald-600 font-medium hover:underline"
            >
              {mode === 'login' ? t('auth.register') : t('auth.login')}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
