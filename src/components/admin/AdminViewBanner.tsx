import { useNavigate } from "react-router-dom";
import { useAdminView } from "@/contexts/AdminViewContext";
import { Button } from "@/components/ui/button";
import { Shield, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AdminViewBanner = () => {
  const { activeSession, isAdminViewing, endSession, isLoading } = useAdminView();
  const navigate = useNavigate();

  if (!isAdminViewing || !activeSession) return null;

  const expiresAt = new Date(activeSession.expires_at);

  const handleEndSession = async () => {
    await endSession();
    navigate("/admin/users");
  };

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5" />
        <div className="text-sm">
          <span className="font-semibold">Modo Administrador:</span>{" "}
          <span>Visualizando workspace "{activeSession.workspace_name}"</span>
          <span className="hidden sm:inline text-destructive-foreground/80 ml-2">
            • Expira às {format(expiresAt, "HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/admin/users")}
          className="h-7 text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Voltar ao Painel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEndSession}
          disabled={isLoading}
          className="h-7 text-xs bg-transparent border-destructive-foreground/30 hover:bg-destructive-foreground/10"
        >
          <X className="h-3 w-3 mr-1" />
          Encerrar
        </Button>
      </div>
    </div>
  );
};
