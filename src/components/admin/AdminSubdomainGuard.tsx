import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";

interface AdminSubdomainGuardProps {
  children: React.ReactNode;
}

export const AdminSubdomainGuard = ({ children }: AdminSubdomainGuardProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isAdminSubdomain()) {
      setHasChecked(true);
      return;
    }

    // If on admin subdomain but not on an /admin route, redirect immediately
    if (!location.pathname.startsWith("/admin")) {
      navigate("/admin", { replace: true });
    }
    setHasChecked(true);
  }, [location.pathname, navigate]);

  // Don't render anything until we've checked
  if (!hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // On admin subdomain, block all non-admin routes entirely
  if (isAdminSubdomain() && !location.pathname.startsWith("/admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecionando para o painel administrativo...</p>
      </div>
    );
  }

  return <>{children}</>;
};
