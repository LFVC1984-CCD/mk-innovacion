'use client'
import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/50 backdrop-blur-sm"
          onClick={e => { if (e.target === overlayRef.current) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-[560px] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-0">
              <h2 className="font-condensed text-[22px] font-extrabold">
                {accent ? <>{title} <span className="text-cobalt">{accent}</span></> : title}
              </h2>
              <button
                onClick={onClose}
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

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate mb-1">{label}</label>
      {children}
    </div>
  )
}

export function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[13px] font-sans bg-white outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]"
    />
  )
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[13px] font-sans bg-white outline-none focus:border-cobalt transition-colors cursor-pointer"
    >
      {children}
    </select>
  )
}

export function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>
}

export function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2.5">{children}</div>
}

export function Divider({ label }: { label: string }) {
  return (
    <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate mt-4 mb-2 pb-1 border-b border-[#E2E8F0]">
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
