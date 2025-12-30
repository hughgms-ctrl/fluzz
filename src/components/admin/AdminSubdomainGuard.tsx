import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";

interface AdminSubdomainGuardProps {
  children: React.ReactNode;
}

export const AdminSubdomainGuard = ({ children }: AdminSubdomainGuardProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isAdminSubdomain()) return;

    // If on admin subdomain but not on an /admin route, redirect
    if (!location.pathname.startsWith("/admin")) {
      setIsRedirecting(true);
      navigate("/admin", { replace: true });
    } else {
      setIsRedirecting(false);
    }
  }, [location.pathname, navigate]);

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

