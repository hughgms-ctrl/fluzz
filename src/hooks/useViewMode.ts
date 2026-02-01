import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type ViewMode = "management" | "focus";

export function useViewMode() {
  const { user } = useAuth();
  
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("viewMode");
    return (saved as ViewMode) || "management";
  });
  
  const [hideCompleted, setHideCompletedState] = useState<boolean>(() => {
    return localStorage.getItem("hideCompleted") === "true";
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem("viewMode", mode);
  };

  const setHideCompleted = (hide: boolean) => {
    setHideCompletedState(hide);
    localStorage.setItem("hideCompleted", String(hide));
  };

  return { viewMode, setViewMode, hideCompleted, setHideCompleted, isLoading };
}
