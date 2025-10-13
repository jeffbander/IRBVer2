import { create } from 'zustand';

export interface Study {
  id: string;
  title: string;
  protocolNumber: string;
  status: string;
  type: string;
  description: string;
  riskLevel: string;
  startDate?: string;
  endDate?: string;
  targetEnrollment?: number;
  currentEnrollment: number;
  irbApprovalDate?: string;
  irbExpirationDate?: string;
  principalInvestigator?: any;
  reviewer?: any;
  participants?: any[];
  documents?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface StudiesState {
  studies: Study[];
  currentStudy: Study | null;
  setStudies: (studies: Study[]) => void;
  setCurrentStudy: (study: Study | null) => void;
  addStudy: (study: Study) => void;
  updateStudy: (id: string, updates: Partial<Study>) => void;
  removeStudy: (id: string) => void;
  clearStudies: () => void;
}

export const useStudiesStore = create<StudiesState>((set) => ({
  studies: [],
  currentStudy: null,

  setStudies: (studies: Study[]) => {
    set({ studies });
  },

  setCurrentStudy: (study: Study | null) => {
    set({ currentStudy: study });
  },

  addStudy: (study: Study) => {
    set((state) => ({
      studies: [...state.studies, study],
    }));
  },

  updateStudy: (id: string, updates: Partial<Study>) => {
    set((state) => ({
      studies: state.studies.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      currentStudy:
        state.currentStudy?.id === id
          ? { ...state.currentStudy, ...updates }
          : state.currentStudy,
    }));
  },

  removeStudy: (id: string) => {
    set((state) => ({
      studies: state.studies.filter((s) => s.id !== id),
      currentStudy: state.currentStudy?.id === id ? null : state.currentStudy,
    }));
  },

  clearStudies: () => {
    set({ studies: [], currentStudy: null });
  },
}));
