import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db, supabase, DEMO, getDemoUser, setDemoUser } from './db'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [userId, setUserId] = useState(DEMO ? getDemoUser() : undefined)
  const [people, setPeople] = useState([])
  const [departments, setDepartments] = useState([])
  const [settings, setSettings] = useState({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (DEMO) return
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user?.id || null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) { setReady(true); return }
    const [ps, ds, ss] = await Promise.all([db.list('profiles', { order: 'full_name' }), db.list('am_departments'), db.list('am_settings')])
    setPeople(ps); setDepartments(ds)
    setSettings(Object.fromEntries(ss.map(s => [s.key, s.value])))
    setReady(true)
  }, [userId])
  useEffect(() => { setReady(false); refresh() }, [refresh])

  const me = people.find(p => p.id === userId) || null
  const has = (...roles) => !!me && roles.some(r => me.roles?.includes(r))
  const backOffice = has('factotum', 'asset_coordinator', 'hod_ops', 'bookkeeper', 'hof', 'ceo', 'treasurer')
  const person = id => people.find(p => p.id === id)
  const name = id => person(id)?.full_name || '—'
  const withRole = r => people.filter(p => p.active !== false && p.roles?.includes(r))

  async function signIn(emailOrId) {
    if (DEMO) { setDemoUser(emailOrId); setUserId(emailOrId); return }
    const { error } = await supabase.auth.signInWithOtp({ email: emailOrId, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
    if (error) throw error
  }
  async function signOut() {
    if (DEMO) { setDemoUser(null); setUserId(null); return }
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ userId, me, people, departments, settings, ready, has, backOffice, person, name, withRole, signIn, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

// In-app notifications (Teams and email can be added later with a Supabase Edge Function)
export async function notify(userIds, title, body = '', link = '') {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length) await db.insertMany('am_notifications', ids.map(user_id => ({ user_id, title, body, link })))
}
