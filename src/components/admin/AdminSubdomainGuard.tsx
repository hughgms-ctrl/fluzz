import React from "react";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";

interface AdminSubdomainGuardProps {
  children: React.ReactNode;
}

const ADMIN_REDIRECT_TARGET = "https://fluzzapp.com/admin/login";

export const AdminSubdomainGuard = ({ children }: AdminSubdomainGuardProps) => {
  // Important: if admin.fluzzapp.com is configured to *serve* this app, force a hard redirect
  // to the main domain admin login.
  if (isAdminSubdomain()) {
    if (window.location.href !== ADMIN_REDIRECT_TARGET) {
      window.location.replace(ADMIN_REDIRECT_TARGET);
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  return <>{children}</>;
};

