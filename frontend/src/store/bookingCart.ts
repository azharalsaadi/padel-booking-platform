import { create } from 'zustand'
import type { SelectedSlot } from '@/types/api'

interface BookingCartState {
  slots: SelectedSlot[]
  addSlot: (slot: SelectedSlot) => void
  removeSlot: (slot: SelectedSlot) => void
  hasSlot: (date: string, startTime: string) => boolean
  clear: () => void
}

const sameSlot = (a: SelectedSlot, b: SelectedSlot) => a.date === b.date && a.start_time === b.start_time

export const useBookingCartStore = create<BookingCartState>((set, get) => ({
  slots: [],
  addSlot: (slot) =>
    set((state) => (state.slots.some((s) => sameSlot(s, slot)) ? state : { slots: [...state.slots, slot] })),
  removeSlot: (slot) => set((state) => ({ slots: state.slots.filter((s) => !sameSlot(s, slot)) })),
  hasSlot: (date, startTime) => get().slots.some((s) => s.date === date && s.start_time === startTime),
  clear: () => set({ slots: [] }),
}))
