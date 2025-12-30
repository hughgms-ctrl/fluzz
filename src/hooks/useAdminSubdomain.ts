import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ADMIN_SUBDOMAIN = 'admin.fluzzapp.com';

export const isAdminSubdomain = (): boolean => {
  return window.location.hostname === ADMIN_SUBDOMAIN;
};

export const useAdminSubdomain = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAdminSubdomain()) {
      // Se estiver no subdomínio admin e não estiver em uma rota admin, redireciona
      if (!location.pathname.startsWith('/admin')) {
        navigate('/admin', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return { isAdminSubdomain: isAdminSubdomain() };
};
