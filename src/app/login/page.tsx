'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Contacta a Felipe Valenzuela si no tienes acceso.')
      setLoading(false)
      return
    }

    router.push('/comites')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F1F5F9' }}>
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-7 bg-gold rounded" />
          <h1 className="font-condensed font-black text-cobalt text-2xl">MK Ingeniería</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">Portal de Gestión — ingresa con tu cuenta</p>

        <form onSubmit={handleLogin}>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10"
            placeholder="tu@mkingenieria.cl"
            required
          />

          <label className="block text-xs font-semibold text-slate-500 mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10"
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-xs text-red-600 mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cobalt text-white rounded-lg font-semibold text-sm hover:bg-cobalt-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar →'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-4">
          Contacta a Felipe Valenzuela si no tienes acceso.
        </p>
      </div>
    </div>
  )
}
