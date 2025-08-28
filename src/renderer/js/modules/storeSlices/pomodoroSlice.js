// /src/renderer/js/modules/storeSlices/pomodoroSlice.js

export const createPomodoroSlice = (set, get) => ({
  pomodoroAnimationId: null,
  currentPomodoroState: "stopped",
  currentPomodoroData: { timeLeft: 0, totalTime: 1, state: 'stopped', mode: 'focus' },
  
  // ACTIONS
  setPomodoroState: (pomodoroState) => set({ currentPomodoroState: pomodoroState }),
  setPomodoroData: (data) => set({ currentPomodoroData: data }),
  setPomodoroAnimationId: (id) => set({ pomodoroAnimationId: id }),
});