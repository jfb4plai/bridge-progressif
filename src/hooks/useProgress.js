/**
 * Hook — progression utilisateur (XP, niveau, Supabase sync)
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { levelFromXp } from '../engine/hints.js'

export function useProgress(userId) {
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchProfile(userId)
  }, [userId])

  const fetchProfile = async (uid) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bridge_profiles')
      .select('*')
      .eq('user_id', uid)
      .single()

    if (error && error.code === 'PGRST116') {
      // profil inexistant → créer
      const lang = localStorage.getItem('bridge_lang') ?? 'fr'
      const { data: created } = await supabase
        .from('bridge_profiles')
        .insert({ user_id: uid, lang, system: 'sf', level: 1, xp: 0 })
        .select()
        .single()
      setProfile(created)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  const addXp = useCallback(async (xpDelta) => {
    if (!profile) return
    const newXp  = Math.max(0, profile.xp + xpDelta)
    const newLvl = levelFromXp(newXp).level

    const { data } = await supabase
      .from('bridge_profiles')
      .update({ xp: newXp, level: newLvl })
      .eq('user_id', profile.user_id)
      .select()
      .single()

    setProfile(data)
    return { oldXp: profile.xp, newXp, levelUp: newLvl > profile.level }
  }, [profile])

  const updateSettings = useCallback(async ({ lang, system }) => {
    if (!profile) return
    const updates = {}
    if (lang)   updates.lang   = lang
    if (system) updates.system = system

    const { data } = await supabase
      .from('bridge_profiles')
      .update(updates)
      .eq('user_id', profile.user_id)
      .select()
      .single()

    setProfile(data)
    if (lang) localStorage.setItem('bridge_lang', lang)
  }, [profile])

  return { profile, loading, addXp, updateSettings, refetch: () => fetchProfile(userId) }
}
