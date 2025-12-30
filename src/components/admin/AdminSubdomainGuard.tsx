import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";

interface AdminSubdomainGuardProps {
  children: React.ReactNode;
}

export const AdminSubdomainGuard = ({ children }: AdminSubdomainGuardProps) => {
  const location = useLocation();

  useEffect(() => {
    if (!isAdminSubdomain()) return;

    // Hard redirect to ensure it works even if SPA navigation is not ready
    if (!location.pathname.startsWith("/admin")) {
      window.location.replace("/admin");
    }
  }, [location.pathname]);

  // Avoid rendering non-admin pages on the admin subdomain
  if (isAdminSubdomain() && !location.pathname.startsWith("/admin")) {
    return null;
  }

  return <>{children}</>;
};

