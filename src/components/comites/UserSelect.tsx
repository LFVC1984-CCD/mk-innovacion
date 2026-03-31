'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserOption { id: string; nombre: string; cargo?: string | null }

interface Props {
  value: string
  onChange: (nombre: string) => void
  placeholder?: string
  className?: string
}

/**
 * Selector de usuario con búsqueda. Lee de tabla `perfiles`.
 * Muestra dropdown con nombres, permite tipear para filtrar.
 * Devuelve el nombre (string) para compatibilidad con campos existentes.
 */
export default function UserSelect({ value, onChange, placeholder = 'Buscar usuario...', className = '' }: Props) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient().from('perfiles').select('id, nombre, cargo').order('nombre')
      .then(({ data }: { data: UserOption[] | null }) => { if (data) setUsers(data) })
  }, [])

  useEffect(() => { setSearch(value || '') }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = users.filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); onChange(e.target.value) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="inp w-full"
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      {open && filtered.length > 0 && (
        <div role="listbox" className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
          {filtered.map(u => (
            <button key={u.id} type="button"
              role="option"
              aria-selected={value === u.nombre}
              onClick={() => { onChange(u.nombre); setSearch(u.nombre); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[#F9FAFB] transition-colors flex items-center justify-between"
              style={{ borderBottom: '1px solid #F1F5F9' }}>
              <span className="font-medium text-ink">{u.nombre}</span>
              {u.cargo && <span className="text-[10px] text-slate">{u.cargo}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
