'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: '#0F172A' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-cobalt/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gold/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cobalt/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-8 w-full max-w-sm shadow-2xl shadow-black/20 relative"
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E8000D] via-cobalt to-gold rounded-t-2xl" />

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-center gap-3 mb-1"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8000D] to-[#B8000A] flex items-center justify-center font-condensed font-black text-white text-sm leading-none select-none shadow-lg shadow-red-900/20">
            MK
          </div>
          <div>
            <h1 className="font-condensed font-black text-cobalt text-2xl leading-tight">MK Ingeniería</h1>
            <p className="text-[10px] text-slate font-semibold">Portal de Gestión de Comités</p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="text-xs text-slate mb-6 mt-3"
        >
          Ingresa con tu cuenta para acceder al portal
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onSubmit={handleLogin}
        >
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate mb-1">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm mb-3 outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] transition-all placeholder:text-[#CBD5E1]"
            placeholder="tu@mkingenieria.cl"
            required
          />

          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm mb-4 outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] transition-all placeholder:text-[#CBD5E1]"
            placeholder="••••••••"
            required
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded bg-danger flex items-center justify-center text-white text-[10px] font-bold shrink-0">!</div>
              <p className="text-[11px] text-red-800 font-medium">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cobalt text-white rounded-lg font-semibold text-sm hover:bg-cobalt-dark hover:shadow-lg hover:shadow-cobalt/25 transition-all disabled:opacity-50 btn-scale"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ingresando...
              </span>
            ) : 'Ingresar →'}
          </button>
        </motion.form>

        <p className="text-[10px] text-slate text-center mt-5">
          ¿No tienes cuenta? Contacta a Felipe Valenzuela
        </p>
      </motion.div>
    </div>
  )
}
