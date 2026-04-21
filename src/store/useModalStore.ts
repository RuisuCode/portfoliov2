import { create } from 'zustand'

interface ModalState {
  isModalOpen: boolean
  setIsModalOpen: (isOpen: boolean) => void
}

export const useModalStore = create<ModalState>((set) => ({
  isModalOpen: false,
  setIsModalOpen: (isOpen: boolean) => set({ isModalOpen: isOpen }),
}))
