'use client'
import { useEffect, useRef, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  accent?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function Modal({ open, onClose, title, accent, children, footer }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const prevFocusRef = useRef<HTMLElement | null>(null)

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    prevFocusRef.current = document.activeElement as HTMLElement

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    // Auto-focus first input (not button) — only once on open
    requestAnimationFrame(() => {
      const firstInput = dialogRef.current?.querySelector<HTMLElement>('input, select, textarea')
      firstInput?.focus()
    })

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prevFocusRef.current?.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md"
          onClick={e => { if (e.target === overlayRef.current) onClose() }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-[560px] max-h-[90vh] overflow-y-auto ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-0">
              <h2 id={titleId} className="font-condensed text-[22px] font-extrabold">
                {accent ? <>{title} <span className="text-cobalt">{accent}</span></> : title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-slate hover:bg-[#F1F5F9] hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex justify-end gap-2 px-6 pb-6 pt-0 border-t border-[#E2E8F0] mt-2 pt-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Reusable form fields ──

export function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-3.5">
      <label htmlFor={htmlFor} className="block text-[10px] font-bold uppercase tracking-wide text-slate mb-1">{label}</label>
      {children}
    </div>
  )
}

export function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[13px] font-sans bg-white outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] transition-all placeholder:text-[#CBD5E1]"
    />
  )
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[13px] font-sans bg-white outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] transition-all cursor-pointer"
    >
      {children}
    </select>
  )
}

export function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{children}</div>
}

export function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">{children}</div>
}

export function Divider({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate mt-4 mb-2 pb-1 border-b border-[#E2E8F0]">
      {label}
    </p>
  )
}

export function ChipSelect({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {options.map(o => {
        const active = selected.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? selected.filter(s => s !== o) : [...selected, o])}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${
              active ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] hover:border-cobalt hover:text-cobalt'
            }`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

export function Btn({ children, variant = 'default', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' }) {
  const cls = variant === 'primary'
    ? 'bg-cobalt border-cobalt text-white hover:bg-cobalt-dark'
    : variant === 'danger'
    ? 'bg-white border-red-300 text-danger hover:bg-red-50'
    : 'bg-white border-[#E2E8F0] hover:bg-[#F1F5F9]'
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${cls}`}
    >
      {children}
    </button>
  )
}
