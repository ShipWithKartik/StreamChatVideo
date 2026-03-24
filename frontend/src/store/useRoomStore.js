import { create } from "zustand";

export const useRoomStore = create((set) => ({
  activeRoom: null,
  setActiveRoom: (room) => set({ activeRoom: room }),
  clearActiveRoom: () => set({ activeRoom: null }),
}));
