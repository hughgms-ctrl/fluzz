import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ADMIN_HOSTS = new Set(["admin.fluzzapp.com", "www.admin.fluzzapp.com"]);

export const isAdminSubdomain = (): boolean => {
  return ADMIN_HOSTS.has(window.location.hostname);
};

export const useAdminSubdomain = () => {
  const location = useLocation();

  useEffect(() => {
    if (!isAdminSubdomain()) return;

    if (!location.pathname.startsWith("/admin")) {
      window.location.replace("/admin");
    }
  }, [location.pathname]);

  return { isAdminSubdomain: isAdminSubdomain() };
};

