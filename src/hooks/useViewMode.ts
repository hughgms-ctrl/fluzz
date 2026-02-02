import { useViewModeContext, type ViewMode } from "@/contexts/ViewModeContext";

export type { ViewMode };

export function useViewMode() {
  return useViewModeContext();
}
