import { create } from "zustand";

export type ActiveView = "input" | "run" | "eval";

interface UIState {
  activeView: ActiveView;
  liveRetryLoop: number;
  canvasMode: "view" | "edit";
  showGrid: boolean;
  setActiveView: (view: ActiveView) => void;
  setLiveRetryLoop: (count: number) => void;
  setCanvasMode: (mode: "view" | "edit") => void;
  setShowGrid: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "input",
  liveRetryLoop: 0,
  canvasMode: "view",
  showGrid: true,
  setActiveView: (view) => set({ activeView: view }),
  setLiveRetryLoop: (count) => set({ liveRetryLoop: count }),
  setCanvasMode: (mode) => set({ canvasMode: mode }),
  setShowGrid: (value) => set({ showGrid: value }),
}));
