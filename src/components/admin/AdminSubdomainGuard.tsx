import React from "react";
import { useLocation } from "react-router-dom";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";

interface AdminSubdomainGuardProps {
  children: React.ReactNode;
}

export const AdminSubdomainGuard = ({ children }: AdminSubdomainGuardProps) => {
  const location = useLocation();

  // Immediate synchronous check - hard redirect before React processes
  if (isAdminSubdomain() && !location.pathname.startsWith("/admin")) {
    window.location.replace("/admin");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  return <>{children}</>;
};
