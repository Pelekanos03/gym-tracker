import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo('Account created. Check your email to confirm it, then sign in.')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-neutral-950" />
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
          <h1 className="text-2xl font-bold mb-2">Gym Tracker</h1>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-neutral-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-400">{info}</p>}

          <button
            type="submit"
            className="py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-medium"
          >
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
              setInfo('')
            }}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGate
