'use client'
import { create } from 'zustand'

export type TaskStatus = 'pendiente' | 'en-proceso' | 'listo'

interface AppState {
  currentSlide: number
  totalSlides: number
  week: string
  tasks: Record<string, TaskStatus>
  setSlide: (n: number) => void
  nextSlide: () => void
  prevSlide: () => void
  setWeek: (w: string) => void
  toggleTask: (key: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentSlide: 1,
  totalSlides: 16,
  week: '17 Mar 2026',
  tasks: {},

  setSlide: (n) => set({ currentSlide: n }),
  nextSlide: () => {
    const { currentSlide, totalSlides } = get()
    if (currentSlide < totalSlides) set({ currentSlide: currentSlide + 1 })
  },
  prevSlide: () => {
    const { currentSlide } = get()
    if (currentSlide > 1) set({ currentSlide: currentSlide - 1 })
  },
  setWeek: (week) => set({ week }),
  toggleTask: (key) => {
    const cur = get().tasks[key] ?? 'pendiente'
    set({ tasks: { ...get().tasks, [key]: cur === 'listo' ? 'pendiente' : 'listo' } })
  },
}))
