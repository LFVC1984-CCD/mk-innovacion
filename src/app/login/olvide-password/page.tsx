'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function OlvidePasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`
    await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setSent(true)
    setLoading(false)
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
            <h1 className="font-condensed font-black text-cobalt text-2xl leading-tight">Recuperar contraseña</h1>
            <p className="text-[10px] text-slate font-semibold">Portal de Gestión de Comités</p>
          </div>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-[12px] text-green-800 font-medium leading-relaxed">
                Si <span className="font-semibold">{email}</span> está registrado, recibirás un correo con el link para definir una nueva contraseña.
              </p>
              <p className="text-[11px] text-green-700 mt-2">
                Revisa tu bandeja de entrada y la carpeta de spam. El link expira en 1 hora.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center text-[12px] text-cobalt hover:text-cobalt-dark font-medium hover:underline"
            >
              ← Volver al login
            </Link>
          </motion.div>
        ) : (
          <>
            <p className="text-xs text-slate mb-6 mt-3">
              Ingresa tu correo y te enviaremos un link para restablecer tu contraseña.
            </p>

            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              onSubmit={handleSubmit}
            >
              <label htmlFor="recover-email" className="block text-[10px] font-bold uppercase tracking-wide text-slate mb-1">
                Correo electrónico
              </label>
              <input
                id="recover-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm mb-4 outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] transition-all placeholder:text-[#CBD5E1]"
                placeholder="tu@mkingenieria.cl"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cobalt text-white rounded-lg font-semibold text-sm hover:bg-cobalt-dark hover:shadow-lg hover:shadow-cobalt/25 transition-all disabled:opacity-50 btn-scale"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : 'Enviar link de recuperación'}
              </button>

              <div className="text-center mt-4">
                <Link
                  href="/login"
                  className="text-[11px] text-slate hover:text-cobalt font-medium transition-colors"
                >
                  ← Volver al login
                </Link>
              </div>
            </motion.form>
          </>
        )}
      </motion.div>
    </div>
  )
}
