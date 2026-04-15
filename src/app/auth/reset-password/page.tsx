'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('No pudimos actualizar tu contraseña. El link puede haber expirado — solicita uno nuevo.')
      setLoading(false)
      return
    }

    router.push('/comites')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: '#0F172A' }}>
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
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E8000D] via-cobalt to-gold rounded-t-2xl" />

        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8000D] to-[#B8000A] flex items-center justify-center font-condensed font-black text-white text-sm leading-none select-none shadow-lg shadow-red-900/20">
            MK
          </div>
          <div>
            <h1 className="font-condensed font-black text-cobalt text-2xl leading-tight">Nueva contraseña</h1>
            <p className="text-[10px] text-slate font-semibold">Portal de Gestión de Comités</p>
          </div>
        </div>

        <p className="text-xs text-slate mb-6 mt-3">
          Define una nueva contraseña para tu cuenta. Mínimo 8 caracteres.
        </p>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          onSubmit={handleSubmit}
        >
          <label htmlFor="new-password" className="block text-[10px] font-bold uppercase tracking-wide text-slate mb-1">
            Nueva contraseña
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm mb-3 outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] transition-all placeholder:text-[#CBD5E1]"
            placeholder="••••••••"
            required
            minLength={8}
          />

          <label htmlFor="confirm-password" className="block text-[10px] font-bold uppercase tracking-wide text-slate mb-1">
            Confirmar contraseña
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm mb-4 outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] transition-all placeholder:text-[#CBD5E1]"
            placeholder="••••••••"
            required
            minLength={8}
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
                Guardando...
              </span>
            ) : 'Guardar y continuar →'}
          </button>
        </motion.form>
      </motion.div>
    </div>
  )
}
