import { create } from 'zustand';

interface UIState {
  modals: Record<string, boolean>;
  filters: Record<string, any>;
  loading: Record<string, boolean>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  toggleModal: (id: string) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setLoading: (key: string, value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  modals: {},
  filters: {},
  loading: {},

  openModal: (id: string) => {
    set((state) => ({
      modals: { ...state.modals, [id]: true },
    }));
  },

  closeModal: (id: string) => {
    set((state) => ({
      modals: { ...state.modals, [id]: false },
    }));
  },

  toggleModal: (id: string) => {
    set((state) => ({
      modals: { ...state.modals, [id]: !state.modals[id] },
    }));
  },

  setFilter: (key: string, value: any) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  setLoading: (key: string, value: boolean) => {
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    }));
  },
}));
