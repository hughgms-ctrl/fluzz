import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type ViewMode = "management" | "focus";

export function useViewMode() {
  const { user } = useAuth();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Try to get from localStorage first for immediate UI
    const saved = localStorage.getItem("viewMode");
    return (saved as ViewMode) || "management";
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load preference from database
  useEffect(() => {
    async function loadPreference() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Check if profile has view_mode (we'll need to add this column)
        // For now, use localStorage as fallback
        const savedMode = localStorage.getItem("viewMode") as ViewMode;
        if (savedMode) {
          setViewModeState(savedMode);
        }
      } catch (error) {
        console.error("Error loading view mode preference:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreference();
  }, [user]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem("viewMode", mode);
    
    // Optionally save to database in the future
    // if (user) {
    //   supabase.from("profiles").update({ view_mode: mode }).eq("id", user.id);
    // }
  };

  return { viewMode, setViewMode, isLoading };
}
