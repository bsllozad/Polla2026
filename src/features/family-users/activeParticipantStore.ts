import { create } from "zustand";
import { Participant } from "@/shared/types/worldcup";

type ActiveParticipantState = {
  activeParticipant: Participant | null;
  setActiveParticipant: (participant: Participant) => void;
  clearActiveParticipant: () => void;
};

export const useActiveParticipantStore = create<ActiveParticipantState>((set) => ({
  activeParticipant: null,
  setActiveParticipant: (participant) => set({ activeParticipant: participant }),
  clearActiveParticipant: () => set({ activeParticipant: null })
}));
