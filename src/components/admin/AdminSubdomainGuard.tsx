import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';

interface AdminSubdomainGuardProps {
  children: React.ReactNode;
}

export const AdminSubdomainGuard = ({ children }: AdminSubdomainGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Se estiver no subdomínio admin
    if (isAdminSubdomain()) {
      // E não estiver em uma rota /admin, redireciona para /admin
      if (!location.pathname.startsWith('/admin')) {
        navigate('/admin', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // Se estiver no subdomínio admin e tentar acessar rotas não-admin, não renderiza nada
  if (isAdminSubdomain() && !location.pathname.startsWith('/admin')) {
    return null;
  }

  return <>{children}</>;
};
